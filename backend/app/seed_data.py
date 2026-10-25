"""Synthetic Data Generator and Database Seeder for NyayaFlow AI.

Generates 125 internally consistent, strictly fictional court case records
with procedural histories, deterministic priority scores, and administrative actions.
Uses non-identifiable fictional numbers (NF-2026-0001 to NF-2026-0125).
"""

import json
import random
from datetime import datetime, timedelta, date, timezone
from sqlalchemy.orm import Session

from app.config import ALL_STAGES, ALL_CATEGORIES, DATA_QUALITY_FLAGS, STAGE_BENCHMARKS
from app.models import Case, CaseEvent, PriorityScore, AdministrativeAction, AuditLog
from app.scoring import calculate_priority_score


REFERENCE_DATE = date(2026, 10, 25)


EVENT_TEMPLATES = {
    "Filing & Scrutiny": [
        "Fictional plaint and affidavit registered at registry e-filing counter.",
        "Scrutiny completed by Registry officer; preliminary procedural objections cleared.",
        "Defects cured by filing counsel; application formally docketed.",
    ],
    "Service of Summons": [
        "Summons issued through registered post and electronic notice portal.",
        "Notice return received; affidavit of service submitted by bailiff.",
        "Substituted service permitted via paper publication; acknowledgment awaited.",
    ],
    "Pleadings & Written Statement": [
        "Respondent appearance entered; time sought for filing written statement.",
        "Written statement and list of documents submitted by contesting parties.",
        "Rejoinder and replication filed; pleadings closed.",
    ],
    "Framing of Issues": [
        "Draft issues proposed by parties examined by court registry.",
        "Procedural issues settled and framed for trial.",
        "Pre-trial conference held; documentary admission/denial recorded.",
    ],
    "Evidence & Witness Examination": [
        "Examination-in-chief of primary witness PW-1 completed.",
        "Cross-examination conducted; documentary exhibits marked.",
        "Evidence closed on behalf of petitioner; defense witness schedule set.",
    ],
    "Final Arguments": [
        "Petitioner counsel commenced oral submissions on procedural merits.",
        "Respondent counsel concluded arguments; written submission briefs placed on record.",
        "Final submissions heard; bench directed both parties to file case notes.",
    ],
    "Judgment Reserved": [
        "Matter concluded and formal judgment reserved for pronouncement.",
        "Registry instructed to prepare formal draft case decree sheet.",
    ],
    "Post-Judgment Compliance": [
        "Certified copy of decree forwarded to executing registry.",
        "Compliance report filed regarding procedural decree enforcement.",
    ],
}


def build_synthetic_cases():
    """Generates 125 rich synthetic cases with chronological consistency."""
    # Seed random for determinism across fresh seeds
    rng = random.Random(42)

    cases = []
    current_year = 2026

    for i in range(1, 126):
        case_num = f"NF-{current_year}-{i:04d}"
        category = rng.choice(ALL_CATEGORIES)

        # Disposed vs Pending distribution (approx 15% disposed)
        is_disposed = (i % 7 == 0)
        
        if is_disposed:
            current_stage = "Post-Judgment Compliance"
            status = "Disposed"
        else:
            current_stage = rng.choice(ALL_STAGES)
            # 20% review needed, 15% ready for hearing, rest pending
            if i % 5 == 0:
                status = "Administrative Review Needed"
            elif i % 4 == 0:
                status = "Ready for Hearing"
            else:
                status = "Pending"

        # Determine stage index
        stage_idx = ALL_STAGES.index(current_stage)

        # Days at stage
        benchmark = STAGE_BENCHMARKS.get(current_stage, 30)
        # Create varied distribution: some well within benchmark, some severely delayed bottlenecks
        if i % 6 == 0:
            # Major bottleneck case (3x to 5x benchmark)
            days_at_stage = int(benchmark * rng.uniform(2.5, 4.8))
        elif i % 3 == 0:
            # Moderate delay
            days_at_stage = int(benchmark * rng.uniform(1.1, 2.2))
        else:
            # Healthy or routine
            days_at_stage = max(3, int(benchmark * rng.uniform(0.2, 0.95)))

        # Filing date calculation
        # Sum of previous stage typical durations + days_at_stage + buffer
        total_days_elapsed = days_at_stage
        for prev_s in ALL_STAGES[:stage_idx]:
            total_days_elapsed += int(STAGE_BENCHMARKS[prev_s] * rng.uniform(0.8, 1.6))
        
        # Add random filing drift
        total_days_elapsed += rng.randint(10, 60)
        filing_d = REFERENCE_DATE - timedelta(days=total_days_elapsed)
        filing_date_str = filing_d.strftime("%Y-%m-%d")

        # Last updated date
        last_update_d = REFERENCE_DATE - timedelta(days=rng.randint(1, min(days_at_stage + 1, 25)))
        last_updated_str = last_update_d.strftime("%Y-%m-%d")

        # Missing information / data quality flag (approx 20% cases)
        if i % 5 == 2:
            missing_info = rng.choice(DATA_QUALITY_FLAGS[1:])
        else:
            missing_info = "None"

        # Documented deadline (approx 25% cases)
        documented_deadline_str = None
        if i % 4 == 1:
            # Overdue deadline
            dd = REFERENCE_DATE - timedelta(days=rng.randint(3, 40))
            documented_deadline_str = dd.strftime("%Y-%m-%d")
        elif i % 4 == 3:
            # Upcoming deadline (5 to 45 days ahead)
            dd = REFERENCE_DATE + timedelta(days=rng.randint(5, 45))
            documented_deadline_str = dd.strftime("%Y-%m-%d")

        # Generate chronological procedural events
        events_data = []
        event_cur_date = filing_d
        for s_idx in range(stage_idx + 1):
            stage_name = ALL_STAGES[s_idx]
            prev_stage_name = ALL_STAGES[s_idx - 1] if s_idx > 0 else None
            
            note_options = EVENT_TEMPLATES.get(stage_name, ["Procedural step entered."])
            note = rng.choice(note_options)
            
            events_data.append({
                "previous_stage": prev_stage_name,
                "new_stage": stage_name,
                "event_date": event_cur_date.strftime("%Y-%m-%d"),
                "notes": note,
            })
            
            # Advance event date towards current stage
            if s_idx < stage_idx:
                step_days = max(5, int(STAGE_BENCHMARKS[stage_name] * rng.uniform(0.7, 1.3)))
                event_cur_date = min(REFERENCE_DATE - timedelta(days=days_at_stage), event_cur_date + timedelta(days=step_days))

        cases.append({
            "case_number": case_num,
            "category": category,
            "filing_date": filing_date_str,
            "current_stage": current_stage,
            "days_at_stage": days_at_stage,
            "status": status,
            "last_updated": last_updated_str,
            "missing_information": missing_info,
            "documented_deadline_date": documented_deadline_str,
            "events": events_data,
        })

    return cases


