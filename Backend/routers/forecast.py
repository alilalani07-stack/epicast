import logging
from typing import List, Optional

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from database import get_db
from models import ForecastResponse, TrendResponse
from services.forecasting import build_forecast, build_trend_summary

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/dashboard", tags=["5. Forecasting"])


@router.get("/forecast/{disease_name}", response_model=ForecastResponse)
async def get_disease_forecast(
    disease_name: str,
    area_id: Optional[str] = Query(None, description="Scope forecast to a single area"),
):
    """
    7-day forward forecast for a given disease.

    Model selection is automatic based on available data:
    - >=14 days -> Weighted Moving Average (best)
    - 7-13 days -> Simple Moving Average
    - 2-6 days -> Linear Regression (fallback, less reliable)

    Also returns trend (Rising / Stable / Declining) with % change.
    """
    disease_name = disease_name.strip().title()

    sql = "SELECT timestamp, count FROM reports WHERE report_type = 'case' AND disease_name = ?"
    params: list = [disease_name]

    if area_id:
        sql += " AND area_id = ?"
        params.append(area_id)

    sql += " ORDER BY timestamp"

    with get_db() as conn:
        df = pd.read_sql_query(sql, conn, params=params)

    if df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No forecast available for '{disease_name}'.",
        )

    try:
        result = build_forecast(df)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return {"disease_name": disease_name, **result}


@router.get("/trends/{disease_name}", response_model=TrendResponse)
async def get_disease_trend(
    disease_name: str,
    area_id: Optional[str] = Query(None),
):
    """
    Lightweight trend snapshot for a disease - no forecast, just:
    - Rising / Stable / Declining label
    - % change (current 7 days vs prior 7 days)
    - Human-readable summary sentence
    """
    disease_name = disease_name.strip().title()

    sql = "SELECT timestamp, count FROM reports WHERE report_type = 'case' AND disease_name = ?"
    params: list = [disease_name]

    if area_id:
        sql += " AND area_id = ?"
        params.append(area_id)

    with get_db() as conn:
        df = pd.read_sql_query(sql, conn, params=params)

    if df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No data found for '{disease_name}'.",
        )

    df["timestamp"] = pd.to_datetime(df["timestamp"], format="ISO8601")
    daily = df.set_index("timestamp").resample("D")["count"].sum().fillna(0)

    return build_trend_summary(disease_name, daily)


@router.get("/trends", response_model=List[TrendResponse])
async def get_all_trends():
    """
    Return trend snapshots for every disease that has data.
    Useful for a dashboard overview.
    """
    with get_db() as conn:
        diseases_rows = conn.execute(
            "SELECT DISTINCT disease_name FROM reports WHERE report_type = 'case' ORDER BY disease_name"
        ).fetchall()
        df_all = pd.read_sql_query(
            "SELECT timestamp, disease_name, count FROM reports WHERE report_type = 'case'",
            conn,
        )

    if df_all.empty:
        return []

    df_all["timestamp"] = pd.to_datetime(df_all["timestamp"], format="ISO8601")
    results = []

    for row in diseases_rows:
        disease = row[0]
        df_disease = df_all[df_all["disease_name"] == disease]
        daily = df_disease.set_index("timestamp").resample("D")["count"].sum().fillna(0)
        results.append(build_trend_summary(disease, daily))

    order = {"Rising": 0, "Stable": 1, "Declining": 2}
    results.sort(key=lambda r: order[r["trend"]])

    return results
