from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PlaceBase(BaseModel):
    city_id: int = Field(gt=0)
    category_id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=200)
    address: str = Field(min_length=1, max_length=300)
    description: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    price_level: int = Field(default=1, ge=1, le=4)
    is_favorite: bool = False


class PlaceCreate(PlaceBase):
    pass


class PlaceUpdate(BaseModel):
    city_id: int | None = Field(default=None, gt=0)
    category_id: int | None = Field(default=None, gt=0)
    name: str | None = Field(default=None, min_length=1, max_length=200)
    address: str | None = Field(default=None, min_length=1, max_length=300)
    description: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    price_level: int | None = Field(default=None, ge=1, le=4)
    is_favorite: bool | None = None


class PlaceOut(PlaceBase):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(gt=0)
    created_at: datetime
    updated_at: datetime