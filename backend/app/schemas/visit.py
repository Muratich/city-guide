from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class VisitBase(BaseModel):
    place_id: int = Field(gt=0)
    visited_at: datetime
    rating: int = Field(ge=1, le=5)
    comment: str | None = None


class VisitCreate(VisitBase):
    pass


class VisitUpdate(BaseModel):
    place_id: int | None = Field(default=None, gt=0)
    visited_at: datetime | None = None
    rating: int | None = Field(default=None, ge=1, le=5)
    comment: str | None = None


class VisitOut(VisitBase):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(gt=0)
    created_at: datetime
    updated_at: datetime