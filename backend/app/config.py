import os
from pathlib import Path
from dotenv import load_dotenv

# Base paths
BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
DATA_DIR = PROJECT_ROOT / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "nyayaflow.db"
DEFAULT_DB_URL = f"sqlite:///{DB_PATH}"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DB_URL)
# If postgresql:// URL provided by cloud hosts, replace with postgresql+psycopg2 if needed
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Load environment variables from .env if present
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(BACKEND_DIR / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

# Procedural stages benchmarks (illustrative standard benchmark in days)
STAGE_BENCHMARKS = {
    "Filing & Scrutiny": 15,
    "Service of Summons": 30,
    "Pleadings & Written Statement": 45,
    "Framing of Issues": 30,
    "Evidence & Witness Examination": 90,
    "Final Arguments": 45,
    "Judgment Reserved": 30,
    "Post-Judgment Compliance": 60,
}

ALL_STAGES = list(STAGE_BENCHMARKS.keys())

ALL_CATEGORIES = [
    "Civil Commercial",
    "Civil Property",
    "Criminal Bail Application",
    "Criminal Summary Trial",
    "Family Custody & Maintenance",
    "Constitutional Writ Petition",
    "Labor & Industrial Dispute",
    "Motor Accident Claims",
]

DATA_QUALITY_FLAGS = [
    "None",
    "Missing Proof of Service",
    "Incomplete Vakalatnama / Representation",
    "Unverified Process Fee Receipt",
    "Pending Certified Translation",
    "Missing Respondent Address Record",
]
