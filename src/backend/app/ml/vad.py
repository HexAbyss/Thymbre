import threading
from typing import Protocol

import numpy as np

from app.ml.audio import SAMPLE_RATE


class SpeechDetector(Protocol):
    def extract_speech(self, samples: np.ndarray) -> np.ndarray:
        """Return only the speech portions of mono 16 kHz float32 samples."""
        ...


class SileroSpeechDetector:
    """Voice activity detection with Silero VAD. The model loads on first use."""

    def __init__(self) -> None:
        self._model = None
        self._lock = threading.Lock()

    def _load(self):
        with self._lock:
            if self._model is None:
                from silero_vad import load_silero_vad

                self._model = load_silero_vad()
        return self._model

    def extract_speech(self, samples: np.ndarray) -> np.ndarray:
        import torch
        from silero_vad import get_speech_timestamps

        timestamps = get_speech_timestamps(
            torch.from_numpy(samples), self._load(), sampling_rate=SAMPLE_RATE
        )
        if not timestamps:
            return np.empty(0, dtype=np.float32)
        return np.concatenate([samples[t["start"] : t["end"]] for t in timestamps])
