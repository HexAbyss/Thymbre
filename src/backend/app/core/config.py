from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://thymbre:thymbre@db:5432/thymbre"
    model_cache_dir: str = "/models"
    min_speech_seconds: float = 3.0
    max_audio_seconds: float = 60.0
    max_upload_bytes: int = 20 * 1024 * 1024
    max_request_bytes: int = 50 * 1024 * 1024
    max_samples_per_enrollment: int = 10
    max_concurrent_inferences: int = 2
    identify_threshold: float = 0.5
    identify_margin: float = 0.05
    pending_clip_ttl_seconds: int = 600


settings = Settings()
