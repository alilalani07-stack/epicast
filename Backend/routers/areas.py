import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from database import get_db, area_exists, fetchall
from models import AreaRegister, AreaResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/areas", tags=["1. Areas"])


@router.post("", response_model=AreaResponse, status_code=201)
async def register_area(payload: AreaRegister):
    """
    Register a new reporting area (clinic, hospital, lab, or field post).
    `area_id` must be unique across the system.
    """
    with get_db() as conn:
        if area_exists(conn, payload.area_id):
            raise HTTPException(
                status_code=409,
                detail=f"Area with id '{payload.area_id}' already exists."
            )

        cursor = conn.execute(
            """
            INSERT INTO areas (area_id, area_name, facility_type, lat, lon, population_density, state)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.area_id,
                payload.area_name,
                payload.facility_type,
                payload.lat,
                payload.lon,
                payload.population_density,
                payload.state,
            ),
        )
        new_id = cursor.lastrowid
        row = conn.execute("SELECT * FROM areas WHERE id = ?", (new_id,)).fetchone()

    logger.info(f"New area registered: {payload.area_id} ({payload.area_name})")
    return dict(row)


@router.get("", response_model=List[AreaResponse])
async def list_areas(q: Optional[str] = Query(None, description="Search by area name or area_id")):
    """Return all registered reporting areas, ordered by name. Optionally filter by name/id."""
    with get_db() as conn:
        if q:
            pattern = f"%{q}%"
            rows = fetchall(
                conn,
                "SELECT * FROM areas WHERE area_name LIKE ? OR area_id LIKE ? ORDER BY area_name",
                (pattern, pattern),
            )
        else:
            rows = fetchall(conn, "SELECT * FROM areas ORDER BY area_name")
    return [dict(r) for r in rows]


@router.get("/{area_id}", response_model=AreaResponse)
async def get_area(area_id: str):
    """Return details for a single area by its area_id."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM areas WHERE area_id = ?", (area_id,)
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail=f"Area '{area_id}' not found.")

    return dict(row)


@router.delete("/{area_id}", status_code=204)
async def delete_area(area_id: str):
    """
    Remove an area from the registry.
    Note: associated reports and alerts are NOT deleted (audit trail preserved).
    """
    with get_db() as conn:
        if not area_exists(conn, area_id):
            raise HTTPException(status_code=404, detail=f"Area '{area_id}' not found.")
        conn.execute("DELETE FROM areas WHERE area_id = ?", (area_id,))

    logger.info(f"Area deleted: {area_id}")