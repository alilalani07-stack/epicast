import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

load_dotenv()

from database import run_migrations
from routers import areas, reports, zones, alerts, forecast, stats, auth_routes
from auth import verify_token
from limiter import limiter

#Logging configuration for consistent and informative output across the application

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup tasks before yielding, shutdown tasks after."""
    logger.info("🚀 EpiCast API starting up…")
    
    # Environment validation
    if os.environ.get("ENV") == "production":
        if not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
            logger.error("CRITICAL: GOOGLE_APPLICATION_CREDENTIALS is not set in production!")
            raise RuntimeError("Missing GOOGLE_APPLICATION_CREDENTIALS in production environment.")
    
    run_migrations()
    logger.info("✅ Ready.")
    yield
    logger.info("🛑 EpiCast API shutting down.")

#App initialization with metadata and lifespan management

app = FastAPI(
    title="EpiCast Outbreak Intelligence API",
    description=(
        "Real-time disease outbreak monitoring: geospatial risk zones, "
        "automated alerting, trend analysis, and multi-model forecasting."
    ),
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        os.environ.get("FRONTEND_URL", "https://epicast.vercel.app")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#Routes for the API endpoints, protected by default

app.include_router(areas.router, dependencies=[Depends(verify_token)])
app.include_router(reports.router, dependencies=[Depends(verify_token)])
app.include_router(zones.router, dependencies=[Depends(verify_token)])
app.include_router(alerts.router, dependencies=[Depends(verify_token)])
app.include_router(forecast.router, dependencies=[Depends(verify_token)])
app.include_router(stats.router, dependencies=[Depends(verify_token)])
app.include_router(auth_routes.router)

#Health check endpoint for liveness probes

@app.get("/health", tags=["Meta"])
async def health_check():
    """Quick liveness probe."""
    return {"status": "ok", "version": app.version}