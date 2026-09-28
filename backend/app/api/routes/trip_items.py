from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import TripItem
from app.schemas.trip_item import TripItemCreate, TripItemOut, TripItemUpdate
from app.services.trip_items import next_position, validate_same_city

router = APIRouter(prefix="/trip-items", tags=["trip-items"])


@router.get("/{item_id}", response_model=TripItemOut)
def get_trip_item(item_id: int, db: Session = Depends(get_db)):
    item = db.get(TripItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Trip item not found")
    return item


@router.post("", response_model=TripItemOut, status_code=201)
def create_trip_item(payload: TripItemCreate, db: Session = Depends(get_db)):
    validate_same_city(db, payload.trip_plan_id, payload.place_id)
    data = payload.model_dump(exclude={"position"})
    item = TripItem(
        **data,
        position=next_position(db, payload.trip_plan_id),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{item_id}", response_model=TripItemOut)
def update_trip_item(
    item_id: int,
    payload: TripItemUpdate,
    db: Session = Depends(get_db),
):
    item = db.get(TripItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Trip item not found")
    data = payload.model_dump(exclude_unset=True)
    new_place_id = data.get("place_id", item.place_id)
    new_plan_id = data.get("trip_plan_id", item.trip_plan_id)
    if new_place_id != item.place_id or new_plan_id != item.trip_plan_id:
        validate_same_city(db, new_plan_id, new_place_id)
    for field, value in data.items():
        setattr(item, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Position already taken in this trip plan",
        )
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_trip_item(item_id: int, db: Session = Depends(get_db)):
    item = db.get(TripItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Trip item not found")
    db.delete(item)
    db.commit()