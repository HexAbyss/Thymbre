import uuid

from sqlalchemy import text

from app.core.config import settings


def enroll(client, name, *takes):
    files = [("files", (f"t{i}.wav", t, "audio/wav")) for i, t in enumerate(takes)]
    response = client.post("/speakers", data={"name": name}, files=files)
    assert response.status_code == 201
    return response.json()


def identify(client, audio: bytes):
    return client.post("/identify", files={"file": ("clip.wav", audio, "audio/wav")}).json()


def from_clip(client, clip_id, name="Daniel"):
    return client.post("/speakers/from-clip", json={"clip_id": clip_id, "name": name})


def pending_count(session) -> int:
    return session.execute(text("SELECT count(*) FROM pending_clips")).scalar()


def test_an_unknown_voice_comes_with_a_clip_id(client):
    enroll(client, "Ana", b"voice:ana:1")

    body = identify(client, b"voice:stranger:1")

    assert body["status"] == "unknown"
    assert uuid.UUID(body["clip_id"])


def test_a_clip_id_is_offered_even_when_nobody_is_enrolled_yet(client):
    assert identify(client, b"voice:first:1")["clip_id"] is not None


def test_a_recognized_voice_has_no_clip_id(client):
    enroll(client, "Ana", b"voice:ana:1", b"voice:ana:2")

    assert identify(client, b"voice:ana:3")["clip_id"] is None


def test_an_uncertain_result_has_no_clip_id(client, monkeypatch):
    enroll(client, "Ana", b"voice:ana:1")
    enroll(client, "Bruno", b"voice:bruno:1")
    monkeypatch.setattr(settings, "identify_threshold", -1.0)
    monkeypatch.setattr(settings, "identify_margin", 2.0)

    body = identify(client, b"voice:ana:2")

    assert body["status"] == "uncertain"
    assert body["clip_id"] is None


def test_enrolling_from_a_clip_makes_the_voice_recognizable(client):
    clip_id = identify(client, b"voice:daniel:1")["clip_id"]

    response = from_clip(client, clip_id, name="Daniel")

    assert response.status_code == 201
    assert response.json()["name"] == "Daniel"
    assert response.json()["sample_count"] == 1
    again = identify(client, b"voice:daniel:2")
    assert again["status"] == "match"
    assert again["speaker"]["name"] == "Daniel"


def test_a_clip_can_only_be_used_once(client, session):
    clip_id = identify(client, b"voice:daniel:1")["clip_id"]
    assert from_clip(client, clip_id).status_code == 201

    assert from_clip(client, clip_id).status_code == 404
    assert len(client.get("/speakers").json()) == 1
    assert pending_count(session) == 0


def test_an_unknown_clip_id_returns_404(client):
    assert from_clip(client, str(uuid.uuid4())).status_code == 404


def test_a_malformed_clip_id_returns_422(client):
    assert from_clip(client, "not-a-uuid").status_code == 422


def test_a_blank_name_returns_422_and_keeps_the_clip(client):
    clip_id = identify(client, b"voice:daniel:1")["clip_id"]

    assert from_clip(client, clip_id, name="   ").status_code == 422
    assert from_clip(client, clip_id, name="Daniel").status_code == 201


def test_an_expired_clip_cannot_be_enrolled(client, monkeypatch):
    monkeypatch.setattr(settings, "pending_clip_ttl_seconds", -1)
    clip_id = identify(client, b"voice:daniel:1")["clip_id"]

    assert from_clip(client, clip_id).status_code == 404


def test_expired_clips_are_purged_when_a_new_one_is_created(client, session, monkeypatch):
    monkeypatch.setattr(settings, "pending_clip_ttl_seconds", -1)
    identify(client, b"voice:old:1")
    identify(client, b"voice:old:2")
    monkeypatch.setattr(settings, "pending_clip_ttl_seconds", 600)

    identify(client, b"voice:new:1")

    assert pending_count(session) == 1


def test_the_response_never_exposes_voice_vectors(client):
    response = client.post(
        "/identify", files={"file": ("clip.wav", b"voice:daniel:1", "audio/wav")}
    )

    assert "embedding" not in response.text
    assert "centroid" not in response.text
