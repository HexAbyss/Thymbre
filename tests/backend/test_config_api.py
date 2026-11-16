from app.core.config import settings


def test_config_exposes_the_limits_the_interface_needs(client):
    response = client.get("/config")

    assert response.status_code == 200
    assert response.json() == {
        "identify_threshold": settings.identify_threshold,
        "identify_margin": settings.identify_margin,
        "min_speech_seconds": settings.min_speech_seconds,
        "max_audio_seconds": settings.max_audio_seconds,
        "max_upload_bytes": settings.max_upload_bytes,
        "max_request_bytes": settings.max_request_bytes,
        "max_samples_per_enrollment": settings.max_samples_per_enrollment,
        "pending_clip_ttl_seconds": settings.pending_clip_ttl_seconds,
    }


def test_config_never_exposes_connection_details(client):
    body = client.get("/config").text

    assert "database" not in body
    assert "postgresql" not in body
