from fastapi.testclient import TestClient

from app.db.session import get_session
from app.main import app


class FakeSession:
    def execute(self, *args, **kwargs):
        return None


def test_health_returns_ok():
    app.dependency_overrides[get_session] = lambda: FakeSession()
    try:
        response = TestClient(app).get("/health")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
