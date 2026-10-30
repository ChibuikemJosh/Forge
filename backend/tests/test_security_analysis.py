"""Tests for Forge Guard's controlled order-ownership analysis."""

from app.services.security_analysis import analyze_demo_state
from app.services.security_verification import verify_demo


def test_vulnerable_analysis_returns_finding_and_exposure_graph() -> None:
    finding, graph = analyze_demo_state(corrected=False)

    assert finding is not None
    assert finding.rule_id == "order-ownership-authorization"
    assert finding.evidence.authenticated_customer is True
    assert finding.evidence.retrieves_order is True
    assert finding.evidence.checks_order_ownership is False
    assert any(edge.relationship == "exposes" for edge in graph.edges)
    assert not any(node.type == "authorization" for node in graph.nodes)


def test_corrected_analysis_has_no_finding_and_contains_authorization() -> None:
    finding, graph = analyze_demo_state(corrected=True)

    assert finding is None
    assert any(node.type == "authorization" for node in graph.nodes)
    assert any(edge.relationship == "authorizes" for edge in graph.edges)


def test_verification_executes_and_reports_actual_state() -> None:
    vulnerable = verify_demo(False, "finding-order-ownership-001")
    corrected = verify_demo(True, "order-ownership-rule")

    assert vulnerable.executed is True
    assert vulnerable.passed is True
    assert corrected.executed is True
    assert corrected.passed is True
