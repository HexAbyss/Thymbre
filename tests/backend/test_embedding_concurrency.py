import threading
import time

import numpy as np
from helpers import make_wav

from app.ml.audio import SAMPLE_RATE
from app.services.embedding import EmbeddingService


class SlowEmbedder:
    def __init__(self) -> None:
        self.active = 0
        self.peak = 0
        self._lock = threading.Lock()

    def embed(self, samples: np.ndarray) -> np.ndarray:
        with self._lock:
            self.active += 1
            self.peak = max(self.peak, self.active)
        time.sleep(0.05)
        with self._lock:
            self.active -= 1
        return np.ones(192, dtype=np.float32)


class AlwaysSpeech:
    def extract_speech(self, samples: np.ndarray) -> np.ndarray:
        return np.zeros(4 * SAMPLE_RATE, dtype=np.float32)


def test_decoding_also_respects_the_concurrency_limit(monkeypatch):
    """Issue #16: decoding used to run outside the limit, so ffmpeg processes piled up."""
    lock = threading.Lock()
    state = {"active": 0, "peak": 0}

    def slow_decode(audio: bytes, max_seconds: float) -> np.ndarray:
        with lock:
            state["active"] += 1
            state["peak"] = max(state["peak"], state["active"])
        time.sleep(0.05)
        with lock:
            state["active"] -= 1
        return np.zeros(SAMPLE_RATE, dtype=np.float32)

    class QuickEmbedder:
        def embed(self, samples: np.ndarray) -> np.ndarray:
            return np.ones(192, dtype=np.float32)

    monkeypatch.setattr("app.services.embedding.decode_audio", slow_decode)
    service = EmbeddingService(
        embedder=QuickEmbedder(),
        speech_detector=AlwaysSpeech(),
        min_speech_seconds=3.0,
        max_audio_seconds=60,
        max_concurrent=2,
    )

    threads = [threading.Thread(target=service.embed, args=(b"x",)) for _ in range(8)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert state["peak"] <= 2


def test_inference_never_exceeds_the_concurrency_limit():
    embedder = SlowEmbedder()
    service = EmbeddingService(
        embedder=embedder,
        speech_detector=AlwaysSpeech(),
        min_speech_seconds=3.0,
        max_audio_seconds=60,
        max_concurrent=2,
    )
    audio = make_wav(1.0)

    threads = [threading.Thread(target=service.embed, args=(audio,)) for _ in range(8)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert embedder.peak <= 2
