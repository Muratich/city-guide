from time import perf_counter
import os
import socket

from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from prometheus_fastapi_instrumentator import Instrumentator
from prometheus_client import REGISTRY
from prometheus_client.openmetrics.exposition import CONTENT_TYPE_LATEST, generate_latest

from app.api.routes import (
    categories,
    cities,
    places,
    trip_items,
    trip_plans,
    visits,
)
from app.core.config import settings
from app.core.metrics import api_request_duration, api_requests
from app.core.metrics import app_build_info
from app.db.database import engine
from sqlalchemy import text

app = FastAPI(
    title="City Guide API",
    version="0.1.0",
)

APP_VERSION = os.getenv("APP_VERSION", "dev")
POD_NAME = os.getenv("POD_NAME", socket.gethostname())
app_build_info.labels(version=APP_VERSION, pod=POD_NAME).set(1)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")
api.include_router(cities.router)
api.include_router(categories.router)
api.include_router(places.router)
api.include_router(visits.router)
api.include_router(trip_plans.router)
api.include_router(trip_items.router)
app.include_router(api)


@app.middleware("http")
async def collect_api_sli_metrics(request: Request, call_next):
    # Keep the SLI focused on user-facing API traffic. Health and metrics
    # scrapes are observed separately and must not improve request SLI scores.
    if not request.url.path.startswith("/api/"):
        response = await call_next(request)
        response.headers["X-CityGuide-Version"] = APP_VERSION
        response.headers["X-CityGuide-Pod"] = POD_NAME
        return response

    started_at = perf_counter()
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        response.headers["X-CityGuide-Version"] = APP_VERSION
        response.headers["X-CityGuide-Pod"] = POD_NAME
        return response
    finally:
        route = request.scope.get("route")
        route_name = getattr(route, "path", "unmatched")
        outcome = "good" if status_code < 500 else "bad"
        api_requests.labels(route_name, request.method, outcome).inc()
        api_request_duration.labels(route_name, request.method).observe(
            perf_counter() - started_at
        )


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready", include_in_schema=False)
def readiness_check() -> dict[str, str]:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as error:
        raise HTTPException(status_code=503, detail="database unavailable") from error
    return {"status": "ready"}


@app.get("/version", include_in_schema=False)
def version() -> dict[str, str]:
    return {"version": APP_VERSION, "pod": POD_NAME}


# Do not count vmagent's periodic scrape as an application HTTP request.
Instrumentator(excluded_handlers=["/metrics", "/health"]).instrument(app)


@app.get("/metrics", include_in_schema=False)
def metrics() -> Response:
    return Response(
        content=generate_latest(REGISTRY),
        media_type=CONTENT_TYPE_LATEST,
    )
