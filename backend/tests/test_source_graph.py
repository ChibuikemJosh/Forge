"""Tests for SourceGraph generation."""

from pathlib import Path

from app.services.project_workspace import WorkspaceService
from app.services.python_indexer import PythonIndexer
from app.services.symbol_resolution import SymbolResolver
from app.services.source_graph_builder import SourceGraphBuilder


def _build(tmp_path, files):
    root = tmp_path / "workspace"
    root.mkdir(exist_ok=True)
    project = root / "proj"
    project.mkdir(exist_ok=True)
    for rel, content in files.items():
        target = project / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8", newline="\n")
    service = WorkspaceService(root)
    ref = service.register_project("proj")
    index = PythonIndexer().index_project(service, ref.project_id)
    resolution = SymbolResolver().resolve(index)
    graph = SourceGraphBuilder().build(ref, index, resolution)
    return graph


def test_empty_project_graph(tmp_path: Path) -> None:
    graph = _build(tmp_path, {})
    assert graph.summary.total_nodes == 1
    assert graph.summary.projects == 1
    assert graph.summary.modules == 0
    assert graph.nodes[0].type == "project"


def test_multiple_modules_and_project_edges(tmp_path: Path) -> None:
    graph = _build(tmp_path, {
        "a.py": "def foo():\n    pass\n",
        "b.py": "def bar():\n    pass\n",
    })
    modules = [n for n in graph.nodes if n.type == "module"]
    assert len(modules) == 2
    contains = [e for e in graph.edges if e.type == "CONTAINS"]
    assert len(contains) == 2


def test_class_function_method_nodes(tmp_path: Path) -> None:
    graph = _build(tmp_path, {
        "m.py": (
            "class A:\n"
            "    def run(self):\n"
            "        pass\n"
            "\n"
            "def top():\n"
            "    pass\n"
        ),
    })
    types = [n.type for n in graph.nodes]
    assert "class" in types
    assert "method" in types
    assert "function" in types
    class_node = next(n for n in graph.nodes if n.type == "class")
    method_node = next(n for n in graph.nodes if n.type == "method")
    dm = [e for e in graph.edges if e.type == "DEFINES_METHOD"]
    assert any(e.source == class_node.id and e.target == method_node.id for e in dm)


def test_resolved_cross_module_call(tmp_path: Path) -> None:
    graph = _build(tmp_path, {
        "services/auth.py": "def authenticate(x):\n    return x\n",
        "routes/orders.py": (
            "from services.auth import authenticate\n"
            "\n"
            "def get_order():\n"
            "    return authenticate(1)\n"
        ),
    })
    calls = [e for e in graph.edges if e.type == "CALLS"]
    resolved = [e for e in calls if e.status.value == "resolved"]
    assert len(resolved) >= 1
    assert any(e.target is not None for e in resolved)


def test_unresolved_call(tmp_path: Path) -> None:
    graph = _build(tmp_path, {
        "m.py": "def run(obj):\n    return obj.process()\n",
    })
    calls = [e for e in graph.edges if e.type == "CALLS"]
    assert len(calls) == 1
    assert calls[0].status.value == "unresolved"
    assert calls[0].target is None


def test_ambiguous_relationship(tmp_path: Path) -> None:
    graph = _build(tmp_path, {
        "a.py": "def foo(x):\n    return x\n",
        "b.py": "def foo(x):\n    return x\n",
        "c.py": (
            "from a import foo\n"
            "from b import foo\n"
            "\n"
            "def run():\n"
            "    return foo(1)\n"
        ),
    })
    calls = [e for e in graph.edges if e.type == "CALLS"]
    assert any(e.status.value == "ambiguous" for e in calls)


def test_relative_import(tmp_path: Path) -> None:
    graph = _build(tmp_path, {
        "pkg/auth.py": "def authenticate(x):\n    return x\n",
        "pkg/routes.py": (
            "from .auth import authenticate\n"
            "\n"
            "def get_order():\n"
            "    return authenticate(1)\n"
        ),
    })
    calls = [e for e in graph.edges if e.type == "CALLS"]
    assert any(e.status.value == "resolved" for e in calls)


def test_circular_imports(tmp_path: Path) -> None:
    graph = _build(tmp_path, {
        "a.py": "from b import b_func\n\ndef a_func():\n    return b_func()\n",
        "b.py": "from a import a_func\n\ndef b_func():\n    return a_func()\n",
    })
    modules = [n for n in graph.nodes if n.type == "module"]
    assert len(modules) == 2


def test_stable_ids(tmp_path: Path) -> None:
    files = {"m.py": "def foo():\n    pass\n"}
    g1 = _build(tmp_path, files)
    # rebuild in new tmp dir with same structure
    tmp2 = tmp_path.parent / "tmp2"
    tmp2.mkdir()
    g2 = _build(tmp2, files)
    assert [n.id for n in g1.nodes] == [n.id for n in g2.nodes]


def test_source_references_and_hashes(tmp_path: Path) -> None:
    graph = _build(tmp_path, {"m.py": "def foo():\n    pass\n"})
    node = next(n for n in graph.nodes if n.type == "function")
    assert node.source is not None
    assert node.source.file_path == "m.py"
    assert node.file_hash is not None
    assert node.source.file_hash == node.file_hash


def test_route_detection(tmp_path: Path) -> None:
    graph = _build(tmp_path, {
        "routes/orders.py": (
            "from fastapi import APIRouter\n"
            "router = APIRouter()\n"
            "\n"
            "@router.get('/orders/{order_id}')\n"
            "def get_order(order_id: str):\n"
            "    return order_id\n"
        ),
    })
    routes = [n for n in graph.nodes if n.type == "route"]
    assert len(routes) == 1
    hr = [e for e in graph.edges if e.type == "HANDLES_ROUTE"]
    assert len(hr) == 1


def test_summary_accuracy(tmp_path: Path) -> None:
    graph = _build(tmp_path, {
        "m.py": (
            "class A:\n"
            "    def run(self):\n"
            "        pass\n"
        ),
    })
    assert graph.summary.total_nodes == len(graph.nodes)
    assert graph.summary.total_edges == len(graph.edges)
    assert graph.summary.classes == 1
    assert graph.summary.methods == 1


def test_invalid_indexing_results(tmp_path: Path) -> None:
    graph = _build(tmp_path, {
        "good.py": "def foo():\n    pass\n",
        "bad.py": "def foo(:\n    pass\n",
    })
    assert any("bad.py" in e for e in graph.errors)
    assert any(n.type == "function" for n in graph.nodes)
