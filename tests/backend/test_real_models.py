"""Issue #17: the real model wrappers. These download model weights, so they only run on request:

docker compose run --rm --no-deps -e RUN_MODEL_TESTS=1 backend pytest tests/test_real_models.py
"""

import os

import numpy as np
import pytest

from app.core.config import settings
from app.ml.audio import SAMPLE_RATE
from app.ml.embedder import SpeechBrainEmbedder
from app.ml.vad import SileroSpeechDetector
from app.services.embedding import ClipTooShortError, EmbeddingService

pytestmark = pytest.mark.skipif(
    not os.environ.get("RUN_MODEL_TESTS"), reason="set RUN_MODEL_TESTS=1 to load the real models"
)


def noise(seconds: float) -> np.ndarray:
    rng = np.random.default_rng(0)
    return (rng.standard_normal(int(seconds * SAMPLE_RATE)) * 0.05).astype(np.float32)


@pytest.fixture(scope="module")
def embedder() -> SpeechBrainEmbedder:
    return SpeechBrainEmbedder(f"{settings.model_cache_dir}/ecapa")


def test_the_embedding_has_192_finite_numbers(embedder):
    vector = embedder.embed(noise(4))

    assert vector.shape == (192,)
    assert np.isfinite(vector).all()


def test_the_same_audio_gives_the_same_embedding(embedder):
    first = embedder.embed(noise(4))
    second = embedder.embed(noise(4))

    assert np.allclose(first, second, atol=1e-4)


def test_plain_noise_is_not_speech():
    assert len(SileroSpeechDetector().extract_speech(noise(4))) == 0


def test_the_whole_service_rejects_a_clip_without_speech(embedder):
    service = EmbeddingService(
        embedder=embedder,
        speech_detector=SileroSpeechDetector(),
        min_speech_seconds=3.0,
        max_audio_seconds=60,
    )
    from helpers import make_wav

    with pytest.raises(ClipTooShortError):
        service.embed(make_wav(5.0))
