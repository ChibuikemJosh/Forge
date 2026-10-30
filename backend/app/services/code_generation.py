"""Deterministic Python generation for validated Function-node graphs."""

import ast
from collections import defaultdict

from app.schemas.graph import Graph, GraphNode, ValidationResult
from app.services.graph_validation import validate_graph


class CodeGenerationError(ValueError):
    """Raised when a graph cannot be safely translated into Python."""


def generate_python(graph: Graph) -> str:
    """Validate a graph and generate stable Python function definitions."""
    validation = validate_graph(graph)
    if not validation.valid:
        raise CodeGenerationError("Cannot generate code from an invalid graph.")

    nodes = {node.id: node for node in graph.nodes}
    callees: dict[str, str] = {
        edge.source: edge.target for edge in graph.edges
    }
    order = _generation_order(nodes, graph)
    blocks = [_generate_function(nodes[node_id], nodes[callees[node_id]] if node_id in callees else None) for node_id in order]
    code = "\n\n".join(blocks) + "\n"
    try:
        ast.parse(code)
    except SyntaxError as error:
        raise CodeGenerationError("Generated Python failed syntax validation.") from error
    return code


def _generation_order(nodes: dict[str, GraphNode], graph: Graph) -> list[str]:
    dependencies: defaultdict[str, set[str]] = defaultdict(set)
    dependents: defaultdict[str, set[str]] = defaultdict(set)
    for edge in graph.edges:
        dependencies[edge.source].add(edge.target)
        dependents[edge.target].add(edge.source)

    ready = sorted(node_id for node_id in nodes if not dependencies[node_id])
    order: list[str] = []
    while ready:
        node_id = ready.pop(0)
        order.append(node_id)
        for dependent_id in sorted(dependents[node_id]):
            dependencies[dependent_id].discard(node_id)
            if not dependencies[dependent_id]:
                ready.append(dependent_id)
        ready.sort()
    if len(order) != len(nodes):
        raise CodeGenerationError("The graph contains an unsupported dependency cycle.")
    return order


def _generate_function(node: GraphNode, callee: GraphNode | None) -> str:
    parameters = ", ".join(
        f"{parameter.name}: {parameter.type}"
        + (f" = {parameter.default!r}" if parameter.default is not None else "")
        for parameter in node.config.parameters
    )
    signature = f"def {node.name}({parameters}) -> {node.config.return_type}:"
    if callee is None:
        body = f'    raise NotImplementedError("Implement {node.name}")'
    else:
        arguments = ", ".join(parameter.name for parameter in node.config.parameters)
        body = f"    return {callee.name}({arguments})"
    return f"{signature}\n{body}"
