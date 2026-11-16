import threading
from typing import Protocol

import numpy as np

MODEL_SOURCE = "speechbrain/spkrec-ecapa-voxceleb"


class Embedder(Protocol):
    def embed(self, samples: np.ndarray) -> np.ndarray:
        """Return a speaker embedding for mono 16 kHz float32 samples."""
        ...


class SpeechBrainEmbedder:
    """ECAPA-TDNN speaker embeddings. The model loads on first use."""

    def __init__(self, cache_dir: str) -> None:
        self._cache_dir = cache_dir
        self._model = None
        self._lock = threading.Lock()

    def _load(self):
        with self._lock:
            if self._model is None:
                from speechbrain.inference.speaker import EncoderClassifier

                self._model = EncoderClassifier.from_hparams(
                    source=MODEL_SOURCE,
                    savedir=self._cache_dir,
                    run_opts={"device": "cpu"},
                )
        return self._model

    def embed(self, samples: np.ndarray) -> np.ndarray:
        import torch

        model = self._load()
        with torch.no_grad():
            tensor = torch.from_numpy(samples).unsqueeze(0)
            embedding = model.encode_batch(tensor)
        return embedding.squeeze().cpu().numpy()
