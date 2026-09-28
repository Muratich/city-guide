from __future__ import annotations

from datetime import date, time

from sqlalchemy import (
    CheckConstraint,
    Date,
    ForeignKey,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import IdMixin


class TripItem(IdMixin, Base):
    __tablename__ = "trip_items"
    __table_args__ = (
        UniqueConstraint(
            "trip_plan_id",
            "position",
            name="uq_trip_items_plan_position",
        ),
        CheckConstraint("position >= 0", name="ck_trip_items_position"),
    )

    trip_plan_id: Mapped[int] = mapped_column(
        ForeignKey("trip_plans.id", ondelete="CASCADE"),
        index=True,
    )
    place_id: Mapped[int] = mapped_column(
        ForeignKey("places.id", ondelete="CASCADE"),
        index=True,
    )
    visit_date: Mapped[date | None] = mapped_column(Date)
    start_time: Mapped[time | None] = mapped_column(Time)
    end_time: Mapped[time | None] = mapped_column(Time)
    notes: Mapped[str | None] = mapped_column(Text)
    position: Mapped[int] = mapped_column(default=0, server_default="0")

    trip_plan: Mapped[TripPlan] = relationship(back_populates="items")
    place: Mapped[Place] = relationship(back_populates="trip_items")