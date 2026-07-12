import logging
import random
import math
import os
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from database import get_db, area_exists, fetchall
from models import CaseReport, DeathReport, ReportResponse
from auth import verify_token
from limiter import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["2. Reporting"])


def _extract_clinic_id(token_data: dict) -> str:
    """Extract UID from Firebase/Auth0/custom JWT claims."""
    uid = (
        token_data.get("sub")           # Firebase standard claim
        or token_data.get("user_id")
        or token_data.get("uid")
        or token_data.get("id")
    )
    if uid:
        logger.info(f"[AUTH] Extracted clinic_id: {uid}")
        return str(uid)

    logger.error(f"[AUTH] CRITICAL: No UID in token. Keys: {list(token_data.keys())}")
    raise HTTPException(status_code=500, detail="Auth token missing user ID")


def _extract_clinic_name(token_data: dict) -> str:
    """Extract a human-readable clinic/facility name from the JWT claims.

    Tries common claim names used by Firebase, Auth0, and custom providers.
    Falls back to the email's local-part, then to the uid, then to None.
    """
    name = (
        token_data.get("name")
        or token_data.get("displayName")
        or token_data.get("display_name")
        or token_data.get("nickname")
    )
    if name:
        return str(name)
    email = token_data.get("email", "")
    if email and "@" in email:
        return email.split("@")[0]
    uid = _extract_clinic_id(token_data)
    return str(uid)[:12] if uid else None


@router.post("/case", response_model=ReportResponse, status_code=202)
@limiter.limit("60/minute")
async def report_case(request: Request, payload: CaseReport, token_data: dict = Depends(verify_token)):
    uid = _extract_clinic_id(token_data)
    clinic_name = _extract_clinic_name(token_data)
    payload.clinic_id = uid
    with get_db() as conn:
        if not area_exists(conn, payload.area_id):
            raise HTTPException(status_code=404, detail=f"Area '{payload.area_id}' not registered.")
        ts = datetime.now(timezone.utc).isoformat()
        cursor = conn.execute(
            "INSERT INTO reports (report_type, area_id, disease_name, count, timestamp, clinic_id, clinic_name, notes, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            ("case", payload.area_id, payload.disease_name.title(), payload.case_count, ts, uid, clinic_name, payload.notes, payload.lat, payload.lng)
        )
    logger.info(f"Case report #{cursor.lastrowid}: {payload.case_count}x {payload.disease_name} @ {payload.area_id} (clinic={uid})")
    return {"message": "Case report saved.", "report_id": cursor.lastrowid}


@router.post("/death", response_model=ReportResponse, status_code=202)
@limiter.limit("60/minute")
async def report_death(request: Request, payload: DeathReport, token_data: dict = Depends(verify_token)):
    uid = _extract_clinic_id(token_data)
    clinic_name = _extract_clinic_name(token_data)
    payload.clinic_id = uid
    with get_db() as conn:
        if not area_exists(conn, payload.area_id):
            raise HTTPException(status_code=404, detail=f"Area '{payload.area_id}' not registered.")
        ts = datetime.now(timezone.utc).isoformat()
        cursor = conn.execute(
            "INSERT INTO reports (report_type, area_id, disease_name, count, timestamp, clinic_id, clinic_name, notes, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            ("death", payload.area_id, payload.disease_name.title(), payload.death_count, ts, uid, clinic_name, payload.notes, payload.lat, payload.lng)
        )
    logger.info(f"Death report #{cursor.lastrowid}: {payload.death_count}x {payload.disease_name} @ {payload.area_id} (clinic={uid})")
    return {"message": "Death report saved.", "report_id": cursor.lastrowid}


def _build_where(
    *,
    area_id: Optional[str],
    disease_name: Optional[str],
    report_type: Optional[str],
    clinic_id: Optional[str],
    from_date: Optional[str],
    to_date: Optional[str],
    q: Optional[str],
):
    """
    Shared WHERE-clause builder used by both list_reports and get_reports_stats.
    Returns (sql_fragment, params_list).
    """
    sql = "WHERE 1=1"
    params: list = []
    if area_id:
        sql += " AND area_id = ?"; params.append(area_id)
    if disease_name:
        sql += " AND disease_name = ?"; params.append(disease_name.strip().title())
    if report_type:
        sql += " AND report_type = ?"; params.append(report_type)
    if clinic_id:
        sql += " AND clinic_id = ?"; params.append(clinic_id)
    if from_date:
        sql += " AND timestamp >= ?"; params.append(f"{from_date}T00:00:00+00:00")
    if to_date:
        sql += " AND timestamp <= ?"; params.append(f"{to_date}T23:59:59+00:00")
    if q:
        pattern = f"%{q.strip()}%"
        sql += " AND (disease_name LIKE ? OR area_id LIKE ? OR clinic_id LIKE ? OR CAST(id AS TEXT) LIKE ?)"
        params.extend([pattern, pattern, pattern, pattern])
    return sql, params


