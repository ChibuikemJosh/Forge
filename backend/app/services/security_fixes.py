"""Human-controlled fixes for the known order-ownership demonstration."""

from __future__ import annotations

import difflib
import hashlib
import inspect
import os
import tempfile
import textwrap
from pathlib import Path

from app.schemas.security import (
    ApplicationStatus,
    FixApplicationResponse,
    FixProposal,
    ReviewActor,
    ReviewDecision,
    ReviewDecisionRecord,
    ReviewStatus,
    SecurityFinding,
    VerificationStatus,
)

CONTROLLED_FILE = "backend/app/security_demo.py"
VERIFICATION_COMMAND = (
    "verify_demo(corrected=True, finding_id=proposal.finding_id)"
)

_proposals: dict[str, FixProposal] = {}
_rollback_contents: dict[str, str] = {}
_applied_hashes: dict[str, str] = {}


class FixWorkflowError(Exception):
    """A safe, expected failure in the controlled fix workflow."""


def build_fix_proposal(
    finding: SecurityFinding | None,
    source_context: str | None = None,
) -> FixProposal | None:
    """Build a deterministic proposal for the known vulnerable function.

    The function shape is intentionally compatible with a future generator:
    callers provide a finding and source context, while this implementation
    supplies a controlled correction rather than AI-generated code.
    """
    if finding is None or finding.finding_id != "finding-order-ownership-001":
        return None
    existing = _proposals.get(finding.finding_id)
    if existing is not None:
        return existing

    from app.security_demo import vulnerable_get_order

    original = source_context or textwrap.dedent(inspect.getsource(vulnerable_get_order))
    corrected = original.replace(
        "    _authenticate_customer(customer_id)\n",
        "    authenticated_customer = _authenticate_customer(customer_id)\n",
        1,
    ).replace(
        "    return order\n",
        "    if order.owner_id != authenticated_customer:\n"
        "        raise HTTPException(status_code=403, detail=\"Order does not belong to customer.\")\n"
        "    return order\n",
        1,
    )
    if corrected == original or "authenticated_customer" not in corrected:
        raise FixWorkflowError("The controlled vulnerable source did not match the expected template.")
    proposal = FixProposal(
        proposal_id="proposal-order-ownership-001",
        finding_id=finding.finding_id,
        file_path=CONTROLLED_FILE,
        unified_diff=_unified_diff(original, corrected),
        affected_code=original,
        explanation="Add an ownership comparison after order retrieval and reject a non-owner with HTTP 403.",
        limitations="Deterministic template for backend/app/security_demo.py only; no arbitrary files or AI-generated scripts are supported.",
        expected_source_hash=_digest(_controlled_path().read_text(encoding="utf-8")),
    )
    _proposals[proposal.proposal_id] = proposal
    return proposal


def record_review(
    proposal_id: str,
    decision: ReviewDecision,
    reviewer: str,
    actor: ReviewActor,
    reason: str | None = None,
) -> ReviewDecisionRecord:
    proposal = _get_proposal(proposal_id)
    if actor is ReviewActor.AI:
        raise FixWorkflowError("An AI actor cannot approve or reject its own proposal.")
    if proposal.review_status is not ReviewStatus.PENDING:
        raise FixWorkflowError("Only pending proposals can receive a review decision.")
    if not reviewer.strip():
        raise FixWorkflowError("A human reviewer is required.")
    proposal.review_status = (
        ReviewStatus.APPROVED if decision is ReviewDecision.APPROVED else ReviewStatus.REJECTED
    )
    return ReviewDecisionRecord(
        decision_id=f"decision-{proposal_id}",
        proposal_id=proposal_id,
        decision=decision,
        reviewer=reviewer,
        actor=actor,
        reason=reason,
    )


