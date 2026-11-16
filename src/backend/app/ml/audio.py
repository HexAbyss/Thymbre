import subprocess

import numpy as np

SAMPLE_RATE = 16000
DECODE_TIMEOUT_SECONDS = 30


class AudioError(ValueError):
    """The input is empty, not decodable audio, or decodes to nothing."""


def decode_audio(data: bytes, max_seconds: float) -> np.ndarray:
    """Decode any ffmpeg-readable audio to mono float32 samples at 16 kHz.

    Output past `max_seconds` is cut off by ffmpeg, which bounds memory use.
    """
    if not data:
        raise AudioError("empty input")

    command = [
        "ffmpeg",
        "-v", "error",
        "-i", "pipe:0",
        "-t", str(max_seconds),
        "-ac", "1",
        "-ar", str(SAMPLE_RATE),
        "-f", "f32le",
        "pipe:1",
    ]  # fmt: skip
    try:
        result = subprocess.run(  # noqa: S603  (fixed argument list, input goes through stdin)
            command,
            input=data,
            capture_output=True,
            timeout=DECODE_TIMEOUT_SECONDS,
            check=False,
        )
    except subprocess.TimeoutExpired as error:
        raise AudioError("decoding timed out") from error

    if result.returncode != 0 or not result.stdout:
        raise AudioError("input is not decodable audio")
    return np.frombuffer(result.stdout, dtype=np.float32).copy()
