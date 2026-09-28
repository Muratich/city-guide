from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import City
from app.schemas.city import CityCreate, CityOut, CityUpdate

router = APIRouter(prefix="/cities", tags=["cities"])


@router.get("", response_model=list[CityOut])
def list_cities(db: Session = Depends(get_db)):
    return db.scalars(select(City).order_by(City.name)).all()


@router.post("", response_model=CityOut, status_code=201)
def create_city(payload: CityCreate, db: Session = Depends(get_db)):
    city = City(**payload.model_dump())
    db.add(city)
    db.commit()
    db.refresh(city)
    return city


@router.get("/{city_id}", response_model=CityOut)
def get_city(city_id: int, db: Session = Depends(get_db)):
    city = db.get(City, city_id)
    if city is None:
        raise HTTPException(status_code=404, detail="City not found")
    return city


@router.patch("/{city_id}", response_model=CityOut)
def update_city(
    city_id: int,
    payload: CityUpdate,
    db: Session = Depends(get_db),
):
    city = db.get(City, city_id)
    if city is None:
        raise HTTPException(status_code=404, detail="City not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(city, field, value)
    db.commit()
    db.refresh(city)
    return city


@router.delete("/{city_id}", status_code=204)
def delete_city(city_id: int, db: Session = Depends(get_db)):
    city = db.get(City, city_id)
    if city is None:
        raise HTTPException(status_code=404, detail="City not found")
    db.delete(city)
    db.commit()