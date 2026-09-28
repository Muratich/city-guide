from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, SmallInteger, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import IdMixin, TimestampMixin


class Visit(IdMixin, TimestampMixin, Base):
    __tablename__ = "visits"
    __table_args__ = (
        CheckConstraint("rating BETWEEN 1 AND 5", name="ck_visits_rating"),
    )

    place_id: Mapped[int] = mapped_column(
        ForeignKey("places.id", ondelete="CASCADE"),
        index=True,
    )
    visited_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    rating: Mapped[int] = mapped_column(SmallInteger)
    comment: Mapped[str | None] = mapped_column(Text)

    place: Mapped[Place] = relationship(back_populates="visits")