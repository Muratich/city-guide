from pydantic import BaseModel, Field


class PlaceStats(BaseModel):
    place_id: int = Field(gt=0)
    visit_count: int = Field(ge=0)
    avg_rating: float | None = Field(default=None, ge=1, le=5)