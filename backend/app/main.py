from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    categories,
    cities,
    places,
    trip_items,
    trip_plans,
    visits,
)
from app.core.config import settings

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


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}