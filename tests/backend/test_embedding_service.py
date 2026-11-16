import numpy as np
import pytest
from helpers import make_wav

from app.ml.audio import SAMPLE_RATE
from app.services.embedding import ClipTooShortError, EmbeddingService

DIM = 192


class FakeEmbedder:
    def embed(self, samples: np.ndarray) -> np.ndarray:
        vector = np.arange(1, DIM + 1, dtype=np.float32)
        return vector * 3.0  # deliberately not unit length


class FakeSpeechDetector:
    def __init__(self, speech_seconds: float) -> None:
        self.speech_seconds = speech_seconds

    def extract_speech(self, samples: np.ndarray) -> np.ndarray:
        return np.zeros(int(self.speech_seconds * SAMPLE_RATE), dtype=np.float32)


def build(speech_seconds: float, min_speech_seconds: float = 3.0) -> EmbeddingService:
    return EmbeddingService(
        embedder=FakeEmbedder(),
        speech_detector=FakeSpeechDetector(speech_seconds),
        min_speech_seconds=min_speech_seconds,
        max_audio_seconds=60,
    )


def test_returns_a_unit_length_embedding_and_the_speech_duration():
    result = build(speech_seconds=4.0).embed(make_wav(5.0))

    assert result.embedding.shape == (DIM,)
    assert np.linalg.norm(result.embedding) == pytest.approx(1.0, abs=1e-5)
    assert result.speech_seconds == pytest.approx(4.0)


def test_rejects_a_clip_with_too_little_speech():
    with pytest.raises(ClipTooShortError):
        build(speech_seconds=1.0).embed(make_wav(5.0))


def test_accepts_a_clip_with_exactly_the_minimum_speech():
    result = build(speech_seconds=3.0).embed(make_wav(5.0))

    assert result.speech_seconds == pytest.approx(3.0)
