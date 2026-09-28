from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import TripPlan
from app.schemas.trip_item import TripItemOut
from app.schemas.trip_plan import TripPlanCreate, TripPlanOut, TripPlanUpdate

router = APIRouter(prefix="/trip-plans", tags=["trip-plans"])


@router.get("", response_model=list[TripPlanOut])
def list_trip_plans(db: Session = Depends(get_db)):
    return db.scalars(select(TripPlan).order_by(TripPlan.name)).all()


@router.post("", response_model=TripPlanOut, status_code=201)
def create_trip_plan(payload: TripPlanCreate, db: Session = Depends(get_db)):
    plan = TripPlan(**payload.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.get("/{plan_id}/items", response_model=list[TripItemOut])
def plan_items(plan_id: int, db: Session = Depends(get_db)):
    plan = db.get(TripPlan, plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Trip plan not found")
    return plan.items


@router.get("/{plan_id}", response_model=TripPlanOut)
def get_trip_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.get(TripPlan, plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Trip plan not found")
    return plan


@router.patch("/{plan_id}", response_model=TripPlanOut)
def update_trip_plan(
    plan_id: int,
    payload: TripPlanUpdate,
    db: Session = Depends(get_db),
):
    plan = db.get(TripPlan, plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Trip plan not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)
    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/{plan_id}", status_code=204)
def delete_trip_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.get(TripPlan, plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Trip plan not found")
    db.delete(plan)
    db.commit()