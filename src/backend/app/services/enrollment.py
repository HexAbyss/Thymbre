import uuid

import numpy as np

from app.repositories.pending_clips import PendingClipRepository
from app.repositories.speakers import SpeakerRepository, SpeakerSummary
from app.services.embedding import EmbeddingService


class ClipNotFoundError(LookupError):
    """The pending clip does not exist, has expired, or was already used."""


class EnrollmentService:
    def __init__(
        self,
        repository: SpeakerRepository,
        embeddings: EmbeddingService,
        pending_clips: PendingClipRepository,
    ) -> None:
        self._repository = repository
        self._embeddings = embeddings
        self._pending_clips = pending_clips

    def enroll_from_clip(self, name: str, clip_id: uuid.UUID) -> SpeakerSummary:
        """Turn a pending clip into a speaker. The clip is consumed in the same transaction."""
        clip = self._pending_clips.claim(clip_id)
        if clip is None:
            raise ClipNotFoundError(str(clip_id))
        return self._repository.create(
            name, clip.embedding, [(clip.embedding, clip.duration_seconds)]
        )

    def enroll(self, name: str, audios: list[bytes]) -> SpeakerSummary:
        """Embed every sample first, so a bad sample leaves nothing stored."""
        results = [self._embeddings.embed(audio) for audio in audios]

        centroid = np.mean([r.embedding for r in results], axis=0)
        centroid = centroid / np.linalg.norm(centroid)
        samples = [(r.embedding, r.speech_seconds) for r in results]
        return self._repository.create(name, centroid, samples)
