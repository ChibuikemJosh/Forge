"""Verification of the controlled order-ownership example."""

from fastapi.testclient import TestClient

from app.schemas.security import VerificationResult, VerificationStatus


def verify_route_status(
    *,
    method: str,
    path: str,
    headers: dict[str, str],
    expected_status: int,
    tested: str,
    finding_id: str,
) -> VerificationResult:
    """Execute a single controlled request and record the actual outcome.

    A raised request error is recorded as ``executed=False`` and ``failed``
    rather than propagating, so verification is never reported as passed when
    it did not run successfully.
    """
    from app.main import app

    client = TestClient(app)
    try:
        response = client.request(method, path, headers=headers)
    except Exception as error:
        return VerificationResult(
            verification_id=f"verification-{finding_id}",
            finding_id=finding_id,
            tested=tested,
            executed=False,
            passed=False,
            status=VerificationStatus.FAILED,
            summary="Verification could not be executed.",
            error=str(error),
        )
    passed = response.status_code == expected_status
    return VerificationResult(
        verification_id=f"verification-{finding_id}",
        finding_id=finding_id,
        tested=tested,
        executed=True,
        passed=passed,
        status=VerificationStatus.PASSED if passed else VerificationStatus.FAILED,
        summary=f"Expected HTTP {expected_status}; received HTTP {response.status_code}.",
        error=None if passed else response.text,
    )


def verify_demo(corrected: bool, finding_id: str) -> VerificationResult:
    """Verify the controlled demo endpoint for the requested state."""
    path = (
        "/api/demo/corrected/orders/order-bob"
        if corrected
        else "/api/demo/vulnerable/orders/order-bob"
    )
    expected_status = 403 if corrected else 200
    return verify_route_status(
        method="GET",
        path=path,
        headers={"x-customer-id": "customer-alice"},
        expected_status=expected_status,
        tested="Authenticated customer cannot retrieve another customer's order.",
        finding_id=finding_id,
    )
