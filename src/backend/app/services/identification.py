import uuid
from dataclasses import dataclass
from typing import Literal

from app.repositories.pending_clips import PendingClipRepository
from app.repositories.speakers import SpeakerMatch, SpeakerRepository
from app.services.embedding import EmbeddingService

Status = Literal["match", "unknown", "uncertain"]


@dataclass(frozen=True)
class Identification:
    status: Status
    speaker: SpeakerMatch | None = None
    score: float | None = None
    clip_id: uuid.UUID | None = None


class IdentificationService:
    def __init__(
        self,
        repository: SpeakerRepository,
        pending_clips: PendingClipRepository,
        embeddings: EmbeddingService,
        threshold: float,
        margin: float,
        clip_ttl_seconds: int,
    ) -> None:
        self._repository = repository
        self._pending_clips = pending_clips
        self._embeddings = embeddings
        self._threshold = threshold
        self._margin = margin
        self._clip_ttl_seconds = clip_ttl_seconds

    def identify(self, audio: bytes) -> Identification:
        result = self._embeddings.embed(audio)
        candidates = self._repository.nearest(result.embedding, limit=2)
        best = candidates[0] if candidates else None

        if best is None or best.score < self._threshold:
            clip_id = self._pending_clips.create(
                result.embedding, result.speech_seconds, self._clip_ttl_seconds
            )
            return Identification("unknown", score=best.score if best else None, clip_id=clip_id)

        runner_up = candidates[1] if len(candidates) > 1 else None
        too_close = (
            runner_up is not None
            and runner_up.score >= self._threshold
            and best.score - runner_up.score < self._margin
        )
        return Identification("uncertain" if too_close else "match", best, best.score)
