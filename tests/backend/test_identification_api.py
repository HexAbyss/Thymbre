import pytest

from app.core.config import settings


def enroll(client, name, *takes):
    files = [("files", (f"t{i}.wav", t, "audio/wav")) for i, t in enumerate(takes)]
    response = client.post("/speakers", data={"name": name}, files=files)
    assert response.status_code == 201
    return response.json()


def identify(client, audio: bytes):
    return client.post("/identify", files={"file": ("clip.wav", audio, "audio/wav")})


def test_identifies_an_enrolled_speaker_from_a_new_recording(client):
    ana = enroll(client, "Ana", b"voice:ana:1", b"voice:ana:2")

    response = identify(client, b"voice:ana:3")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "match"
    assert body["speaker"] == {"id": ana["id"], "name": "Ana"}
    assert body["score"] > 0.9


def test_picks_the_right_speaker_among_several(client):
    enroll(client, "Ana", b"voice:ana:1", b"voice:ana:2")
    enroll(client, "Bruno", b"voice:bruno:1", b"voice:bruno:2")
    enroll(client, "Carla", b"voice:carla:1", b"voice:carla:2")

    assert identify(client, b"voice:bruno:9").json()["speaker"]["name"] == "Bruno"
    assert identify(client, b"voice:carla:9").json()["speaker"]["name"] == "Carla"
    assert identify(client, b"voice:ana:9").json()["speaker"]["name"] == "Ana"


def test_reports_unknown_for_a_voice_nobody_enrolled(client):
    enroll(client, "Ana", b"voice:ana:1", b"voice:ana:2")

    body = identify(client, b"voice:stranger:1").json()

    assert body["status"] == "unknown"
    assert body["speaker"] is None


def test_reports_unknown_when_nobody_is_enrolled(client):
    body = identify(client, b"voice:ana:1").json()

    assert body["status"] == "unknown"
    assert body["speaker"] is None
    assert body["score"] is None


def test_reports_uncertain_when_two_speakers_score_too_close(client, monkeypatch):
    enroll(client, "Ana", b"voice:ana:1")
    enroll(client, "Bruno", b"voice:bruno:1")
    monkeypatch.setattr(settings, "identify_threshold", -1.0)
    monkeypatch.setattr(settings, "identify_margin", 2.0)

    body = identify(client, b"voice:ana:2").json()

    assert body["status"] == "uncertain"


def test_a_deleted_speaker_is_no_longer_identified(client):
    ana = enroll(client, "Ana", b"voice:ana:1", b"voice:ana:2")
    client.delete(f"/speakers/{ana['id']}")

    assert identify(client, b"voice:ana:3").json()["status"] == "unknown"


def test_rejects_a_clip_with_too_little_speech(client):
    assert identify(client, b"short-clip").status_code == 422


def test_rejects_input_that_is_not_audio(client):
    assert identify(client, b"bad-bytes").status_code == 422


def test_rejects_a_request_without_a_file(client):
    assert client.post("/identify").status_code == 422


def test_rejects_an_upload_over_the_size_limit(client, monkeypatch):
    monkeypatch.setattr(settings, "max_upload_bytes", 10)

    assert identify(client, b"x" * 11).status_code == 413


@pytest.mark.parametrize("field", ["embedding", "centroid"])
def test_the_response_never_exposes_voice_vectors(client, field):
    enroll(client, "Ana", b"voice:ana:1")

    response = identify(client, b"voice:ana:2")

    assert response.status_code == 200
    assert field not in response.text
