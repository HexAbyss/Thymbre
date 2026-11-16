import numpy as np
import pytest
from helpers import make_wav

from app.ml.audio import SAMPLE_RATE, AudioError, decode_audio


def test_decodes_to_mono_16khz_float32():
    samples = decode_audio(make_wav(1.0), max_seconds=60)

    assert samples.dtype == np.float32
    assert samples.ndim == 1
    assert len(samples) == pytest.approx(SAMPLE_RATE, abs=SAMPLE_RATE * 0.01)
    assert np.abs(samples).max() <= 1.0


def test_rejects_empty_input():
    with pytest.raises(AudioError):
        decode_audio(b"", max_seconds=60)


def test_rejects_bytes_that_are_not_audio():
    with pytest.raises(AudioError):
        decode_audio(b"this is not audio at all" * 100, max_seconds=60)


def test_truncates_audio_longer_than_the_limit():
    samples = decode_audio(make_wav(5.0), max_seconds=2)

    assert len(samples) <= 2 * SAMPLE_RATE + SAMPLE_RATE * 0.01
