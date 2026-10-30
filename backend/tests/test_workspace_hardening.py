"""Tests for workspace hardening."""

from pathlib import Path

import pytest

from app.services.project_workspace import WorkspaceError, WorkspaceService


def test_symlink_outside_root_rejected(tmp_path: Path) -> None:
    root = tmp_path / "workspace"
    root.mkdir()
    outside = tmp_path / "outside.txt"
    outside.write_text("secret", encoding="utf-8")
    project = root / "proj"
    project.mkdir()
    link = project / "link.txt"
    try:
        link.symlink_to(outside)
    except (OSError, NotImplementedError):
        pytest.skip("symlinks not supported")
    service = WorkspaceService(root)
    ref = service.register_project("proj")
    manifest = service.manifest(ref.project_id)
    link_meta = next((f for f in manifest.files if f.path == "link.txt"), None)
    if link_meta is not None:
        assert link_meta.readable is False
    with pytest.raises(WorkspaceError):
        service.read_file(ref.project_id, "link.txt")


def test_oversized_file(tmp_path: Path) -> None:
    root = tmp_path / "workspace"
    root.mkdir()
    project = root / "proj"
    project.mkdir()
    (project / "big.txt").write_bytes(b"x" * 100)
    service = WorkspaceService(root, max_file_size_bytes=10)
    ref = service.register_project("proj")
    manifest = service.manifest(ref.project_id)
    big = next(f for f in manifest.files if f.path == "big.txt")
    assert big.readable is False
    assert "size limit" in (big.error or "")
    with pytest.raises(WorkspaceError):
        service.read_file(ref.project_id, "big.txt")


def test_sensitive_config_excluded(tmp_path: Path) -> None:
    root = tmp_path / "workspace"
    root.mkdir()
    project = root / "proj"
    project.mkdir()
    (project / ".env").write_text("SECRET=1", encoding="utf-8")
    (project / ".env.local").write_text("SECRET=2", encoding="utf-8")
    (project / "main.py").write_text("x=1", encoding="utf-8")
    service = WorkspaceService(root)
    ref = service.register_project("proj")
    manifest = service.manifest(ref.project_id)
    paths = [f.path for f in manifest.files]
    assert "main.py" in paths
    assert ".env" not in paths
    assert ".env.local" not in paths


def test_binary_file_hashed_but_unreadable_as_text(tmp_path: Path) -> None:
    root = tmp_path / "workspace"
    root.mkdir()
    project = root / "proj"
    project.mkdir()
    (project / "data.bin").write_bytes(b"\x00\x01\x02")
    service = WorkspaceService(root)
    ref = service.register_project("proj")
    manifest = service.manifest(ref.project_id)
    binary = next(f for f in manifest.files if f.path == "data.bin")
    assert binary.sha256 is not None
    with pytest.raises(WorkspaceError):
        service.read_file(ref.project_id, "data.bin")
