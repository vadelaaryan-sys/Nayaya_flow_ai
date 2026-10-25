import pytest
from app.scoring import calculate_priority_score, DEFAULT_WEIGHTS


def test_standard_case_scoring():
    res = calculate_priority_score(
        filing_date_str="2025-01-01",
        current_stage="Pleadings & Written Statement",
        days_at_stage=60,
        missing_information="None",
        documented_deadline_str=None,
        reference_date_str="2026-10-25",
    )
    assert 0.0 <= res["score"] <= 100.0
    assert "factor_breakdown" in res
    assert res["factor_breakdown"]["age_factor"]["days"] > 0
    assert res["factor_breakdown"]["data_quality_factor"]["has_missing_info"] is False
    assert res["factor_breakdown"]["deadline_factor"]["points"] == 0.0


def test_edge_case_zero_days_at_stage():
    res = calculate_priority_score(
        filing_date_str="2026-10-25",
        current_stage="Filing & Scrutiny",
        days_at_stage=0,
        missing_information="None",
        documented_deadline_str=None,
        reference_date_str="2026-10-25",
    )
    assert res["factor_breakdown"]["stage_delay_factor"]["points"] == 0.0
    assert res["score"] == 0.0


def test_edge_case_negative_days_at_stage():
    res = calculate_priority_score(
        filing_date_str="2026-10-25",
        current_stage="Service of Summons",
        days_at_stage=-15,
        missing_information="None",
        reference_date_str="2026-10-25",
    )
    # Negative should be clamped to 0
    assert res["factor_breakdown"]["stage_delay_factor"]["days_at_stage"] == 0
    assert res["factor_breakdown"]["stage_delay_factor"]["points"] == 0.0
    assert any("Negative days_at_stage" in w for w in res["warnings"])


def test_edge_case_future_filing_date():
    res = calculate_priority_score(
        filing_date_str="2027-01-01",
        current_stage="Filing & Scrutiny",
        days_at_stage=10,
        reference_date_str="2026-10-25",
    )
    # Future filing clamped to 0 age days
    assert res["factor_breakdown"]["age_factor"]["days"] == 0
    assert res["factor_breakdown"]["age_factor"]["points"] == 0.0
    assert any("future" in w for w in res["warnings"])


def test_missing_information_triggers_warning_and_quality_points():
    res = calculate_priority_score(
        filing_date_str="2026-01-01",
        current_stage="Service of Summons",
        days_at_stage=20,
        missing_information="Missing Proof of Service",
        reference_date_str="2026-10-25",
    )
    assert res["factor_breakdown"]["data_quality_factor"]["has_missing_info"] is True
    assert res["factor_breakdown"]["data_quality_factor"]["points"] == DEFAULT_WEIGHTS["data_quality_weight"]
    assert any("Data-Quality Warning" in w for w in res["warnings"])


def test_no_documented_deadline_is_neutral():
    res = calculate_priority_score(
        filing_date_str="2026-01-01",
        current_stage="Framing of Issues",
        days_at_stage=25,
        missing_information=None,
        documented_deadline_str=None,
        reference_date_str="2026-10-25",
    )
    assert res["factor_breakdown"]["deadline_factor"]["points"] == 0.0
    assert res["factor_breakdown"]["deadline_factor"]["status"] == "No Documented Deadline"


def test_overdue_deadline_scoring():
    res = calculate_priority_score(
        filing_date_str="2026-01-01",
        current_stage="Evidence & Witness Examination",
        days_at_stage=100,
        missing_information="None",
        documented_deadline_str="2026-09-01",  # Overdue relative to 2026-10-25
        reference_date_str="2026-10-25",
    )
    assert res["factor_breakdown"]["deadline_factor"]["points"] == DEFAULT_WEIGHTS["deadline_weight"]
    assert "Deadline Overdue" in res["factor_breakdown"]["deadline_factor"]["status"]
    assert any("deadline" in w.lower() for w in res["warnings"])


def test_custom_weights_what_if():
    custom_w = {
        "age_weight": 50.0,
        "stage_weight": 20.0,
        "deadline_weight": 15.0,
        "data_quality_weight": 15.0,
    }
    res = calculate_priority_score(
        filing_date_str="2023-01-01",  # ~3+ years old -> full age points
        current_stage="Final Arguments",
        days_at_stage=10,
        reference_date_str="2026-10-25",
        weights=custom_w,
    )
    assert res["factor_breakdown"]["age_factor"]["weight"] == 50.0
    assert res["factor_breakdown"]["age_factor"]["points"] == 50.0
