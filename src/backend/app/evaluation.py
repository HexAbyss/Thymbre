"""Open-set identification metrics, used to calibrate the similarity threshold.

Scores are cosine similarities between L2-normalized embeddings. A "known" probe comes from an
enrolled speaker and should be matched to them. A "stranger" probe comes from someone who is not
enrolled and should be rejected, which is what `unknown` means in the API.
"""

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class OpenSetScores:
    known_best: list[float]
    """Best score of each known probe over all enrolled centroids."""
    known_correct: list[bool]
    """Whether that best match is the probe's own speaker."""
    stranger_best: list[float]
    """Best score of each stranger probe over all enrolled centroids."""


@dataclass(frozen=True)
class Rates:
    far: float
    """False accept rate: strangers accepted as someone."""
    frr: float
    """False reject rate: known voices rejected as unknown."""
    misid: float
    """Known voices accepted but matched to the wrong speaker."""


def score_open_set(
    centroids: dict[str, np.ndarray],
    known_probes: list[tuple[str, np.ndarray]],
    stranger_probes: list[np.ndarray],
) -> OpenSetScores:
    names = list(centroids)
    matrix = np.stack([centroids[name] for name in names])

    known_best: list[float] = []
    known_correct: list[bool] = []
    for speaker, embedding in known_probes:
        similarities = matrix @ embedding
        best = int(np.argmax(similarities))
        known_best.append(float(similarities[best]))
        known_correct.append(names[best] == speaker)

    stranger_best = [float(np.max(matrix @ embedding)) for embedding in stranger_probes]
    return OpenSetScores(known_best, known_correct, stranger_best)


def rates_at(scores: OpenSetScores, threshold: float) -> Rates:
    if not scores.known_best:
        raise ValueError("no known probes to evaluate")
    if not scores.stranger_best:
        raise ValueError("no stranger probes to evaluate")

    known = np.asarray(scores.known_best)
    correct = np.asarray(scores.known_correct)
    strangers = np.asarray(scores.stranger_best)
    accepted = known >= threshold
    return Rates(
        far=float(np.mean(strangers >= threshold)),
        frr=float(np.mean(~accepted)),
        misid=float(np.mean(accepted & ~correct)),
    )


def _candidates(scores: OpenSetScores) -> list[float]:
    """Each observed score and the point just above it, where the rates can change."""
    values = sorted({*scores.known_best, *scores.stranger_best})
    return sorted({*values, *(value + 1e-6 for value in values)})


def equal_error_rate(scores: OpenSetScores) -> tuple[float, float]:
    """The rate where false accepts meet false rejects, and the threshold that gives it."""
    best_gap, best = float("inf"), (1.0, 0.0)
    for threshold in _candidates(scores):
        rates = rates_at(scores, threshold)
        gap = abs(rates.far - rates.frr)
        if gap < best_gap:
            best_gap, best = gap, ((rates.far + rates.frr) / 2, threshold)
    return best


def threshold_for_far(scores: OpenSetScores, target: float) -> float:
    """The lowest threshold whose false accept rate does not exceed `target`."""
    for threshold in _candidates(scores):
        if rates_at(scores, threshold).far <= target:
            return threshold
    raise AssertionError("the highest candidate always rejects every stranger")
