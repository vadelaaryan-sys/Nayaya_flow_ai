"""AI and Deterministic Explanation Service for NyayaFlow AI.

Explains authoritative administrative priority scores.
Does NOT compute or modify scores.
Does NOT determine legal urgency or guilt.
Falls back seamlessly to local deterministic templates when GEMINI_API_KEY is not set or unavailable.
"""

import json
import logging
from typing import Dict, Any, List
import httpx
from app.config import GEMINI_API_KEY

logger = logging.getLogger(__name__)

DISCLAIMER = (
    "ADMINISTRATIVE EXPLANATION ONLY: This breakdown explains procedural delay indicators. "
    "It does not evaluate legal merits or suggest substantive judicial action."
)


def generate_deterministic_explanation(case_data: Dict[str, Any], breakdown: Dict[str, Any], score: float) -> Dict[str, Any]:
    """Generate structured, transparent, non-AI explanation using deterministic templates."""
    case_num = case_data.get("case_number", "Case")
    category = case_data.get("category", "General")
    stage = case_data.get("current_stage", "Unknown")
    days_at_stage = case_data.get("days_at_stage", 0)
    missing_info = case_data.get("missing_information")
    deadline = case_data.get("documented_deadline_date")

    age_f = breakdown.get("age_factor", {})
    stage_f = breakdown.get("stage_delay_factor", {})
    dead_f = breakdown.get("deadline_factor", {})
    qual_f = breakdown.get("data_quality_factor", {})

    factors_explained: List[str] = []
    checklist: List[str] = []

    # Summary sentence
    summary = (
        f"{case_num} ({category}) currently has an administrative priority score of {score}/100. "
        f"This indicator suggests administrative tracking attention due to elapsed procedural timelines."
    )

    # Procedural context
    context = (
        f"The case is currently in the '{stage}' stage, where it has remained for {days_at_stage} days. "
        f"The illustrative administrative benchmark for this stage is {stage_f.get('benchmark_days', 30)} days."
    )

    # Factor explanations
    age_days = age_f.get("days", 0)
    factors_explained.append(
        f"Case Age: Filed {age_days} days ago (~{(age_days / 365.25):.1f} years), contributing "
        f"{age_f.get('points', 0)} of {age_f.get('weight', 30)} possible age priority points."
    )

    bench = stage_f.get("benchmark_days", 30)
    if days_at_stage > bench:
        excess = days_at_stage - bench
        factors_explained.append(
            f"Stage Delay: Case has spent {days_at_stage} days in '{stage}', exceeding the {bench}-day benchmark "
            f"by {excess} days. This contributes {stage_f.get('points', 0)} of {stage_f.get('weight', 35)} delay points."
        )
        checklist.append(f"Administrative review: Verify why proceedings at '{stage}' have exceeded {bench} days.")
    else:
        factors_explained.append(
            f"Stage Progression: Case has spent {days_at_stage} days in '{stage}', within the expected {bench}-day benchmark "
            f"({stage_f.get('points', 0)} points assigned)."
        )

    if dead_f.get("points", 0) > 0:
        factors_explained.append(
            f"Procedural Deadline: {dead_f.get('status')} ({dead_f.get('points', 0)} points). "
            f"{dead_f.get('detail')}"
        )
        checklist.append(f"Compliance verification: Check procedural compliance relative to target date {deadline}.")
    else:
        factors_explained.append("Procedural Deadline: No overdue or approaching documented deadline recorded.")

    if qual_f.get("has_missing_info"):
        factors_explained.append(
            f"Data Quality Flag: '{missing_info}' is flagged in registry records ({qual_f.get('points', 0)} points). "
            "Note: Missing records require registry verification and do not lower administrative urgency."
        )
        checklist.append(f"Registry rectification: Request submission or verification of '{missing_info}'.")
    else:
        factors_explained.append("Data Quality: All standard registry records and filings appear complete.")

    if not checklist:
        checklist.append("Routine administrative audit: Maintain standard procedural diary tracking.")

    return {
        "case_id": case_data.get("id", 0),
        "case_number": case_num,
        "is_ai_generated": False,
        "explanation_source": "Deterministic Local Template",
        "summary": summary,
        "procedural_context": context,
        "delay_factors_explanation": factors_explained,
        "suggested_administrative_checklist": checklist,
        "disclaimer": DISCLAIMER,
    }


async def get_case_explanation(case_data: Dict[str, Any], breakdown: Dict[str, Any], score: float) -> Dict[str, Any]:
    """
    Attempt Google Gemini explanation if key available, otherwise fallback cleanly to deterministic template.
    Never lets AI modify or invent scores.
    """
    if not GEMINI_API_KEY:
        return generate_deterministic_explanation(case_data, breakdown, score)

    # Prepare minimal necessary fictional case payload (sanitized)
    minimal_payload = {
        "case_number": case_data.get("case_number"),
        "category": case_data.get("category"),
        "current_stage": case_data.get("current_stage"),
        "days_at_stage": case_data.get("days_at_stage"),
        "filing_date": case_data.get("filing_date"),
        "missing_information": case_data.get("missing_information"),
        "documented_deadline_date": case_data.get("documented_deadline_date"),
        "authoritative_score": score,
        "breakdown": breakdown,
    }

    system_instruction = (
        "You are an explainability assistant for court registry administrative staff. "
        "Explain the deterministic score factors already computed for this fictional case. "
        "RULES:\n"
        "1. Do NOT calculate or change the authoritative score. Use the exact score provided.\n"
        "2. Do NOT evaluate legal merits, assess guilt, or predict judicial rulings.\n"
        "3. Focus solely on administrative workflow delays, stage benchmarks, and missing documentation.\n"
        "4. Respond with valid JSON with keys: summary (string), procedural_context (string), "
        "delay_factors_explanation (list of strings), suggested_administrative_checklist (list of strings)."
    )

    prompt = (
        f"{system_instruction}\n\n"
        f"Case Data:\n{json.dumps(minimal_payload, indent=2)}\n\n"
        "Return ONLY the JSON object."
    )

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                url,
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"},
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                parsed = json.loads(raw_text)
                return {
                    "case_id": case_data.get("id", 0),
                    "case_number": case_data.get("case_number", "Case"),
                    "is_ai_generated": True,
                    "explanation_source": "Google Gemini API",
                    "summary": parsed.get("summary", ""),
                    "procedural_context": parsed.get("procedural_context", ""),
                    "delay_factors_explanation": parsed.get("delay_factors_explanation", []),
                    "suggested_administrative_checklist": parsed.get("suggested_administrative_checklist", []),
                    "disclaimer": DISCLAIMER,
                }
    except Exception as e:
        logger.warning(f"Gemini API explanation failed: {e}. Falling back to deterministic template.")

    # Safe fallback
    return generate_deterministic_explanation(case_data, breakdown, score)
