# Architecture

Thymbre identifies who is speaking. A voice is enrolled once as a speaker embedding, and later audio is matched against the enrolled voices. If nothing matches closely enough, the voice is reported as unknown and can be enrolled on the spot.

## Overview

```
 frontend (Next.js) ──HTTP / WebSocket──▶ backend (FastAPI) ──SQL──▶ db (Postgres + pgvector)
                                              │
                                              └─ in-process: decode → VAD → embedding model
```

Three Docker Compose services: `frontend`, `backend` and `db`. The model runs inside the backend process. A separate ML service would add network hops and deployment work without a benefit at this scale.

Repository layout:

```
src/backend/    FastAPI app, ML pipeline, migrations
src/frontend/   Next.js app
tests/backend/  backend tests; regression/ holds one test per fixed bug
tests/frontend/ frontend tests
docs/
.github/        CI, issue and pull request templates
docker-compose.yml
```

## Backend layers

```
routes/        HTTP and WebSocket handlers, Pydantic request/response schemas
services/      enrollment and identification (business rules)
ml/            audio decoding, VAD, embedder (behind a small interface)
repositories/  all SQL
db/            models and Alembic migrations
core/          settings and logging
```

Routes call services only. Services do not import FastAPI. The embedder sits behind an interface so the model can be swapped (for example SpeechBrain to ONNX Runtime) in one place.

## Audio pipeline

Used by both enrollment and identification:

1. Decode with ffmpeg to mono, 16 kHz.
2. Remove silence with Silero VAD.
3. Reject the clip if too little speech remains (default 3 s of speech, configurable).
4. Compute the ECAPA-TDNN embedding (192 dimensions) and L2-normalize it.

## Data model

- `speakers`: id, name, centroid (vector), created_at.
- `voice_samples`: id, speaker_id, embedding (vector), duration, created_at.
- `pending_clips`: id, embedding (vector), duration (seconds of speech), expires_at.

A speaker's centroid is the normalized mean of its sample embeddings and is recomputed on every enrollment. Identification compares the query embedding to the centroids with pgvector (HNSW index, cosine distance).

## Identification rules

- Take the closest speaker and its cosine similarity.
- If the similarity is at or above the threshold, return that speaker. Otherwise return `unknown`.
- Also check the margin against the second-best speaker. When the two are too close, the result is treated as uncertain, not as a match.
- The threshold (`IDENTIFY_THRESHOLD`, default 0.50) and the margin (`IDENTIFY_MARGIN`, default 0.05) are configurable. The threshold was calibrated on a labelled set, and the margin was not. See [CALIBRATION.md](CALIBRATION.md) for the method, the results and how to rerun it on your own audio.

`POST /identify` takes one `file` and answers `{"status": "match" | "unknown" | "uncertain", "speaker": {"id", "name"} | null, "score": number | null, "clip_id": uuid | null}`. For `uncertain`, `speaker` is the best candidate. The score is null when nobody is enrolled. `clip_id` is set only for `unknown` (see below). The response never contains voice vectors. Upload limits and error codes (`413`, `422`) are the same as for enrollment.

## Unknown voices

Raw audio is not stored. When identification returns `unknown`, only the embedding is saved in `pending_clips` and the response includes a `clip_id`. This also happens when nobody is enrolled yet, so the first voice can be enrolled straight from an identify call. Voice is biometric data, so keeping as little of it as possible is deliberate.

A clip lives for `PENDING_CLIP_TTL_SECONDS` (default 600). Expired clips are deleted whenever a new clip is created, and an expired clip cannot be enrolled.

`POST /speakers/from-clip` takes `{"clip_id", "name"}` and creates a speaker with that single sample. The clip is consumed in the same transaction, so it works once. A missing, expired or already used clip returns `404`, and a malformed id or a blank name returns `422` and leaves the clip usable.

## API (MVP)

```
POST   /speakers                  name + audio samples: enroll
GET    /speakers                  list
DELETE /speakers/{id}             delete a voice and all its data
POST   /identify                  audio: match, unknown (+ clip_id) or uncertain
POST   /speakers/from-clip        clip_id + name: enroll an unknown voice
GET    /config                    thresholds and limits a client needs
GET    /health
```

Deletion exists from the start: whoever enrolls a voice must be able to remove it.

Enrollment is multipart (`name` plus 1 to 10 `files`). Each file is limited to `MAX_UPLOAD_BYTES` (20 MB) and 60 s of audio, and one request to `MAX_REQUEST_BYTES` (50 MB) in total. The backend stops reading as soon as the total is passed. Every sample is embedded before anything is written, so one bad sample rejects the whole request and stores nothing. Errors: `413` for an oversized file or an oversized request, `422` for a blank name, a wrong number of files, input that is not audio, or a clip with too little speech, `404` when deleting an unknown speaker.

## Frontend

Next.js (App Router) with TypeScript and Tailwind CSS, in a dark, flat style: charcoal cards on a near-black page, white primary buttons and very little color. Fonts are self-hosted through the `geist` package, so building needs no font download.

The browser only talks to the frontend. Requests to `/api/*` go through a route handler (`app/api/[...path]/route.ts`) that forwards them to the backend, so the backend needs no CORS configuration and stays off the public surface. The address comes from `BACKEND_URL` on every request, so one built image runs against any backend. Bodies are streamed rather than buffered, and the backend's limits are the ones that decide. If the backend cannot be reached the handler answers `502`.

Screens:

- **Identify**: record from the microphone or upload a file, see the verdict with the score drawn against the threshold, and enroll an unknown voice from the same screen. The list of attempts lives in the browser tab only and is never stored.
- **Speakers**: list enrolled voices, enroll a new one from 1 to 10 samples, delete a voice after confirming.
- **Privacy**: what is kept and what is not.

The thresholds and limits shown on screen come from `GET /config`, so they always match the server. Enrolling a voice requires ticking a consent box. Errors are translated into a sentence that says what to do next. Recording uses the browser's `MediaRecorder`, and the live level on the timeline comes from an `AnalyserNode`.

Styles are Tailwind utilities in the markup. `app/globals.css` holds the design tokens (`@theme`) and the few patterns that repeat (card, buttons, pills, notices).

## Concurrency

Inference is CPU-bound and blocking. Route handlers are plain functions, so FastAPI runs them in a thread pool, and `MAX_CONCURRENT_INFERENCES` (default 2) caps how many decode audio and run the models at once. The models load on first use, under a lock so that simultaneous first requests load them once, and stay in memory. Their weights live in a Docker volume (`model-cache`), so they are downloaded once and not on every build.

## Live identification (after the MVP)

The client streams PCM chunks over a WebSocket. The backend keeps a sliding window of about 3 seconds, runs VAD, and identifies once per second. It reuses the same identification service as the HTTP endpoint.

## Out of scope for the MVP

Authentication, anti-spoofing and multi-speaker diarization. They are tracked as issues.
