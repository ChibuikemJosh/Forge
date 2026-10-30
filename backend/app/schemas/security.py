"""Shared business objects for the Forge Guard ownership-analysis workflow."""

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class Severity(str, Enum):
    """Finding severity levels supported by the MVP."""

    HIGH = "high"
    INFO = "info"


class AnalysisStatus(str, Enum):
    """Status of an analysis operation."""

    COMPLETED = "completed"
    FAILED = "failed"


class VerificationStatus(str, Enum):
    """Status of security verification for a finding."""

    NOT_RUN = "not_run"
    PASSED = "passed"
    FAILED = "failed"


class ReviewStatus(str, Enum):
    """Human review status for a proposed fix."""

    NOT_PROPOSED = "not_proposed"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ApplicationStatus(str, Enum):
    """Application status for a proposed fix."""

    NOT_APPLIED = "not_applied"
    APPLIED = "applied"
    FAILED = "failed"


class SourceReference(BaseModel):
    """A source location known by the controlled analyzer."""

    model_config = ConfigDict(extra="forbid")

    file_path: str
    symbol: str
    line_start: int | None = None
    line_end: int | None = None


class SecurityRule(BaseModel):
    """A rule definition independent of any individual finding."""

    model_config = ConfigDict(extra="forbid")

    rule_id: str
    title: str
    invariant: str


class AnalysisEvidence(BaseModel):
    """Observed facts used to support or clear a security finding."""

    model_config = ConfigDict(extra="forbid")

    authenticated_customer: bool
    retrieves_order: bool
    checks_order_ownership: bool
    ownership_expression: str | None = None
    source: SourceReference


class SecurityFinding(BaseModel):
    """A potential or confirmed violation of a security rule."""

    model_config = ConfigDict(extra="forbid")

    finding_id: str
    rule_id: str
    severity: Severity
    title: str
    description: str
    affected_route: str
    source: SourceReference
    evidence: AnalysisEvidence
    impact: str
    suggested_remediation: str
    analysis_status: AnalysisStatus
    verification_status: VerificationStatus = VerificationStatus.NOT_RUN


class SecurityGraphNode(BaseModel):
    """A semantic node for the analyzed security execution path."""

    model_config = ConfigDict(extra="forbid")

    id: str
    type: str
    label: str
    source: SourceReference | None = None
    finding_ids: list[str] = Field(default_factory=list)


class SecurityGraphEdge(BaseModel):
    """A directed observed or proposed relationship in the security graph."""

    model_config = ConfigDict(extra="forbid")

    id: str
    source: str
    target: str
    relationship: str
    observed: bool = True
    finding_ids: list[str] = Field(default_factory=list)


class SecurityGraph(BaseModel):
    """Graph data derived from the controlled analysis evidence."""

    model_config = ConfigDict(extra="forbid")

    nodes: list[SecurityGraphNode]
    edges: list[SecurityGraphEdge]


class VerificationResult(BaseModel):
    """An actual verification attempt and its outcome."""

    model_config = ConfigDict(extra="forbid")

    verification_id: str
    finding_id: str
    tested: str
    executed: bool
    passed: bool
    status: VerificationStatus
    summary: str
    error: str | None = None


class FixProposal(BaseModel):
    """A reviewable, not-yet-applied correction proposal."""

    model_config = ConfigDict(extra="forbid")

    proposal_id: str
    finding_id: str
    file_path: str
    unified_diff: str | None = None
    explanation: str
    review_status: ReviewStatus = ReviewStatus.PENDING
    application_status: ApplicationStatus = ApplicationStatus.NOT_APPLIED


class SecurityAnalysisResponse(BaseModel):
    """Complete result returned by the MVP analysis endpoint.

    ``error`` carries a human-readable failure reason when ``status`` is
    ``failed``; it is ``None`` for a completed analysis.
    """

    analysis_id: str
    project_id: str
    status: AnalysisStatus
    rule: SecurityRule
    finding: SecurityFinding | None
    graph: SecurityGraph
    fix_proposal: FixProposal | None = None
    verification: VerificationResult | None = None
    error: str | None = None
