"""Tests for the human-controlled controlled-demo fix workflow."""

import pytest

from app.schemas.security import ReviewActor, ReviewDecision, VerificationStatus
from app.services import security_fixes
from app.services.security_analysis import analyze_demo_state


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


def _proposal():
    finding, _ = analyze_demo_state(corrected=False)
    assert finding is not None
    proposal = security_fixes.build_fix_proposal(finding)
    assert proposal is not None
    return proposal


def test_valid_finding_produces_reviewable_deterministic_proposal() -> None:
    proposal = _proposal()

    assert proposal.review_status.value == "pending"
    assert proposal.application_status.value == "not_applied"
    assert proposal.affected_code
    assert "owner_id" in proposal.unified_diff
    assert "Deterministic template" in proposal.limitations


def test_unapproved_proposal_cannot_be_applied() -> None:
    proposal = _proposal()

    with pytest.raises(security_fixes.FixWorkflowError, match="approved"):
        security_fixes.apply_fix_proposal(proposal.proposal_id)


def test_rejected_proposal_cannot_be_applied() -> None:
    proposal = _proposal()
    security_fixes.record_review(
        proposal.proposal_id,
        ReviewDecision.REJECTED,
        "human-reviewer",
        ReviewActor.HUMAN,
    )

    with pytest.raises(security_fixes.FixWorkflowError, match="approved"):
        security_fixes.apply_fix_proposal(proposal.proposal_id)


def test_ai_actor_cannot_record_a_review_decision() -> None:
    proposal = _proposal()

    with pytest.raises(security_fixes.FixWorkflowError, match="AI actor"):
        security_fixes.record_review(
            proposal.proposal_id,
            ReviewDecision.APPROVED,
            "model",
            ReviewActor.AI,
        )


def test_approved_proposal_applies_verifies_and_rolls_back() -> None:
    proposal = _proposal()
    security_fixes.record_review(
        proposal.proposal_id,
        ReviewDecision.APPROVED,
        "human-reviewer",
        ReviewActor.HUMAN,
    )

    result = security_fixes.apply_fix_proposal(proposal.proposal_id)

    assert result.application_status.value == "applied"
    assert result.verification_status == VerificationStatus.PASSED
    assert result.rollback_available is True
    assert "Expected HTTP 403; received HTTP 403." in (result.verification_output or "")
    assert "order.owner_id != authenticated_customer" in security_fixes._controlled_path().read_text()

    rollback = security_fixes.rollback_fix_proposal(proposal.proposal_id)

    assert rollback.application_status.value == "not_applied"
    assert rollback.verification_status == VerificationStatus.NOT_RUN
    assert rollback.rollback_available is False


def test_stale_source_is_rejected() -> None:
    proposal = _proposal()
    security_fixes.record_review(
        proposal.proposal_id,
        ReviewDecision.APPROVED,
        "human-reviewer",
        ReviewActor.HUMAN,
    )
    target = security_fixes._controlled_path()
    target.write_text(target.read_text(encoding="utf-8") + "\n", encoding="utf-8")

    with pytest.raises(security_fixes.FixWorkflowError, match="stale"):
        security_fixes.apply_fix_proposal(proposal.proposal_id)


def test_unexpected_target_is_rejected() -> None:
    proposal = _proposal()
    security_fixes.record_review(
        proposal.proposal_id,
        ReviewDecision.APPROVED,
        "human-reviewer",
        ReviewActor.HUMAN,
    )
    proposal.file_path = "backend/app/other.py"

    with pytest.raises(security_fixes.FixWorkflowError, match="outside"):
        security_fixes.apply_fix_proposal(proposal.proposal_id)


def test_malformed_diff_is_rejected() -> None:
    proposal = _proposal()
    security_fixes.record_review(
        proposal.proposal_id,
        ReviewDecision.APPROVED,
        "human-reviewer",
        ReviewActor.HUMAN,
    )
    proposal.unified_diff = "not the generated patch"

    with pytest.raises(security_fixes.FixWorkflowError, match="diff"):
        security_fixes.apply_fix_proposal(proposal.proposal_id)


def test_failed_verification_is_not_reported_as_verified(monkeypatch) -> None:
    proposal = _proposal()
    security_fixes.record_review(
        proposal.proposal_id,
        ReviewDecision.APPROVED,
        "human-reviewer",
        ReviewActor.HUMAN,
    )

    from app.services import security_verification

    monkeypatch.setattr(
        security_verification,
        "verify_demo",
        lambda corrected, finding_id: security_verification.VerificationResult(
            verification_id="verification-failed",
            finding_id=finding_id,
            tested="controlled test",
            executed=True,
            passed=False,
            status=VerificationStatus.FAILED,
            summary="Controlled test failed.",
            error="controlled test failure",
        ),
    )
    result = security_fixes.apply_fix_proposal(proposal.proposal_id)

    assert result.application_status.value == "failed"
    assert result.verification_status == VerificationStatus.FAILED
    assert result.error == "Controlled verification failed."
    assert result.verification_status != VerificationStatus.PASSED


def test_repeated_application_is_rejected() -> None:
    proposal = _proposal()
    security_fixes.record_review(
        proposal.proposal_id,
        ReviewDecision.APPROVED,
        "human-reviewer",
        ReviewActor.HUMAN,
    )
    security_fixes.apply_fix_proposal(proposal.proposal_id)

    with pytest.raises(security_fixes.FixWorkflowError, match="already been applied"):
        security_fixes.apply_fix_proposal(proposal.proposal_id)