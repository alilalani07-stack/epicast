import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from database import get_db, fetchall
from models import AlertResponse, AlertStatusUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/dashboard/alerts", tags=["4. Alerts"])


@router.get("", response_model=dict)
async def get_alerts(
    status: Optional[str] = Query(None, pattern="^(new|acknowledged|resolved)$"),
    disease_name: Optional[str] = Query(None),
    area_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None, pattern="^(critical|high|moderate)$"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """
    List alerts with optional filters and pagination.
    Default: returns all alerts ordered by newest first.
    """
    sql = "SELECT * FROM alerts WHERE 1=1"
    params: list = []

    if status:
        sql += " AND status = ?"
        params.append(status)
    if disease_name:
        sql += " AND disease_name = ?"
        params.append(disease_name.strip().title())
    if area_id:
        sql += " AND area_id = ?"
        params.append(area_id)
    if severity:
        sql += " AND severity = ?"
        params.append(severity)

    count_sql = sql.replace("SELECT *", "SELECT COUNT(*)")
    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params_paginated = params + [limit, offset]

    with get_db() as conn:
        total = conn.execute(count_sql, tuple(params)).fetchone()[0]
        rows = fetchall(conn, sql, tuple(params_paginated))

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "alerts": [dict(r) for r in rows],
    }


@router.patch("/{alert_id}", response_model=AlertResponse)
async def update_alert_status(alert_id: int, payload: AlertStatusUpdate):
    """
    Update an alert's status.
    - `acknowledged` : Responder has seen the alert.
    - `resolved`     : The situation has been handled.
    """
    with get_db() as conn:
        row = conn.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found.")

        conn.execute(
            "UPDATE alerts SET status = ?, updated_at = datetime('now') WHERE id = ?",
            (payload.status, alert_id),
        )
        updated = conn.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,)).fetchone()

    logger.info(f"Alert {alert_id} status updated to '{payload.status}'")
    return dict(updated)


@router.delete("/{alert_id}", status_code=204)
async def delete_alert(alert_id: int):
    """Permanently delete an alert record."""
    with get_db() as conn:
        row = conn.execute("SELECT id FROM alerts WHERE id = ?", (alert_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found.")
        conn.execute("DELETE FROM alerts WHERE id = ?", (alert_id,))

    logger.info(f"Alert {alert_id} deleted.")