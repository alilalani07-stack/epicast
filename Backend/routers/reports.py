import logging
import random
import math
import os
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.security import HTTPAuthorizationCredentials
from database import get_db, area_exists, fetchall
from models import CaseReport, DeathReport, ReportResponse
from auth import verify_token
from limiter import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["2. Reporting"])

#Core endpoints for submitting case and death reports, with validation and logging

@router.post("/case", response_model=ReportResponse, status_code=202)
@limiter.limit("60/minute")
async def report_case(request: Request, payload: CaseReport, token_data: dict = Depends(verify_token)):
    """
    Submit a new disease case report for a registered area.
    - area_id must exist in the areas table.
    - disease_name is normalised to Title Case automatically.
    - count must be > 0.
    """
    payload.clinic_id = token_data.get("uid")
    with get_db() as conn:
        if not area_exists(conn, payload.area_id):
            raise HTTPException(
                status_code=404,
                detail=f"Area '{payload.area_id}' is not registered. Register it first via POST /areas."
            )
        timestamp = datetime.now(timezone.utc).isoformat()
        cursor = conn.execute(
            "INSERT INTO reports (report_type, area_id, disease_name, count, timestamp, clinic_id, notes, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            ("case", payload.area_id, payload.disease_name, payload.case_count, timestamp, payload.clinic_id, payload.notes, payload.lat, payload.lng),
        )
        report_id = cursor.lastrowid

    logger.info(f"Case report #{report_id}: {payload.case_count}x {payload.disease_name} @ {payload.area_id}")
    return {"message": "Case report saved.", "report_id": report_id}


@router.post("/death", response_model=ReportResponse, status_code=202)
@limiter.limit("60/minute")
async def report_death(request: Request, payload: DeathReport, token_data: dict = Depends(verify_token)):
    """
    Submit a death count report for a registered area.
    - area_id must exist in the areas table.
    - death_count must be > 0.
    """
    payload.clinic_id = token_data.get("uid")
    with get_db() as conn:
        if not area_exists(conn, payload.area_id):
            raise HTTPException(
                status_code=404,
                detail=f"Area '{payload.area_id}' is not registered. Register it first via POST /areas."
            )
        timestamp = datetime.now(timezone.utc).isoformat()
        cursor = conn.execute(
            "INSERT INTO reports (report_type, area_id, disease_name, count, timestamp, clinic_id, notes, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            ("death", payload.area_id, payload.disease_name, payload.death_count, timestamp, payload.clinic_id, payload.notes, payload.lat, payload.lng),
        )
        report_id = cursor.lastrowid

    logger.info(f"Death report #{report_id}: {payload.death_count}x {payload.disease_name} @ {payload.area_id}")
    return {"message": "Death report saved.", "report_id": report_id}

#Query endpoint for listing reports with optional filters and pagination

@router.get("")
async def list_reports(
    area_id: Optional[str] = Query(None),
    disease_name: Optional[str] = Query(None),
    report_type: Optional[str] = Query(None, pattern="^(case|death)$"),
    clinic_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    """
    List reports with optional filters.
    Supports pagination via `limit` and `offset`.
    """
    sql = "SELECT * FROM reports WHERE 1=1"
    params: list = []

    if area_id:
        sql += " AND area_id = ?"
        params.append(area_id)
    if disease_name:
        sql += " AND disease_name = ?"
        params.append(disease_name.strip().title())
    if report_type:
        sql += " AND report_type = ?"
        params.append(report_type)
    if clinic_id:
        sql += " AND clinic_id = ?"
        params.append(clinic_id)

    count_sql = sql.replace("SELECT *", "SELECT COUNT(*)")
    count_params = list(params)

    sql += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    with get_db() as conn:
        total = conn.execute(count_sql, tuple(count_params)).fetchone()[0]
        rows = fetchall(conn, sql, tuple(params))

    return {"total": total, "reports": [dict(r) for r in rows]}


@router.post("/seed", status_code=201, tags=["Dev / Seed"])
async def seed_demo_data(
    days_back: int = Query(14, ge=1, le=90),
    token_data: dict = Depends(verify_token),
):
    """
    DEV ONLY — Seeds realistic-looking demo data across all registered areas
    using proper historical timestamps spread over the last `days_back` days.

    Requires: ENV != production AND authority role.
    Safe to call multiple times (adds new records each time).
    """
    if os.environ.get("ENV") == "production":
        raise HTTPException(status_code=403, detail="Not available in production")
    if token_data.get("role") not in ("authority", "admin"):
        raise HTTPException(status_code=403, detail="Authority role required.")

    diseases = ["Dengue", "Malaria", "Cholera", "Influenza"]

    with get_db() as conn:
        areas = fetchall(conn, "SELECT area_id FROM areas")
        if not areas:
            raise HTTPException(
                status_code=400,
                detail="No areas registered. Register at least one area before seeding."
            )

        inserted = 0
        now = datetime.now(timezone.utc)

        for area_row in areas:
            area_id = area_row["area_id"]
            for disease in diseases:
                base_cases = random.randint(2, 15)
                for day_offset in range(days_back, 0, -1):
                    # Simple sine-wave-like pattern: low → high → lower
                    progress = 1 - (day_offset / days_back)
                    multiplier = math.sin(progress * math.pi) + 0.2
                    daily_cases = max(1, int(base_cases * multiplier * random.uniform(0.7, 1.3)))

                    ts = (now - timedelta(days=day_offset)).replace(
                        hour=random.randint(8, 18),
                        minute=random.randint(0, 59),
                        second=0,
                        microsecond=0,
                    ).isoformat()

                    conn.execute(
                        "INSERT INTO reports (report_type, area_id, disease_name, count, timestamp) VALUES (?, ?, ?, ?, ?)",
                        ("case", area_id, disease, daily_cases, ts),
                    )
                    inserted += 1

                # Seed a small number of deaths (CFR ~2-5%)
                total_cases = sum(
                    max(1, int((base_cases * (math.sin((1 - d / days_back) * math.pi) + 0.2)) * 0.9))
                    for d in range(days_back, 0, -1)
                )
                deaths = max(0, int(total_cases * random.uniform(0.02, 0.05)))
                if deaths > 0:
                    ts = (now - timedelta(days=random.randint(1, days_back))).isoformat()
                    conn.execute(
                        "INSERT INTO reports (report_type, area_id, disease_name, count, timestamp) VALUES (?, ?, ?, ?, ?)",
                        ("death", area_id, disease, deaths, ts),
                    )
                    inserted += 1

    logger.info(f"Seed complete: {inserted} records inserted across {len(areas)} area(s).")
    return {"message": f"Seeded {inserted} records across {len(areas)} area(s) over {days_back} days."}


@router.delete("/reset", status_code=200, tags=["Dev / Seed"])
async def reset_all_data(
    token_data: dict = Depends(verify_token),
):
    """
    DEV ONLY — Wipes all reports and alerts. Areas are preserved.
    Use before re-seeding for a clean demo state.

    Requires: ENV != production AND authority role.
    """
    if os.environ.get("ENV") == "production":
        raise HTTPException(status_code=403, detail="Not available in production")
    if token_data.get("role") not in ("authority", "admin"):
        raise HTTPException(status_code=403, detail="Authority role required.")

    with get_db() as conn:
        conn.execute("DELETE FROM reports")
        conn.execute("DELETE FROM alerts")
    logger.warning("All reports and alerts have been wiped (reset endpoint called).")
    return {"message": "All reports and alerts deleted. Areas preserved."}