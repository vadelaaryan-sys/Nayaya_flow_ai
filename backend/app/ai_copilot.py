"""Interactive AI Procedural Copilot Engine for NyayaFlow AI.

Provides conversational AI assistance, draft notices, bottleneck diagnostics,
and root-cause analysis for court administrators.
Supports:
1. Live Google Gemini API (when configured)
2. Built-in Local Procedural NLP Intelligence Engine (works 100% offline, zero API keys required)
"""

import os
import json
import re
from datetime import datetime
from typing import Dict, Any, List, Optional
import httpx
from app.config import STAGE_BENCHMARKS, PROJECT_ROOT
from app.models import Case, PriorityScore, CaseEvent, AdministrativeAction
from sqlalchemy.orm import Session

DISCLAIMER = (
    "AI ADMINISTRATIVE ASSISTANT: Generated for procedural court workflow and diary tracking on fictional records. "
    "Does not determine legal merits, evaluate guilt, or replace judicial discretion."
)


def get_current_gemini_key() -> str:
    return os.getenv("GEMINI_API_KEY", "").strip()


def set_current_gemini_key(key: str) -> bool:
    clean_key = key.strip()
    os.environ["GEMINI_API_KEY"] = clean_key
    # Persist to .env file in project root
    env_file = PROJECT_ROOT / ".env"
    try:
        lines = []
        if env_file.exists():
            with open(env_file, "r", encoding="utf-8") as f:
                lines = f.readlines()
        
        found = False
        new_lines = []
        for line in lines:
            if line.startswith("GEMINI_API_KEY="):
                new_lines.append(f"GEMINI_API_KEY={clean_key}\n")
                found = True
            else:
                new_lines.append(line)
        if not found:
            new_lines.append(f"GEMINI_API_KEY={clean_key}\n")

        with open(env_file, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
        return True
    except Exception as e:
        print(f"Error saving .env: {e}")
        return False


async def test_gemini_key(key: str) -> Dict[str, Any]:
    """Test Gemini API key with a small prompt."""
    if not key:
        return {"valid": False, "message": "Key cannot be empty."}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                url,
                json={"contents": [{"parts": [{"text": "Hello, respond with 'AI Ready'."}]}]},
            )
            if resp.status_code == 200:
                return {"valid": True, "message": "Google Gemini API connected successfully!"}
            else:
                err_detail = resp.json().get("error", {}).get("message", resp.text)
                return {"valid": False, "message": f"Gemini API rejected key: {err_detail}"}
    except Exception as e:
        return {"valid": False, "message": f"Connection error: {str(e)}"}


