"""The agentic loop: scan -> display/select -> fix selected.

Stops when fixes are collected, nothing is selected, or max_steps is hit.
Each iteration is one tool call; the transcript records every step.
"""
from __future__ import annotations

from dataclasses import asdict

from forgeguard_loop.config import Settings
from forgeguard_loop.models import LoopResult
from forgeguard_loop.tools import meta_model_fix, meta_model_scan, react_display
from forgeguard_loop.transcript import Transcript


def run(
    rule_id: str,
    rule_description: str,
    settings: Settings | None = None,
    transcript: Transcript | None = None,
) -> LoopResult:
    settings = settings or Settings()
    transcript = transcript or Transcript()
    result = LoopResult()
    steps = 0

    transcript.log("start", rule_id=rule_id, target_repo=settings.target_repo)

    # Step 1: scan
    result.found = meta_model_scan.scan(rule_id, rule_description, settings)
    steps += 1
    transcript.log("scanned", count=len(result.found),
                   findings=[asdict(v) for v in result.found])
    if not result.found or steps >= settings.max_steps:
        transcript.log("done", reason="no-findings-or-budget")
        return result

    # Step 2: display + user selection
    result.selected_ids = react_display.display_and_select(result.found, settings)
    steps += 1
    transcript.log("selected", selected_ids=result.selected_ids)
    if not result.selected_ids or steps >= settings.max_steps:
        transcript.log("done", reason="nothing-selected-or-budget")
        return result

    # Step 3: fix each selected finding (one step per fix)
    by_id = {v.id: v for v in result.found}
    for vid in result.selected_ids:
        if steps >= settings.max_steps:
            break
        finding = by_id.get(vid)
        if finding is None:
            transcript.log("skipped-unknown-id", id=vid)
            continue
        fix = meta_model_fix.get_fix(finding, settings)
        steps += 1
        result.fixes.append(fix)
        transcript.log("fixed", vulnerability_id=vid, fix=asdict(fix))

    transcript.log("done", fixes=len(result.fixes))
    return result