@router.get("")
async def list_reports(
    area_id: Optional[str] = Query(None),
    disease_name: Optional[str] = Query(None),
    report_type: Optional[str] = Query(None, pattern="^(case|death)$"),
    clinic_id: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    where, params = _build_where(
        area_id=area_id, disease_name=disease_name, report_type=report_type,
        clinic_id=clinic_id, from_date=from_date, to_date=to_date, q=q,
    )
    with get_db() as conn:
        total = conn.execute(f"SELECT COUNT(*) FROM reports {where}", params).fetchone()[0]
        rows = fetchall(conn, f"SELECT * FROM reports {where} ORDER BY timestamp DESC LIMIT ? OFFSET ?",
                        params + [limit, offset])
    return {"total": total, "reports": [dict(r) for r in rows]}


@router.get("/stats")
async def get_reports_stats(
    area_id: Optional[str] = Query(None),
    disease_name: Optional[str] = Query(None),
    report_type: Optional[str] = Query(None, pattern="^(case|death)$"),
    clinic_id: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
):
    """
    Server-side aggregated totals scoped by any combination of filters.

    Use this for KPI cards and tab header counts — never sum a possibly-
    truncated paginated row list on the client.

    Returns:
        total_reports  — number of report *records* matching the filter
        total_cases    — SUM(count) where report_type = 'case' (within filter)
        total_deaths   — SUM(count) where report_type = 'death' (within filter)
    """
    where, params = _build_where(
        area_id=area_id, disease_name=disease_name, report_type=report_type,
        clinic_id=clinic_id, from_date=from_date, to_date=to_date, q=q,
    )

    # For aggregate sums we always scan both types, regardless of report_type filter,
    # so the caller gets all three numbers in one round-trip unless they explicitly
    # pass report_type (in which case we scope to that type for the row count too).
    where_cases  = where  + (" AND report_type = 'case'"  if not report_type else "")
    where_deaths = where  + (" AND report_type = 'death'" if not report_type else "")

    with get_db() as conn:
        total_reports = conn.execute(f"SELECT COUNT(*) FROM reports {where}",        params).fetchone()[0]
        total_cases   = conn.execute(f"SELECT COALESCE(SUM(count),0) FROM reports {where_cases}",  params).fetchone()[0]
        total_deaths  = conn.execute(f"SELECT COALESCE(SUM(count),0) FROM reports {where_deaths}", params).fetchone()[0]

    return {
        "total_reports": total_reports,
        "total_cases":   total_cases,
        "total_deaths":  total_deaths,
    }


@router.get("/clinics")
async def list_clinics():
    """
    Returns a list of distinct (clinic_id, clinic_name) pairs from the
    reports table, which the frontend uses to resolve raw UIDs into
    human-readable clinic names in ReportsTable.
    """
    with get_db() as conn:
        rows = fetchall(
            conn,
            """
            SELECT clinic_id, clinic_name
            FROM reports
            WHERE clinic_id IS NOT NULL AND clinic_id != ''
            GROUP BY clinic_id
            ORDER BY clinic_name ASC
            """,
        )
    return {
        "clinics": [
            {"clinic_id": r["clinic_id"], "clinic_name": r["clinic_name"] or r["clinic_id"][:12]}
            for r in rows
        ]
    }


@router.post("/seed", status_code=201, tags=["Dev / Seed"])
async def seed_demo_data(days_back: int = Query(14, ge=1, le=90), token_data: dict = Depends(verify_token)):
    if os.environ.get("ENV") == "production": raise HTTPException(status_code=403, detail="Not available in production")
    if token_data.get("role") not in ("authority", "admin"): raise HTTPException(status_code=403, detail="Authority role required.")
    diseases = ["Dengue", "Malaria", "Cholera", "Influenza"]
    with get_db() as conn:
        areas = fetchall(conn, "SELECT area_id FROM areas")
        if not areas: raise HTTPException(status_code=400, detail="No areas registered.")
        inserted = 0; now = datetime.now(timezone.utc)
        for area_row in areas:
            area_id = area_row["area_id"]
            for disease in diseases:
                base_cases = random.randint(2, 15)
                for day_offset in range(days_back, 0, -1):
                    progress = 1 - (day_offset / days_back)
                    multiplier = math.sin(progress * math.pi) + 0.2
                    daily_cases = max(1, int(base_cases * multiplier * random.uniform(0.7, 1.3)))
                    ts = (now - timedelta(days=day_offset)).replace(hour=random.randint(8,18), minute=random.randint(0,59), second=0, microsecond=0).isoformat()
                    conn.execute("INSERT INTO reports (report_type, area_id, disease_name, count, timestamp, clinic_id, clinic_name, notes, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        ("case", area_id, disease, daily_cases, ts, None, None, None, None, None))
                    inserted += 1
                total_cases = sum(max(1, int((base_cases * (math.sin((1 - d / days_back) * math.pi) + 0.2)) * 0.9)) for d in range(days_back, 0, -1))
                deaths = max(0, int(total_cases * random.uniform(0.02, 0.05)))
                if deaths > 0:
                    ts = (now - timedelta(days=random.randint(1, days_back))).isoformat()
                    conn.execute("INSERT INTO reports (report_type, area_id, disease_name, count, timestamp, clinic_id, clinic_name, notes, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        ("death", area_id, disease, deaths, ts, None, None, None, None, None))
                    inserted += 1
    return {"message": f"Seeded {inserted} records across {len(areas)} area(s) over {days_back} days."}


@router.delete("/reset", status_code=200, tags=["Dev / Seed"])
async def reset_all_data(token_data: dict = Depends(verify_token)):
    if os.environ.get("ENV") == "production": raise HTTPException(status_code=403, detail="Not available in production")
    if token_data.get("role") not in ("authority", "admin"): raise HTTPException(status_code=403, detail="Authority role required.")
    with get_db() as conn:
        conn.execute("DELETE FROM reports")
        conn.execute("DELETE FROM alerts")
    return {"message": "All reports and alerts deleted. Areas preserved."}