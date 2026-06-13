import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "")
    ML_SERVICE_TOKEN: str = os.environ.get("ML_SERVICE_TOKEN", "")
    PORT: int = int(os.environ.get("PORT", "8001"))


settings = Settings()
