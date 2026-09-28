from __future__ import annotations

from datetime import date

from sqlalchemy import CheckConstraint, Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import IdMixin, TimestampMixin


class TripPlan(IdMixin, TimestampMixin, Base):
    __tablename__ = "trip_plans"
    __table_args__ = (
        CheckConstraint("start_date <= end_date", name="ck_trip_plans_dates"),
    )

    city_id: Mapped[int] = mapped_column(
        ForeignKey("cities.id", ondelete="CASCADE"),
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)

    city: Mapped[City] = relationship(back_populates="trip_plans")
    items: Mapped[list[TripItem]] = relationship(
        back_populates="trip_plan",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="TripItem.position",
    )