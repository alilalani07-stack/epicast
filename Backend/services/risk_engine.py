"""
risk_engine.py — Single source of truth for all risk computations.

Every module that needs risk data (zones, hotspots, area-stats, dashboard stats,
alert generation) calls ``compute_area_risks()``.  This guarantees that all pages
always show the same numbers and that the risk logic only needs to be maintained
in one place.

Output shape (per item in the returned list):
    area_id          str   — e.g. "A-101"
    area_name        str
    lat              float
    lon              float
    state            str
    population_density int
    disease          str   — disease this record is for
    case_count_7d    int   — sum of case-type report counts in the lookback window
    prior_case_count int   — sum of case counts in the *previous* window (for trend)
    trend_pct        float — % change vs prior window (0.0 if no prior data)
    cluster_count    int   — number of *other* areas within ZONE_RADIUS_KM reporting
                             the same disease in the same window
    nearby_areas     list  — [{area_id, area_name, distance_km, case_count}]
    zone_color       str   — "Green" | "Yellow" | "Red"
    risk_level       str   — "low"   | "high"   | "critical"
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from database import fetchall
from services.geo import haversine_distance, calculate_zone_color, ZONE_RADIUS_KM

logger = logging.getLogger(__name__)

# Map zone_color → risk_level used by every frontend consumer
COLOR_TO_RISK = {"Red": "critical", "Yellow": "high", "Green": "low"}


def compute_area_risks(
    conn,
    disease_name: Optional[str] = None,
    days: int = 7,
) -> List[dict]:
    """
    Compute risk data for every (area, disease) pair that has reports in the
    last ``days`` days.  Returns a stable, sorted list (Red first, then Yellow,
    then Green; ties broken by descending case count).

    Parameters
    ----------
    conn         : open SQLite connection (caller manages transaction)
    disease_name : if supplied, only compute risk for that disease (Title-cased)
    days         : lookback window in days (default 7)
    """
    now = datetime.now(timezone.utc)
    cutoff       = (now - timedelta(days=days)).isoformat()
    prior_cutoff = (now - timedelta(days=days * 2)).isoformat()

    # ── 1. Load area metadata ──────────────────────────────────────────────
    area_rows = fetchall(conn, "SELECT * FROM areas")
    area_map: dict = {r["area_id"]: dict(r) for r in area_rows}

    if not area_map:
        return []

    # ── 2. Current-window report aggregates ───────────────────────────────
    sql_current = """
        SELECT area_id, disease_name, SUM(count) AS total_count
        FROM   reports
        WHERE  report_type = 'case'
          AND  timestamp   >= ?
    """
    params_current: list = [cutoff]

    if disease_name:
        sql_current += " AND disease_name = ?"
        params_current.append(disease_name.strip().title())

    sql_current += " GROUP BY area_id, disease_name"
    current_rows = fetchall(conn, sql_current, tuple(params_current))

    if not current_rows:
        return []

    # Build lookup: (area_id, disease_name) → case count
    reported_set: set = {(r["area_id"], r["disease_name"]) for r in current_rows}
    case_count_map: dict = {
        (r["area_id"], r["disease_name"]): r["total_count"]
        for r in current_rows
    }

    # ── 3. Prior-window report aggregates (for trend %) ───────────────────
    sql_prior = """
        SELECT area_id, disease_name, SUM(count) AS total_count
        FROM   reports
        WHERE  report_type = 'case'
          AND  timestamp   >= ?
          AND  timestamp   <  ?
    """
    params_prior: list = [prior_cutoff, cutoff]

    if disease_name:
        sql_prior += " AND disease_name = ?"
        params_prior.append(disease_name.strip().title())

    sql_prior += " GROUP BY area_id, disease_name"
    prior_rows = fetchall(conn, sql_prior, tuple(params_prior))
    prior_map: dict = {
        (r["area_id"], r["disease_name"]): r["total_count"]
        for r in prior_rows
    }

    # ── 4. Compute clustering & zone color per (area, disease) pair ────────
    results: List[dict] = []
    processed: set = set()

    for row in current_rows:
        source_id = row["area_id"]
        disease   = row["disease_name"]
        key       = (source_id, disease)

        if key in processed:
            continue
        processed.add(key)

        source = area_map.get(source_id)
        if not source:
            logger.warning("Report references unknown area_id '%s' — skipped.", source_id)
            continue

        # Geographic clustering: count other areas within ZONE_RADIUS_KM
        # that reported the same disease in the same window.
        cluster_count = 0
        nearby_areas: List[dict] = []

        for other_id, other in area_map.items():
            if other_id == source_id:
                continue
            if (other_id, disease) not in reported_set:
                continue
            dist = haversine_distance(
                source["lat"], source["lon"],
                other["lat"], other["lon"],
            )
            if dist <= ZONE_RADIUS_KM:
                cluster_count += 1
                nearby_areas.append({
                    "area_id":    other_id,
                    "area_name":  other["area_name"],
                    "distance_km": round(dist, 2),
                    "case_count": case_count_map.get((other_id, disease), 0),
                })

        case_count_7d = case_count_map[key]
        zone_color    = calculate_zone_color(cluster_count, case_count_7d)

        # Trend percentage vs prior window
        prior_count = prior_map.get(key, 0)
        if prior_count > 0:
            trend_pct = round((case_count_7d - prior_count) / prior_count * 100, 1)
        elif case_count_7d > 0:
            trend_pct = 100.0   # Brand-new disease in this area
        else:
            trend_pct = 0.0

        results.append({
            "area_id":           source_id,
            "area_name":         source["area_name"],
            "lat":               source["lat"],
            "lon":               source["lon"],
            "state":             source["state"],
            "population_density": source["population_density"],
            "disease":           disease,
            "case_count_7d":     case_count_7d,
            "prior_case_count":  prior_count,
            "trend_pct":         trend_pct,
            "cluster_count":     cluster_count,
            "nearby_areas":      nearby_areas,
            "zone_color":        zone_color,
            "risk_level":        COLOR_TO_RISK[zone_color],
        })

    # ── 5. Sort: Red → Yellow → Green; then by descending case count ───────
    order = {"Red": 0, "Yellow": 1, "Green": 2}
    results.sort(key=lambda z: (order[z["zone_color"]], -z["case_count_7d"]))

    return results
