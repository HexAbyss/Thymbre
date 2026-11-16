# Calibrating the threshold

Thymbre reports a voice as known when its similarity to an enrolled voice reaches `IDENTIFY_THRESHOLD`. A lower threshold recognizes more voices but also accepts strangers. A higher one does the opposite. The script in `src/backend/scripts/calibrate.py` measures that trade-off on audio you provide.

## How the test works

It mirrors what the product does:

1. The speakers are split in two halves. The first half is enrolled from their first 3 clips.
2. The remaining clips of those speakers are probes that should be recognized.
3. Every clip of the other half is a probe from a stranger and should come back `unknown`.

It reports three rates for each threshold:

- **FAR**, the share of strangers accepted as someone.
- **FRR**, the share of enrolled voices rejected as unknown.
- **Misidentification**, the share of enrolled voices accepted but matched to the wrong person.

It also prints the equal error rate (where FAR and FRR meet) and the lowest threshold that keeps FAR under 1% and under 0.1%.

## Running it

Put one folder per speaker in a directory. Any audio format ffmpeg reads works, and clips with less than the minimum speech are skipped and counted.

```bash
docker compose run --rm --no-deps -v /path/to/speakers:/data:ro backend python -m scripts.calibrate /data
```

Options: `--enroll-per-speaker` (default 3), `--max-per-speaker` (default 10), `--seed` for the speaker split, and `--json FILE` to save the full table.

To reproduce the numbers below, download [LibriSpeech test-clean](https://www.openslr.org/12) (CC BY 4.0) and point the script at its `test-clean` folder with `--max-per-speaker 12`.

## Results

LibriSpeech test-clean: 20 enrolled speakers, 20 strangers, 139 known probes and 193 stranger probes. 88 clips were skipped for having too little speech.

| Threshold | FAR | FRR | Misidentification |
|---|---|---|---|
| 0.40 | 6.2% | 0.0% | 0.0% |
| 0.45 | 2.1% | 0.7% | 0.0% |
| 0.50 | 0.0% | 0.7% | 0.0% |
| 0.60 | 0.0% | 0.7% | 0.0% |
| 0.70 | 0.0% | 3.6% | 0.0% |
| 0.80 | 0.0% | 15.1% | 0.0% |

The equal error rate is 0.62% at a threshold of 0.465. The default is **0.50**: no stranger was accepted, and only 0.7% of enrolled voices were rejected. Between 0.50 and 0.60 the rates do not change, so the default sits at the low end of that range to keep recognizing voices recorded in worse conditions.

## What this does not tell you

- The clips are clean read English speech. Phone calls, voice messages and noisy rooms score lower, so the right threshold for your audio may differ. Measure with your own recordings.
- 193 stranger probes with no false accepts only says the false accept rate is probably below about 1.5%. A larger set gives a tighter bound.
- The margin that marks a result as `uncertain` (`IDENTIFY_MARGIN`, 0.05) was not tuned here. No enrolled voice was matched to the wrong person at any threshold in this set.
