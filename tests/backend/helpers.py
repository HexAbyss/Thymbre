import io
import wave

import numpy as np


def make_wav(seconds: float, rate: int = 44100, channels: int = 2) -> bytes:
    t = np.arange(int(seconds * rate)) / rate
    tone = (np.sin(2 * np.pi * 220 * t) * 0.3 * 32767).astype(np.int16)
    frames = np.repeat(tone[:, None], channels, axis=1)
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(channels)
        wav.setsampwidth(2)
        wav.setframerate(rate)
        wav.writeframes(frames.tobytes())
    return buffer.getvalue()
