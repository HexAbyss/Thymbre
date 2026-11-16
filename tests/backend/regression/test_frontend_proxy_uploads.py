"""Uploads through the frontend's `/api` proxy. Needs the whole stack, so it only runs when
FRONTEND_URL points at the frontend service, for example http://frontend:3000."""

import os

import httpx
import pytest

FRONTEND_URL = os.environ.get("FRONTEND_URL")

pytestmark = pytest.mark.skipif(not FRONTEND_URL, reason="FRONTEND_URL is not set")


def upload(megabytes: int) -> httpx.Response:
    clip = b"\x00" * (megabytes * 1024 * 1024)
    return httpx.post(
        f"{FRONTEND_URL}/api/identify",
        files={"file": ("clip.wav", clip, "audio/wav")},
        timeout=60,
    )


def test_an_upload_over_the_proxy_buffer_still_reaches_the_backend():
    """The proxy used to cut bodies at 10 MB and answer 500 instead of letting the backend reply."""
    response = upload(12)

    assert response.status_code == 422


def test_the_backend_size_limit_is_enforced_behind_the_proxy():
    response = upload(25)

    assert response.status_code == 413


def test_samples_over_the_total_limit_get_a_413_through_the_proxy():
    """Issue #14: three files under the per-file limit but over the total used to end in a 500."""
    clip = b"\x00" * (18 * 1024 * 1024)
    files = [("files", (f"s{i}.wav", clip, "audio/wav")) for i in range(3)]

    response = httpx.post(
        f"{FRONTEND_URL}/api/speakers", data={"name": "Ana"}, files=files, timeout=120
    )

    assert response.status_code == 413
