"""CLI: python -m forgeguard_loop --rule-id X --rule-description Y"""
from __future__ import annotations

import argparse

from forgeguard_loop.loop import run


def main() -> None:
    parser = argparse.ArgumentParser(description="Scan for a custom vuln, display, fix selected.")
    parser.add_argument("--rule-id", required=True)
    parser.add_argument("--rule-description", required=True)
    args = parser.parse_args()
    result = run(args.rule_id, args.rule_description)
    print(f"found={len(result.found)} selected={result.selected_ids} fixes={len(result.fixes)}")
    for fix in result.fixes:
        print(f"--- {fix.vulnerability_id} (confidence {fix.confidence}) ---")
        print(fix.explanation)
        print(fix.patched_snippet)


if __name__ == "__main__":
    main()
