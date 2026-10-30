"""Tests for structural symbol resolution."""

from pathlib import Path

from app.services.python_indexer import PythonIndexer
from app.services.symbol_resolution import SymbolResolver, ResolutionStatus


def _index(tmp_path, files):
    root = tmp_path / "workspace"
    root.mkdir(exist_ok=True)
    project = root / "proj"
    project.mkdir(exist_ok=True)
    for rel, content in files.items():
        target = project / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8", newline="\n")
    from app.services.project_workspace import WorkspaceService

    service = WorkspaceService(root)
    ref = service.register_project("proj")
    return PythonIndexer().index_project(service, ref.project_id)


def test_absolute_import_resolution(tmp_path: Path) -> None:
    index = _index(tmp_path, {
        "services/auth.py": "def authenticate(customer_id):\n    return customer_id\n",
        "routes/orders.py": (
            "from services.auth import authenticate\n"
            "\n"
            "def get_order(customer_id):\n"
            "    return authenticate(customer_id)\n"
        ),
    })
    result = SymbolResolver().resolve(index)
    calls = [r for r in result.relationships if r.relationship_type == "calls"]
    assert any(
        r.status == ResolutionStatus.RESOLVED
        and r.target_symbol_id == "project-proj:services/auth.py:authenticate"
        or (r.target_symbol_id and r.target_symbol_id.endswith("services/auth.py:authenticate"))
        for r in calls
    )


def test_relative_import_resolution(tmp_path: Path) -> None:
    index = _index(tmp_path, {
        "pkg/auth.py": "def authenticate(customer_id):\n    return customer_id\n",
        "pkg/routes.py": (
            "from .auth import authenticate\n"
            "\n"
            "def get_order(customer_id):\n"
            "    return authenticate(customer_id)\n"
        ),
    })
    result = SymbolResolver().resolve(index)
    calls = [r for r in result.relationships if r.relationship_type == "calls"]
    assert any(r.status == ResolutionStatus.RESOLVED for r in calls)


def test_imported_class_resolution(tmp_path: Path) -> None:
    index = _index(tmp_path, {
        "models/order.py": "class Order:\n    def is_owned_by(self, user):\n        return True\n",
        "routes/orders.py": (
            "from models.order import Order\n"
            "\n"
            "def get_order():\n"
            "    order = Order()\n"
            "    return order.is_owned_by('x')\n"
        ),
    })
    result = SymbolResolver().resolve(index)
    calls = [r for r in result.relationships if r.relationship_type == "calls"]
    # Order() constructor resolved to class
    assert any(
        r.status == ResolutionStatus.RESOLVED
        and r.target_symbol_id is not None
        and "Order" in (r.target_symbol_id or "")
        for r in calls
    )
    # instance method call unresolved (no type info)
    assert any(
        r.status == ResolutionStatus.UNRESOLVED
        and "is_owned_by" in r.evidence
        for r in calls
    )


def test_unresolved_attribute_call(tmp_path: Path) -> None:
    index = _index(tmp_path, {
        "m.py": (
            "def run(obj):\n"
            "    return obj.process()\n"
        ),
    })
    result = SymbolResolver().resolve(index)
    calls = [r for r in result.relationships if r.relationship_type == "calls"]
    assert len(calls) == 1
    assert calls[0].status == ResolutionStatus.UNRESOLVED
    assert calls[0].target_symbol_id is None


def test_ambiguous_call(tmp_path: Path) -> None:
    index = _index(tmp_path, {
        "a.py": "def foo(x):\n    return x\n",
        "b.py": "def foo(x):\n    return x\n",
        "c.py": (
            "from a import foo\n"
            "from b import foo as foo_b\n"
            "\n"
            "def run():\n"
            "    foo(1)\n"
            "    foo_b(2)\n"
        ),
    })
    # Force ambiguity by importing same local name from two modules
    index2 = _index(tmp_path, {
        "a.py": "def foo(x):\n    return x\n",
        "b.py": "def foo(x):\n    return x\n",
        "c.py": (
            "from a import foo\n"
            "from b import foo\n"
            "\n"
            "def run():\n"
            "    foo(1)\n"
        ),
    })
    result = SymbolResolver().resolve(index2)
    calls = [r for r in result.relationships if r.relationship_type == "calls"]
    assert any(r.status == ResolutionStatus.AMBIGUOUS for r in calls)


def test_circular_imports(tmp_path: Path) -> None:
    index = _index(tmp_path, {
        "a.py": "from b import b_func\n\ndef a_func():\n    return b_func()\n",
        "b.py": "from a import a_func\n\ndef b_func():\n    return a_func()\n",
    })
    result = SymbolResolver().resolve(index)
    assert result.unresolved_count + result.resolved_count + result.ambiguous_count == len(result.relationships)


def test_file_hash_association(tmp_path: Path) -> None:
    index = _index(tmp_path, {
        "m.py": "def foo():\n    pass\n",
    })
    assert index.modules[0].file_hash is not None
    assert index.functions[0].source.file_hash is not None
    assert index.functions[0].source.file_hash == index.modules[0].file_hash
