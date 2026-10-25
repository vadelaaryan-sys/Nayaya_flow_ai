import csv
import io
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.database import get_db
from app.models import Case, PriorityScore, CaseEvent, AdministrativeAction
from app.schemas import (
    CaseListPaginatedResponse,
    CaseSummaryResponse,
    CaseDetailResponse,
    AIExplanationResponse,
)
from app.ai_service import get_case_explanation
from app.scoring import DISCLAIMER_TEXT

router = APIRouter(prefix="/cases", tags=["Cases"])


@router.get("", response_model=CaseListPaginatedResponse)
def get_cases(
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    search: Optional[str] = None,
    stage: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    has_missing_info: Optional[bool] = None,
    sort_by: str = Query("score", pattern="^(score|days_at_stage|filing_date|case_number)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    """List and filter synthetic court cases with deterministic priority scores."""
    query = db.query(Case).outerjoin(PriorityScore, Case.id == PriorityScore.case_id)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Case.case_number.ilike(search_pattern),
                Case.category.ilike(search_pattern),
                Case.current_stage.ilike(search_pattern),
            )
        )

    if stage and stage != "All":
        query = query.filter(Case.current_stage == stage)

    if category and category != "All":
        query = query.filter(Case.category == category)

    if status and status != "All":
        query = query.filter(Case.status == status)

    if has_missing_info is True:
        query = query.filter(Case.missing_information.isnot(None), Case.missing_information != "None")
    elif has_missing_info is False:
        query = query.filter(or_(Case.missing_information.is_(None), Case.missing_information == "None"))

    # Sorting
    sort_column = PriorityScore.score
    if sort_by == "days_at_stage":
        sort_column = Case.days_at_stage
    elif sort_by == "filing_date":
        sort_column = Case.filing_date
    elif sort_by == "case_number":
        sort_column = Case.case_number

    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))

    total = query.count()
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    case_summaries = []
    for c in items:
        score_val = c.priority_score.score if c.priority_score else None
        p_level = None
        if score_val is not None:
            if score_val >= 75.0:
                p_level = "High"
            elif score_val >= 50.0:
                p_level = "Moderate"
            elif score_val >= 25.0:
                p_level = "Routine"
            else:
                p_level = "Normal"

        case_summaries.append(
            CaseSummaryResponse(
                id=c.id,
                case_number=c.case_number,
                category=c.category,
                filing_date=c.filing_date,
                current_stage=c.current_stage,
                days_at_stage=c.days_at_stage,
                status=c.status,
                last_updated=c.last_updated,
                missing_information=c.missing_information,
                documented_deadline_date=c.documented_deadline_date,
                priority_score=score_val,
                priority_level=p_level,
            )
        )

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return CaseListPaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        cases=case_summaries,
    )


@router.get("/export/csv")
def export_cases_csv(
    stage: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    has_missing_info: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Exports filtered case records as CSV."""
    query = db.query(Case).outerjoin(PriorityScore, Case.id == PriorityScore.case_id)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Case.case_number.ilike(search_pattern),
                Case.category.ilike(search_pattern),
            )
        )

    if stage and stage != "All":
        query = query.filter(Case.current_stage == stage)

    if category and category != "All":
        query = query.filter(Case.category == category)

    if status and status != "All":
        query = query.filter(Case.status == status)

    if has_missing_info is True:
        query = query.filter(Case.missing_information.isnot(None), Case.missing_information != "None")
    elif has_missing_info is False:
        query = query.filter(or_(Case.missing_information.is_(None), Case.missing_information == "None"))

    cases = query.order_by(desc(PriorityScore.score)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Case ID",
        "Case Number",
        "Category",
        "Filing Date",
        "Current Stage",
        "Days at Stage",
        "Status",
        "Priority Score (Admin Indicator)",
        "Missing Information Flag",
        "Documented Deadline",
        "Last Updated",
    ])

    for c in cases:
        score_val = c.priority_score.score if c.priority_score else ""
        writer.writerow([
            c.id,
            c.case_number,
            c.category,
            c.filing_date,
            c.current_stage,
            c.days_at_stage,
            c.status,
            score_val,
            c.missing_information or "None",
            c.documented_deadline_date or "N/A",
            c.last_updated,
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=nyayaflow_cases_export.csv"},
    )


@router.get("/{case_id}", response_model=CaseDetailResponse)
def get_case_detail(case_id: int, db: Session = Depends(get_db)):
    """Fetch complete case record, procedural timeline, priority score, and actions."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case record not found.")

    factor_breakdown = None
    if case.priority_score and case.priority_score.factor_breakdown_json:
        try:
            factor_breakdown = json.loads(case.priority_score.factor_breakdown_json)
        except json.JSONDecodeError:
            factor_breakdown = None

    return CaseDetailResponse(
        id=case.id,
        case_number=case.case_number,
        category=case.category,
        filing_date=case.filing_date,
        current_stage=case.current_stage,
        days_at_stage=case.days_at_stage,
        status=case.status,
        last_updated=case.last_updated,
        missing_information=case.missing_information,
        documented_deadline_date=case.documented_deadline_date,
        created_at=case.created_at,
        priority_score=case.priority_score,
        factor_breakdown=factor_breakdown,
        events=case.events,
        administrative_actions=case.administrative_actions,
        disclaimer=DISCLAIMER_TEXT,
    )


@router.get("/{case_id}/explanation", response_model=AIExplanationResponse)
async def get_case_explanation_route(case_id: int, db: Session = Depends(get_db)):
    """Provides plain-language procedural explanation of existing deterministic score."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case record not found.")

    breakdown = {}
    score = 0.0
    if case.priority_score:
        score = case.priority_score.score
        try:
            breakdown = json.loads(case.priority_score.factor_breakdown_json)
        except json.JSONDecodeError:
            breakdown = {}

    case_data = {
        "id": case.id,
        "case_number": case.case_number,
        "category": case.category,
        "current_stage": case.current_stage,
        "days_at_stage": case.days_at_stage,
        "filing_date": case.filing_date,
        "missing_information": case.missing_information,
        "documented_deadline_date": case.documented_deadline_date,
    }

    explanation = await get_case_explanation(case_data, breakdown, score)
    return AIExplanationResponse(**explanation)
