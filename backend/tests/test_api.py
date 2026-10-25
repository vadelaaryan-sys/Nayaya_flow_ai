import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.seed_data import seed_database


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db, force_reset=True)
    finally:
        db.close()
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "NyayaFlow AI API"
    assert "disclaimer" in data


def test_get_dashboard_analytics(client):
    response = client.get("/api/analytics/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "total_cases" in data
    assert data["total_cases"] >= 100
    assert "stage_distribution" in data
    assert "age_bands" in data


def test_get_bottlenecks(client):
    response = client.get("/api/analytics/bottlenecks")
    assert response.status_code == 200
    data = response.json()
    assert "stages" in data
    assert len(data["stages"]) > 0
    assert "disclaimer" in data


def test_get_cases_paginated(client):
    response = client.get("/api/cases?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["page_size"] == 10
    assert len(data["cases"]) <= 10
    assert data["total"] >= 100


def test_filter_cases_by_stage(client):
    target_stage = "Evidence & Witness Examination"
    response = client.get(f"/api/cases?stage={target_stage}&page_size=5")
    assert response.status_code == 200
    data = response.json()
    for c in data["cases"]:
        assert c["current_stage"] == target_stage


def test_case_detail(client):
    list_resp = client.get("/api/cases?page_size=1")
    first_case = list_resp.json()["cases"][0]
    case_id = first_case["id"]

    detail_resp = client.get(f"/api/cases/{case_id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["id"] == case_id
    assert "events" in detail
    assert "disclaimer" in detail
    assert "factor_breakdown" in detail


def test_case_explanation_endpoint(client):
    list_resp = client.get("/api/cases?page_size=1")
    first_case = list_resp.json()["cases"][0]
    case_id = first_case["id"]

    exp_resp = client.get(f"/api/cases/{case_id}/explanation")
    assert exp_resp.status_code == 200
    exp = exp_resp.json()
    assert "summary" in exp
    assert "delay_factors_explanation" in exp
    assert "suggested_administrative_checklist" in exp
    assert exp["explanation_source"] in ["Deterministic Local Template", "Google Gemini API"]


def test_administrative_actions_lifecycle(client):
    list_resp = client.get("/api/cases?page_size=1")
    case_id = list_resp.json()["cases"][0]["id"]

    # Create new action
    create_resp = client.post(
        "/api/actions",
        json={
            "case_id": case_id,
            "action_description": "Test verification of summons service delivery certificate.",
            "status": "Open",
        },
    )
    assert create_resp.status_code == 200
    action_data = create_resp.json()
    action_id = action_data["id"]
    assert action_data["status"] == "Open"

    # Update status to Completed
    patch_resp = client.patch(
        f"/api/actions/{action_id}",
        json={"status": "Completed"},
    )
    assert patch_resp.status_code == 200
    updated_data = patch_resp.json()
    assert updated_data["status"] == "Completed"
    assert updated_data["completed_at"] is not None


def test_what_if_simulator(client):
    sim_resp = client.post(
        "/api/simulator/what-if",
        json={
            "age_weight": 50.0,
            "stage_weight": 20.0,
            "deadline_weight": 15.0,
            "data_quality_weight": 15.0,
            "limit": 10,
        },
    )
    assert sim_resp.status_code == 200
    sim_data = sim_resp.json()
    assert len(sim_data["cases"]) <= 10
    assert "weights_applied" in sim_data
    assert "disclaimer" in sim_data
    assert "rank_delta" in sim_data["cases"][0]


def test_csv_export(client):
    csv_resp = client.get("/api/cases/export/csv")
    assert csv_resp.status_code == 200
    assert "text/csv" in csv_resp.headers.get("content-type", "")
    assert "Case Number" in csv_resp.text


def test_ai_status(client):
    resp = client.get("/api/ai/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "active_engine" in data
    assert "disclaimer" in data


def test_ai_chat(client):
    resp = client.post(
        "/api/ai/chat",
        json={"message": "What are the worst bottlenecks in the court?", "case_id": None},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "reply" in data
    assert "engine" in data
    assert "disclaimer" in data
