from functools import lru_cache

from app.core.config import settings
from app.ml.embedder import SpeechBrainEmbedder
from app.ml.vad import SileroSpeechDetector
from app.services.embedding import EmbeddingService


@lru_cache
def get_embedding_service() -> EmbeddingService:
    return EmbeddingService(
        embedder=SpeechBrainEmbedder(f"{settings.model_cache_dir}/ecapa"),
        speech_detector=SileroSpeechDetector(),
        min_speech_seconds=settings.min_speech_seconds,
        max_audio_seconds=settings.max_audio_seconds,
        max_concurrent=settings.max_concurrent_inferences,
    )
