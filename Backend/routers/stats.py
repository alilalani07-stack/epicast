import logging
from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import APIRouter, Query
from database import get_db, fetchall
from models import DashboardStats, DiseaseStats

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
    - New unacknowledged alert count
    - Per-disease breakdown with Case Fatality Rate (CFR)
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    with get_db() as conn:

        total_cases = conn.execute(
            "SELECT COALESCE(SUM(count), 0) FROM reports WHERE report_type = 'case'"
        ).fetchone()[0]

        total_deaths = conn.execute(
            "SELECT COALESCE(SUM(count), 0) FROM reports WHERE report_type = 'death'"
        ).fetchone()[0]

        new_alerts = conn.execute(
            "SELECT COUNT(*) FROM alerts WHERE status = 'new'"
        ).fetchone()[0]

        active_cases = conn.execute(
            "SELECT COALESCE(SUM(count), 0) FROM reports WHERE report_type = 'case' AND timestamp >= ?",
            (cutoff,),
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
        total_deaths=total_deaths,
        new_alerts=new_alerts,
        disease_breakdown=breakdown,
    )


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