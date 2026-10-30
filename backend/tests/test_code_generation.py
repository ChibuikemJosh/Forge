"""Tests for deterministic graph-to-Python generation."""

import ast

import pytest

from app.services.code_generation import CodeGenerationError, generate_python
from tests.test_graph_validation import make_graph


def test_generates_callee_before_caller_with_the_declared_call() -> None:
    code = generate_python(make_graph())
    tree = ast.parse(code)
    functions = {node.name: node for node in tree.body if isinstance(node, ast.FunctionDef)}

    assert list(functions) == ["search_products", "find_products"]
    call = functions["find_products"].body[0].value
    assert isinstance(call, ast.Call)
    assert isinstance(call.func, ast.Name)
    assert call.func.id == "search_products"
    assert [argument.id for argument in call.args if isinstance(argument, ast.Name)] == [
        "query",
        "limit",
    ]


def test_generation_is_deterministic_and_syntax_valid() -> None:
    first = generate_python(make_graph())
    second = generate_python(make_graph())

    assert first == second
    ast.parse(first)


def test_invalid_graph_cannot_generate_code() -> None:
    graph = make_graph()
    graph.edges[0].type = "returns_output"

    with pytest.raises(CodeGenerationError):
        generate_python(graph)
