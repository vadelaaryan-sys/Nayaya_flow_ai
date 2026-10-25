# NyayaFlow AI — Explainable Court Backlog and Procedural Bottleneck Assistant

> **DEMONSTRATION PROTOTYPE DISCLAIMER**  
> NyayaFlow AI is an administrative research demonstration prototype for court backlog exploration and procedural bottleneck detection. It operates strictly on **synthetic, fictional records** (e.g. `NF-2026-0001`).  
> **It is NOT an official judicial system.** It does **never** automate judicial decisions, evaluate legal merits, determine guilt, make determinations based on protected characteristics, or assert legal urgency. Scores generated are transparent **administrative review indicators** designed to assist court registry staff with diary tracking and record completeness audits.

---

## Architecture & Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Recharts, Lucide Icons.
- **Backend**: Python 3.14+, FastAPI, Uvicorn, Pydantic v2.
- **Database**: SQLite stored locally in `./data/nyayaflow.db` via SQLAlchemy ORM.
- **AI/LLM**: Optional Google Gemini API integration (via `GEMINI_API_KEY`). Works 100% offline using deterministic rule-based template explanations when no key is supplied.
- **Environment**: 100% Local on your laptop. No external cloud hosting, no remote database dependencies.

---

## Core Features

1. **AI Procedural Copilot (Interactive Assistant)**: Conversational assistant directly in the web UI. Answers procedural backlog queries, diagnoses stalled cases, identifies worst bottlenecks, and drafts administrative defect notices. Works 100% offline via the built-in Local Procedural NLP Engine or connects to Google Gemini 1.5 Flash via the in-app API Key settings!
2. **Procedural Dashboard**: Aggregate metrics (total synthetic cases, pending cases, disposed cases, high-review cases, missing document warnings, overdue deadlines), stage volume distribution charts, age-band donut charts, and top bottleneck summaries.
3. **Case Explorer**: Full search, stage/category/status/data-quality filters, multi-column sorting (score, days at stage, filing date, case #), pagination, and instant CSV export.
4. **Case Detail & Explainable Scoring**: Complete case record, procedural stage duration vs standard benchmarks, documented deadlines, missing record flags, and transparent factor breakdown (0–100 scale). Direct "Consult AI" action button.
5. **AI & Deterministic Explanations**: Plain-language breakdown of administrative delay factors with suggested action checklists.
6. **Procedural Timeline**: Chronological event sequence (`case_events`) tracking stage transitions and registry remarks.
7. **Administrative Action Queue**: Actionable follow-up tasks (e.g., verifying summons proof of service, checking compliance with procedural deadlines). Registry clerks can mark tasks *Open*, *In Progress*, or *Completed*.
8. **What-If Policy Simulator**: Interactive sliders for factor weights (Age, Stage Delay, Deadline, Data Quality) that recalculate review queues dynamically in memory without altering stored database baselines.
9. **Bottleneck Analytics**: Stage-by-stage delay multiplier analysis, comparing actual average duration to standard benchmarks.
10. **Data Management & Audit Logging**: 1-click database reset with confirmation restoring 125 rich synthetic cases, plus a real-time system audit log.

---

## Database Schema (SQLite)

- `cases`: `id`, `case_number`, `category`, `filing_date`, `current_stage`, `days_at_stage`, `status`, `last_updated`, `missing_information`, `documented_deadline_date`, `created_at`.
- `case_events`: `id`, `case_id`, `previous_stage`, `new_stage`, `event_date`, `notes`.
- `priority_scores`: `id`, `case_id`, `score`, `factor_breakdown_json`, `rule_version`, `calculated_at`.
- `administrative_actions`: `id`, `case_id`, `action_description`, `status`, `created_at`, `completed_at`.
- `audit_logs`: `id`, `action_type`, `record_type`, `record_id`, `details`, `created_at`.

---

## Scoring Formula & Weights

The **Administrative Review Priority Score** is a deterministic metric from `0.0` to `100.0` calculated as:

$$\text{Score} = W_{\text{age}} + W_{\text{stage}} + W_{\text{deadline}} + W_{\text{quality}}$$

### Default Weights:
1. **Total Case Age ($W_{\text{age}} = 30\%$)**: Ratio of elapsed calendar days since filing against a 3-year standard ceiling.
2. **Stage Delay vs Benchmark ($W_{\text{stage}} = 35\%$)**: Evaluates days at current stage against the illustrative procedural benchmark (e.g., *Service of Summons* benchmark is 30 days). Excess duration scales points up to 100%.
3. **Documented Procedural Deadline ($W_{\text{deadline}} = 20\%$)**: Neutral (0 pts) if no deadline is documented. Overdue deadlines award full 20 pts; imminent deadlines (within 14 days) scale from 14 to 20 pts.
4. **Data Quality & Registry Completeness ($W_{\text{quality}} = 15\%$)**: Anomaly detection flag (e.g., missing proof of service, incomplete representation). Missing data triggers administrative review and does **not** imply low urgency.

---

## Running Locally on Windows

### Prerequisites
- Python 3.10+ (Tested with Python 3.14)
- Node.js v18+ and npm

### Terminal 1 — Backend (FastAPI)
```powershell
# Navigate to backend directory
cd C:\Users\user\.gemini\antigravity\scratch\nyayaflow-ai\backend

# Activate existing virtual environment
.\venv\Scripts\Activate.ps1

# (Optional) If running for the first time:
# pip install -r requirements.txt

# Start FastAPI server on http://127.0.0.1:8000
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Terminal 2 — Frontend (React + Vite)
```powershell
# Open a second PowerShell window and navigate to frontend directory
cd C:\Users\user\.gemini\antigravity\scratch\nyayaflow-ai\frontend

# (Optional) If running for the first time:
# npm install

# Start Vite dev server on http://localhost:5173
npm run dev
```

Open your browser at **http://localhost:5173** to view NyayaFlow AI.

---

## Running Automated Backend Tests

To run the complete unit and integration test suite:
```powershell
cd C:\Users\user\.gemini\antigravity\scratch\nyayaflow-ai\backend
.\venv\Scripts\pytest.exe -v
```

All 18 tests cover:
- Deterministic scoring edge cases (zero days, negative days clamped, future date clamped, missing data warnings).
- Neutral deadline behavior vs overdue deadline escalation.
- Custom weight what-if calculations.
- API endpoints for cases, filtering, details, explanations, actions, analytics, simulator, and CSV export.

---

## Resetting the Database
You can restore the synthetic dataset at any time:
1. In the web interface, click **Data Admin** in the top navigation bar.
2. Under **Reset Database**, type `RESET` and click **Confirm Reset**.
3. Or send a POST request:
```powershell
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/api/admin/reset"
```
