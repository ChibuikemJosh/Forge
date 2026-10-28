"""Typed request and response models for graph validation and code preview."""

from enum import Enum
from typing import TypeAlias

from pydantic import BaseModel, ConfigDict, Field

PrimitiveValue: TypeAlias = str | int | float | bool | None


class NodeType(str, Enum):
    """Node categories supported by the initial graph contract."""

    FUNCTION = "function"


class RelationshipType(str, Enum):
    """Relationship meanings that may be used by graph edges."""

    CALLS = "calls"
    PASSES_INPUT = "passes_input"
    RETURNS_OUTPUT = "returns_output"


class FunctionParameter(BaseModel):
    """A Python function parameter declaration."""

    model_config = ConfigDict(extra="forbid")

    name: str
    type: str = "object"
    default: PrimitiveValue = None


class FunctionPort(BaseModel):
    """An explicit input or output port on a function node."""

    model_config = ConfigDict(extra="forbid")

    name: str
    type: str = "object"


class FunctionConfiguration(BaseModel):
    """Configuration that defines a Function node's Python interface."""

    model_config = ConfigDict(extra="forbid")

    parameters: list[FunctionParameter] = Field(default_factory=list)
    return_type: str = "None"


class GraphNode(BaseModel):
    """A graph node with a stable identity and typed interface."""

    model_config = ConfigDict(extra="forbid")

    id: str
    type: str
    name: str
    config: FunctionConfiguration
    inputs: list[FunctionPort] = Field(default_factory=list)
    outputs: list[FunctionPort] = Field(default_factory=list)


class GraphEdge(BaseModel):
    """A directed relationship between two graph nodes."""

    model_config = ConfigDict(extra="forbid")

    id: str
    source: str
    target: str
    type: str


class Graph(BaseModel):
    """A complete graph submitted for validation or code generation."""

    model_config = ConfigDict(extra="forbid")

    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)


class ValidationErrorItem(BaseModel):
    """A structured graph validation failure."""

    code: str
    message: str
    node_id: str | None = None
    edge_id: str | None = None


class ValidationResult(BaseModel):
    """The result of validating a graph."""

    valid: bool
    errors: list[ValidationErrorItem] = Field(default_factory=list)


class GraphPreviewResponse(BaseModel):
    """Generated Python and the validation metadata for a valid graph."""

    valid: bool = True
    syntax_valid: bool = True
    code: str
