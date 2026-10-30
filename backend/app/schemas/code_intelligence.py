"""Structured code-intelligence models produced by the Python indexer."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.security import SourceReference


class IndexedParameter(BaseModel):
    """A parameter declaration discovered on a function or method."""

    model_config = ConfigDict(extra="forbid")

    name: str
    annotation: str | None = None
    default: str | None = None
    kind: str = "positional"


class IndexedImport(BaseModel):
    """An import statement discovered in a module."""

    model_config = ConfigDict(extra="forbid")

    module: str | None = None
    names: list[str] = Field(default_factory=list)
    aliases: list[str | None] = Field(default_factory=list)
    alias: str | None = None
    level: int = 0
    is_from: bool = False
    line_start: int
    line_end: int


class IndexedCall(BaseModel):
    """A function or method call discovered inside a symbol."""

    model_config = ConfigDict(extra="forbid")

    callee: str
    line_start: int
    line_end: int
    containing_symbol: str | None = None


class IndexedAttributeAccess(BaseModel):
    """An attribute access discovered inside a symbol."""

    model_config = ConfigDict(extra="forbid")

    expression: str
    attribute: str
    line_start: int
    line_end: int


class IndexedFunction(BaseModel):
    """A function or method discovered in a Python module."""

    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    qualified_name: str
    kind: str = "function"
    module: str
    class_name: str | None = None
    decorators: list[str] = Field(default_factory=list)
    parameters: list[IndexedParameter] = Field(default_factory=list)
    return_annotation: str | None = None
    calls: list[IndexedCall] = Field(default_factory=list)
    attribute_accesses: list[IndexedAttributeAccess] = Field(default_factory=list)
    source: SourceReference
    line_start: int
    line_end: int


class IndexedClass(BaseModel):
    """A class discovered in a Python module."""

    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    qualified_name: str
    module: str
    bases: list[str] = Field(default_factory=list)
    decorators: list[str] = Field(default_factory=list)
    method_ids: list[str] = Field(default_factory=list)
    source: SourceReference
    line_start: int
    line_end: int


class ModuleIndex(BaseModel):
    """Index information for a single Python module."""

    model_config = ConfigDict(extra="forbid")

    module: str
    file_path: str
    file_hash: str | None = None
    imports: list[IndexedImport] = Field(default_factory=list)
    class_ids: list[str] = Field(default_factory=list)
    function_ids: list[str] = Field(default_factory=list)


class IndexingError(BaseModel):
    """A non-fatal error encountered while indexing a file."""

    model_config = ConfigDict(extra="forbid")

    file_path: str
    message: str


class CodeIndex(BaseModel):
    """A structured representation of a Python project's code."""

    model_config = ConfigDict(extra="forbid")

    project_id: str
    files: list[str] = Field(default_factory=list)
    modules: list[ModuleIndex] = Field(default_factory=list)
    classes: list[IndexedClass] = Field(default_factory=list)
    functions: list[IndexedFunction] = Field(default_factory=list)
    errors: list[IndexingError] = Field(default_factory=list)
