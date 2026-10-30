"""API tests for the human-controlled security-fix lifecycle."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import security_fixes

client = TestClient(app)


@pytest.fixture(autouse=True)
def restore_controlled_source():
    target = security_fixes._controlled_path()
    original = target.read_text(encoding="utf-8")
    security_fixes._proposals.clear()
    security_fixes._rollback_contents.clear()
    security_fixes._applied_hashes.clear()
    yield
    target.write_text(original, encoding="utf-8")
    security_fixes._proposals.clear()
    security_fixes._rollback_contents.clear()
    security_fixes._applied_hashes.clear()


def test_api_review_apply_verify_and_rollback_lifecycle() -> None:
    analysis = client.post("/api/security/analyze?verify=false")
    proposal_id = analysis.json()["fix_proposal"]["proposal_id"]

    review = client.post(
        f"/api/security/proposals/{proposal_id}/review",
        json={
            "decision": "approved",
            "reviewer": "human-reviewer",
            "actor": "human",
            "reason": "The deterministic correction matches the ownership rule.",
        },
    )
    assert review.status_code == 200
    assert review.json()["decision"] == "approved"

    applied = client.post(f"/api/security/proposals/{proposal_id}/apply")
    assert applied.status_code == 200
    assert applied.json()["application_status"] == "applied"
    assert applied.json()["verification_status"] == "passed"

    repeated = client.post(f"/api/security/proposals/{proposal_id}/apply")
    assert repeated.status_code == 409

    rollback = client.post(f"/api/security/proposals/{proposal_id}/rollback")
    assert rollback.status_code == 200
    assert rollback.json()["application_status"] == "not_applied"