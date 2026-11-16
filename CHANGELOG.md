# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [semantic versioning](https://semver.org/).

## [0.1.0] - 2026-11-16

First release.

### Added

- Enroll a speaker from 1 to 10 audio clips, list enrolled speakers, and delete a speaker with all of its samples.
- Identify a speaker from an audio file. The answer is `match`, `unknown` or `uncertain`, with a similarity score.
- Enroll an unknown voice from the identify result, without sending the audio again.
- Speaker embeddings with ECAPA-TDNN (SpeechBrain), speech detection with Silero VAD, and similarity search with Postgres and pgvector.
- A calibration script and a documented method for measuring error rates on your own audio. The default threshold of 0.50 comes from LibriSpeech test-clean.
- A web interface with microphone recording, file upload, a score meter, the session history and speaker management. Enrolling a voice requires confirming that its owner agreed.
- Docker Compose setup, CI for both sides, a weekly job that tests the real models, and Dependabot.

### Known limits

- No authentication. Run it on a trusted machine or network.
- Identification works on a finished clip, not on a live stream.
- Evaluated on English speech only.
