from datetime import date, time

from pydantic import BaseModel, ConfigDict, Field, model_validator


class TripItemBase(BaseModel):
    trip_plan_id: int = Field(gt=0)
    place_id: int = Field(gt=0)
    visit_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    notes: str | None = None
    position: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def check_times(self) -> TripItemBase:
        if self.start_time and self.end_time and self.start_time > self.end_time:
            raise ValueError("start_time must be <= end_time")
        return self


class TripItemCreate(TripItemBase):
    pass


class TripItemUpdate(BaseModel):
    trip_plan_id: int | None = Field(default=None, gt=0)
    place_id: int | None = Field(default=None, gt=0)
    visit_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    notes: str | None = None
    position: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def check_times(self) -> TripItemUpdate:
        if self.start_time and self.end_time and self.start_time > self.end_time:
            raise ValueError("start_time must be <= end_time")
        return self


class TripItemOut(TripItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(gt=0)
    position: int = Field(ge=0)