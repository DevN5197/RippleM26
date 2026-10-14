from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool
from app.config import settings

db_url = settings.normalized_database_url
connect_args = {}
if "sqlite" in db_url:
    connect_args["check_same_thread"] = False
    connect_args["timeout"] = 30  # Wait up to 30s for busy SQLite locks
    engine = create_engine(
        db_url,
        connect_args=connect_args,
        poolclass=NullPool,  # SQLite is an embedded file; do not hold persistent connection pools
    )
else:
    engine = create_engine(
        db_url,
        connect_args=connect_args,
        pool_size=20,
        max_overflow=40,
        pool_pre_ping=True,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
