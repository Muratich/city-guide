from time import perf_counter

from fastapi import APIRouter, FastAPI, Request
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

app = FastAPI(
    title="City Guide API",
    version="0.1.0",
)

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
        return await call_next(request)

    started_at = perf_counter()
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
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


# Do not count vmagent's periodic scrape as an application HTTP request.
Instrumentator(excluded_handlers=["/metrics", "/health"]).instrument(app)


@app.get("/metrics", include_in_schema=False)
def metrics() -> Response:
    return Response(
        content=generate_latest(REGISTRY),
        media_type=CONTENT_TYPE_LATEST,
    )
