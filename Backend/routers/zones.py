import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Query
from database import get_db, fetchall
from models import ZoneResponse
from services.geo import haversine_distance, calculate_zone_color, ZONE_RADIUS_KM

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/dashboard", tags=["3. Zones"])


@router.get("/zones", response_model=List[ZoneResponse])
async def get_risk_zones(
    disease_name: Optional[str] = Query(None, description="Filter zones by a specific disease"),
    days: int = Query(7, ge=1, le=90, description="Lookback window in days"),
):
    """
    Compute and return risk zones for all areas that have filed reports
    within the last `days` days.

    - Green  : Low density, isolated report
    - Yellow : Medium density or moderate clustering
    - Red    : High density + cluster OR ≥2 nearby facilities same disease

    Red zones automatically generate alerts (deduplicated — one active alert
    per area+disease pair at a time).
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    with get_db() as conn:
        area_rows = fetchall(conn, "SELECT * FROM areas")
        area_map = {r["area_id"]: dict(r) for r in area_rows}

        sql = """
            SELECT area_id, disease_name, SUM(count) as total_count
            FROM reports
            WHERE report_type = 'case' AND timestamp >= ?
        """
        params: list = [cutoff]
        if disease_name:
            sql += " AND disease_name = ?"
            params.append(disease_name.strip().title())
        sql += " GROUP BY area_id, disease_name"

        recent = fetchall(conn, sql, tuple(params))

        if not recent:
            return []

        reported_set = {(r["area_id"], r["disease_name"]) for r in recent}
        
        case_count_map = {(r["area_id"], r["disease_name"]): r["total_count"] for r in recent}

        zones: List[dict] = []
        processed = set()

        for row in recent:
            source_id, disease = row["area_id"], row["disease_name"]
            key = (source_id, disease)

            if key in processed:
                continue
            processed.add(key)

            source = area_map.get(source_id)
            if not source:
                logger.warning(f"Report references unknown area_id '{source_id}' — skipping.")
                continue

            cluster_count = 0
            nearby_names: List[str] = []

            for other_id, other in area_map.items():
                if other_id == source_id:
                    continue
                if (other_id, disease) not in reported_set:
                    continue
                dist = haversine_distance(
                    source["lat"], source["lon"], other["lat"], other["lon"]
                )
                if dist <= ZONE_RADIUS_KM:
                    cluster_count += 1
                    nearby_names.append(other["area_name"])

            case_count_7d = case_count_map.get(key, 0)
            zone_color = calculate_zone_color(
                source["population_density"], cluster_count, case_count_7d
            )

            if zone_color == "Red":
                _upsert_red_alert(conn, source_id, disease, source["area_name"], nearby_names)

            zones.append({
                "area_id": source_id,
                "area_name": source["area_name"],
                "lat": source["lat"],
                "lon": source["lon"],
                "zone_color": zone_color,
                "disease_in_cluster": disease,
                "nearby_reporting_clinics": cluster_count,
                "population_density": source["population_density"],
                "state": source["state"],
            })

    order = {"Red": 0, "Yellow": 1, "Green": 2}
    zones.sort(key=lambda z: order[z["zone_color"]])

    return zones

#Internal helper to insert a Red Alert

def _upsert_red_alert(
    conn,
    area_id: str,
    disease_name: str,
    area_name: str,
    nearby_names: List[str],
):
    """
    Insert a Red Zone alert only if one doesn't already exist with status='new'.
    This prevents alert flooding on repeated zone calculations.
    """
    import sqlite3
    nearby_str = ", ".join(nearby_names) if nearby_names else "nearby facilities"
    message = (
        f"🔴 Red Zone Alert: High-risk cluster of '{disease_name}' detected near "
        f"{area_name}. Also reported at: {nearby_str}. Immediate review recommended."
    )

    try:
        conn.execute(
            "INSERT INTO alerts (area_id, disease_name, message, severity) VALUES (?, ?, ?, ?)",
            (area_id, disease_name, message, 'critical'),
        )
        logger.info(f"New Red Zone alert created: {area_id} / {disease_name}")
    except sqlite3.IntegrityError:
        pass