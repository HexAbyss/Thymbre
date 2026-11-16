"""Issue #14: several samples that are each under the per-file limit but together too big."""

from app.core.config import settings


def enroll(client, *sizes: int):
    files = [("files", (f"s{i}.wav", b"v" * size, "audio/wav")) for i, size in enumerate(sizes)]
    return client.post("/speakers", data={"name": "Ana"}, files=files)


def test_samples_that_add_up_to_more_than_the_request_limit_are_refused(client, monkeypatch):
    monkeypatch.setattr(settings, "max_upload_bytes", 20)
    monkeypatch.setattr(settings, "max_request_bytes", 25)

    response = enroll(client, 15, 15)

    assert response.status_code == 413
    assert "25" in response.json()["detail"]
    assert client.get("/speakers").json() == []


def test_samples_that_fit_in_the_request_limit_are_accepted(client, monkeypatch):
    monkeypatch.setattr(settings, "max_upload_bytes", 20)
    monkeypatch.setattr(settings, "max_request_bytes", 25)

    assert enroll(client, 12, 12).status_code == 201


def test_one_file_over_the_per_file_limit_is_still_refused_first(client, monkeypatch):
    monkeypatch.setattr(settings, "max_upload_bytes", 10)
    monkeypatch.setattr(settings, "max_request_bytes", 100)

    assert enroll(client, 11).status_code == 413
