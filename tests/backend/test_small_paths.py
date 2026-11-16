"""Issue #19: small backend paths that no other test reaches."""

import subprocess

import pytest

from app.core.config import settings
from app.dependencies import get_embedding_service
from app.ml.audio import AudioError, decode_audio


def test_a_decoder_that_takes_too_long_is_reported_as_an_audio_error(monkeypatch):
    def hang(*args, **kwargs):
        raise subprocess.TimeoutExpired(cmd="ffmpeg", timeout=30)

    monkeypatch.setattr("app.ml.audio.subprocess.run", hang)

    with pytest.raises(AudioError, match="timed out"):
        decode_audio(b"anything", max_seconds=60)


def test_the_real_embedding_service_is_built_from_the_settings(monkeypatch):
    monkeypatch.setattr(settings, "min_speech_seconds", 7.0)
    monkeypatch.setattr(settings, "max_audio_seconds", 33.0)
    monkeypatch.setattr(settings, "max_concurrent_inferences", 3)
    get_embedding_service.cache_clear()
    try:
        service = get_embedding_service()

        assert service._min_speech_seconds == 7.0
        assert service._max_audio_seconds == 33.0
        assert service._slots._value == 3
    finally:
        get_embedding_service.cache_clear()