def apply_fix_proposal(proposal_id: str) -> FixApplicationResponse:
    """Apply one approved exact-template patch and run its controlled test."""
    proposal = _get_proposal(proposal_id)
    if proposal.review_status is not ReviewStatus.APPROVED:
        raise FixWorkflowError("Only an approved proposal can be applied.")
    if proposal.application_status in {ApplicationStatus.APPLIED, ApplicationStatus.FAILED}:
        raise FixWorkflowError("This proposal has already been applied; use rollback before retrying.")
    if proposal.file_path != CONTROLLED_FILE or Path(proposal.file_path).is_absolute():
        raise FixWorkflowError("The proposal target is outside the controlled demonstration file.")
    target = _controlled_path()
    current = target.read_text(encoding="utf-8")
    if proposal.expected_source_hash != _digest(current):
        raise FixWorkflowError("The controlled source is stale or no longer matches the proposal.")
    original = proposal.affected_code
    expected_original = _extract_vulnerable_source(current)
    if not original or original != expected_original or current.count(original) != 1:
        raise FixWorkflowError("The proposal patch boundary is invalid or ambiguous.")
    corrected = _corrected_source(original)
    if proposal.unified_diff != _unified_diff(original, corrected):
        raise FixWorkflowError("The proposal diff is malformed or has been modified.")
    updated = current.replace(original, corrected, 1)
    _rollback_contents[proposal_id] = current
    _atomic_write(target, updated)
    _applied_hashes[proposal_id] = _digest(updated)
    proposal.application_status = ApplicationStatus.APPLIED
    proposal.rollback_available = True

    from app.services.security_verification import verify_demo

    verification = verify_demo(True, proposal.finding_id)
    output = verification.summary if verification.error is None else (
        f"{verification.summary} {verification.error}"
    )
    if verification.passed:
        proposal.application_status = ApplicationStatus.APPLIED
        proposal.verification_status = VerificationStatus.PASSED
    else:
        proposal.application_status = ApplicationStatus.FAILED
        proposal.verification_status = VerificationStatus.FAILED
    proposal.verification_output = output
    return FixApplicationResponse(
        proposal_id=proposal_id,
        file_path=proposal.file_path,
        application_status=proposal.application_status,
        verification_status=proposal.verification_status,
        verification_command=VERIFICATION_COMMAND,
        verification_output=output,
        rollback_available=proposal.rollback_available,
        error=None if verification.passed else "Controlled verification failed.",
    )


def rollback_fix_proposal(proposal_id: str) -> FixApplicationResponse:
    """Restore the exact content captured before an application."""
    proposal = _get_proposal(proposal_id)
    original = _rollback_contents.get(proposal_id)
    if not proposal.rollback_available or original is None:
        raise FixWorkflowError("No rollback is available for this proposal.")
    target = _controlled_path()
    current = target.read_text(encoding="utf-8")
    if _digest(current) != _applied_hashes.get(proposal_id):
        raise FixWorkflowError("The controlled file changed after application; refusing rollback.")
    _atomic_write(target, original)
    proposal.application_status = ApplicationStatus.NOT_APPLIED
    proposal.verification_status = VerificationStatus.NOT_RUN
    proposal.verification_output = None
    proposal.rollback_available = False
    _applied_hashes.pop(proposal_id, None)
    return FixApplicationResponse(
        proposal_id=proposal_id,
        file_path=proposal.file_path,
        application_status=proposal.application_status,
        verification_status=proposal.verification_status,
        verification_command=VERIFICATION_COMMAND,
        rollback_available=False,
    )


def get_fix_proposal(proposal_id: str) -> FixProposal:
    return _get_proposal(proposal_id)


def _get_proposal(proposal_id: str) -> FixProposal:
    try:
        return _proposals[proposal_id]
    except KeyError as error:
        raise FixWorkflowError("Unknown fix proposal.") from error


def _controlled_path() -> Path:
    return _backend_root() / "app" / "security_demo.py"


def _backend_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _digest(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def _corrected_source(original: str) -> str:
    return original.replace(
        "    _authenticate_customer(customer_id)\n",
        "    authenticated_customer = _authenticate_customer(customer_id)\n",
        1,
    ).replace(
        "    return order\n",
        "    if order.owner_id != authenticated_customer:\n"
        "        raise HTTPException(status_code=403, detail=\"Order does not belong to customer.\")\n"
        "    return order\n",
        1,
    )


def _extract_vulnerable_source(content: str) -> str:
    start = content.index("def vulnerable_get_order(")
    end = content.index("\n\ndef secure_get_order(", start)
    return content[start:end]


def _unified_diff(original: str, corrected: str) -> str:
    return "".join(
        difflib.unified_diff(
            original.splitlines(keepends=True),
            corrected.splitlines(keepends=True),
            fromfile=CONTROLLED_FILE,
            tofile=CONTROLLED_FILE,
        )
    )


def _atomic_write(target: Path, content: str) -> None:
    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", dir=target.parent, delete=False
    ) as temporary:
        temporary.write(content)
        temporary_path = Path(temporary.name)
    os.replace(temporary_path, target)