import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./ripple.db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secret-ripple-jwt-key-change-in-production-2026")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5173,http://localhost:8080,http://localhost:8081,http://localhost:8082,http://127.0.0.1:3000,http://127.0.0.1:5173,http://127.0.0.1:8080,http://127.0.0.1:8081,http://127.0.0.1:8082,http://localhost:8000"
    )
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def normalized_database_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        elif url.startswith("sqlite:///") and not url.startswith("sqlite:////"):
            rel_path = url[len("sqlite:///"):]
            # If not an absolute Windows path (e.g. C:/) and not an absolute Unix path
            if not (len(rel_path) > 1 and rel_path[1] == ":") and not os.path.isabs(rel_path):
                abs_path = (BASE_DIR / rel_path).resolve().as_posix()
                url = f"sqlite:///{abs_path}"
        return url

settings = Settings()
