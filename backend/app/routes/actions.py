from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import AdministrativeAction, Case, AuditLog
from app.schemas import (
    AdministrativeActionCreate,
    AdministrativeActionUpdate,
    AdministrativeActionResponse,
)

router = APIRouter(prefix="/actions", tags=["Administrative Actions"])


@router.get("", response_model=List[AdministrativeActionResponse])
def get_actions(
    status: Optional[str] = Query(None, description="Filter by status: Open, In Progress, Completed"),
    case_id: Optional[int] = Query(None, description="Filter by case ID"),
    db: Session = Depends(get_db),
):
    """List administrative actions with case context."""
    query = db.query(AdministrativeAction).join(Case, Case.id == AdministrativeAction.case_id)

    if status and status != "All":
        query = query.filter(AdministrativeAction.status == status)

    if case_id:
        query = query.filter(AdministrativeAction.case_id == case_id)

    actions = query.order_by(desc(AdministrativeAction.created_at)).all()

    results = []
    for a in actions:
        results.append(
            AdministrativeActionResponse(
                id=a.id,
                case_id=a.case_id,
                case_number=a.case.case_number if a.case else None,
                category=a.case.category if a.case else None,
                action_description=a.action_description,
                status=a.status,
                created_at=a.created_at,
                completed_at=a.completed_at,
            )
        )
    return results


@router.post("", response_model=AdministrativeActionResponse)
def create_action(payload: AdministrativeActionCreate, db: Session = Depends(get_db)):
    """Create a new administrative follow-up action for a case."""
    case = db.query(Case).filter(Case.id == payload.case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    new_action = AdministrativeAction(
        case_id=payload.case_id,
        action_description=payload.action_description,
        status=payload.status,
    )
    db.add(new_action)
    db.flush()

    # Log to audit_logs
    audit = AuditLog(
        action_type="ACTION_CREATED",
        record_type="administrative_action",
        record_id=str(new_action.id),
        details=f"Created administrative action for case {case.case_number}: '{payload.action_description}'",
    )
    db.add(audit)
    db.commit()
    db.refresh(new_action)

    return AdministrativeActionResponse(
        id=new_action.id,
        case_id=new_action.case_id,
        case_number=case.case_number,
        category=case.category,
        action_description=new_action.action_description,
        status=new_action.status,
        created_at=new_action.created_at,
        completed_at=new_action.completed_at,
    )


@router.patch("/{action_id}", response_model=AdministrativeActionResponse)
def update_action_status(action_id: int, payload: AdministrativeActionUpdate, db: Session = Depends(get_db)):
    """Update status or description of an administrative action."""
    action = db.query(AdministrativeAction).filter(AdministrativeAction.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found.")

    old_status = action.status
    if payload.status:
        action.status = payload.status
        if payload.status == "Completed":
            action.completed_at = datetime.now(timezone.utc)
        elif old_status == "Completed" and payload.status != "Completed":
            action.completed_at = None

    if payload.action_description:
        action.action_description = payload.action_description

    # Log update
    audit = AuditLog(
        action_type="ACTION_UPDATED",
        record_type="administrative_action",
        record_id=str(action.id),
        details=f"Status changed from '{old_status}' to '{action.status}' for action ID {action.id}",
    )
    db.add(audit)
    db.commit()
    db.refresh(action)

    case = db.query(Case).filter(Case.id == action.case_id).first()

    return AdministrativeActionResponse(
        id=action.id,
        case_id=action.case_id,
        case_number=case.case_number if case else None,
        category=case.category if case else None,
        action_description=action.action_description,
        status=action.status,
        created_at=action.created_at,
        completed_at=action.completed_at,
    )
