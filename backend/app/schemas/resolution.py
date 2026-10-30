"""Structured relationship resolution models for code intelligence."""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.security import SourceReference


class ResolutionStatus(str, Enum):
    """Resolution status for a structural relationship."""

    RESOLVED = "resolved"
    AMBIGUOUS = "ambiguous"
    UNRESOLVED = "unresolved"


class SymbolRelationship(BaseModel):
    """A resolved or unresolved relationship between indexed symbols."""

    model_config = ConfigDict(extra="forbid")

    relationship_id: str
    source_symbol_id: str
    target_symbol_id: str | None = None
    relationship_type: str
    status: ResolutionStatus
    source: SourceReference
    evidence: str


class ResolutionResult(BaseModel):
    """The result of running symbol resolution over a code index."""

    model_config = ConfigDict(extra="forbid")

    project_id: str
    relationships: list[SymbolRelationship] = Field(default_factory=list)
    resolved_count: int = 0
    ambiguous_count: int = 0
    unresolved_count: int = 0
