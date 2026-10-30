"""Tool 3: ask the Meta Model API for a fix for one selected finding."""
from __future__ import annotations

import httpx

from forgeguard_loop.config import Settings
from forgeguard_loop.models import Fix, Vulnerability


def get_fix(
    finding: Vulnerability,
    settings: Settings,
    client: httpx.Client | None = None,
) -> Fix:
    """Contract (real mode):
      POST {META_MODEL_API_URL}/v1/fix
        {"vulnerability": {...}}
      -> {"patched_snippet": ..., "explanation": ..., "confidence": ...}
    """
    if settings.fake_tools:
        return Fix(
            vulnerability_id=finding.id,
            patched_snippet=f"# TODO: remediate {finding.id}\n{finding.snippet}",
            explanation="demo fix (fake mode)",
            confidence=0.5,
        )
    own = client is None
    client = client or httpx.Client(timeout=120)
    try:
        resp = client.post(
            f"{settings.meta_model_api_url}/v1/fix",
            headers={"Authorization": f"Bearer {settings.meta_model_api_key}"},
            json={"vulnerability": {
                "id": finding.id, "rule_id": finding.rule_id,
                "file": finding.file, "line_start": finding.line_start,
                "line_end": finding.line_end, "snippet": finding.snippet,
                "severity": finding.severity, "message": finding.message}},
        )
        resp.raise_for_status()
        body = resp.json()
        return Fix(vulnerability_id=finding.id,
                   patched_snippet=body.get("patched_snippet", ""),
                   explanation=body.get("explanation", ""),
                   confidence=float(body.get("confidence", 0.0)))
    finally:
        if own:
            client.close()
