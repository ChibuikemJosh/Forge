"""Request and response contracts for the chat endpoint."""

from pydantic import BaseModel, ConfigDict


class ChatRequest(BaseModel):
    """Website chat input describing a custom security violation."""

    model_config = ConfigDict(extra="forbid")

    custom_security_violation_details: str
    project_folder: str
    session_id: str


class ChatLocation(BaseModel):
    """A source location relevant to the reported violation."""

    model_config = ConfigDict(extra="forbid")

    filename: str
    linenumber: int
