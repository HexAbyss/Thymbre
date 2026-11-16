from app.main import app


def test_upload_fields_are_described_as_binary_so_swagger_shows_a_file_picker():
    """Without `format: binary`, /docs renders `files` as text inputs and cannot upload."""
    schema = app.openapi()
    body = schema["components"]["schemas"]["Body_enroll_speakers_post"]

    assert body["properties"]["files"]["items"] == {"type": "string", "format": "binary"}


def test_single_file_upload_is_also_described_as_binary():
    schema = app.openapi()
    body = schema["components"]["schemas"]["Body_identify_identify_post"]

    assert body["properties"]["file"]["format"] == "binary"


def test_no_schema_uses_the_octet_stream_media_type_marker():
    assert "contentMediaType" not in str(app.openapi())
