"""Issue #15: two requests arriving together on a fresh process must not load a model twice."""

import threading
import time

from app.ml.embedder import SpeechBrainEmbedder
from app.ml.vad import SileroSpeechDetector


def run_in_threads(target, count: int = 8) -> None:
    threads = [threading.Thread(target=target) for _ in range(count)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()


def test_the_speaker_model_loads_once_when_called_from_many_threads(monkeypatch, tmp_path):
    from speechbrain.inference.speaker import EncoderClassifier

    calls: list[int] = []

    def slow_load(*args, **kwargs):
        calls.append(1)
        time.sleep(0.1)
        return object()

    monkeypatch.setattr(EncoderClassifier, "from_hparams", slow_load)
    embedder = SpeechBrainEmbedder(str(tmp_path))

    run_in_threads(embedder._load)

    assert len(calls) == 1


def test_the_speech_detector_loads_once_when_called_from_many_threads(monkeypatch):
    import silero_vad

    calls: list[int] = []

    def slow_load(*args, **kwargs):
        calls.append(1)
        time.sleep(0.1)
        return object()

    monkeypatch.setattr(silero_vad, "load_silero_vad", slow_load)
    detector = SileroSpeechDetector()

    run_in_threads(detector._load)

    assert len(calls) == 1
