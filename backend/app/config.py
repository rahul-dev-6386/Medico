import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/health_assistant"
    JWT_SECRET: str = "change-this-secret-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 60
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    DEEPSEEK_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    DEEPSEEK_MODEL: str = "deepseek-v4-flash"
    GEMINI_MODEL: str = "gemini-2.5-flash"
    STORAGE_BACKEND: str = "local"
    UPLOAD_DIR: str = "./uploads"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_S3_BUCKET: Optional[str] = None
    AWS_REGION: Optional[str] = None

    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: Optional[str] = None
    QDRANT_COLLECTION: str = "medical_knowledge"
    FAISS_INDEX_PATH: str = "./data/faiss_index"
    EMBEDDING_MODEL: str = "models/gemini-embedding-001"
    EMBEDDING_DIMENSION: int = 768
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 100
    MAX_EMBEDDING_BATCH: int = 10
    GUIDELINES_DIR: str = "./data/medical_guidelines"
    MODELS_DIR: str = "./data/models"
    DATASETS_DIR: str = "./data/datasets"
    CACHE_DIR: str = "./data/cache"

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
        extra = "allow"


settings = Settings()
