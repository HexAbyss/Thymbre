import numpy as np
import pytest
from sqlalchemy import text

from app.core.config import settings

DIM = 192


def files(*contents: bytes):
    return [
        ("files", (f"sample{i}.wav", content, "audio/wav")) for i, content in enumerate(contents)
    ]


def enroll(client, name="Maya", audios=(b"voice-a",)):
    return client.post("/speakers", data={"name": name}, files=files(*audios))


def count(session, table: str) -> int:
    return session.execute(text(f"SELECT count(*) FROM {table}")).scalar()  # noqa: S608


def test_enrolls_a_speaker_with_one_sample(client):
    response = enroll(client)

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Maya"
    assert body["sample_count"] == 1
    assert body["id"]


def test_centroid_is_the_normalized_mean_of_the_samples(client, session):
    enroll(client, audios=(b"voice-a", b"voice-b", b"voice-c"))

    rows = session.execute(text("SELECT embedding::text FROM voice_samples")).scalars().all()
    samples = np.array([np.fromstring(r.strip("[]"), sep=",") for r in rows])  # noqa: NPY201
    centroid_text = session.execute(text("SELECT centroid::text FROM speakers")).scalar()
    centroid = np.fromstring(centroid_text.strip("[]"), sep=",")  # noqa: NPY201

    expected = samples.mean(axis=0)
    expected /= np.linalg.norm(expected)
    assert len(rows) == 3
    assert np.linalg.norm(centroid) == pytest.approx(1.0, abs=1e-4)
    assert np.allclose(centroid, expected, atol=1e-4)


def test_lists_enrolled_speakers_with_their_sample_counts(client):
    enroll(client, name="Ana", audios=(b"a1", b"a2"))
    enroll(client, name="Bruno", audios=(b"b1",))

    response = client.get("/speakers")

    assert response.status_code == 200
    summary = {s["name"]: s["sample_count"] for s in response.json()}
    assert summary == {"Ana": 2, "Bruno": 1}


def test_list_is_empty_when_nobody_is_enrolled(client):
    assert client.get("/speakers").json() == []


@pytest.mark.parametrize("name", ["", "   "])
def test_rejects_a_blank_name(client, name):
    assert enroll(client, name=name).status_code == 422


def test_rejects_a_request_without_samples(client):
    response = client.post("/speakers", data={"name": "Maya"})

    assert response.status_code == 422


def test_rejects_too_many_samples(client):
    audios = tuple(f"voice-{i}".encode() for i in range(11))

    assert enroll(client, audios=audios).status_code == 422


def test_rejects_a_clip_with_too_little_speech_and_stores_nothing(client, session):
    response = enroll(client, audios=(b"short-clip",))

    assert response.status_code == 422
    assert count(session, "speakers") == 0


def test_rejects_input_that_is_not_audio(client, session):
    response = enroll(client, audios=(b"bad-bytes",))

    assert response.status_code == 422
    assert count(session, "speakers") == 0


def test_one_bad_sample_rejects_the_whole_enrollment(client, session):
    response = enroll(client, audios=(b"voice-a", b"short-clip", b"voice-c"))

    assert response.status_code == 422
    assert count(session, "speakers") == 0
    assert count(session, "voice_samples") == 0


def test_rejects_an_upload_over_the_size_limit(client, session, monkeypatch):
    monkeypatch.setattr(settings, "max_upload_bytes", 10)

    response = enroll(client, audios=(b"x" * 11,))

    assert response.status_code == 413
    assert count(session, "speakers") == 0


def test_deletes_a_speaker_and_all_of_its_samples(client, session):
    speaker_id = enroll(client, audios=(b"a1", b"a2")).json()["id"]

    response = client.delete(f"/speakers/{speaker_id}")

    assert response.status_code == 204
    assert count(session, "speakers") == 0
    assert count(session, "voice_samples") == 0


def test_deleting_an_unknown_speaker_returns_404(client):
    response = client.delete("/speakers/00000000-0000-0000-0000-000000000000")

    assert response.status_code == 404


def test_deleting_with_a_malformed_id_returns_422(client):
    assert client.delete("/speakers/not-a-uuid").status_code == 422
