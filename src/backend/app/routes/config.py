from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter(tags=["config"])


class PublicConfig(BaseModel):
    identify_threshold: float
    identify_margin: float
    min_speech_seconds: float
    max_audio_seconds: float
    max_upload_bytes: int
    max_request_bytes: int
    max_samples_per_enrollment: int
    pending_clip_ttl_seconds: int


@router.get("/config")
def public_config() -> PublicConfig:
    """Limits and thresholds a client needs to guide the user. Nothing about the deployment."""
    return PublicConfig(
        identify_threshold=settings.identify_threshold,
        identify_margin=settings.identify_margin,
        min_speech_seconds=settings.min_speech_seconds,
        max_audio_seconds=settings.max_audio_seconds,
        max_upload_bytes=settings.max_upload_bytes,
        max_request_bytes=settings.max_request_bytes,
        max_samples_per_enrollment=settings.max_samples_per_enrollment,
        pending_clip_ttl_seconds=settings.pending_clip_ttl_seconds,
    )
