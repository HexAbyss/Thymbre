import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_session
from app.dependencies import get_embedding_service
from app.ml.audio import AudioError
from app.repositories.pending_clips import PendingClipRepository
from app.repositories.speakers import SpeakerRepository, SpeakerSummary
from app.routes.uploads import read_uploads
from app.services.embedding import ClipTooShortError, EmbeddingService
from app.services.enrollment import ClipNotFoundError, EnrollmentService

router = APIRouter(prefix="/speakers", tags=["speakers"])

SessionDep = Annotated[Session, Depends(get_session)]
EmbeddingDep = Annotated[EmbeddingService, Depends(get_embedding_service)]


class SpeakerOut(BaseModel):
    id: uuid.UUID
    name: str
    sample_count: int
    created_at: datetime

    @classmethod
    def of(cls, summary: SpeakerSummary) -> "SpeakerOut":
        return cls(
            id=summary.id,
            name=summary.name,
            sample_count=summary.sample_count,
            created_at=summary.created_at,
        )


@router.post("", status_code=201)
def enroll(
    name: Annotated[str, Form(max_length=200)],
    files: Annotated[list[UploadFile], File()],
    session: SessionDep,
    embeddings: EmbeddingDep,
) -> SpeakerOut:
    name = name.strip()
    if not name:
        raise HTTPException(422, "name must not be blank")
    if not 1 <= len(files) <= settings.max_samples_per_enrollment:
        raise HTTPException(
            422, f"send between 1 and {settings.max_samples_per_enrollment} audio files"
        )

    audios = read_uploads(files)
    service = EnrollmentService(
        SpeakerRepository(session), embeddings, PendingClipRepository(session)
    )
    try:
        return SpeakerOut.of(service.enroll(name, audios))
    except (AudioError, ClipTooShortError) as error:
        raise HTTPException(422, str(error)) from error


class FromClipIn(BaseModel):
    clip_id: uuid.UUID
    name: str = Field(min_length=1, max_length=200)


@router.post("/from-clip", status_code=201)
def enroll_from_clip(body: FromClipIn, session: SessionDep, embeddings: EmbeddingDep) -> SpeakerOut:
    name = body.name.strip()
    if not name:
        raise HTTPException(422, "name must not be blank")
    service = EnrollmentService(
        SpeakerRepository(session), embeddings, PendingClipRepository(session)
    )
    try:
        return SpeakerOut.of(service.enroll_from_clip(name, body.clip_id))
    except ClipNotFoundError as error:
        raise HTTPException(404, "clip not found or expired") from error


@router.get("")
def list_speakers(session: SessionDep) -> list[SpeakerOut]:
    return [SpeakerOut.of(s) for s in SpeakerRepository(session).list_all()]


@router.delete("/{speaker_id}", status_code=204)
def delete_speaker(speaker_id: uuid.UUID, session: SessionDep) -> Response:
    if not SpeakerRepository(session).delete(speaker_id):
        raise HTTPException(404, "speaker not found")
    return Response(status_code=204)
