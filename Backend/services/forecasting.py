import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from typing import Literal


FORECAST_DAYS = 7
STABLE_THRESHOLD_PCT = 10.0   # ±10 % = Stable

#Internal helpers

def _weighted_moving_average(series: np.ndarray, window: int = 7) -> np.ndarray:
    """Linearly weighted moving average — recent values weighted higher."""
    weights = np.arange(1, window + 1, dtype=float)
    result = []
    for i in range(len(series)):
        start = max(0, i - window + 1)
        chunk = series[start : i + 1]
        w = weights[-len(chunk):]
        result.append(np.dot(chunk, w) / w.sum())
    return np.array(result)


def _linear_regression_forecast(y: np.ndarray, horizon: int) -> np.ndarray:
    X = np.arange(len(y)).reshape(-1, 1)
    model = LinearRegression()
    model.fit(X, y)
    future_X = np.arange(len(y), len(y) + horizon).reshape(-1, 1)
    return np.maximum(0, model.predict(future_X))


def _compute_trend(
    daily: pd.Series,
) -> tuple[Literal["Rising", "Stable", "Declining"], float]:
    """
    Compare the last 7 days vs the 7 days before that.
    Returns (trend_label, pct_change).
    """
    if len(daily) < 2:
        return "Stable", 0.0

    last_7 = daily.iloc[-7:].sum() if len(daily) >= 7 else daily.sum()
    prev_7 = daily.iloc[-14:-7].sum() if len(daily) >= 14 else daily.iloc[: len(daily) // 2].sum()

    if prev_7 == 0:
        # Can't compute % change from zero baseline
        return ("Rising" if last_7 > 0 else "Stable"), 0.0

    pct_change = ((last_7 - prev_7) / prev_7) * 100.0

    if pct_change > STABLE_THRESHOLD_PCT:
        trend = "Rising"
    elif pct_change < -STABLE_THRESHOLD_PCT:
        trend = "Declining"
    else:
        trend = "Stable"

    return trend, round(pct_change, 2)

#Public API

def build_forecast(df: pd.DataFrame) -> dict:
    """
    Given a DataFrame with columns [timestamp, count], return a forecast dict.

    Returns:
        {
            historical_labels, historical_data,
            forecast_labels, forecast_data,
            trend, trend_percent_change, model_used
        }
    Raises:
        ValueError if not enough data.
    """
    if df.empty:
        raise ValueError("No historical data available.")

    df = df.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"], format="ISO8601")
    daily: pd.Series = (
        df.set_index("timestamp")
        .resample("D")["count"]
        .sum()
        .fillna(0)
    )

    n_days = len(daily)
    if n_days < 2:
        if n_days == 1:
            prev_date = daily.index[0] - pd.Timedelta(days=1)
            daily = pd.concat([pd.Series([0.0], index=[prev_date]), daily])
            n_days = len(daily)
        else:
            raise ValueError("At least 2 days of data are required for forecasting.")

    y = daily.values.astype(float)

    # --- Choose model ---
    if n_days >= 14:
        smoothed = _weighted_moving_average(y, window=7)
        # Project forward: use slope of last 7 smoothed values
        slope = np.polyfit(np.arange(7), smoothed[-7:], 1)[0]
        last_val = smoothed[-1]
        raw_forecast = np.array([last_val + slope * (i + 1) for i in range(FORECAST_DAYS)])
        model_used = "Weighted Moving Average"

    elif n_days >= 7:
        window = min(7, n_days)
        avg = y[-window:].mean()
        slope = np.polyfit(np.arange(window), y[-window:], 1)[0]
        raw_forecast = np.array([avg + slope * (i + 1) for i in range(FORECAST_DAYS)])
        model_used = "Simple Moving Average"

    else:
        raw_forecast = _linear_regression_forecast(y, FORECAST_DAYS)
        model_used = "Linear Regression (limited data)"

    forecast_values = np.maximum(0, raw_forecast).round().astype(int)

    # --- Trend ---
    trend, pct_change = _compute_trend(daily)

    # --- Labels ---
    historical_labels = daily.index.strftime("%Y-%m-%d").tolist()
    forecast_start = daily.index.max() + pd.Timedelta(days=1)
    forecast_labels = (
        pd.date_range(start=forecast_start, periods=FORECAST_DAYS)
        .strftime("%Y-%m-%d")
        .tolist()
    )

    return {
        "historical_labels": historical_labels,
        "historical_data": y.tolist(),
        "forecast_labels": forecast_labels,
        "forecast_data": forecast_values.tolist(),
        "trend": trend,
        "trend_percent_change": pct_change,
        "model_used": model_used,
    }


def build_trend_summary(disease_name: str, daily: pd.Series) -> dict:
    """
    Build a lightweight trend summary without a full forecast.
    Used by GET /dashboard/trends/{disease_name}.
    """
    current_week = int(daily.iloc[-7:].sum()) if len(daily) >= 7 else int(daily.sum())
    previous_week = int(daily.iloc[-14:-7].sum()) if len(daily) >= 14 else 0

    trend, pct_change = _compute_trend(daily)

    if trend == "Rising":
        summary = f"'{disease_name}' cases have increased by {abs(pct_change):.1f}% over the past week. Heightened monitoring recommended."
    elif trend == "Declining":
        summary = f"'{disease_name}' cases have decreased by {abs(pct_change):.1f}% over the past week. Continue surveillance."
    else:
        summary = f"'{disease_name}' case counts are stable (±{abs(pct_change):.1f}%) over the past week."

    return {
        "disease_name": disease_name,
        "trend": trend,
        "percent_change_7d": pct_change,
        "current_week_cases": current_week,
        "previous_week_cases": previous_week,
        "summary": summary,
    }