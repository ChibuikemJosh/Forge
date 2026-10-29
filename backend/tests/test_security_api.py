"""API tests for the Forge Guard analysis contract."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_analyze_vulnerable_demo_returns_finding_graph_and_verification() -> None:
    response = client.post("/api/security/analyze")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "completed"
    assert body["finding"]["rule_id"] == "order-ownership-authorization"
    assert body["fix_proposal"]["review_status"] == "pending"
    assert body["fix_proposal"]["application_status"] == "not_applied"
    assert body["finding"]["verification_status"] == "passed"
    assert body["verification"]["executed"] is True
    assert body["verification"]["passed"] is True
    assert any(edge["relationship"] == "exposes" for edge in body["graph"]["edges"])


def test_analyze_corrected_demo_has_no_finding() -> None:
    response = client.post("/api/security/analyze?corrected=true")

    assert response.status_code == 200
    body = response.json()
    assert body["finding"] is None
    assert body["verification"]["passed"] is True
    assert any(node["type"] == "authorization" for node in body["graph"]["nodes"])


def test_rule_endpoint_returns_stable_rule_contract() -> None:
    response = client.get("/api/security/rules/order-ownership")

    assert response.status_code == 200
    assert response.json()["rule_id"] == "order-ownership-authorization"
