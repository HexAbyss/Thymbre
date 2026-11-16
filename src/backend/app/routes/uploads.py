from fastapi import HTTPException, UploadFile

from app.core.config import settings


def read_upload(upload: UploadFile) -> bytes:
    """Read an upload into memory, refusing anything over the per-file limit."""
    data = upload.file.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(413, f"file exceeds {settings.max_upload_bytes} bytes")
    return data


def read_uploads(uploads: list[UploadFile]) -> list[bytes]:
    """Read several uploads, stopping as soon as the request as a whole gets too big."""
    contents: list[bytes] = []
    total = 0
    for upload in uploads:
        data = read_upload(upload)
        total += len(data)
        if total > settings.max_request_bytes:
            raise HTTPException(413, f"request exceeds {settings.max_request_bytes} bytes in total")
        contents.append(data)
    return contents
