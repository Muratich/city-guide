from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Place, TripItem, TripPlan


def validate_same_city(db: Session, trip_plan_id: int, place_id: int) -> None:
    plan = db.get(TripPlan, trip_plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Trip plan not found")
    place = db.get(Place, place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")
    if plan.city_id != place.city_id:
        raise HTTPException(
            status_code=422,
            detail="Place belongs to a different city than the trip plan",
        )


def next_position(db: Session, trip_plan_id: int) -> int:
    current = db.scalar(
        select(func.max(TripItem.position)).where(
            TripItem.trip_plan_id == trip_plan_id
        )
    )
    return (current if current is not None else -1) + 1