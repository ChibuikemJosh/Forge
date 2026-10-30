"""Append-only JSONL transcript: every step is recorded for audit/replay."""
from __future__ import annotations

import json
from pathlib import Path


class Transcript:
    def __init__(self, path: str | Path = "runs/transcript.jsonl") -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def log(self, step: str, **fields: object) -> None:
        with self.path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps({"step": step, **fields}) + "\n")