def build_local_nlp_response(user_message: str, case_context: Optional[Dict[str, Any]], db_summary: Dict[str, Any]) -> str:
    """
    Intelligent local procedural NLP engine.
    Generates rich, tailored, dynamic administrative analysis based on the actual database context.
    """
    msg = user_message.lower()

    # 1. Draft an Administrative Notice
    if "draft" in msg or "notice" in msg or "letter" in msg or "summon" in msg:
        case_num = case_context.get("case_number", "NF-2026-XXXX") if case_context else "NF-2026-[Case Number]"
        cat = case_context.get("category", "Civil / Commercial") if case_context else "General Matter"
        stage = case_context.get("current_stage", "Service of Summons") if case_context else "Filing & Scrutiny"
        missing = case_context.get("missing_information", "Proof of Service") if case_context else "Mandatory Registry Filing"
        if not missing or missing == "None":
            missing = "Updated Process Fee & Address Schedule"

        return (
            f"### Official Registry Administrative Notice (Draft)\n\n"
            f"**To:** Counsel of Record / Filing Litigant  \n"
            f"**In the Court of Administration & Registry**  \n"
            f"**Case Reference:** `{case_num}` ({cat})  \n"
            f"**Current Procedural Stage:** {stage}  \n"
            f"**Date:** {datetime.now().strftime('%d %B %Y')}  \n\n"
            f"**SUBJECT: ADMINISTRATIVE DEFECT NOTICE & CALL-WORK DIRECTIVE**\n\n"
            f"Sir / Madam,\n\n"
            f"1. On administrative scrutiny of the electronic procedural diary for `{case_num}`, it is noted that the matter has remained pending at the '{stage}' stage for an extended duration.\n\n"
            f"2. **Specific Administrative Defect:** The registry records indicate: **{missing}** has not been verified on record within standard timeframes.\n\n"
            f"3. You are hereby called upon to cure the defect or submit the requisite verification receipt before the Administrative Registry within **7 days** of this communication, failing which the matter shall be listed before the Registrar for appropriate administrative directions.\n\n"
            f"By Order of the Administrative Registrar,  \n"
            f"*Court Registry & Backlog Management Section*\n\n"
            f"> *Note: This notice is generated to rectify procedural record completeness and does not adjudicate substantive legal rights.*"
        )

    # 2. Case Specific Query (Why is this case delayed / score explanation)
    if case_context:
        case_num = case_context.get("case_number")
        cat = case_context.get("category")
        stage = case_context.get("current_stage")
        days = case_context.get("days_at_stage", 0)
        score = case_context.get("score", 0.0)
        missing = case_context.get("missing_information", "None")
        bench = STAGE_BENCHMARKS.get(stage, 30)

        response = [
            f"### Procedural Delay Analysis for `{case_num}`",
            f"**Category:** {cat} | **Current Stage:** {stage} | **Administrative Priority Score:** {score}/100",
            "",
            f"**Key Findings:**",
            f"- **Stage Bottleneck:** The case has remained at '{stage}' for **{days} days**. The administrative benchmark for this step is **{bench} days**.",
        ]

        if days > bench:
            excess = days - bench
            response.append(
                f"- **Excess Lingering:** Proceedings have exceeded standard benchmark duration by **{excess} days** ({round(days/bench, 1)}x benchmark)."
            )
        else:
            response.append(f"- **Progression Pace:** Currently progressing within the normal {bench}-day benchmark.")

        if missing and missing != "None":
            response.append(
                f"- **Data Quality Anomaly:** Missing **'{missing}'**. This anomaly triggers priority review points to ensure registry verification, and does not lower operational urgency."
            )
        else:
            response.append("- **Registry Documentation:** All mandatory standard registry records appear complete.")

        response.extend([
            "",
            "**Recommended Actionable Steps:**",
            f"1. Issue an administrative reminder to counsel regarding '{stage}' compliance.",
            f"2. Check court diary schedule to confirm whether summons returns or written statements have been received but not indexed.",
            f"3. Mark this case for administrative listing if no progress occurs within the next 10 business days."
        ])
        return "\n".join(response)

    # 3. Overall Bottlenecks & Friction Inquiry
    if "bottleneck" in msg or "stalled" in msg or "worst" in msg or "delay" in msg or "friction" in msg:
        top_b = db_summary.get("top_bottlenecks", [])
        lines = [
            "### AI Bottleneck Diagnostic Report",
            f"Based on real-time analysis of {db_summary.get('total_cases', 125)} synthetic records in the local SQLite database:",
            "",
            "**Most Congested Procedural Stages:**",
        ]
        for idx, b in enumerate(top_b, 1):
            lines.append(
                f"{idx}. **{b.get('stage')}**: {b.get('case_count')} cases accumulated. "
                f"Average stay is **{b.get('avg_days')} days** vs standard benchmark of {b.get('benchmark')} days "
                f"(**{b.get('delay_ratio')}x delay multiplier**)."
            )

        lines.extend([
            "",
            "**Operational Recommendations for Administrators:**",
            "- **Targeted Call-Work Days:** Schedule dedicated registry call-work sessions for the top 2 congested stages to clear document backlog.",
            "- **Service Compliance Drive:** Prioritize verification of summons acknowledgments and process fee receipts to prevent pre-trial stalling.",
            "- **Bench Allotment Advisory:** Notify the presiding roster coordinator where final argument queues are accumulating beyond 45 days."
        ])
        return "\n".join(lines)

    # 4. Priority Scoring Explanation Inquiry
    if "score" in msg or "how" in msg or "formula" in msg or "calculate" in msg or "weight" in msg:
        return (
            "### Explainable Scoring Architecture (v1.2)\n\n"
            "NyayaFlow AI calculates the **Administrative Review Priority Score (0–100)** deterministically through four transparent factors:\n\n"
            "1. **Case Age (30% weight):** Calendar days since original filing date evaluated against a 3-year standard benchmark.\n"
            "2. **Stage Delay (35% weight):** Days lingering at the current procedural step compared against specific benchmarks (e.g., Summons: 30d, Arguments: 45d).\n"
            "3. **Procedural Deadlines (20% weight):** Documented target dates. Overdue deadlines award full points; imminent deadlines scale dynamically; cases without documented deadlines receive 0 pts (neutral).\n"
            "4. **Data Quality Flags (15% weight):** Registry document anomalies (e.g., missing proof of service, unverified fees). Raises urgent review alerts without lowering priority.\n\n"
            "> *Important: This score is an administrative prioritization tool for court registrars and case managers. It never evaluates legal merits, assesses guilt, or replaces judicial discretion.*"
        )

    # 5. Default General Conversational Response
    return (
        f"### NyayaFlow AI Procedural Assistant\n\n"
        f"I am active and monitoring {db_summary.get('total_cases', 125)} synthetic court case records in your local database. "
        f"There are currently **{db_summary.get('pending_cases', 108)} active pending cases**, with **{db_summary.get('data_quality_flagged_cases', 25)} cases flagged for missing documentation**.\n\n"
        f"**Here are things you can ask me to do:**\n"
        f"- *'Why is case NF-2026-0012 delayed?'* (Analyzes specific stage delays & benchmarks)\n"
        f"- *'Draft an administrative notice for missing proof of service'* (Generates official draft notices)\n"
        f"- *'Which procedural stages are causing the worst bottlenecks?'* (Identifies flow friction)\n"
        f"- *'How does the priority scoring formula work?'* (Explains factors & weights)\n"
        f"- *'What administrative follow-ups should the registry prioritize today?'*\n\n"
        f"*(Tip: You can also connect your Google Gemini API key in the AI Settings in the top bar for live multimodal LLM responses!)*"
    )


