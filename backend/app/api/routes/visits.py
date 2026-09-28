from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import Visit
from app.schemas.visit import VisitCreate, VisitOut, VisitUpdate

router = APIRouter(prefix="/visits", tags=["visits"])


@router.get("", response_model=list[VisitOut])
def list_visits(db: Session = Depends(get_db)):
    return db.scalars(select(Visit).order_by(Visit.visited_at.desc())).all()


@router.get("/{visit_id}", response_model=VisitOut)
def get_visit(visit_id: int, db: Session = Depends(get_db)):
    visit = db.get(Visit, visit_id)
    if visit is None:
        raise HTTPException(status_code=404, detail="Visit not found")
    return visit


@router.post("", response_model=VisitOut, status_code=201)
def create_visit(payload: VisitCreate, db: Session = Depends(get_db)):
    visit = Visit(**payload.model_dump())
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return visit


@router.patch("/{visit_id}", response_model=VisitOut)
def update_visit(
    visit_id: int,
    payload: VisitUpdate,
    db: Session = Depends(get_db),
):
    visit = db.get(Visit, visit_id)
    if visit is None:
        raise HTTPException(status_code=404, detail="Visit not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(visit, field, value)
    db.commit()
    db.refresh(visit)
    return visit


@router.delete("/{visit_id}", status_code=204)
def delete_visit(visit_id: int, db: Session = Depends(get_db)):
    visit = db.get(Visit, visit_id)
    if visit is None:
        raise HTTPException(status_code=404, detail="Visit not found")
    db.delete(visit)
    db.commit()