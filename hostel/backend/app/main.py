from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.api.v1.api import api_router
from app.services.seed import seed_database
import app.models  # ensure models are registered with Base metadata


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize database tables and seed sample data."""
    # Create tables if not existing
    Base.metadata.create_all(bind=engine)

    # Seed initial test data
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-ready REST API for MSEC Hostel Management Dashboard",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Set up CORS
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/", tags=["Health Check"])
def root_endpoint():
    """Root health check and welcome endpoint."""
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "documentation": "/docs",
        "api_v1": settings.API_V1_STR,
    }


@app.get("/health", tags=["Health Check"])
def health_check():
    """Lightweight health check probe for load balancers & containers."""
    return {"status": "healthy"}


# Include Version 1 API routes
app.include_router(api_router, prefix=settings.API_V1_STR)
