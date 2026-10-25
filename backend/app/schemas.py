from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


# --- Case Events ---
class CaseEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: int
    previous_stage: Optional[str] = None
    new_stage: str
    event_date: str
    notes: str


# --- Priority Score ---
class PriorityScoreResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: int
    score: float
    factor_breakdown_json: str
    rule_version: str
    calculated_at: datetime


# --- Administrative Actions ---
class AdministrativeActionBase(BaseModel):
    action_description: str
    status: str = Field(default="Open", description="Open, In Progress, Completed")


class AdministrativeActionCreate(AdministrativeActionBase):
    case_id: int


class AdministrativeActionUpdate(BaseModel):
    status: Optional[str] = None
    action_description: Optional[str] = None


class AdministrativeActionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: int
    case_number: Optional[str] = None
    category: Optional[str] = None
    action_description: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None


# --- Case ---
class CaseSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_number: str
    category: str
    filing_date: str
    current_stage: str
    days_at_stage: int
    status: str
    last_updated: str
    missing_information: Optional[str] = None
    documented_deadline_date: Optional[str] = None
    priority_score: Optional[float] = None
    priority_level: Optional[str] = None


class CaseDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_number: str
    category: str
    filing_date: str
    current_stage: str
    days_at_stage: int
    status: str
    last_updated: str
    missing_information: Optional[str] = None
    documented_deadline_date: Optional[str] = None
    created_at: datetime
    priority_score: Optional[PriorityScoreResponse] = None
    factor_breakdown: Optional[Dict[str, Any]] = None
    events: List[CaseEventResponse] = []
    administrative_actions: List[AdministrativeActionResponse] = []
    disclaimer: str


class CaseListPaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    cases: List[CaseSummaryResponse]


# --- Dashboard ---
class DashboardMetricsResponse(BaseModel):
    total_cases: int
    pending_cases: int
    disposed_cases: int
    high_priority_review_cases: int
    data_quality_flagged_cases: int
    overdue_deadline_cases: int
    average_days_at_stage: float
    age_bands: Dict[str, int]
    stage_distribution: Dict[str, int]
    category_distribution: Dict[str, int]
    top_bottlenecks: List[Dict[str, Any]]


# --- Bottleneck Analytics ---
class StageBottleneckMetric(BaseModel):
    stage_name: str
    case_count: int
    avg_days_at_stage: float
    median_days_at_stage: float
    benchmark_days: int
    delay_ratio: float  # avg_days / benchmark
    bottleneck_severity: str  # Critical, Elevated, Moderate, Normal
    flagged_actions_count: int


class BottleneckAnalyticsResponse(BaseModel):
    stages: List[StageBottleneckMetric]
    disclaimer: str
    total_analyzed: int


# --- What-If Simulator ---
class WhatIfRequest(BaseModel):
    age_weight: float = Field(default=30.0, ge=0.0, le=100.0)
    stage_weight: float = Field(default=35.0, ge=0.0, le=100.0)
    deadline_weight: float = Field(default=20.0, ge=0.0, le=100.0)
    data_quality_weight: float = Field(default=15.0, ge=0.0, le=100.0)
    limit: int = Field(default=20, ge=5, le=100)


class WhatIfCaseComparison(BaseModel):
    id: int
    case_number: str
    category: str
    current_stage: str
    days_at_stage: int
    missing_information: Optional[str] = None
    documented_deadline_date: Optional[str] = None
    baseline_score: float
    baseline_rank: int
    simulated_score: float
    simulated_rank: int
    rank_delta: int  # baseline_rank - simulated_rank (+ means moved higher in urgency)
    score_delta: float
    simulated_breakdown: Dict[str, Any]


class WhatIfResponse(BaseModel):
    weights_applied: Dict[str, float]
    cases: List[WhatIfCaseComparison]
    summary_notes: str
    disclaimer: str


# --- AI Explanation ---
class AIExplanationRequest(BaseModel):
    case_id: int


class AIExplanationResponse(BaseModel):
    case_id: int
    case_number: str
    is_ai_generated: bool
    explanation_source: str  # "Google Gemini API" or "Deterministic Local Template"
    summary: str
    procedural_context: str
    delay_factors_explanation: List[str]
    suggested_administrative_checklist: List[str]
    disclaimer: str
