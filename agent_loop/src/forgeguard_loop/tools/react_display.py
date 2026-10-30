"""Tool 2: display findings in the custom React app, collect user selection.

Contract (real mode):
  POST {REACT_APP_URL}/api/vulnerabilities  {"findings": [...]}
  GET  {REACT_APP_URL}/api/selections?run_id=...  -> {"selected_ids": [...]}
The GET is polled until SELECTION_TIMEOUT_S. If the app is unreachable,
falls back to a CLI prompt so the loop still runs.
"""
from __future__ import annotations

import time
import uuid
from dataclasses import asdict

import httpx

from forgeguard_loop.config import Settings
from forgeguard_loop.models import Vulnerability


def display_and_select(
    findings: list[Vulnerability],
    settings: Settings,
    client: httpx.Client | None = None,
) -> list[str]:
    if settings.fake_tools:
        return [v.id for v in findings[:1]] if findings else []
    run_id = uuid.uuid4().hex
    own = client is None
    client = client or httpx.Client(timeout=10)
    try:
        try:
            client.post(
                f"{settings.react_app_url}/api/vulnerabilities",
                json={"run_id": run_id,
                      "findings": [asdict(v) for v in findings]},
            ).raise_for_status()
        except httpx.HTTPError:
            return _cli_fallback(findings)
        deadline = time.monotonic() + settings.selection_timeout_s
        while time.monotonic() < deadline:
            try:
                resp = client.get(
                    f"{settings.react_app_url}/api/selections",
                    params={"run_id": run_id},
                )
                if resp.status_code == 200:
                    ids = resp.json().get("selected_ids")
                    if ids is not None:
                        return list(ids)
            except httpx.HTTPError:
                pass
            time.sleep(5)
        return []
    finally:
        if own:
            client.close()


def _cli_fallback(findings: list[Vulnerability]) -> list[str]:
    print("\nReact app unreachable. Select findings in CLI (comma ids, empty=none):")
    for v in findings:
        print(f"  {v.id} [{v.severity}] {v.file}:{v.line_start}-{v.line_end} {v.message}")
    raw = input("> ").strip()
    return [p.strip() for p in raw.split(",") if p.strip()] if raw else []
