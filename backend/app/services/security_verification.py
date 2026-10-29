"""Verification of the controlled order-ownership example."""

from app.schemas.security import VerificationResult, VerificationStatus


def verify_demo(corrected: bool, finding_id: str) -> VerificationResult:
    """Execute ownership checks against the controlled FastAPI demo."""
    from fastapi.testclient import TestClient

    from app.main import app

    client = TestClient(app)
    path = "/api/demo/corrected/orders/order-bob" if corrected else "/api/demo/vulnerable/orders/order-bob"
    response = client.get(path, headers={"x-customer-id": "customer-alice"})
    expected_status = 403 if corrected else 200
    passed = response.status_code == expected_status
    return VerificationResult(
        verification_id=f"verification-{finding_id}",
        finding_id=finding_id,
        tested="Authenticated customer cannot retrieve another customer's order.",
        executed=True,
        passed=passed,
        status=VerificationStatus.PASSED if passed else VerificationStatus.FAILED,
        summary=f"Expected HTTP {expected_status}; received HTTP {response.status_code}.",
        error=None if passed else response.text,
    )
