"""Deterministic, explainable scoring engine for NyayaFlow AI.

Provides administrative review priority indicators based on:
1. Total case age (calendar days since filing)
2. Days lingering at current procedural stage vs standard benchmarks
3. Documented procedural deadlines (if supplied; never invented)
4. Missing administrative documentation / data quality flags

IMPORTANT: This score is strictly an administrative review indicator to help registry
clerks and court administrators manage procedural backlogs. It does NOT evaluate legal merits,
determine guilt, replace judicial judgment, or suggest substantive outcomes.
"""

from datetime import datetime, date
from typing import Dict, Any, Optional
from app.config import STAGE_BENCHMARKS

DEFAULT_WEIGHTS = {
    "age_weight": 30.0,
    "stage_weight": 35.0,
    "deadline_weight": 20.0,
    "data_quality_weight": 15.0,
}

RULE_VERSION = "v1.2-administrative-default"
DISCLAIMER_TEXT = (
    "ADMINISTRATIVE REVIEW INDICATOR ONLY: This score measures administrative delay indicators "
    "(case age, stage duration vs benchmarks, missing registry documents, and documented deadlines). "
    "It is NOT a legal determination of urgency, does not evaluate legal merits, and must never replace judicial discretion."
)


def parse_date(date_str: Optional[str]) -> Optional[date]:
    """Safely parse ISO YYYY-MM-DD date."""
    if not date_str or not isinstance(date_str, str):
        return None
    try:
        return datetime.strptime(date_str.strip()[:10], "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def calculate_priority_score(
    filing_date_str: str,
    current_stage: str,
    days_at_stage: int,
    missing_information: Optional[str] = None,
    documented_deadline_str: Optional[str] = None,
    reference_date_str: Optional[str] = "2026-10-25",
    weights: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    """
    Deterministically compute the administrative review priority score.
    Returns:
        {
            "score": float (0.0 to 100.0),
            "priority_level": str ("High", "Moderate", "Routine", "Normal"),
            "factor_breakdown": {
                "age_factor": {...},
                "stage_delay_factor": {...},
                "deadline_factor": {...},
                "data_quality_factor": {...}
            },
            "rule_version": str,
            "disclaimer": str,
            "warnings": list[str]
        }
    """
    w = dict(DEFAULT_WEIGHTS)
    if weights:
        w.update(weights)

    warnings = []
    ref_date = parse_date(reference_date_str) or date(2026, 10, 25)

    # 1. Total Case Age Factor
    f_date = parse_date(filing_date_str)
    if f_date is None:
        age_days = 0
        warnings.append("Invalid or missing filing date; age factor set to 0.")
    else:
        raw_age = (ref_date - f_date).days
        # Edge case: future filing date
        if raw_age < 0:
            age_days = 0
            warnings.append(f"Filing date ({filing_date_str}) is in the future; clamped to 0 days.")
        else:
            age_days = raw_age

    # Age points: benchmark 3 years (1095 days) for full weight
    age_ratio = min(max(age_days / 1095.0, 0.0), 1.0)
    age_points = round(age_ratio * w["age_weight"], 2)

    # 2. Stage Inactivity / Delay Factor
    safe_days_at_stage = max(0, int(days_at_stage or 0))
    if days_at_stage is not None and days_at_stage < 0:
        warnings.append(f"Negative days_at_stage ({days_at_stage}) provided; clamped to 0.")

    benchmark_days = STAGE_BENCHMARKS.get(current_stage, 30)
    if safe_days_at_stage <= benchmark_days:
        # Within benchmark: max 40% of stage weight
        stage_ratio = (safe_days_at_stage / max(benchmark_days, 1)) * 0.40
        stage_status = "Within procedural benchmark"
    else:
        # Exceeded benchmark: points scale up to 100%
        excess_days = safe_days_at_stage - benchmark_days
        # Full points reached if excess reaches 2.5x the benchmark
        excess_ratio = min(excess_days / (benchmark_days * 2.5), 1.0)
        stage_ratio = 0.40 + (excess_ratio * 0.60)
        stage_status = f"Exceeded benchmark by {excess_days} days (Benchmark: {benchmark_days}d, Actual: {safe_days_at_stage}d)"

    stage_points = round(min(stage_ratio, 1.0) * w["stage_weight"], 2)

    # 3. Documented Procedural Deadline Factor
    d_date = parse_date(documented_deadline_str)
    if d_date is None:
        deadline_points = 0.0
        deadline_status = "No Documented Deadline"
        deadline_detail = "No statutory or administrative deadline recorded. Neutral calculation (0 points added)."
    else:
        days_until_deadline = (d_date - ref_date).days
        if days_until_deadline < 0:
            overdue_days = abs(days_until_deadline)
            deadline_points = round(w["deadline_weight"], 2)
            deadline_status = f"Deadline Overdue ({overdue_days} days past)"
            deadline_detail = f"Procedural deadline of {documented_deadline_str} was missed by {overdue_days} days."
            warnings.append(f"Documented compliance deadline ({documented_deadline_str}) has passed.")
        elif days_until_deadline <= 14:
            # Imminent deadline (within 2 weeks)
            urgency_fraction = 0.70 + (0.30 * (14 - days_until_deadline) / 14.0)
            deadline_points = round(urgency_fraction * w["deadline_weight"], 2)
            deadline_status = f"Deadline Imminent ({days_until_deadline} days remaining)"
            deadline_detail = f"Documented procedural deadline due on {documented_deadline_str} ({days_until_deadline} days)."
        elif days_until_deadline <= 45:
            deadline_points = round(0.40 * w["deadline_weight"], 2)
            deadline_status = f"Deadline Approaching ({days_until_deadline} days remaining)"
            deadline_detail = f"Documented procedural deadline on {documented_deadline_str}."
        else:
            deadline_points = round(0.15 * w["deadline_weight"], 2)
            deadline_status = f"Deadline on Record ({days_until_deadline} days remaining)"
            deadline_detail = f"Documented deadline on {documented_deadline_str}."

    # 4. Data Quality / Missing Information Factor
    has_missing_info = (
        missing_information is not None
        and str(missing_information).strip() != ""
        and str(missing_information).strip().lower() != "none"
    )
    if has_missing_info:
        quality_points = round(w["data_quality_weight"], 2)
        quality_status = "Data Quality Flag Raised"
        quality_detail = f"Missing procedural record: '{missing_information}'. Action needed by administrative registry."
        warnings.append(f"Data-Quality Warning: Case record indicates '{missing_information}'. Does not lower urgency.")
    else:
        quality_points = 0.0
        quality_status = "Complete Administrative Records"
        quality_detail = "All expected filing and registry records are documented."

    total_score = round(age_points + stage_points + deadline_points + quality_points, 1)
    total_score = max(0.0, min(100.0, total_score))

    if total_score >= 75.0:
        priority_level = "High Administrative Priority"
    elif total_score >= 50.0:
        priority_level = "Moderate Administrative Priority"
    elif total_score >= 25.0:
        priority_level = "Routine Administrative Tracking"
    else:
        priority_level = "Normal Progress"

    factor_breakdown = {
        "age_factor": {
            "name": "Total Case Age",
            "weight": w["age_weight"],
            "points": age_points,
            "days": age_days,
            "detail": f"{age_days} days since filing (approx {(age_days / 365.25):.1f} years).",
        },
        "stage_delay_factor": {
            "name": "Stage Procedural Inactivity",
            "weight": w["stage_weight"],
            "points": stage_points,
            "days_at_stage": safe_days_at_stage,
            "benchmark_days": benchmark_days,
            "status": stage_status,
            "detail": f"{safe_days_at_stage} days at '{current_stage}' (Benchmark: {benchmark_days} days).",
        },
        "deadline_factor": {
            "name": "Documented Procedural Deadline",
            "weight": w["deadline_weight"],
            "points": deadline_points,
            "documented_deadline": documented_deadline_str,
            "status": deadline_status,
            "detail": deadline_detail,
        },
        "data_quality_factor": {
            "name": "Registry Data Completeness",
            "weight": w["data_quality_weight"],
            "points": quality_points,
            "has_missing_info": has_missing_info,
            "missing_item": missing_information if has_missing_info else None,
            "status": quality_status,
            "detail": quality_detail,
        },
    }

    return {
        "score": total_score,
        "priority_level": priority_level,
        "factor_breakdown": factor_breakdown,
        "rule_version": RULE_VERSION,
        "disclaimer": DISCLAIMER_TEXT,
        "warnings": warnings,
        "weights_applied": w,
    }
