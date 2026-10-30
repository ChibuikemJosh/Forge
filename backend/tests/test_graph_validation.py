"""Tests for the supported graph contract and validation rules."""

from app.schemas.graph import Graph, GraphEdge
from app.services.graph_validation import validate_graph


def make_graph() -> Graph:
    return Graph.model_validate(
        {
            "nodes": [
                {
                    "id": "caller",
                    "type": "function",
                    "name": "find_products",
                    "config": {
                        "parameters": [
                            {"name": "query", "type": "str"},
                            {"name": "limit", "type": "int", "default": 10},
                        ],
                        "return_type": "list",
                    },
                },
                {
                    "id": "callee",
                    "type": "function",
                    "name": "search_products",
                    "config": {
                        "parameters": [
                            {"name": "query", "type": "str"},
                            {"name": "limit", "type": "int", "default": 10},
                        ],
                        "return_type": "list",
                    },
                },
            ],
            "edges": [
                {"id": "caller-callee", "source": "caller", "target": "callee", "type": "calls"}
            ],
        }
    )


def test_valid_connected_function_graph() -> None:
    result = validate_graph(make_graph())

    assert result.valid is True
    assert result.errors == []


def test_duplicate_ids_and_missing_reference_are_rejected() -> None:
    graph = make_graph()
    graph.nodes.append(graph.nodes[0])
    graph.edges[0].id = "duplicate"
    graph.edges.append(
        GraphEdge(id="duplicate", source="missing", target="callee", type="calls")
    )

    result = validate_graph(graph)

    assert result.valid is False
    assert {error.code for error in result.errors} >= {
        "duplicate_node_id",
        "duplicate_edge_id",
        "missing_node_reference",
    }


def test_unsupported_types_and_invalid_names_are_rejected() -> None:
    graph = make_graph()
    graph.nodes[0].type = "database"
    graph.nodes[0].name = "not-valid"
    graph.edges[0].type = "passes_input"

    result = validate_graph(graph)

    assert result.valid is False
    assert {error.code for error in result.errors} >= {
        "unsupported_node_type",
        "invalid_function_name",
        "unsupported_relationship",
    }


def test_duplicate_parameters_and_incompatible_calls_are_rejected() -> None:
    graph = make_graph()
    graph.nodes[0].config.parameters[1].name = "query"
    graph.nodes[1].config.parameters[0].type = "int"

    result = validate_graph(graph)

    assert result.valid is False
    assert {error.code for error in result.errors} >= {
        "duplicate_parameter",
        "incompatible_connection",
    }


def test_cycles_are_rejected() -> None:
    graph = make_graph()
    graph.edges.append(
        GraphEdge(id="callee-caller", source="callee", target="caller", type="calls")
    )

    result = validate_graph(graph)

    assert result.valid is False
    assert any(error.code == "dependency_cycle" for error in result.errors)
