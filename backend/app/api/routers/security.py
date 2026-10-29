"""Forge Guard security-analysis endpoints for the controlled demo."""

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.security import SecurityAnalysisResponse
from app.services.security_analysis import (
    ORDER_OWNERSHIP_RULE,
    analyze_demo_state,
    build_fix_proposal,
)
from app.services.security_verification import verify_demo

router = APIRouter(prefix="/api/security", tags=["security"])


@router.post("/analyze", response_model=SecurityAnalysisResponse)
def analyze_security_demo(
    corrected: bool = Query(default=False),
    verify: bool = Query(default=True),
) -> SecurityAnalysisResponse:
    """Analyze the controlled vulnerable or corrected demo state."""
    finding, graph = analyze_demo_state(corrected)
    fix_proposal = build_fix_proposal(finding)
    verification = None
    if verify:
        target_finding_id = finding.finding_id if finding else "order-ownership-rule"
        verification = verify_demo(corrected, target_finding_id)
        if finding:
            finding.verification_status = verification.status
    return SecurityAnalysisResponse(
        analysis_id=f"analysis-order-ownership-{'corrected' if corrected else 'vulnerable'}",
        project_id="controlled-fastapi-order-demo",
        status="completed",
        rule=ORDER_OWNERSHIP_RULE,
        finding=finding,
        graph=graph,
        fix_proposal=fix_proposal,
        verification=verification,
    )


@router.get("/rules/order-ownership")
def get_order_ownership_rule():
    """Return the stable MVP rule definition."""
    return ORDER_OWNERSHIP_RULE
