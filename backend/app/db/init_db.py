import app.models
from app.db.database import Base, engine


def init_db() -> None:
    Base.metadata.create_all(engine)


if __name__ == "__main__":
    init_db()