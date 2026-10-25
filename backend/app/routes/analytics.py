import statistics
from datetime import datetime, date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Case, PriorityScore, AdministrativeAction
from app.config import ALL_STAGES, STAGE_BENCHMARKS
from app.schemas import (
    DashboardMetricsResponse,
    BottleneckAnalyticsResponse,
    StageBottleneckMetric,
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])
REFERENCE_DATE = date(2026, 10, 25)


@router.get("/dashboard", response_model=DashboardMetricsResponse)
def get_dashboard_metrics(db: Session = Depends(get_db)):
    """Computes high-level aggregated operational metrics for the dashboard."""
    cases = db.query(Case).all()
    total_cases = len(cases)
    if total_cases == 0:
        return DashboardMetricsResponse(
            total_cases=0,
            pending_cases=0,
            disposed_cases=0,
            high_priority_review_cases=0,
            data_quality_flagged_cases=0,
            overdue_deadline_cases=0,
            average_days_at_stage=0.0,
            age_bands={},
            stage_distribution={},
            category_distribution={},
            top_bottlenecks=[],
        )

    pending_count = sum(1 for c in cases if c.status != "Disposed")
    disposed_count = sum(1 for c in cases if c.status == "Disposed")
    flagged_quality = sum(1 for c in cases if c.missing_information and c.missing_information != "None")

    # High priority review count
    high_priority_count = (
        db.query(PriorityScore)
        .join(Case, Case.id == PriorityScore.case_id)
        .filter(PriorityScore.score >= 75.0, Case.status != "Disposed")
        .count()
    )

    # Overdue deadlines
    overdue_count = 0
    for c in cases:
        if c.documented_deadline_date:
            try:
                d_date = datetime.strptime(c.documented_deadline_date[:10], "%Y-%m-%d").date()
                if d_date < REFERENCE_DATE and c.status != "Disposed":
                    overdue_count += 1
            except ValueError:
                pass

    # Average days at stage
    avg_days = sum(c.days_at_stage for c in cases) / total_cases

    # Age bands
    age_bands = {
        "< 6 Months": 0,
        "6 - 12 Months": 0,
        "1 - 2 Years": 0,
        "2 - 3 Years": 0,
        "3+ Years": 0,
    }
    for c in cases:
        try:
            f_date = datetime.strptime(c.filing_date[:10], "%Y-%m-%d").date()
            diff_days = (REFERENCE_DATE - f_date).days
            if diff_days < 182:
                age_bands["< 6 Months"] += 1
            elif diff_days < 365:
                age_bands["6 - 12 Months"] += 1
            elif diff_days < 730:
                age_bands["1 - 2 Years"] += 1
            elif diff_days < 1095:
                age_bands["2 - 3 Years"] += 1
            else:
                age_bands["3+ Years"] += 1
        except ValueError:
            age_bands["< 6 Months"] += 1

    # Stage distribution
    stage_dist = {s: 0 for s in ALL_STAGES}
    for c in cases:
        if c.current_stage in stage_dist:
            stage_dist[c.current_stage] += 1
        else:
            stage_dist[c.current_stage] = 1

    # Category distribution
    cat_dist = {}
    for c in cases:
        cat_dist[c.category] = cat_dist.get(c.category, 0) + 1

    # Top bottlenecks (by delay ratio)
    stage_metrics = []
    for stage in ALL_STAGES:
        stage_cases = [c for c in cases if c.current_stage == stage and c.status != "Disposed"]
        count = len(stage_cases)
        if count > 0:
            avg_d = sum(c.days_at_stage for c in stage_cases) / count
            bench = STAGE_BENCHMARKS.get(stage, 30)
            ratio = avg_d / max(bench, 1)
            stage_metrics.append({
                "stage": stage,
                "case_count": count,
                "avg_days": round(avg_d, 1),
                "benchmark": bench,
                "delay_ratio": round(ratio, 2),
            })

    stage_metrics.sort(key=lambda x: x["delay_ratio"], reverse=True)

    return DashboardMetricsResponse(
        total_cases=total_cases,
        pending_cases=pending_count,
        disposed_cases=disposed_count,
        high_priority_review_cases=high_priority_count,
        data_quality_flagged_cases=flagged_quality,
        overdue_deadline_cases=overdue_count,
        average_days_at_stage=round(avg_days, 1),
        age_bands=age_bands,
        stage_distribution=stage_dist,
        category_distribution=cat_dist,
        top_bottlenecks=stage_metrics[:4],
    )


@router.get("/bottlenecks", response_model=BottleneckAnalyticsResponse)
def get_bottleneck_analytics(db: Session = Depends(get_db)):
    """Computes procedural accumulation and delay ratios across all procedural stages."""
    cases = db.query(Case).filter(Case.status != "Disposed").all()
    stage_results = []

    for stage_name in ALL_STAGES:
        stage_cases = [c for c in cases if c.current_stage == stage_name]
        count = len(stage_cases)
        benchmark = STAGE_BENCHMARKS.get(stage_name, 30)

        if count > 0:
            durations = [c.days_at_stage for c in stage_cases]
            avg_days = sum(durations) / count
            med_days = statistics.median(durations)
            ratio = avg_days / benchmark

            # Severity
            if ratio >= 2.0:
                severity = "Critical Delay"
            elif ratio >= 1.4:
                severity = "Elevated Delay"
            elif ratio >= 1.0:
                severity = "Moderate Attention"
            else:
                severity = "Within Benchmark"

            # Count open actions in this stage
            case_ids = [c.id for c in stage_cases]
            action_count = (
                db.query(AdministrativeAction)
                .filter(AdministrativeAction.case_id.in_(case_ids), AdministrativeAction.status != "Completed")
                .count()
            )
        else:
            avg_days = 0.0
            med_days = 0.0
            ratio = 0.0
            severity = "Within Benchmark"
            action_count = 0

        stage_results.append(
            StageBottleneckMetric(
                stage_name=stage_name,
                case_count=count,
                avg_days_at_stage=round(avg_days, 1),
                median_days_at_stage=round(med_days, 1),
                benchmark_days=benchmark,
                delay_ratio=round(ratio, 2),
                bottleneck_severity=severity,
                flagged_actions_count=action_count,
            )
        )

    disclaimer = (
        "ANALYTICS NOTICE: Procedural bottleneck ratios and stage accumulations are computed "
        "solely from the local synthetic dataset and illustrative administrative benchmarks. "
        "They highlight procedural queuing friction for court administrators, not individual judicial efficiency."
    )

    return BottleneckAnalyticsResponse(
        stages=stage_results,
        disclaimer=disclaimer,
        total_analyzed=len(cases),
    )
