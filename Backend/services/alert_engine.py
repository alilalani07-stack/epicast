"""
alert_engine.py — Alert generation driven by risk_engine output.

Calling ``refresh_alerts(conn, area_risks)`` is the ONLY place alerts are created.
Zones, hotspots, and any other endpoint that triggers alert generation must call
this function with the output of ``compute_area_risks()`` — never roll their own
alert logic.

Alert rules
-----------
Critical  Red zone detected (≥2 cluster OR ≥50 cases in 7d)
High      Yellow zone with ≥50 % spike vs prior window, OR any zone with ≥50 % spike
           and at least 5 cases in current window
Moderate  Yellow zone (cluster or 10+ cases) without a spike

Deduplication
-------------
One active (status ∈ {'new', 'acknowledged'}) alert per (area_id, disease_name)
pair is allowed at a time.  A new alert is only inserted when no active one exists,
preventing alert flooding when the endpoint is called repeatedly.
"""

import logging
import sqlite3
from typing import List

logger = logging.getLogger(__name__)

SPIKE_THRESHOLD_PCT = 50.0   # ≥ 50% week-on-week increase triggers a high alert


def refresh_alerts(conn, area_risks: List[dict]) -> dict:
    """
    Inspect ``area_risks`` (output of ``compute_area_risks()``) and insert
    alerts for any area/disease combination that meets the alert criteria.

    Returns a summary dict: {"alerts_created": int, "skipped_dedup": int}.
    """
    created  = 0
    skipped  = 0

    for risk in area_risks:
        area_id    = risk["area_id"]
        disease    = risk["disease"]
        area_name  = risk["area_name"]
        zone_color = risk["zone_color"]
        cases      = risk["case_count_7d"]
        trend_pct  = risk["trend_pct"]
        nearby     = risk["nearby_areas"]

        # ── Determine whether an alert is warranted ────────────────────────
        should_alert = False
        severity     = "moderate"
        message      = ""

        if zone_color == "Red":
            should_alert = True
            severity     = "critical"
            nearby_str   = (
                ", ".join(a["area_name"] for a in nearby)
                if nearby else "nearby facilities"
            )
            message = (
                f"🔴 Critical: High-risk cluster of '{disease}' confirmed in "
                f"{area_name}. Also reported at: {nearby_str}. "
                f"{cases} cases in the last 7 days. Immediate review recommended."
            )

        elif zone_color == "Yellow" and trend_pct >= SPIKE_THRESHOLD_PCT:
            should_alert = True
            severity     = "high"
            message = (
                f"🟡 High Risk: '{disease}' in {area_name} surged "
                f"{trend_pct:.0f}% week-over-week ({cases} cases in 7 days). "
                "Sustained monitoring recommended."
            )

        elif zone_color == "Yellow":
            should_alert = True
            severity     = "moderate"
            if nearby:
                nearby_str = ", ".join(a["area_name"] for a in nearby)
                message = (
                    f"🟡 Moderate Risk: '{disease}' spreading beyond {area_name} "
                    f"— also reported at {nearby_str}. {cases} cases in 7 days."
                )
            else:
                message = (
                    f"⚠️ Elevated Activity: {cases} '{disease}' cases reported in "
                    f"{area_name} over the last 7 days."
                )

        elif trend_pct >= SPIKE_THRESHOLD_PCT and cases >= 5:
            # Green zone but a spike — flag it
            should_alert = True
            severity     = "high"
            message = (
                f"⚠️ Spike Detected: '{disease}' in {area_name} increased "
                f"{trend_pct:.0f}% compared to the previous week "
                f"({cases} cases in 7 days)."
            )

        if not should_alert:
            continue

        # ── Deduplication: skip if an active alert already exists ──────────
        existing = conn.execute(
            """
            SELECT id FROM alerts
            WHERE  area_id      = ?
              AND  disease_name = ?
              AND  status       IN ('new', 'acknowledged')
            """,
            (area_id, disease),
        ).fetchone()

        if existing:
            skipped += 1
            continue

        # ── Insert ─────────────────────────────────────────────────────────
        try:
            conn.execute(
                "INSERT INTO alerts (area_id, disease_name, message, severity) "
                "VALUES (?, ?, ?, ?)",
                (area_id, disease, message, severity),
            )
            created += 1
            logger.info(
                "Alert created [%s]: %s / %s", severity, area_id, disease
            )
        except sqlite3.IntegrityError:
            skipped += 1

    logger.info(
        "refresh_alerts: %d created, %d skipped (dedup)", created, skipped
    )
    return {"alerts_created": created, "skipped_dedup": skipped}
