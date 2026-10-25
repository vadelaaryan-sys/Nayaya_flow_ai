from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String(50), unique=True, index=True, nullable=False)
    category = Column(String(100), index=True, nullable=False)
    filing_date = Column(String(20), nullable=False)  # YYYY-MM-DD
    current_stage = Column(String(100), index=True, nullable=False)
    days_at_stage = Column(Integer, default=0, nullable=False)
    status = Column(String(50), index=True, default="Pending", nullable=False)
    last_updated = Column(String(30), nullable=False)
    missing_information = Column(String(255), default="None", nullable=True)
    documented_deadline_date = Column(String(20), nullable=True)  # YYYY-MM-DD
    created_at = Column(DateTime, default=utcnow, nullable=False)

    # Relationships
    events = relationship("CaseEvent", back_populates="case", cascade="all, delete-orphan", order_by="CaseEvent.event_date.asc()")
    priority_score = relationship("PriorityScore", back_populates="case", uselist=False, cascade="all, delete-orphan")
    administrative_actions = relationship("AdministrativeAction", back_populates="case", cascade="all, delete-orphan", order_by="AdministrativeAction.created_at.desc()")


class CaseEvent(Base):
    __tablename__ = "case_events"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    previous_stage = Column(String(100), nullable=True)
    new_stage = Column(String(100), nullable=False)
    event_date = Column(String(20), nullable=False)
    notes = Column(Text, nullable=False)

    case = relationship("Case", back_populates="events")


class PriorityScore(Base):
    __tablename__ = "priority_scores"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    score = Column(Float, nullable=False, index=True)
    factor_breakdown_json = Column(Text, nullable=False)  # JSON string
    rule_version = Column(String(50), default="v1.2-administrative-default", nullable=False)
    calculated_at = Column(DateTime, default=utcnow, nullable=False)

    case = relationship("Case", back_populates="priority_score")


class AdministrativeAction(Base):
    __tablename__ = "administrative_actions"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    action_description = Column(Text, nullable=False)
    status = Column(String(50), default="Open", nullable=False, index=True)  # Open, In Progress, Completed
    created_at = Column(DateTime, default=utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    case = relationship("Case", back_populates="administrative_actions")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action_type = Column(String(100), nullable=False, index=True)
    record_type = Column(String(50), nullable=False)
    record_id = Column(String(50), nullable=True)
    details = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
