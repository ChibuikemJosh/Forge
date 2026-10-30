"""Shared data types for the loop."""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Vulnerability:
    id: str
    rule_id: str
    file: str
    line_start: int
    line_end: int
    snippet: str
    severity: str = "medium"
    message: str = ""


@dataclass
class Fix:
    vulnerability_id: str
    patched_snippet: str
    explanation: str = ""
    confidence: float = 0.0


@dataclass
class LoopResult:
    found: list[Vulnerability] = field(default_factory=list)
    selected_ids: list[str] = field(default_factory=list)
    fixes: list[Fix] = field(default_factory=list)
