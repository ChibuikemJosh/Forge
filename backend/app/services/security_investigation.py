from __future__ import annotations

import json
import uuid
from typing import Any

from app.schemas.code_intelligence import CodeIndex
from app.schemas.security import SecurityRule, SourceReference
from app.schemas.security_investigation import (
    EvidenceItem,
    EvidenceType,
    FindingStatus,
    InvestigationFinding,
    InvestigationResult,
    InvestigationStatus,
)
from app.schemas.source_graph import SourceGraph
from app.services.ai_provider import AIProvider, AIProviderError, get_default_ai_provider
from app.services.evidence_validation import EvidenceValidator
from app.services.project_workspace import ProjectReference, WorkspaceService


class SecurityInvestigationService:
    def __init__(self, workspace: WorkspaceService, provider: AIProvider | None = None) -> None:
        self.workspace = workspace
        self.provider = provider or get_default_ai_provider()

    def investigate(self, project, index, graph, rule, provider=None):
        provider = provider or self.provider
        investigation_id = f"investigation-{uuid.uuid4().hex[:12]}"
        try:
            prompt = self._build_prompt(project, index, graph, rule)
            raw = provider.analyze(prompt)
        except AIProviderError as error:
            return InvestigationResult(
                investigation_id=investigation_id,
                project_id=project.project_id,
                rule_id=rule.rule_id,
                status=InvestigationStatus.FAILED,
                errors=[str(error)],
                summary="Investigation failed because no AI analysis was available.",
            )
        except Exception as error:
            return InvestigationResult(
                investigation_id=investigation_id,
                project_id=project.project_id,
                rule_id=rule.rule_id,
                status=InvestigationStatus.FAILED,
                errors=[f"Investigation failed: {error}"],
            )

        findings = []
        errors = []
        validator = EvidenceValidator(self.workspace, project.project_id, index, graph)
        for raw_finding in raw.get("findings", []):
            try:
                finding = self._build_finding(project, index, graph, rule, raw_finding, validator)
                findings.append(finding)
            except Exception as error:
                errors.append(f"Invalid finding from AI provider: {error}")

        status = InvestigationStatus.COMPLETED if findings else InvestigationStatus.INCONCLUSIVE
        if errors and not findings:
            status = InvestigationStatus.INCONCLUSIVE
        return InvestigationResult(
            investigation_id=investigation_id,
            project_id=project.project_id,
            rule_id=rule.rule_id,
            status=status,
            findings=findings,
            errors=errors,
            summary=f"Investigated {len(index.files)} files and produced {len(findings)} finding(s).",
        )

    def _build_prompt(self, project, index, graph, rule):
        source_blocks = []
        for file_path in index.files:
            if not file_path.endswith(".py"):
                continue
            try:
                content = self.workspace.read_file(project.project_id, file_path)
            except Exception:
                continue
            source_blocks.append(f"--- {file_path} ---\n{content}")
        graph_summary = graph.summary.model_dump()
        return (
            "You are analyzing a Python project for a security rule.\n"
            "Return JSON with a top-level 'findings' array.\n"
            "Each finding must include title, description, severity, confidence, "
            "affected_files, affected_symbols, related_graph_nodes, evidence, "
            "reasoning, and recommended_remediation.\n"
            "Evidence items must include evidence_type, description, file_path, "
            "source with project_id, file_path, symbol, line_start, line_end, "
            "excerpt, symbol_id, file_hash, and observed.\n"
            "Only use files and symbols present in the provided context.\n"
            "Do not fabricate source locations.\n\n"
            f"Rule: {rule.model_dump_json()}\n\n"
            f"Project: {project.project_id} ({project.relative_path})\n\n"
            f"Graph summary: {json.dumps(graph_summary)}\n\n"
            "Source files:\n" + "\n\n".join(source_blocks)
        )

    def _build_finding(self, project, index, graph, rule, raw, validator):
        evidence_items = []
        for raw_evidence in raw.get("evidence", []):
            source_data = raw_evidence.get("source", {})
            source = SourceReference(
                project_id=source_data.get("project_id", project.project_id),
                file_path=source_data.get("file_path", raw_evidence.get("file_path", "")),
                module=source_data.get("module"),
                symbol=source_data.get("symbol", ""),
                line_start=source_data.get("line_start"),
                line_end=source_data.get("line_end"),
                file_hash=source_data.get("file_hash"),
            )
            item = EvidenceItem(
                evidence_id=f"evidence-{len(evidence_items) + 1}",
                evidence_type=raw_evidence.get("evidence_type", EvidenceType.AI_INTERPRETATION),
                description=raw_evidence.get("description", ""),
                file_path=raw_evidence.get("file_path", source.file_path),
                source=source,
                excerpt=raw_evidence.get("excerpt"),
                symbol_id=raw_evidence.get("symbol_id"),
                file_hash=raw_evidence.get("file_hash"),
                observed=bool(raw_evidence.get("observed", False)),
            )
            item = validator.validate(item)
            evidence_items.append(item)

        valid_evidence = [e for e in evidence_items if e.status.value == "valid"]
        observed_valid = any(e.observed for e in valid_evidence)
        if not evidence_items or not valid_evidence:
            status = FindingStatus.INCONCLUSIVE
        elif all(e.status.value == "valid" for e in evidence_items) and observed_valid:
            status = FindingStatus.VALIDATED
        elif any(e.status.value in {"invalid", "stale", "inconsistent"} for e in evidence_items):
            status = FindingStatus.UNSUPPORTED
        else:
            status = FindingStatus.POTENTIAL

        confidence = float(raw.get("confidence", 0.5))
        confidence = max(0.0, min(1.0, confidence))
        if status in {FindingStatus.UNSUPPORTED, FindingStatus.INCONCLUSIVE}:
            confidence = min(confidence, 0.3)

        graph_nodes = {node.id for node in graph.nodes}
        symbol_ids = {f.id for f in index.functions} | {c.id for c in index.classes}
        related_nodes = [node for node in raw.get("related_graph_nodes", []) if node in graph_nodes]
        affected_symbols = [s for s in raw.get("affected_symbols", []) if s in symbol_ids]
        affected_files = [f for f in raw.get("affected_files", []) if f in index.files]

        from app.schemas.security import Severity

        severity = raw.get("severity", rule.severity.value if hasattr(rule.severity, "value") else rule.severity)
        try:
            severity = Severity(severity)
        except ValueError:
            severity = rule.severity

        return InvestigationFinding(
            finding_id=f"finding-{uuid.uuid4().hex[:8]}",
            rule_id=rule.rule_id,
            title=raw.get("title", "Potential security issue"),
            description=raw.get("description", ""),
            severity=severity,
            confidence=confidence,
            status=status,
            affected_files=affected_files,
            affected_symbols=affected_symbols,
            related_graph_nodes=related_nodes,
            evidence=evidence_items,
            reasoning=raw.get("reasoning", ""),
            recommended_remediation=raw.get("recommended_remediation", ""),
        )
