from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import Place, Visit
from app.schemas.filters import PlaceFilters
from app.schemas.place import PlaceCreate, PlaceOut, PlaceUpdate
from app.schemas.stats import PlaceStats
from app.schemas.visit import VisitOut

router = APIRouter(prefix="/places", tags=["places"])


@router.get("", response_model=list[PlaceOut])
def list_places(
    filters: PlaceFilters = Depends(),
    db: Session = Depends(get_db),
):
    stmt = select(Place)
    if filters.city_id is not None:
        stmt = stmt.where(Place.city_id == filters.city_id)
    if filters.category_id is not None:
        stmt = stmt.where(Place.category_id == filters.category_id)
    if filters.is_favorite is not None:
        stmt = stmt.where(Place.is_favorite == filters.is_favorite)
    if filters.min_rating is not None:
        avg_rating = (
            select(Visit.place_id, func.avg(Visit.rating).label("avg_rating"))
            .group_by(Visit.place_id)
            .subquery()
        )
        stmt = stmt.join(avg_rating, avg_rating.c.place_id == Place.id).where(
            avg_rating.c.avg_rating >= filters.min_rating
        )
    return db.scalars(stmt.order_by(Place.name)).all()


@router.post("", response_model=PlaceOut, status_code=201)
def create_place(payload: PlaceCreate, db: Session = Depends(get_db)):
    place = Place(**payload.model_dump())
    db.add(place)
    db.commit()
    db.refresh(place)
    return place


@router.get("/{place_id}/stats", response_model=PlaceStats)
def place_stats(place_id: int, db: Session = Depends(get_db)):
    place = db.get(Place, place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")
    visit_count, avg_rating = db.execute(
        select(func.count(Visit.id), func.avg(Visit.rating)).where(
            Visit.place_id == place_id
        )
    ).one()
    return PlaceStats(
        place_id=place_id,
        visit_count=visit_count,
        avg_rating=avg_rating,
    )


@router.get("/{place_id}/visits", response_model=list[VisitOut])
def place_visits(place_id: int, db: Session = Depends(get_db)):
    place = db.get(Place, place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")
    return db.scalars(
        select(Visit)
        .where(Visit.place_id == place_id)
        .order_by(Visit.visited_at)
    ).all()


@router.get("/{place_id}", response_model=PlaceOut)
def get_place(place_id: int, db: Session = Depends(get_db)):
    place = db.get(Place, place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")
    return place


@router.patch("/{place_id}", response_model=PlaceOut)
def update_place(
    place_id: int,
    payload: PlaceUpdate,
    db: Session = Depends(get_db),
):
    place = db.get(Place, place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(place, field, value)
    db.commit()
    db.refresh(place)
    return place


@router.delete("/{place_id}", status_code=204)
def delete_place(place_id: int, db: Session = Depends(get_db)):
    place = db.get(Place, place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")
    db.delete(place)
    db.commit()