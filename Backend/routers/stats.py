import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Query
from database import get_db, fetchall
from models import DashboardStats, DiseaseStats, AreaStatsResponse
from services.risk_engine import compute_area_risks, COLOR_TO_RISK
from services.alert_engine import refresh_alerts

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/dashboard", tags=["6. Stats"])


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    days: int = Query(7, ge=1, le=90, description="Window for 'active' case count"),
):
    """
    Returns top-level dashboard statistics including:
    - Active cases in the last `days` days
    - Total recorded cases and deaths (all time)
    - Total number of report records (case + death)
    - New unacknowledged alert count
    - Active alert count (new + acknowledged)
    - High risk zone count (areas with Red zone color)
    - Per-disease breakdown with Case Fatality Rate (CFR)
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    cutoff_30d     = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    cutoff_60d     = (datetime.now(timezone.utc) - timedelta(days=60)).isoformat()
    cutoff_14d     = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()

    with get_db() as conn:
        total_cases = conn.execute(
            "SELECT COALESCE(SUM(count), 0) FROM reports WHERE report_type = 'case'"
        ).fetchone()[0]

        total_deaths = conn.execute(
            "SELECT COALESCE(SUM(count), 0) FROM reports WHERE report_type = 'death'"
        ).fetchone()[0]

        # Total number of report records (not sum of counts)
        total_report_count = conn.execute(
            "SELECT COUNT(*) FROM reports"
        ).fetchone()[0]

        active_cases = conn.execute(
            "SELECT COALESCE(SUM(count), 0) FROM reports WHERE report_type = 'case' AND timestamp >= ?",
            (cutoff,),
        ).fetchone()[0]

        # ── Deltas ──────────────────────────────────────────────────────────
        # totalReports: reports in last 30d vs previous 30d
        reports_30d = conn.execute(
            "SELECT COUNT(*) FROM reports WHERE timestamp >= ?", (cutoff_30d,)
        ).fetchone()[0]
        reports_prior_30d = conn.execute(
            "SELECT COUNT(*) FROM reports WHERE timestamp >= ? AND timestamp < ?",
            (cutoff_60d, cutoff_30d),
        ).fetchone()[0]
        total_reports_delta = (
            round((reports_30d - reports_prior_30d) / reports_prior_30d * 100, 1)
            if reports_prior_30d > 0 else None
        )

        # activeAlerts: new + acknowledged alerts created in last 7d vs prior 7d
        alerts_7d = conn.execute(
            "SELECT COUNT(*) FROM alerts WHERE created_at >= ?", (cutoff,)
        ).fetchone()[0]
        alerts_prior_7d = conn.execute(
            "SELECT COUNT(*) FROM alerts WHERE created_at >= ? AND created_at < ?",
            (cutoff_14d, cutoff),
        ).fetchone()[0]
        active_alerts_delta = (
            round((alerts_7d - alerts_prior_7d) / alerts_prior_7d * 100, 1)
            if alerts_prior_7d > 0 else None
        )

        # Count of areas that have at least one Red zone, computed via the central risk engine
        area_risks = compute_area_risks(conn, days=days)
        refresh_alerts(conn, area_risks)
        high_risk_zone_count = len(set(r["area_id"] for r in area_risks if r["zone_color"] == "Red"))

        # highRiskZones: compare current Red count to areas with >= 10 prior cases
        area_prior_total = {}
        for r in area_risks:
            area_prior_total[r["area_id"]] = area_prior_total.get(r["area_id"], 0) + r["prior_case_count"]
        prior_elevated = sum(1 for v in area_prior_total.values() if v >= 10)
        high_risk_zones_delta = (
            round((high_risk_zone_count - prior_elevated) / prior_elevated * 100, 1)
            if prior_elevated > 0 else None
        )

        # Only status='new' alerts
        new_alerts = conn.execute(
            "SELECT COUNT(*) FROM alerts WHERE status = 'new'"
        ).fetchone()[0]

        # Active = new + acknowledged (anything not resolved)
        active_alerts = conn.execute(
            "SELECT COUNT(*) FROM alerts WHERE status IN ('new', 'acknowledged')"
        ).fetchone()[0]

        disease_cases = fetchall(
            conn,
            """
            SELECT disease_name, COALESCE(SUM(count), 0) as total
            FROM reports
            WHERE report_type = 'case'
            GROUP BY disease_name
            ORDER BY total DESC
            """,
        )

        disease_deaths = fetchall(
            conn,
            """
            SELECT disease_name, COALESCE(SUM(count), 0) as total
            FROM reports
            WHERE report_type = 'death'
            GROUP BY disease_name
            """,
        )

        disease_active = fetchall(
            conn,
            """
            SELECT disease_name, COALESCE(SUM(count), 0) as total
            FROM reports
            WHERE report_type = 'case' AND timestamp >= ?
            GROUP BY disease_name
            """,
            (cutoff,),
        )

    deaths_map = {r["disease_name"]: r["total"] for r in disease_deaths}
    active_map = {r["disease_name"]: r["total"] for r in disease_active}

    breakdown: List[DiseaseStats] = []
    for r in disease_cases:
        disease = r["disease_name"]
        cases = r["total"]
        deaths = deaths_map.get(disease, 0)
        cfr = round((deaths / cases * 100), 2) if cases > 0 else 0.0
        breakdown.append(
            DiseaseStats(
                disease_name=disease,
                total_cases=cases,
                total_deaths=deaths,
                cfr_percent=cfr,
                active_cases_7d=active_map.get(disease, 0),
            )
        )

    return DashboardStats(
        active_cases_7d=active_cases,
        total_recorded_cases=total_cases,
        total_report_count=total_report_count,
        total_deaths=total_deaths,
        new_alerts=new_alerts,
        active_alerts=active_alerts,
        high_risk_zone_count=high_risk_zone_count,
        total_reports_delta=total_reports_delta,
        active_alerts_delta=active_alerts_delta,
        high_risk_zones_delta=high_risk_zones_delta,
        disease_breakdown=breakdown,
    )


@router.get("/area-stats", response_model=List[AreaStatsResponse])
async def get_area_stats(
    days: int = Query(7, ge=1, le=90, description="Lookback window in days"),
    q: Optional[str] = Query(None, description="Search term for area name or ID"),
):
    """
    Returns summary stats for all areas (or matching search criteria), enriched
    with computed risk data from the central risk engine.

    Guarantees Areas page is 100% in sync with the Dashboard and Zones map.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    with get_db() as conn:
        # Load all areas or filtered
        if q:
            pattern = f"%{q}%"
            areas = fetchall(
                conn,
                "SELECT * FROM areas WHERE area_name LIKE ? OR area_id LIKE ? ORDER BY area_name",
                (pattern, pattern),
            )
        else:
            areas = fetchall(conn, "SELECT * FROM areas ORDER BY area_name")

        # Get central risks
        area_risks = compute_area_risks(conn, days=days)

        # Group risks by area_id
        risks_by_area: dict = {}
        for r in area_risks:
            risks_by_area.setdefault(r["area_id"], []).append(r)

        results = []
        for area in areas:
            area_id = area["area_id"]
            specific_risks = risks_by_area.get(area_id, [])

            # Active alerts count
            active_alerts = conn.execute(
                "SELECT COUNT(*) FROM alerts WHERE area_id = ? AND status IN ('new', 'acknowledged')",
                (area_id,),
            ).fetchone()[0]

            # 7-day death count
            death_count_7d = conn.execute(
                "SELECT COALESCE(SUM(count), 0) FROM reports WHERE area_id = ? AND report_type = 'death' AND timestamp >= ?",
                (area_id, cutoff),
            ).fetchone()[0]

            # Calculate aggregated parameters
            if specific_risks:
                case_count_7d = sum(r["case_count_7d"] for r in specific_risks)
                prior_cases = sum(r["prior_case_count"] for r in specific_risks)

                # Overall trend
                if prior_cases > 0:
                    trend_pct = round((case_count_7d - prior_cases) / prior_cases * 100, 1)
                elif case_count_7d > 0:
                    trend_pct = 100.0
                else:
                    trend_pct = 0.0

                # Worst color determines risk
                color_order = {"Red": 0, "Yellow": 1, "Green": 2}
                sorted_by_color = sorted(specific_risks, key=lambda x: color_order.get(x["zone_color"], 2))
                zone_color = sorted_by_color[0]["zone_color"]
                risk_level = COLOR_TO_RISK[zone_color]
                diseases = [r["disease"] for r in specific_risks]
            else:
                case_count_7d = 0
                trend_pct = 0.0
                zone_color = "Green"
                risk_level = "low"
                diseases = []

            results.append(
                AreaStatsResponse(
                    area_id=area_id,
                    area_name=area["area_name"],
                    lat=area["lat"],
                    lon=area["lon"],
                    state=area["state"],
                    population_density=area["population_density"],
                    case_count_7d=case_count_7d,
                    death_count_7d=death_count_7d,
                    active_alerts=active_alerts,
                    risk_level=risk_level,
                    zone_color=zone_color,
                    trend_pct=trend_pct,
                    diseases=diseases,
                )
            )

    return results


@router.get("/filters")
async def get_filter_options():
    """Return all distinct disease names and area IDs for frontend filter dropdowns."""
    with get_db() as conn:
        diseases = conn.execute(
            "SELECT DISTINCT disease_name FROM reports ORDER BY disease_name"
        ).fetchall()
        areas = conn.execute(
            "SELECT area_id, area_name FROM areas ORDER BY area_name"
        ).fetchall()

    return {
        "diseases": [d[0] for d in diseases],
        "areas": [{"area_id": r["area_id"], "area_name": r["area_name"]} for r in areas],
    }

