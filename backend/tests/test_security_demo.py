"""Endpoint tests for the controlled vulnerable and corrected demo."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_customer_can_retrieve_own_order_in_both_states() -> None:
    for state in ("vulnerable", "corrected"):
        response = client.get(
            f"/api/demo/{state}/orders/order-alice",
            headers={"x-customer-id": "customer-alice"},
        )

        assert response.status_code == 200
        assert response.json()["owner_id"] == "customer-alice"


def test_vulnerable_state_exposes_another_customers_order() -> None:
    response = client.get(
        "/api/demo/vulnerable/orders/order-bob",
        headers={"x-customer-id": "customer-alice"},
    )

    assert response.status_code == 200
    assert response.json()["owner_id"] == "customer-bob"


def test_corrected_state_blocks_another_customers_order() -> None:
    response = client.get(
        "/api/demo/corrected/orders/order-bob",
        headers={"x-customer-id": "customer-alice"},
    )

    assert response.status_code == 403


def test_missing_authentication_is_rejected() -> None:
    response = client.get("/api/demo/corrected/orders/order-alice")

    assert response.status_code == 401


def test_nonexistent_order_is_rejected_in_both_states() -> None:
    for state in ("vulnerable", "corrected"):
        response = client.get(
            f"/api/demo/{state}/orders/order-does-not-exist",
            headers={"x-customer-id": "customer-alice"},
        )
        assert response.status_code == 404
