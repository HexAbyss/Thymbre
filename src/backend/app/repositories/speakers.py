import uuid
from dataclasses import dataclass
from datetime import datetime

import numpy as np
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.db.models import Speaker, VoiceSample


@dataclass(frozen=True)
class SpeakerSummary:
    id: uuid.UUID
    name: str
    sample_count: int
    created_at: datetime


@dataclass(frozen=True)
class SpeakerMatch:
    id: uuid.UUID
    name: str
    score: float


class SpeakerRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def create(
        self,
        name: str,
        centroid: np.ndarray,
        samples: list[tuple[np.ndarray, float]],
    ) -> SpeakerSummary:
        """Insert a speaker and its samples in one transaction."""
        speaker = Speaker(name=name, centroid=centroid)
        self._session.add(speaker)
        self._session.flush()
        self._session.add_all(
            VoiceSample(speaker_id=speaker.id, embedding=embedding, duration_seconds=duration)
            for embedding, duration in samples
        )
        self._session.commit()
        self._session.refresh(speaker)
        return SpeakerSummary(speaker.id, speaker.name, len(samples), speaker.created_at)

    def list_all(self) -> list[SpeakerSummary]:
        count = func.count(VoiceSample.id)
        rows = self._session.execute(
            select(Speaker.id, Speaker.name, count, Speaker.created_at)
            .outerjoin(VoiceSample, VoiceSample.speaker_id == Speaker.id)
            .group_by(Speaker.id)
            .order_by(Speaker.created_at, Speaker.name)
        )
        return [SpeakerSummary(*row) for row in rows]

    def nearest(self, embedding: np.ndarray, limit: int) -> list[SpeakerMatch]:
        """Closest speakers by cosine similarity to their centroid, best first."""
        distance = Speaker.centroid.cosine_distance(embedding)
        rows = self._session.execute(
            select(Speaker.id, Speaker.name, distance)
            .where(Speaker.centroid.is_not(None))
            .order_by(distance)
            .limit(limit)
        )
        return [SpeakerMatch(id, name, 1.0 - float(d)) for id, name, d in rows]

    def delete(self, speaker_id: uuid.UUID) -> bool:
        """Delete a speaker; its samples go with it through the foreign key cascade."""
        result = self._session.execute(delete(Speaker).where(Speaker.id == speaker_id))
        self._session.commit()
        return result.rowcount > 0
