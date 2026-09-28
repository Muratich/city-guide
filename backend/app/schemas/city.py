from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CityBase(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    country: str = Field(min_length=1, max_length=150)
    description: str | None = None


class CityCreate(CityBase):
    pass


class CityUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    country: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = None


class CityOut(CityBase):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(gt=0)
    created_at: datetime
    updated_at: datetime