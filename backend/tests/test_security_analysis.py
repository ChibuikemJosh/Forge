"""Tests for Forge Guard's controlled order-ownership analysis."""

import ast
import textwrap

from app.schemas.security import SourceReference, VerificationStatus
from app.services import security_verification
from app.services.security_analysis import (
    _build_finding,
    _collect_evidence,
    analyze_demo_state,
)
from app.services.security_verification import verify_demo, verify_route_status


def test_vulnerable_analysis_returns_finding_and_exposure_graph() -> None:
    finding, graph = analyze_demo_state(corrected=False)

    assert finding is not None
    assert finding.rule_id == "order-ownership-authorization"
    assert finding.evidence.authenticated_customer is True
    assert finding.evidence.retrieves_order is True
    assert finding.evidence.checks_order_ownership is False
    assert finding.evidence.explanation.endswith("without comparing its owner.")
    assert finding.confidence.value == "high"
    assert any(edge.relationship == "exposes" for edge in graph.edges)
    assert {node.id for node in graph.nodes} >= {
        "customer",
        "retrieve",
        "order",
        "response",
        "finding-order-ownership-001",
    }
    assert not any(node.type == "authorization" for node in graph.nodes)


def test_corrected_analysis_has_no_finding_and_contains_authorization() -> None:
    finding, graph = analyze_demo_state(corrected=True)

    assert finding is None
    assert any(node.type == "authorization" for node in graph.nodes)
    assert any(edge.relationship == "authorizes" for edge in graph.edges)
    assert any(node.type == "order" for node in graph.nodes)


def test_verification_executes_and_reports_actual_state() -> None:
    vulnerable = verify_demo(False, "finding-order-ownership-001")
    corrected = verify_demo(True, "order-ownership-rule")

    assert vulnerable.executed is True
    assert vulnerable.passed is True
    assert corrected.executed is True
    assert corrected.passed is True


def test_detector_creates_no_finding_for_unanalysed_source_pattern() -> None:
    """The detector must not fabricate a finding when the source does not match."""
    tree = ast.parse(
        textwrap.dedent(
            """
            def unrelated(order_id: str, customer_id: str | None) -> None:
                return None
            """
        )
    )
    function_node = next(node for node in tree.body if isinstance(node, ast.FunctionDef))
    source_reference = SourceReference(
        file_path="backend/app/security_demo.py",
        symbol="unrelated",
    )
    evidence = _collect_evidence(function_node, source_reference)

    assert evidence.authenticated_customer is False
    assert evidence.retrieves_order is False
    assert evidence.checks_order_ownership is False
    assert _build_finding(evidence, source_reference, corrected=False) is None


def test_verification_reports_failure_when_behavior_does_not_match() -> None:
    """A mismatch must be reported as failed, never as passed."""
    result = verify_route_status(
        method="GET",
        path="/api/demo/vulnerable/orders/order-bob",
        headers={"x-customer-id": "customer-alice"},
        expected_status=403,
        tested="Vulnerable endpoint must not expose another customer's order.",
        finding_id="finding-order-ownership-001",
    )

    assert result.executed is True
    assert result.passed is False
    assert result.status == VerificationStatus.FAILED
    assert "Expected HTTP 403" in result.summary


def test_verification_reports_execution_error_as_failed_not_passed(
    monkeypatch,
) -> None:
    """An error preventing verification must never be reported as passed."""

    class _FailingClient:
        def __init__(self, *args: object, **kwargs: object) -> None:
            pass

        def request(self, *args: object, **kwargs: object):
            raise RuntimeError("transport failure")

    monkeypatch.setattr(security_verification, "TestClient", _FailingClient)
    result = verify_route_status(
        method="GET",
        path="/api/demo/vulnerable/orders/order-bob",
        headers={"x-customer-id": "customer-alice"},
        expected_status=200,
        tested="Authenticated customer cannot retrieve another customer's order.",
        finding_id="finding-order-ownership-001",
    )

    assert result.executed is False
    assert result.passed is False
    assert result.status == VerificationStatus.FAILED
    assert result.error == "transport failure"
