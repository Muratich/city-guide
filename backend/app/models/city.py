from __future__ import annotations

from sqlalchemy import String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import IdMixin, TimestampMixin


class City(IdMixin, TimestampMixin, Base):
    __tablename__ = "cities"
    __table_args__ = (
        UniqueConstraint("name", "country", name="uq_cities_name_country"),
    )

    name: Mapped[str] = mapped_column(String(150))
    country: Mapped[str] = mapped_column(String(150))
    description: Mapped[str | None] = mapped_column(Text)

    places: Mapped[list[Place]] = relationship(
        back_populates="city",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    trip_plans: Mapped[list[TripPlan]] = relationship(
        back_populates="city",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )