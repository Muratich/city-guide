from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class TripPlanBase(BaseModel):
    city_id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None

    @model_validator(mode="after")
    def check_dates(self) -> TripPlanBase:
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValueError("start_date must be <= end_date")
        return self


class TripPlanCreate(TripPlanBase):
    pass


class TripPlanUpdate(BaseModel):
    city_id: int | None = Field(default=None, gt=0)
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None

    @model_validator(mode="after")
    def check_dates(self) -> TripPlanUpdate:
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValueError("start_date must be <= end_date")
        return self


class TripPlanOut(TripPlanBase):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(gt=0)
    created_at: datetime
    updated_at: datetime