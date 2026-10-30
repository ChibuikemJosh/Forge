"""Environment-based configuration. All network targets are env vars so the
scaffold runs offline in fake mode and against real services in prod."""
from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    meta_model_api_url: str = os.environ.get("META_MODEL_API_URL", "")
    meta_model_api_key: str = os.environ.get("META_MODEL_API_KEY", "")
    react_app_url: str = os.environ.get("REACT_APP_URL", "http://localhost:3000")
    target_repo: str = os.environ.get("TARGET_REPO", ".")
    fake_tools: bool = os.environ.get("FORGEGUARD_FAKE_TOOLS", "1") == "1"
    selection_timeout_s: int = int(os.environ.get("SELECTION_TIMEOUT_S", "300"))
    max_steps: int = int(os.environ.get("MAX_STEPS", "10"))
