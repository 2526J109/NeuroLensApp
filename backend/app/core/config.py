import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""
    
    # API Settings
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "NeuroLens API"
    
    # Database
    DATABASE_URL: str = "sqlite:///./neurolens.db"
    
    # Firebase
    FIREBASE_ADMIN_SDK_PATH: str = "firebase-admin-sdk.json"

    # Remote model server (Hugging Face Space)
    MODEL_SERVER_URL: str = "https://haran29-neurolenseapp.hf.space/"

    # CORS
    BACKEND_CORS_ORIGINS: list = ["*"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
