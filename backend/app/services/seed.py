"""Seed CLI: python -m app.services.seed"""
from app.core.deps import SessionLocal, create_tables
from app.core.seed_data import seed_all


def main() -> None:
    create_tables()
    db = SessionLocal()
    try:
        result = seed_all(db)
        print(result)
    finally:
        db.close()


if __name__ == "__main__":
    main()