async def ask_copilot(
    message: str,
    case_id: Optional[int],
    history: List[Dict[str, str]],
    db: Session,
) -> Dict[str, Any]:
    """
    Main conversational agent.
    Dispatches to Google Gemini if API key is valid and available;
    otherwise executes the high-precision Local Procedural NLP Engine.
    """
    key = get_current_gemini_key()

    # Extract case context if case_id provided or mentioned in message (e.g. NF-2026-0042)
    case_context = None
    target_case = None

    if case_id:
        target_case = db.query(Case).filter(Case.id == case_id).first()
    else:
        # Check if user mentioned a case number in the prompt
        match = re.search(r"NF-2026-\d{4}", message, re.IGNORECASE)
        if match:
            c_num = match.group(0).upper()
            target_case = db.query(Case).filter(Case.case_number == c_num).first()

    if target_case:
        score_val = target_case.priority_score.score if target_case.priority_score else 0.0
        case_context = {
            "id": target_case.id,
            "case_number": target_case.case_number,
            "category": target_case.category,
            "current_stage": target_case.current_stage,
            "days_at_stage": target_case.days_at_stage,
            "filing_date": target_case.filing_date,
            "missing_information": target_case.missing_information,
            "documented_deadline_date": target_case.documented_deadline_date,
            "score": score_val,
        }

    # Summary of court database
    cases = db.query(Case).all()
    total_cases = len(cases)
    pending_count = sum(1 for c in cases if c.status != "Disposed")
    flagged_quality = sum(1 for c in cases if c.missing_information and c.missing_information != "None")
    
    # Calculate top bottleneck
    stage_metrics = []
    for stage, bench in STAGE_BENCHMARKS.items():
        s_cases = [c for c in cases if c.current_stage == stage and c.status != "Disposed"]
        if s_cases:
            avg_d = sum(c.days_at_stage for c in s_cases) / len(s_cases)
            stage_metrics.append({
                "stage": stage,
                "case_count": len(s_cases),
                "avg_days": round(avg_d, 1),
                "benchmark": bench,
                "delay_ratio": round(avg_d / bench, 2),
            })
    stage_metrics.sort(key=lambda x: x["delay_ratio"], reverse=True)

    db_summary = {
        "total_cases": total_cases,
        "pending_cases": pending_count,
        "data_quality_flagged_cases": flagged_quality,
        "top_bottlenecks": stage_metrics[:3],
    }

    # If Gemini Key is present, call Google Gemini
    if key:
        system_instruction = (
            "You are NyayaFlow AI, an explainable court backlog and procedural bottleneck assistant. "
            "You assist court registry staff in managing procedural diaries, identifying workflow delays, "
            "and drafting administrative notices on synthetic court records. "
            "RULES:\n"
            "1. NEVER determine legal merits, predict judicial rulings, or assess guilt.\n"
            "2. Prioritize explainability: reference case age, stage duration vs benchmarks, missing documents, and deadlines.\n"
            "3. Answer concisely in clean markdown with clear bullet points and action items."
        )

        prompt_parts = [
            f"System Context: {system_instruction}",
            f"Court Database Summary: {json.dumps(db_summary)}",
        ]
        if case_context:
            prompt_parts.append(f"Active Case Context: {json.dumps(case_context)}")
        
        prompt_parts.append(f"User Query: {message}")
        full_prompt = "\n\n".join(prompt_parts)

        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}"
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    url,
                    json={
                        "contents": [{"parts": [{"text": full_prompt}]}],
                        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 800},
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    ai_reply = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    return {
                        "reply": ai_reply,
                        "engine": "Google Gemini API (Live LLM)",
                        "model": "gemini-1.5-flash",
                        "is_ai_generated": True,
                        "case_context": case_context,
                        "disclaimer": DISCLAIMER,
                    }
        except Exception as e:
            print(f"Gemini call failed: {e}. Falling back to Local Procedural NLP Engine.")

    # Execute Local Procedural NLP Engine
    local_reply = build_local_nlp_response(message, case_context, db_summary)
    return {
        "reply": local_reply,
        "engine": "NyayaFlow Local Procedural NLP Engine",
        "model": "rule-nlp-v1.2-offline",
        "is_ai_generated": False,
        "case_context": case_context,
        "disclaimer": DISCLAIMER,
    }
