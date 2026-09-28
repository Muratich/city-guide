from __future__ import annotations

from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import IdMixin, TimestampMixin


class Place(IdMixin, TimestampMixin, Base):
    __tablename__ = "places"
    __table_args__ = (
        UniqueConstraint("city_id", "name", name="uq_places_city_name"),
        CheckConstraint(
            "price_level BETWEEN 1 AND 4",
            name="ck_places_price_level",
        ),
        CheckConstraint(
            "latitude IS NULL OR latitude BETWEEN -90 AND 90",
            name="ck_places_latitude",
        ),
        CheckConstraint(
            "longitude IS NULL OR longitude BETWEEN -180 AND 180",
            name="ck_places_longitude",
        ),
    )

    city_id: Mapped[int] = mapped_column(
        ForeignKey("cities.id", ondelete="CASCADE"),
        index=True,
    )
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id", ondelete="RESTRICT"),
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200))
    address: Mapped[str] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(Text)
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(10, 7))
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(10, 7))
    price_level: Mapped[int] = mapped_column(
        SmallInteger,
        default=1,
        server_default="1",
    )
    is_favorite: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="false",
    )

    city: Mapped[City] = relationship(back_populates="places")
    category: Mapped[Category] = relationship(back_populates="places")
    visits: Mapped[list[Visit]] = relationship(
        back_populates="place",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    trip_items: Mapped[list[TripItem]] = relationship(
        back_populates="place",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )