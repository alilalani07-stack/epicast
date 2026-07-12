"""
zones.py — Risk zone and hotspot endpoints.

Both endpoints consume ``compute_area_risks()`` from the risk engine as their
single source of truth.  Alert generation is a side-effect of the zones endpoint
(via ``refresh_alerts()`` from the alert engine).
"""
import logging
from typing import List, Optional
from fastapi import APIRouter, Query
from database import get_db
from models import ZoneResponse, HotspotResponse
from services.risk_engine import compute_area_risks
from services.alert_engine import refresh_alerts
from services.geo import haversine_distance, ZONE_RADIUS_KM

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/dashboard", tags=["3. Zones"])


@router.get("/zones", response_model=List[ZoneResponse])
async def get_risk_zones(
    disease_name: Optional[str] = Query(None, description="Filter zones by a specific disease"),
    days: int = Query(7, ge=1, le=90, description="Lookback window in days"),
):
    """
    Compute and return risk zones for every area with reports in the last
    ``days`` days.  Zone color is determined by the central risk engine.

    As a side-effect, alerts are generated / deduplicated for all elevated zones.

    - Green  : Isolated, low-volume report
    - Yellow : Possible spread (cluster or ≥10 cases)
    - Red    : Confirmed cluster (≥2 nearby) or ≥50 cases in the window
    """
    with get_db() as conn:
        area_risks = compute_area_risks(conn, disease_name=disease_name, days=days)
        # Side-effect: generate alerts from the latest risk picture
        refresh_alerts(conn, area_risks)

    return [
        {
            "area_id":                  r["area_id"],
            "area_name":                r["area_name"],
            "lat":                      r["lat"],
            "lon":                      r["lon"],
            "zone_color":               r["zone_color"],
            "disease_in_cluster":       r["disease"],
            "nearby_reporting_clinics": r["cluster_count"],
            "population_density":       r["population_density"],
            "case_count":               r["case_count_7d"],
            "state":                    r["state"],
        }
        for r in area_risks
    ]


@router.get("/hotspots", response_model=List[HotspotResponse])
async def get_hotspots(
    disease_name: Optional[str] = Query(None, description="Filter by disease"),
    days: int = Query(7, ge=1, le=90, description="Lookback window in days"),
):
    """
    Aggregate Red and Yellow zones into geographic clusters.

    Returns one hotspot record per *cluster* (group of nearby areas reporting
    the same disease), rather than one row per area.  This gives a true "hotspot"
    view — useful for mapping and triage dashboards.

    A cluster is formed when two or more elevated zones are within ZONE_RADIUS_KM
    of each other and share a disease.  Single-area outbreaks with ≥20 cases are
    also surfaced as solo hotspots.
    """
    with get_db() as conn:
        area_risks = compute_area_risks(conn, disease_name=disease_name, days=days)

    # Only consider elevated (Red or Yellow) zones
    elevated = [r for r in area_risks if r["zone_color"] in ("Red", "Yellow")]

    # A solo Green area with ≥20 cases is also a hotspot worth surfacing
    notable_green = [
        r for r in area_risks
        if r["zone_color"] == "Green" and r["case_count_7d"] >= 20
    ]
    candidates = elevated + notable_green

    # ── Geographic clustering ─────────────────────────────────────────────
    clusters: List[dict] = []
    assigned: set = set()

    for zone in candidates:
        key = (zone["area_id"], zone["disease"])
        if key in assigned:
            continue

        # Build this cluster: all unassigned candidates within radius sharing disease
        members = [zone]
        assigned.add(key)

        for other in candidates:
            other_key = (other["area_id"], other["disease"])
            if other_key in assigned:
                continue
            if other["disease"] != zone["disease"]:
                continue
            dist = haversine_distance(
                zone["lat"], zone["lon"],
                other["lat"], other["lon"],
            )
            if dist <= ZONE_RADIUS_KM:
                members.append(other)
                assigned.add(other_key)

        total_cases = sum(m["case_count_7d"] for m in members)
        max_trend   = max(m["trend_pct"] for m in members)

        # Worst zone_color in the cluster determines hotspot severity
        if any(m["zone_color"] == "Red" for m in members):
            worst_color = "Red"
            risk_level  = "critical"
        elif any(m["zone_color"] == "Yellow" for m in members):
            worst_color = "Yellow"
            risk_level  = "high"
        else:
            worst_color = "Green"
            risk_level  = "low"

        # Centroid
        centroid_lat = sum(m["lat"] for m in members) / len(members)
        centroid_lon = sum(m["lon"] for m in members) / len(members)

        clusters.append({
            "id":           f"H-{zone['area_id']}-{zone['disease'][:3].upper()}",
            "primary_area": zone["area_name"],
            "area_names":   [m["area_name"] for m in members],
            "area_count":   len(members),
            "lat":          centroid_lat,
            "lon":          centroid_lon,
            "disease":      zone["disease"],
            "total_cases":  total_cases,
            "zone_color":   worst_color,
            "risk_level":   risk_level,
            "trend_pct":    max_trend,
        })

    # Sort: Red clusters first, then by total case count descending
    order = {"Red": 0, "Yellow": 1, "Green": 2}
    clusters.sort(key=lambda c: (order.get(c["zone_color"], 2), -c["total_cases"]))

    return clusters