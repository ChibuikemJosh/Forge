"""Deterministic AST analysis for the controlled order-ownership example."""

import ast
import inspect
import textwrap

from app.schemas.security import (
    AnalysisEvidence,
    AnalysisStatus,
    SecurityFinding,
    SecurityGraph,
    SecurityGraphEdge,
    SecurityGraphNode,
    SecurityRule,
    Severity,
    SourceReference,
    VerificationStatus,
    FixProposal,
)

ORDER_OWNERSHIP_RULE = SecurityRule(
    rule_id="order-ownership-authorization",
    title="Authenticated customers may access only their own orders",
    invariant="The authenticated customer ID must be compared with the retrieved order owner before the order is returned.",
)


def analyze_demo_state(corrected: bool) -> tuple[SecurityFinding | None, SecurityGraph]:
    """Analyze the actual controlled demo function source and build its graph."""
    function = _function_for_state(corrected)
    source, source_reference, tree = _source_details(function)
    evidence = _collect_evidence(tree, source_reference)
    finding = _build_finding(evidence, source_reference, corrected)
    graph = _build_graph(evidence, source_reference, finding)
    return finding, graph


def build_fix_proposal(finding: SecurityFinding | None) -> FixProposal | None:
    """Create a review-only remediation suggestion for a detected finding."""
    if finding is None:
        return None
    return FixProposal(
        proposal_id="proposal-order-ownership-001",
        finding_id=finding.finding_id,
        file_path=finding.source.file_path,
        explanation="Add an ownership comparison after order retrieval and reject a non-owner with HTTP 403.",
    )


def _function_for_state(corrected: bool):
    from app.security_demo import secure_get_order, vulnerable_get_order

    return secure_get_order if corrected else vulnerable_get_order


def _source_details(function) -> tuple[str, SourceReference, ast.FunctionDef]:
    source = textwrap.dedent(inspect.getsource(function))
    tree = ast.parse(source)
    function_node = next(node for node in tree.body if isinstance(node, ast.FunctionDef))
    file_path = "backend/app/security_demo.py"
    source_reference = SourceReference(
        file_path=file_path,
        symbol=function.__name__,
        line_start=function.__code__.co_firstlineno,
        line_end=function.__code__.co_firstlineno + len(source.splitlines()) - 1,
    )
    return source, source_reference, function_node


def _collect_evidence(
    function_node: ast.FunctionDef,
    source_reference: SourceReference,
) -> AnalysisEvidence:
    calls = [
        node
        for node in ast.walk(function_node)
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
    ]
    retrieves_order = any(call.func.attr == "get" for call in calls)
    authenticated_customer = any(
        isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id == "_authenticate_customer"
        for node in ast.walk(function_node)
    )
    ownership_expression = next(
        (
            ast.unparse(node.test)
            for node in ast.walk(function_node)
            if isinstance(node, ast.If)
            and "owner_id" in ast.unparse(node.test)
            and "customer" in ast.unparse(node.test)
        ),
        None,
    )
    return AnalysisEvidence(
        authenticated_customer=authenticated_customer,
        retrieves_order=retrieves_order,
        checks_order_ownership=ownership_expression is not None,
        ownership_expression=ownership_expression,
        source=source_reference,
    )


def _build_finding(
    evidence: AnalysisEvidence,
    source_reference: SourceReference,
    corrected: bool,
) -> SecurityFinding | None:
    if corrected or not (evidence.authenticated_customer and evidence.retrieves_order):
        return None
    return SecurityFinding(
        finding_id="finding-order-ownership-001",
        rule_id=ORDER_OWNERSHIP_RULE.rule_id,
        severity=Severity.HIGH,
        title="Order ownership authorization is missing",
        description="The endpoint authenticates a customer and retrieves an order but returns it without checking the order owner.",
        affected_route="/api/demo/vulnerable/orders/{order_id}",
        source=source_reference,
        evidence=evidence,
        impact="One authenticated customer can read another customer's order.",
        suggested_remediation="Compare the authenticated customer ID with order.owner_id and return HTTP 403 when they differ.",
        analysis_status=AnalysisStatus.COMPLETED,
    )


def _build_graph(
    evidence: AnalysisEvidence,
    source_reference: SourceReference,
    finding: SecurityFinding | None,
) -> SecurityGraph:
    finding_ids = [finding.finding_id] if finding else []
    nodes = [
        SecurityGraphNode(id="request", type="request", label="Order request"),
        SecurityGraphNode(
            id="authenticate",
            type="authentication",
            label="Authenticate customer",
            source=source_reference,
        ),
        SecurityGraphNode(
            id="retrieve",
            type="order_retrieval",
            label="Retrieve order",
            source=source_reference,
        ),
    ]
    edges = [
        SecurityGraphEdge(
            id="request-authenticate",
            source="request",
            target="authenticate",
            relationship="authenticates",
        ),
        SecurityGraphEdge(
            id="authenticate-retrieve",
            source="authenticate",
            target="retrieve",
            relationship="retrieves",
        ),
    ]
    if evidence.checks_order_ownership:
        nodes.append(
            SecurityGraphNode(
                id="ownership",
                type="authorization",
                label="Verify ownership",
                source=source_reference,
            )
        )
        nodes.append(
            SecurityGraphNode(
                id="response",
                type="response",
                label="Return order",
                source=source_reference,
            )
        )
        edges.extend(
            [
                SecurityGraphEdge(
                    id="retrieve-ownership",
                    source="retrieve",
                    target="ownership",
                    relationship="authorizes",
                ),
                SecurityGraphEdge(
                    id="ownership-response",
                    source="ownership",
                    target="response",
                    relationship="returns",
                ),
            ]
        )
    else:
        nodes.append(
            SecurityGraphNode(
                id="response",
                type="response",
                label="Return order",
                source=source_reference,
                finding_ids=finding_ids,
            )
        )
        edges.append(
            SecurityGraphEdge(
                id="retrieve-response",
                source="retrieve",
                target="response",
                relationship="exposes",
                finding_ids=finding_ids,
            )
        )
    return SecurityGraph(nodes=nodes, edges=edges)
