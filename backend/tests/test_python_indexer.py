"""Tests for the Python indexer."""

from pathlib import Path

from app.services.project_workspace import WorkspaceService
from app.services.python_indexer import PythonIndexer


def _setup(tmp_path, files):
    root = tmp_path / "workspace"
    root.mkdir()
    project = root / "proj"
    project.mkdir()
    for rel, content in files.items():
        target = project / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8", newline="\n")
    service = WorkspaceService(root)
    ref = service.register_project("proj")
    return service, ref.project_id


def test_parse_multiple_files(tmp_path: Path) -> None:
    service, pid = _setup(tmp_path, {
        "a.py": "def foo():\n    return bar()\n",
        "b.py": "class Baz:\n    def method(self):\n        pass\n",
    })
    index = PythonIndexer().index_project(service, pid)
    assert len(index.files) == 2
    assert len(index.modules) == 2
    assert len(index.functions) >= 2
    assert len(index.classes) == 1


def test_extract_classes_and_functions(tmp_path: Path) -> None:
    service, pid = _setup(tmp_path, {
        "m.py": (
            "class A:\n"
            "    def run(self, x: int) -> int:\n"
            "        return x\n"
            "\n"
            "def top(y: str = 'z') -> str:\n"
            "    return y\n"
        ),
    })
    index = PythonIndexer().index_project(service, pid)
    class_names = [c.name for c in index.classes]
    assert "A" in class_names
    func_names = [f.name for f in index.functions]
    assert "run" in func_names
    assert "top" in func_names
    run_func = next(f for f in index.functions if f.name == "run")
    assert run_func.class_name == "A"
    assert run_func.kind == "method"
    assert run_func.parameters[0].name == "self"
    assert run_func.parameters[1].name == "x"
    assert run_func.parameters[1].annotation == "int"
    assert run_func.return_annotation == "int"
    top_func = next(f for f in index.functions if f.name == "top")
    assert top_func.parameters[0].default == "'z'"


def test_extract_imports_and_calls(tmp_path: Path) -> None:
    service, pid = _setup(tmp_path, {
        "m.py": (
            "import os\n"
            "from pathlib import Path\n"
            "\n"
            "def foo():\n"
            "    os.getcwd()\n"
            "    Path('.')\n"
            "    return helper(1)\n"
        ),
    })
    index = PythonIndexer().index_project(service, pid)
    module = index.modules[0]
    assert any(i.is_from is False and "os" in i.names for i in module.imports)
    assert any(i.is_from is True and i.module == "pathlib" for i in module.imports)
    foo = next(f for f in index.functions if f.name == "foo")
    callees = [c.callee for c in foo.calls]
    assert "os.getcwd" in callees
    assert "Path" in callees
    assert "helper" in callees


def test_source_locations(tmp_path: Path) -> None:
    service, pid = _setup(tmp_path, {
        "m.py": "def foo():\n    pass\n",
    })
    index = PythonIndexer().index_project(service, pid)
    foo = next(f for f in index.functions if f.name == "foo")
    assert foo.line_start == 1
    assert foo.line_end == 2
    assert foo.source is not None
    assert foo.source.project_id == pid
    assert foo.source.file_path == "m.py"
    assert foo.source.module == "m"
    assert foo.source.symbol == "foo"


def test_decorators(tmp_path: Path) -> None:
    service, pid = _setup(tmp_path, {
        "m.py": (
            "def dec(f):\n"
            "    return f\n"
            "\n"
            "@dec\n"
            "def foo():\n"
            "    pass\n"
        ),
    })
    index = PythonIndexer().index_project(service, pid)
    foo = next(f for f in index.functions if f.name == "foo")
    assert "dec" in foo.decorators


def test_invalid_python_handled(tmp_path: Path) -> None:
    service, pid = _setup(tmp_path, {
        "good.py": "def foo():\n    pass\n",
        "bad.py": "def foo(:\n    pass\n",
    })
    index = PythonIndexer().index_project(service, pid)
    assert len(index.errors) == 1
    assert index.errors[0].file_path == "bad.py"
    assert any(f == "good.py" for f in index.files)


def test_empty_project_index(tmp_path: Path) -> None:
    root = tmp_path / "workspace"
    root.mkdir()
    (root / "empty").mkdir()
    service = WorkspaceService(root)
    ref = service.register_project("empty")
    index = PythonIndexer().index_project(service, ref.project_id)
    assert index.functions == []
    assert index.classes == []
    assert index.modules == []


def test_attribute_access(tmp_path: Path) -> None:
    service, pid = _setup(tmp_path, {
        "m.py": "def foo(obj):\n    return obj.bar.baz\n",
    })
    index = PythonIndexer().index_project(service, pid)
    foo = next(f for f in index.functions if f.name == "foo")
    attrs = [a.attribute for a in foo.attribute_accesses]
    assert "bar" in attrs
    assert "baz" in attrs
