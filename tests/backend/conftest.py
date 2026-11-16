import hashlib

import numpy as np
import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.db.session import get_session
from app.dependencies import get_embedding_service
from app.main import app
from app.ml.audio import AudioError
from app.services.embedding import ClipTooShortError, EmbeddingResult

DIM = 192
TEST_DB_NAME = "thymbre_test"


class FakeEmbeddingService:
    """Deterministic stand-in: the audio bytes decide the embedding or the failure."""

    def embed(self, audio: bytes) -> EmbeddingResult:
        if audio.startswith(b"short"):
            raise ClipTooShortError("not enough speech")
        if audio.startswith(b"bad"):
            raise AudioError("input is not decodable audio")
        if audio.startswith(b"voice:"):
            # b"voice:<person>:<take>": takes of one person are close, different people are not.
            _, person, take = audio.split(b":", 2)
            vector = vector_for(person) + 0.2 * vector_for(person + b"/" + take)
        else:
            vector = vector_for(audio)
        return EmbeddingResult(embedding=vector / np.linalg.norm(vector), speech_seconds=4.0)


def vector_for(seed_bytes: bytes) -> np.ndarray:
    seed = int.from_bytes(hashlib.sha256(seed_bytes).digest()[:4], "big")
    return np.random.default_rng(seed).standard_normal(DIM).astype(np.float32)


@pytest.fixture(scope="session")
def test_database_url() -> str:
    url = make_url(settings.database_url)
    admin = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin.connect() as connection:
        exists = connection.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": TEST_DB_NAME}
        ).scalar()
        if not exists:
            connection.execute(text(f'CREATE DATABASE "{TEST_DB_NAME}"'))
    admin.dispose()

    test_url = url.set(database=TEST_DB_NAME).render_as_string(hide_password=False)
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", test_url)
    command.upgrade(config, "head")
    return test_url


@pytest.fixture
def db(test_database_url: str):
    engine = create_engine(test_database_url)
    with engine.begin() as connection:
        connection.execute(text("TRUNCATE speakers, voice_samples, pending_clips CASCADE"))
    yield sessionmaker(engine, expire_on_commit=False)
    engine.dispose()


@pytest.fixture
def session(db) -> Session:
    with db() as session:
        yield session


@pytest.fixture
def client(db):
    def override_session():
        with db() as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_embedding_service] = lambda: FakeEmbeddingService()
    yield TestClient(app)
    app.dependency_overrides.clear()
