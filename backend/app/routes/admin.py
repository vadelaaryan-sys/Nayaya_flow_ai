from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel, ConfigDict
from datetime import datetime

from app.database import get_db
from app.models import AuditLog
from app.seed_data import seed_database

router = APIRouter(prefix="/admin", tags=["Admin"])


class ResetResponse(BaseModel):
    status: str
    message: str
    cases_seeded: int


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    action_type: str
    record_type: str
    record_id: str | None
    details: str
    created_at: datetime


@router.post("/reset", response_model=ResetResponse)
def reset_to_seed_data(db: Session = Depends(get_db)):
    """Resets the entire local SQLite database to fresh synthetic seed data."""
    res = seed_database(db, force_reset=True)
    return ResetResponse(
        status=res.get("status", "success"),
        message=res.get("message", "Database reset complete."),
        cases_seeded=res.get("cases_seeded", 125),
    )


@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(limit: int = 50, db: Session = Depends(get_db)):
    """Retrieve recent audit logs of administrative actions, resets, and operations."""
    logs = db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(limit).all()
    return logs
