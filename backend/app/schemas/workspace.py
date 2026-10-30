"""Workspace and project file models for Forge Guard's source-to-graph foundation."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class ProjectReference(BaseModel):
    """A stable, client-safe reference to a registered project."""

    model_config = ConfigDict(extra="forbid")

    project_id: str
    name: str
    relative_path: str


class ProjectFile(BaseModel):
    """Metadata for a single file discovered inside a project."""

    model_config = ConfigDict(extra="forbid")

    path: str
    language: str | None = None
    size_bytes: int = 0
    sha256: str | None = None
    readable: bool = True
    error: str | None = None


class ProjectManifest(BaseModel):
    """A snapshot of the files discovered in a project."""

    model_config = ConfigDict(extra="forbid")

    project_id: str
    name: str
    relative_path: str
    file_count: int = 0
    python_file_count: int = 0
    files: list[ProjectFile] = Field(default_factory=list)
    ignored_directories: list[str] = Field(default_factory=list)
