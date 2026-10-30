"""Tool 1: find instances of a custom vulnerability via Meta Model API."""
from __future__ import annotations

import httpx

from forgeguard_loop.config import Settings
from forgeguard_loop.models import Vulnerability


def scan(
    rule_id: str,
    rule_description: str,
    settings: Settings,
    client: httpx.Client | None = None,
) -> list[Vulnerability]:
    """POST the rule + repo pointer to the Meta Model API, return findings.

    Contract (real mode):
      POST {META_MODEL_API_URL}/v1/scan
        {"rule_id": ..., "rule_description": ..., "target_repo": ...}
      -> {"findings": [{"id":..., "rule_id":..., "file":..., "line_start":...,
                        "line_end":..., "snippet":..., "severity":..., "message":...}]}

    Fake mode (FORGEGUARD_FAKE_TOOLS=1) returns two deterministic findings
    so the loop runs offline.
    """
    if settings.fake_tools:
        return [
            Vulnerability(
                id="VULN-001", rule_id=rule_id, file="app/auth.py",
                line_start=42, line_end=47,
                snippet="password == stored  # timing leak",
                severity="high", message="demo finding 1",
            ),
            Vulnerability(
                id="VULN-002", rule_id=rule_id, file="app/session.py",
                line_start=10, line_end=12,
                snippet="token = rand()  # weak RNG",
                severity="medium", message="demo finding 2",
            ),
        ]
    own = client is None
    client = client or httpx.Client(timeout=120)
    try:
        resp = client.post(
            f"{settings.meta_model_api_url}/v1/scan",
            headers={"Authorization": f"Bearer {settings.meta_model_api_key}"},
            json={"rule_id": rule_id, "rule_description": rule_description,
                  "target_repo": settings.target_repo},
        )
        resp.raise_for_status()
        return [Vulnerability(**f) for f in resp.json().get("findings", [])]
    finally:
        if own:
            client.close()
