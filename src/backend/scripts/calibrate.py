"""Measure identification error rates on a labelled folder and suggest a threshold.

    python -m scripts.calibrate DATA_DIR [--enroll-per-speaker 3] [--seed 0] [--json OUT]

DATA_DIR holds one folder per speaker, each with audio files in any format ffmpeg reads.
Half of the speakers are enrolled from their first files. Their remaining files are the known
probes. The other half are strangers that must be rejected.
"""

import argparse
import json
import random
import sys
from pathlib import Path

import numpy as np

from app.core.config import settings
from app.dependencies import get_embedding_service
from app.evaluation import (
    equal_error_rate,
    rates_at,
    score_open_set,
    threshold_for_far,
)
from app.ml.audio import AudioError
from app.services.embedding import ClipTooShortError

AUDIO_SUFFIXES = {".wav", ".flac", ".mp3", ".ogg", ".opus", ".m4a", ".webm"}
GRID = [round(0.05 * step, 2) for step in range(2, 17)]


def load_embeddings(
    data_dir: Path, per_speaker_limit: int
) -> tuple[dict[str, list[np.ndarray]], int]:
    service = get_embedding_service()
    embeddings: dict[str, list[np.ndarray]] = {}
    skipped = 0
    for speaker_dir in sorted(p for p in data_dir.iterdir() if p.is_dir()):
        files = sorted(f for f in speaker_dir.rglob("*") if f.suffix.lower() in AUDIO_SUFFIXES)
        for file in files[:per_speaker_limit]:
            try:
                embeddings.setdefault(speaker_dir.name, []).append(
                    service.embed(file.read_bytes()).embedding
                )
            except (AudioError, ClipTooShortError):
                skipped += 1
    return embeddings, skipped


def centroid(vectors: list[np.ndarray]) -> np.ndarray:
    mean = np.mean(vectors, axis=0)
    return mean / np.linalg.norm(mean)


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument("data_dir", type=Path)
    parser.add_argument("--enroll-per-speaker", type=int, default=3)
    parser.add_argument("--max-per-speaker", type=int, default=10)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--json", type=Path, help="write the full results to this file")
    args = parser.parse_args()

    embeddings, skipped = load_embeddings(args.data_dir, args.max_per_speaker)
    usable = {name: v for name, v in embeddings.items() if len(v) > args.enroll_per_speaker}
    if len(usable) < 4:
        print(
            "Need at least 4 speakers with more than --enroll-per-speaker usable clips.",
            file=sys.stderr,
        )
        return 1

    names = sorted(usable)
    random.Random(args.seed).shuffle(names)  # noqa: S311  (a seeded split, not security)
    enrolled, strangers = names[: len(names) // 2], names[len(names) // 2 :]

    n = args.enroll_per_speaker
    centroids = {name: centroid(usable[name][:n]) for name in enrolled}
    known = [(name, vector) for name in enrolled for vector in usable[name][n:]]
    stranger_probes = [vector for name in strangers for vector in usable[name]]

    scores = score_open_set(centroids, known, stranger_probes)
    eer, eer_threshold = equal_error_rate(scores)
    suggested = {f"far_{target}": threshold_for_far(scores, target) for target in (0.01, 0.001)}

    print(f"Speakers: {len(enrolled)} enrolled, {len(strangers)} strangers")
    print(f"Probes: {len(known)} known, {len(stranger_probes)} stranger. Clips skipped: {skipped}")
    print(f"\n{'threshold':>9} {'FAR':>8} {'FRR':>8} {'misid':>8}")
    table = []
    for threshold in GRID:
        rates = rates_at(scores, threshold)
        table.append({"threshold": threshold, **rates.__dict__})
        print(f"{threshold:>9.2f} {rates.far:>8.1%} {rates.frr:>8.1%} {rates.misid:>8.1%}")

    print(f"\nEqual error rate: {eer:.2%} at threshold {eer_threshold:.3f}")
    for label, value in suggested.items():
        print(f"Lowest threshold for {label.replace('_', ' = ')}: {value:.3f}")
    print(f"Current default threshold: {settings.identify_threshold}")

    if args.json:
        args.json.write_text(
            json.dumps(
                {
                    "enrolled_speakers": len(enrolled),
                    "stranger_speakers": len(strangers),
                    "known_probes": len(known),
                    "stranger_probes": len(stranger_probes),
                    "skipped_clips": skipped,
                    "eer": eer,
                    "eer_threshold": eer_threshold,
                    "suggested": suggested,
                    "table": table,
                },
                indent=2,
            )
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
