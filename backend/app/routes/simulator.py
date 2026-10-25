from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import Case, PriorityScore
from app.schemas import WhatIfRequest, WhatIfResponse, WhatIfCaseComparison
from app.scoring import calculate_priority_score

router = APIRouter(prefix="/simulator", tags=["Simulator"])

SIMULATOR_DISCLAIMER = (
    "WHAT-IF SIMULATION ONLY: Adjusting weights recalculates review priority scores in memory "
    "to explore queue sensitivity. Stored baseline database scores are NOT modified. "
    "Simulated rankings must be used only to evaluate procedural policy hypotheses."
)


@router.post("/what-if", response_model=WhatIfResponse)
def run_what_if_simulation(payload: WhatIfRequest, db: Session = Depends(get_db)):
    """
    Simulates priority scoring with custom weights without altering saved baseline scores.
    Compares baseline ranking vs simulated ranking.
    """
    custom_weights = {
        "age_weight": payload.age_weight,
        "stage_weight": payload.stage_weight,
        "deadline_weight": payload.deadline_weight,
        "data_quality_weight": payload.data_quality_weight,
    }

    # Fetch all active (non-disposed) cases with their baseline scores
    active_cases = (
        db.query(Case)
        .join(PriorityScore, Case.id == PriorityScore.case_id)
        .filter(Case.status != "Disposed")
        .order_by(desc(PriorityScore.score))
        .all()
    )

    # Establish baseline rankings (1-indexed)
    baseline_ranking_map = {c.id: rank + 1 for rank, c in enumerate(active_cases)}

    # Calculate simulated scores in memory
    simulated_list = []
    for c in active_cases:
        sim_res = calculate_priority_score(
            filing_date_str=c.filing_date,
            current_stage=c.current_stage,
            days_at_stage=c.days_at_stage,
            missing_information=c.missing_information,
            documented_deadline_str=c.documented_deadline_date,
            reference_date_str="2026-10-25",
            weights=custom_weights,
        )

        simulated_list.append({
            "case": c,
            "baseline_score": c.priority_score.score,
            "baseline_rank": baseline_ranking_map[c.id],
            "simulated_score": sim_res["score"],
            "simulated_breakdown": sim_res["factor_breakdown"],
        })

    # Sort simulated list by simulated score descending
    simulated_list.sort(key=lambda x: x["simulated_score"], reverse=True)

    # Assign simulated rank and build comparisons
    comparison_results: List[WhatIfCaseComparison] = []
    for s_rank, item in enumerate(simulated_list[:payload.limit], start=1):
        c = item["case"]
        b_rank = item["baseline_rank"]
        b_score = item["baseline_score"]
        s_score = item["simulated_score"]
        rank_delta = b_rank - s_rank  # positive = moved up in priority queue
        score_delta = round(s_score - b_score, 1)

        comparison_results.append(
            WhatIfCaseComparison(
                id=c.id,
                case_number=c.case_number,
                category=c.category,
                current_stage=c.current_stage,
                days_at_stage=c.days_at_stage,
                missing_information=c.missing_information,
                documented_deadline_date=c.documented_deadline_date,
                baseline_score=b_score,
                baseline_rank=b_rank,
                simulated_score=s_score,
                simulated_rank=s_rank,
                rank_delta=rank_delta,
                score_delta=score_delta,
                simulated_breakdown=item["simulated_breakdown"],
            )
        )

    # Summary notes on weight shifts
    notes = (
        f"Simulated queue generated using Age ({payload.age_weight}%), Stage Delay ({payload.stage_weight}%), "
        f"Deadline ({payload.deadline_weight}%), Data Quality ({payload.data_quality_weight}%). "
        f"Evaluated {len(active_cases)} pending case records in-memory."
    )

    return WhatIfResponse(
        weights_applied=custom_weights,
        cases=comparison_results,
        summary_notes=notes,
        disclaimer=SIMULATOR_DISCLAIMER,
    )
