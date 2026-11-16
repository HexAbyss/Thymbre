import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import numpy as np
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.db.models import PendingClip


@dataclass(frozen=True)
class ClaimedClip:
    embedding: np.ndarray
    duration_seconds: float


class PendingClipRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def create(self, embedding: np.ndarray, duration_seconds: float, ttl_seconds: int) -> uuid.UUID:
        """Store a clip's embedding, dropping any clips that have already expired."""
        now = datetime.now(UTC)
        self._session.execute(delete(PendingClip).where(PendingClip.expires_at <= now))
        clip = PendingClip(
            embedding=embedding,
            duration_seconds=duration_seconds,
            expires_at=now + timedelta(seconds=ttl_seconds),
        )
        self._session.add(clip)
        self._session.commit()
        return clip.id

    def claim(self, clip_id: uuid.UUID) -> ClaimedClip | None:
        """Remove and return an unexpired clip. The caller commits, so claiming and
        enrolling can share one transaction."""
        row = self._session.execute(
            delete(PendingClip)
            .where(PendingClip.id == clip_id, PendingClip.expires_at > datetime.now(UTC))
            .returning(PendingClip.embedding, PendingClip.duration_seconds)
        ).first()
        if row is None:
            return None
        return ClaimedClip(np.asarray(row[0], dtype=np.float32), row[1])
