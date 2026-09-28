from typing import Annotated

from fastapi import Query
from pydantic import BaseModel


class PlaceFilters(BaseModel):
    city_id: Annotated[int | None, Query(gt=0)] = None
    category_id: Annotated[int | None, Query(gt=0)] = None
    is_favorite: bool | None = None
    min_rating: Annotated[float | None, Query(ge=1, le=5)] = None