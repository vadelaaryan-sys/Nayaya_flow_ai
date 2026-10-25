import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base, SessionLocal
from app.seed_data import seed_database
from app.routes import cases, analytics, actions, simulator, admin, ai
from app.scoring import DISCLAIMER_TEXT


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    # Seed synthetic data on first run if empty
    db = SessionLocal()
    try:
        seed_database(db, force_reset=False)
    finally:
        db.close()
    yield


app = FastAPI(
    title="NyayaFlow AI API",
    description="Explainable Court Backlog and Procedural Bottleneck Assistant API (Fictional Demonstration Prototype)",
    version="1.2.0",
    lifespan=lifespan,
)

# Enable CORS for local development and deployed frontend (e.g. Vercel)
frontend_url = os.getenv("FRONTEND_URL", "").strip()
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(cases.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(actions.router, prefix="/api")
app.include_router(simulator.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(ai.router, prefix="/api")


@app.get("/")
def root():
    return {
        "name": "NyayaFlow AI API",
        "version": "1.2.0",
        "status": "operational",
        "notice": "Demonstration prototype for administrative procedural tracking with synthetic data only.",
        "disclaimer": DISCLAIMER_TEXT,
    }