def seed_database(db: Session, force_reset: bool = False):
    """Seeds the SQLite database if empty or if force_reset is requested."""
    case_count = db.query(Case).count()
    if case_count > 0 and not force_reset:
        return {"status": "skipped", "message": f"Database already contains {case_count} cases."}

    if force_reset:
        db.query(AuditLog).delete()
        db.query(AdministrativeAction).delete()
        db.query(PriorityScore).delete()
        db.query(CaseEvent).delete()
        db.query(Case).delete()
        db.commit()

    cases_raw = build_synthetic_cases()

    for item in cases_raw:
        # Create Case
        case_obj = Case(
            case_number=item["case_number"],
            category=item["category"],
            filing_date=item["filing_date"],
            current_stage=item["current_stage"],
            days_at_stage=item["days_at_stage"],
            status=item["status"],
            last_updated=item["last_updated"],
            missing_information=item["missing_information"],
            documented_deadline_date=item["documented_deadline_date"],
        )
        db.add(case_obj)
        db.flush()  # populate case_obj.id

        # Create Events
        for ev in item["events"]:
            event_obj = CaseEvent(
                case_id=case_obj.id,
                previous_stage=ev["previous_stage"],
                new_stage=ev["new_stage"],
                event_date=ev["event_date"],
                notes=ev["notes"],
            )
            db.add(event_obj)

        # Calculate Priority Score deterministically
        score_res = calculate_priority_score(
            filing_date_str=case_obj.filing_date,
            current_stage=case_obj.current_stage,
            days_at_stage=case_obj.days_at_stage,
            missing_information=case_obj.missing_information,
            documented_deadline_str=case_obj.documented_deadline_date,
            reference_date_str="2026-10-25",
        )

        score_obj = PriorityScore(
            case_id=case_obj.id,
            score=score_res["score"],
            factor_breakdown_json=json.dumps(score_res["factor_breakdown"]),
            rule_version=score_res["rule_version"],
        )
        db.add(score_obj)

        # Generate Administrative Actions for cases needing follow-up
        if score_res["score"] >= 65.0 or case_obj.missing_information != "None":
            action_desc = []
            if case_obj.missing_information != "None":
                action_desc.append(f"Administrative notice: Follow-up required for missing record '{case_obj.missing_information}'.")
            if case_obj.days_at_stage > STAGE_BENCHMARKS.get(case_obj.current_stage, 30) * 1.5:
                action_desc.append(f"Procedural diary review: Prolonged stay at stage '{case_obj.current_stage}' ({case_obj.days_at_stage} days).")
            if case_obj.documented_deadline_date:
                action_desc.append(f"Statutory tracking: Verify compliance status for target date {case_obj.documented_deadline_date}.")

            for desc in action_desc:
                action_obj = AdministrativeAction(
                    case_id=case_obj.id,
                    action_description=desc,
                    status="Open" if case_obj.id % 2 == 0 else "In Progress",
                )
                db.add(action_obj)

    # Add audit log
    audit_entry = AuditLog(
        action_type="DATABASE_SEED",
        record_type="system",
        record_id=str(len(cases_raw)),
        details=f"Seeded {len(cases_raw)} synthetic case records with procedural histories and deterministic priority scores.",
    )
    db.add(audit_entry)
    db.commit()

    return {
        "status": "success",
        "cases_seeded": len(cases_raw),
        "message": f"Successfully initialized database with {len(cases_raw)} synthetic cases."
    }
