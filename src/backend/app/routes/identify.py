import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_session
from app.dependencies import get_embedding_service
from app.ml.audio import AudioError
from app.repositories.pending_clips import PendingClipRepository
from app.repositories.speakers import SpeakerRepository
from app.routes.uploads import read_upload
from app.services.embedding import ClipTooShortError, EmbeddingService
from app.services.identification import IdentificationService, Status

router = APIRouter(tags=["identification"])


class SpeakerRef(BaseModel):
    id: uuid.UUID
    name: str


class IdentifyOut(BaseModel):
    status: Status
    speaker: SpeakerRef | None
    score: float | None
    clip_id: uuid.UUID | None


@router.post("/identify")
def identify(
    file: Annotated[UploadFile, File()],
    session: Annotated[Session, Depends(get_session)],
    embeddings: Annotated[EmbeddingService, Depends(get_embedding_service)],
) -> IdentifyOut:
    audio = read_upload(file)
    service = IdentificationService(
        SpeakerRepository(session),
        PendingClipRepository(session),
        embeddings,
        threshold=settings.identify_threshold,
        margin=settings.identify_margin,
        clip_ttl_seconds=settings.pending_clip_ttl_seconds,
    )
    try:
        result = service.identify(audio)
    except (AudioError, ClipTooShortError) as error:
        raise HTTPException(422, str(error)) from error

    speaker = SpeakerRef(id=result.speaker.id, name=result.speaker.name) if result.speaker else None
    return IdentifyOut(
        status=result.status, speaker=speaker, score=result.score, clip_id=result.clip_id
    )
