"""API tests for graph validation and Python preview."""

from fastapi.testclient import TestClient

from app.main import app
from tests.test_graph_validation import make_graph

client = TestClient(app)


def test_validate_endpoint_returns_structured_success() -> None:
    response = client.post("/api/graph/validate", json=make_graph().model_dump())

    assert response.status_code == 200
    assert response.json() == {"valid": True, "errors": []}


def test_validate_endpoint_reports_invalid_graph() -> None:
    payload = make_graph().model_dump(mode="json")
    payload["edges"][0]["type"] = "passes_input"

    response = client.post("/api/graph/validate", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["valid"] is False
    assert body["errors"][0]["code"] == "unsupported_relationship"


def test_preview_endpoint_returns_generated_python() -> None:
    response = client.post("/api/graph/preview", json=make_graph().model_dump(mode="json"))

    assert response.status_code == 200
    body = response.json()
    assert body["valid"] is True
    assert body["syntax_valid"] is True
    assert "return search_products(query, limit)" in body["code"]


def test_preview_endpoint_rejects_invalid_graph_without_code() -> None:
    payload = make_graph().model_dump(mode="json")
    payload["nodes"][0]["name"] = "not-valid"

    response = client.post("/api/graph/preview", json=payload)

    assert response.status_code == 422
    assert "code" not in response.json()["detail"]
