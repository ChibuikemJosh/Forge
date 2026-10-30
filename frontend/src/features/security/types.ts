export type AnalysisStatus = "completed" | "failed";
export type AnalysisOutcome = "confirmed" | "satisfied" | "inconclusive" | "failed";
export type Severity = "high" | "info";
export type Confidence = "high";
export type VerificationStatus = "not_run" | "passed" | "failed";
export type ReviewStatus = "not_proposed" | "pending" | "approved" | "rejected";
export type ApplicationStatus = "not_applied" | "applied" | "failed";

export interface SourceReference { file_path: string; symbol: string; line_start: number | null; line_end: number | null }
export interface SecurityRule { rule_id: string; title: string; invariant: string }
export interface AnalysisEvidence { authenticated_customer: boolean; retrieves_order: boolean; checks_order_ownership: boolean; ownership_expression: string | null; source: SourceReference; explanation: string }
export interface SecurityFinding { finding_id: string; rule_id: string; severity: Severity; title: string; description: string; affected_route: string; source: SourceReference; evidence: AnalysisEvidence; impact: string; suggested_remediation: string; severity_rationale: string; confidence: Confidence; confidence_rationale: string; analysis_status: AnalysisStatus; verification_status: VerificationStatus }
export interface SecurityGraphNode { id: string; type: string; label: string; source: SourceReference | null; finding_ids: string[] }
export interface SecurityGraphEdge { id: string; source: string; target: string; relationship: string; observed: boolean; finding_ids: string[] }
export interface SecurityGraph { nodes: SecurityGraphNode[]; edges: SecurityGraphEdge[] }
export interface VerificationResult { verification_id: string; finding_id: string; tested: string; executed: boolean; passed: boolean; status: VerificationStatus; summary: string; error: string | null }
export interface FixProposal { proposal_id: string; finding_id: string; file_path: string; unified_diff: string | null; affected_code: string | null; explanation: string; limitations: string; expected_source_hash: string | null; verification_status: VerificationStatus; verification_output: string | null; rollback_available: boolean; review_status: ReviewStatus; application_status: ApplicationStatus }
export interface FixApplicationResponse { proposal_id: string; file_path: string; application_status: ApplicationStatus; verification_status: VerificationStatus; verification_command: string; verification_output: string | null; rollback_available: boolean; error: string | null }
export interface SecurityAnalysisResponse { analysis_id: string; project_id: string; status: AnalysisStatus; outcome: AnalysisOutcome; rule: SecurityRule; finding: SecurityFinding | null; graph: SecurityGraph; fix_proposal: FixProposal | null; verification: VerificationResult | null; error: string | null }
export interface ReviewDecisionRequest { decision: "approved" | "rejected"; reviewer: string; actor: "human"; reason?: string }
export interface ReviewDecisionRecord { decision_id: string; proposal_id: string; decision: "approved" | "rejected"; reviewer: string | null; actor: "human" | "ai"; reason: string | null; decided_at: string | null }
export interface DemoOrderResult { status: number; body: unknown; durationMs: number }
export interface ApiLogEntry { id: number; at: string; method: string; path: string; status: number | string; durationMs: number }
export interface ExploitEntry { id: number; at: string; kind: "try" | "replay"; status: number; body: unknown; durationMs: number }
