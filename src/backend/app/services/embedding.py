import threading
from dataclasses import dataclass

import numpy as np

from app.ml.audio import SAMPLE_RATE, decode_audio
from app.ml.embedder import Embedder
from app.ml.vad import SpeechDetector


class ClipTooShortError(ValueError):
    """The clip has less speech than needed for a reliable embedding."""


@dataclass(frozen=True)
class EmbeddingResult:
    embedding: np.ndarray
    speech_seconds: float


class EmbeddingService:
    """Turns raw audio bytes into a unit-length speaker embedding."""

    def __init__(
        self,
        embedder: Embedder,
        speech_detector: SpeechDetector,
        min_speech_seconds: float,
        max_audio_seconds: float,
        max_concurrent: int = 2,
    ) -> None:
        self._embedder = embedder
        self._speech_detector = speech_detector
        self._min_speech_seconds = min_speech_seconds
        self._max_audio_seconds = max_audio_seconds
        self._slots = threading.BoundedSemaphore(max_concurrent)

    def embed(self, audio: bytes) -> EmbeddingResult:
        with self._slots:
            samples = decode_audio(audio, max_seconds=self._max_audio_seconds)
            speech = self._speech_detector.extract_speech(samples)
            speech_seconds = len(speech) / SAMPLE_RATE
            if speech_seconds < self._min_speech_seconds:
                raise ClipTooShortError(
                    f"{speech_seconds:.1f}s of speech found, {self._min_speech_seconds:.1f}s needed"
                )
            embedding = np.asarray(self._embedder.embed(speech), dtype=np.float32)
        embedding = embedding / np.linalg.norm(embedding)
        return EmbeddingResult(embedding=embedding, speech_seconds=speech_seconds)
