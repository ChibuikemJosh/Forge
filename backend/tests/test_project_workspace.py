"""Tests for the project workspace service."""

import hashlib
from pathlib import Path

import pytest

from app.services.project_workspace import WorkspaceError, WorkspaceService


def _make_project(tmp_path: Path) -> tuple[Path, WorkspaceService, Path]:
    root = tmp_path / "workspace"
    root.mkdir()
    project = root / "demo"
    project.mkdir()
    (project / "main.py").write_bytes(b"print('hi')\n")
    (project / "README.md").write_text("# demo\n", encoding="utf-8")
    ignored = project / "__pycache__"
    ignored.mkdir()
    (ignored / "junk.pyc").write_bytes(b"\x00")
    service = WorkspaceService(root)
    return root, service, project


def test_register_valid_project(tmp_path: Path) -> None:
    root, service, project = _make_project(tmp_path)
    ref = service.register_project("demo")
    assert ref.project_id.startswith("project-")
    assert ref.relative_path == "demo"
    assert ref.name == "demo"
    manifest = service.manifest(ref.project_id)
    assert manifest.file_count == 2
    assert manifest.python_file_count == 1


def test_rejects_path_outside_workspace(tmp_path: Path) -> None:
    root = tmp_path / "workspace"
    root.mkdir()
    outside = tmp_path / "outside"
    outside.mkdir()
    service = WorkspaceService(root)
    with pytest.raises(WorkspaceError):
        service.register_project(str(outside))


def test_path_traversal_rejected(tmp_path: Path) -> None:
    root = tmp_path / "workspace"
    root.mkdir()
    (root / "demo").mkdir()
    service = WorkspaceService(root)
    with pytest.raises(WorkspaceError):
        service.register_project("demo/../../")


def test_ignored_directories(tmp_path: Path) -> None:
    root, service, project = _make_project(tmp_path)
    ref = service.register_project("demo")
    manifest = service.manifest(ref.project_id)
    paths = [f.path for f in manifest.files]
    assert "main.py" in paths
    assert not any("__pycache__" in p for p in paths)


def test_file_reading(tmp_path: Path) -> None:
    root, service, project = _make_project(tmp_path)
    ref = service.register_project("demo")
    content = service.read_file(ref.project_id, "main.py")
    assert content == "print('hi')\n"


def test_read_outside_project_rejected(tmp_path: Path) -> None:
    root, service, project = _make_project(tmp_path)
    ref = service.register_project("demo")
    with pytest.raises(WorkspaceError):
        service.read_file(ref.project_id, "../workspace")


def test_hash_generation(tmp_path: Path) -> None:
    root, service, project = _make_project(tmp_path)
    ref = service.register_project("demo")
    manifest = service.manifest(ref.project_id)
    main_file = next(f for f in manifest.files if f.path == "main.py")
    expected = hashlib.sha256(b"print('hi')\n").hexdigest()
    assert main_file.sha256 == expected
    assert main_file.readable is True


def test_empty_project(tmp_path: Path) -> None:
    root = tmp_path / "workspace"
    root.mkdir()
    (root / "empty").mkdir()
    service = WorkspaceService(root)
    ref = service.register_project("empty")
    manifest = service.manifest(ref.project_id)
    assert manifest.file_count == 0
    assert manifest.python_file_count == 0


def test_missing_path(tmp_path: Path) -> None:
    root = tmp_path / "workspace"
    root.mkdir()
    service = WorkspaceService(root)
    with pytest.raises(WorkspaceError):
        service.register_project("does-not-exist")


def test_unreadable_file_handled(tmp_path: Path) -> None:
    root = tmp_path / "workspace"
    root.mkdir()
    project = root / "demo"
    project.mkdir()
    target = project / "secret.py"
    target.write_text("x = 1\n", encoding="utf-8")
    target.chmod(0o000)
    service = WorkspaceService(root)
    ref = service.register_project("demo")
    manifest = service.manifest(ref.project_id)
    # Restore permissions for cleanup.
    target.chmod(0o644)
    python_file = next(f for f in manifest.files if f.path == "secret.py")
    # On some platforms chmod 000 may still allow root read; just ensure no crash.
    assert python_file.path == "secret.py"
