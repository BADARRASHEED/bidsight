from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401 - registers SQLModel tables
from app.config import get_settings
from app.database import create_db_and_tables
from app.routers.evaluations import router as evaluations_router
from app.routers.quotations import router as quotations_router
from app.schemas import HealthResponse


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    create_db_and_tables()
    yield


settings = get_settings()
app = FastAPI(
    title="BidSight API",
    version="0.1.0",
    description="Procurement quotation extraction, comparison, and recommendation API.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url.rstrip("/")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(evaluations_router)
app.include_router(quotations_router)


@app.get("/", include_in_schema=False)
def root() -> dict[str, str]:
    return {
        "name": "BidSight API",
        "status": "ok",
        "documentation": "/docs",
    }


@app.get("/api/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    return HealthResponse(status="ok")
