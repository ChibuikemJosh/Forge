"""Tests for nested symbol identity."""

from pathlib import Path

from app.services.python_indexer import PythonIndexer


def _index(tmp_path, source):
    root = tmp_path / "workspace"
    root.mkdir()
    project = root / "proj"
    project.mkdir()
    (project / "m.py").write_text(source, encoding="utf-8", newline="\n")
    from app.services.project_workspace import WorkspaceService

    service = WorkspaceService(root)
    ref = service.register_project("proj")
    return PythonIndexer().index_project(service, ref.project_id)


def test_nested_function_identity(tmp_path: Path) -> None:
    index = _index(
        tmp_path,
        "def outer():\n"
        "    def inner():\n"
        "        return 1\n"
        "    return inner()\n",
    )
    names = {f.qualified_name for f in index.functions}
    assert "outer" in names
    assert "outer.<locals>.inner" in names
    outer = next(f for f in index.functions if f.qualified_name == "outer")
    inner = next(f for f in index.functions if f.qualified_name == "outer.<locals>.inner")
    assert inner.id != outer.id
    assert inner.source.symbol == "outer.<locals>.inner"


def test_duplicate_names_in_different_scopes(tmp_path: Path) -> None:
    index = _index(
        tmp_path,
        "def make():\n"
        "    def helper():\n"
        "        return 1\n"
        "    return helper\n"
        "\n"
        "def helper():\n"
        "    return 2\n",
    )
    names = [f.qualified_name for f in index.functions]
    assert "make.<locals>.helper" in names
    assert "helper" in names
    ids = {f.id for f in index.functions if f.name == "helper"}
    assert len(ids) == 2
