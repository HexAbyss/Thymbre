"""Issue #19: the calibration script's glue: the split, the output and the error exit."""

import hashlib
import json
import sys
from pathlib import Path

import numpy as np
import pytest

from app.services.embedding import EmbeddingResult
from scripts import calibrate

DIM = 192


def vector(seed_text: str) -> np.ndarray:
    seed = int.from_bytes(hashlib.sha256(seed_text.encode()).digest()[:4], "big")
    return np.random.default_rng(seed).standard_normal(DIM).astype(np.float32)


class FakeService:
    """The file content is `<speaker>:<take>`, so each speaker gets a stable voice."""

    def embed(self, audio: bytes) -> EmbeddingResult:
        speaker, take = audio.decode().split(":")
        mixed = vector(speaker) + 0.2 * vector(f"{speaker}/{take}")
        return EmbeddingResult(embedding=mixed / np.linalg.norm(mixed), speech_seconds=4.0)


def make_dataset(root: Path, speakers: int, clips: int = 6) -> Path:
    for s in range(speakers):
        folder = root / f"speaker{s}"
        folder.mkdir(parents=True)
        for take in range(clips):
            (folder / f"clip{take}.wav").write_bytes(f"speaker{s}:{take}".encode())
    return root


@pytest.fixture(autouse=True)
def fake_service(monkeypatch):
    monkeypatch.setattr(calibrate, "get_embedding_service", lambda: FakeService())


def run(monkeypatch, *args: str) -> int:
    monkeypatch.setattr(sys, "argv", ["calibrate", *args])
    return calibrate.main()


def test_prints_the_report_and_writes_the_json(tmp_path, monkeypatch, capsys):
    data = make_dataset(tmp_path / "data", speakers=8)
    out = tmp_path / "result.json"

    code = run(monkeypatch, str(data), "--json", str(out))

    assert code == 0
    printed = capsys.readouterr().out
    assert "Equal error rate" in printed
    assert "4 enrolled, 4 strangers" in printed
    result = json.loads(out.read_text())
    assert result["enrolled_speakers"] == 4
    assert result["stranger_probes"] == 4 * 6
    assert result["known_probes"] == 4 * 3


def test_the_same_seed_gives_the_same_split(tmp_path, monkeypatch):
    data = make_dataset(tmp_path / "data", speakers=8)
    first, second = tmp_path / "a.json", tmp_path / "b.json"

    run(monkeypatch, str(data), "--seed", "5", "--json", str(first))
    run(monkeypatch, str(data), "--seed", "5", "--json", str(second))

    assert json.loads(first.read_text()) == json.loads(second.read_text())


def test_stops_with_an_error_when_there_are_too_few_speakers(tmp_path, monkeypatch, capsys):
    data = make_dataset(tmp_path / "data", speakers=3)

    code = run(monkeypatch, str(data))

    assert code == 1
    assert "at least 4 speakers" in capsys.readouterr().err


def test_speakers_with_too_few_clips_are_left_out(tmp_path, monkeypatch, capsys):
    data = make_dataset(tmp_path / "data", speakers=4, clips=3)

    code = run(monkeypatch, str(data), "--enroll-per-speaker", "3")

    assert code == 1
    assert "at least 4 speakers" in capsys.readouterr().err
