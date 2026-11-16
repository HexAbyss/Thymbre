import numpy as np
import pytest

from app.evaluation import (
    OpenSetScores,
    equal_error_rate,
    rates_at,
    score_open_set,
    threshold_for_far,
)


def unit(*values: float) -> np.ndarray:
    vector = np.array(values, dtype=np.float32)
    return vector / np.linalg.norm(vector)


def test_scores_a_known_probe_against_its_own_and_other_centroids():
    centroids = {"ana": unit(1, 0, 0), "bruno": unit(0, 1, 0)}

    scores = score_open_set(centroids, [("ana", unit(1, 0.1, 0)), ("bruno", unit(0.1, 1, 0))], [])

    assert scores.known_correct == [True, True]
    assert all(score > 0.9 for score in scores.known_best)


def test_flags_a_known_probe_that_matches_the_wrong_speaker():
    centroids = {"ana": unit(1, 0, 0), "bruno": unit(0, 1, 0)}

    scores = score_open_set(centroids, [("ana", unit(0, 1, 0))], [])

    assert scores.known_correct == [False]


def test_a_stranger_scores_its_best_match_among_enrolled_voices():
    centroids = {"ana": unit(1, 0, 0), "bruno": unit(0, 1, 0)}

    scores = score_open_set(centroids, [], [unit(0, 0, 1), unit(1, 1, 0)])

    assert scores.stranger_best[0] == pytest.approx(0.0, abs=1e-6)
    assert scores.stranger_best[1] == pytest.approx(0.7071, abs=1e-3)


def separable() -> OpenSetScores:
    return OpenSetScores(
        known_best=[0.9, 0.85, 0.8, 0.88],
        known_correct=[True, True, True, True],
        stranger_best=[0.1, 0.2, 0.15, 0.3],
    )


def test_rates_at_a_threshold_between_the_groups_are_zero():
    rates = rates_at(separable(), 0.5)

    assert rates.far == 0.0
    assert rates.frr == 0.0
    assert rates.misid == 0.0


def test_a_low_threshold_accepts_strangers_and_a_high_one_rejects_known_voices():
    scores = separable()

    assert rates_at(scores, 0.0).far == 1.0
    assert rates_at(scores, 0.99).frr == 1.0


def test_misidentification_counts_accepted_probes_that_matched_the_wrong_speaker():
    scores = OpenSetScores(known_best=[0.9, 0.9], known_correct=[True, False], stranger_best=[0.1])

    rates = rates_at(scores, 0.5)

    assert rates.misid == 0.5
    assert rates.frr == 0.0


def test_the_threshold_is_inclusive():
    scores = OpenSetScores(known_best=[0.5], known_correct=[True], stranger_best=[0.5])

    assert rates_at(scores, 0.5).far == 1.0
    assert rates_at(scores, 0.5).frr == 0.0


def test_equal_error_rate_is_zero_for_separable_scores():
    eer, threshold = equal_error_rate(separable())

    assert eer == 0.0
    assert 0.3 < threshold <= 0.8


def test_equal_error_rate_reflects_overlap():
    scores = OpenSetScores(
        known_best=[0.9, 0.8, 0.4, 0.7],
        known_correct=[True] * 4,
        stranger_best=[0.1, 0.5, 0.2, 0.3],
    )

    eer, _ = equal_error_rate(scores)

    assert 0.1 < eer < 0.5


def test_threshold_for_far_is_the_lowest_threshold_that_meets_the_target():
    scores = OpenSetScores(
        known_best=[0.9] * 4,
        known_correct=[True] * 4,
        stranger_best=[0.1, 0.2, 0.3, 0.6],
    )

    threshold = threshold_for_far(scores, target=0.25)

    assert rates_at(scores, threshold).far <= 0.25
    assert rates_at(scores, threshold - 1e-6).far > 0.25


def test_threshold_for_a_zero_far_sits_above_every_stranger():
    scores = OpenSetScores(known_best=[0.9], known_correct=[True], stranger_best=[0.4, 0.7])

    assert threshold_for_far(scores, target=0.0) > 0.7


def test_empty_groups_are_rejected_with_a_clear_error():
    with pytest.raises(ValueError, match="known"):
        rates_at(OpenSetScores([], [], [0.1]), 0.5)
    with pytest.raises(ValueError, match="stranger"):
        rates_at(OpenSetScores([0.9], [True], []), 0.5)
