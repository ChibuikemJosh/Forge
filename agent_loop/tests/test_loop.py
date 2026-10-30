"""Offline tests: fake mode runs the full loop with no network."""
from forgeguard_loop.config import Settings
from forgeguard_loop.loop import run
from forgeguard_loop.transcript import Transcript


def test_full_loop_fake_mode(tmp_path):
    settings = Settings()
    assert settings.fake_tools  # default offline
    result = run("DEMO-001", "demo rule", settings,
                 Transcript(tmp_path / "t.jsonl"))
    assert len(result.found) == 2
    assert result.selected_ids == ["VULN-001"]
    assert len(result.fixes) == 1
    assert result.fixes[0].vulnerability_id == "VULN-001"


def test_empty_selection_stops(tmp_path, monkeypatch):
    import forgeguard_loop.tools.react_display as rd
    monkeypatch.setattr(rd, "display_and_select", lambda findings, s: [])
    result = run("DEMO-001", "demo rule", Settings(),
                 Transcript(tmp_path / "t.jsonl"))
    assert len(result.found) == 2
    assert result.fixes == []
