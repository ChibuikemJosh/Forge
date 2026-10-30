"""Deterministic validation for the supported Function-node graph subset."""

import keyword
import re
from collections import defaultdict

from app.schemas.graph import (
    FunctionParameter,
    Graph,
    GraphNode,
    RelationshipType,
    ValidationErrorItem,
    ValidationResult,
)

PYTHON_IDENTIFIER = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
SUPPORTED_TYPES = {"str", "int", "float", "bool", "list", "dict", "object", "None"}


def validate_graph(graph: Graph) -> ValidationResult:
    """Validate graph identity, interfaces, relationships, and dependencies."""
    errors: list[ValidationErrorItem] = []
    node_ids: dict[str, GraphNode] = {}
    edge_ids: set[str] = set()

    for node in graph.nodes:
        if node.id in node_ids:
            errors.append(
                ValidationErrorItem(
                    code="duplicate_node_id",
                    message=f"Node ID '{node.id}' is duplicated.",
                    node_id=node.id,
                )
            )
        else:
            node_ids[node.id] = node
        _validate_node(node, errors)

    outgoing_calls: defaultdict[str, list[str]] = defaultdict(list)
    adjacency: defaultdict[str, list[str]] = defaultdict(list)
    for edge in graph.edges:
        if edge.id in edge_ids:
            errors.append(
                ValidationErrorItem(
                    code="duplicate_edge_id",
                    message=f"Edge ID '{edge.id}' is duplicated.",
                    edge_id=edge.id,
                )
            )
        edge_ids.add(edge.id)

        if edge.source not in node_ids or edge.target not in node_ids:
            errors.append(
                ValidationErrorItem(
                    code="missing_node_reference",
                    message=f"Edge '{edge.id}' references a missing node.",
                    edge_id=edge.id,
                )
            )
            continue

        if edge.type != RelationshipType.CALLS.value:
            errors.append(
                ValidationErrorItem(
                    code="unsupported_relationship",
                    message=f"Relationship '{edge.type}' is not supported yet; only 'calls' is supported.",
                    edge_id=edge.id,
                )
            )
            continue

        if edge.source == edge.target:
            errors.append(
                ValidationErrorItem(
                    code="self_call",
                    message="A function cannot call itself in the initial generator.",
                    edge_id=edge.id,
                )
            )
            continue

        outgoing_calls[edge.source].append(edge.target)
        adjacency[edge.target].append(edge.source)
        _validate_call_interface(node_ids[edge.source], node_ids[edge.target], edge.id, errors)

    for source_id, targets in outgoing_calls.items():
        if len(targets) > 1:
            errors.append(
                ValidationErrorItem(
                    code="multiple_calls",
                    message="A caller may have only one calls edge in the initial generator.",
                    node_id=source_id,
                )
            )

    errors.extend(_cycle_errors(node_ids, adjacency))
    return ValidationResult(valid=not errors, errors=errors)


def _validate_node(node: GraphNode, errors: list[ValidationErrorItem]) -> None:
    if node.type != "function":
        errors.append(
            ValidationErrorItem(
                code="unsupported_node_type",
                message=f"Node type '{node.type}' is not supported; only 'function' is supported.",
                node_id=node.id,
            )
        )
    if not PYTHON_IDENTIFIER.fullmatch(node.name) or keyword.iskeyword(node.name):
        errors.append(
            ValidationErrorItem(
                code="invalid_function_name",
                message=f"'{node.name}' is not a valid Python function name.",
                node_id=node.id,
            )
        )

    parameter_names: set[str] = set()
    for parameter in node.config.parameters:
        if not PYTHON_IDENTIFIER.fullmatch(parameter.name) or keyword.iskeyword(parameter.name):
            errors.append(
                ValidationErrorItem(
                    code="invalid_parameter_name",
                    message=f"'{parameter.name}' is not a valid Python parameter name.",
                    node_id=node.id,
                )
            )
        if parameter.name in parameter_names:
            errors.append(
                ValidationErrorItem(
                    code="duplicate_parameter",
                    message=f"Parameter '{parameter.name}' is duplicated.",
                    node_id=node.id,
                )
            )
        parameter_names.add(parameter.name)
        if parameter.type not in SUPPORTED_TYPES:
            errors.append(
                ValidationErrorItem(
                    code="unsupported_type",
                    message=f"Type '{parameter.type}' is not supported by the initial generator.",
                    node_id=node.id,
                )
            )

    if node.config.return_type not in SUPPORTED_TYPES:
        errors.append(
            ValidationErrorItem(
                code="unsupported_return_type",
                message=f"Return type '{node.config.return_type}' is not supported by the initial generator.",
                node_id=node.id,
            )
        )

    input_names = [port.name for port in node.inputs]
    if len(input_names) != len(set(input_names)):
        errors.append(
            ValidationErrorItem(
                code="duplicate_input_port",
                message="Input port names must be unique.",
                node_id=node.id,
            )
        )
    expected_inputs = [(parameter.name, parameter.type) for parameter in node.config.parameters]
    actual_inputs = [(port.name, port.type) for port in node.inputs]
    if node.inputs and actual_inputs != expected_inputs:
        errors.append(
            ValidationErrorItem(
                code="inconsistent_inputs",
                message="Explicit inputs must match the configured function parameters.",
                node_id=node.id,
            )
        )
    if len(node.outputs) > 1:
        errors.append(
            ValidationErrorItem(
                code="unsupported_outputs",
                message="A Function node may define at most one output port.",
                node_id=node.id,
            )
        )
    if node.outputs and node.outputs[0].type != node.config.return_type:
        errors.append(
            ValidationErrorItem(
                code="inconsistent_outputs",
                message="The output port type must match the configured return type.",
                node_id=node.id,
            )
        )


def _validate_call_interface(
    caller: GraphNode,
    callee: GraphNode,
    edge_id: str,
    errors: list[ValidationErrorItem],
) -> None:
    caller_parameters = caller.config.parameters
    callee_parameters = callee.config.parameters
    if len(caller_parameters) != len(callee_parameters) or any(
        (caller_parameter.name, caller_parameter.type)
        != (callee_parameter.name, callee_parameter.type)
        for caller_parameter, callee_parameter in zip(caller_parameters, callee_parameters)
    ):
        errors.append(
            ValidationErrorItem(
                code="incompatible_connection",
                message="A calls edge requires caller and callee parameters to have matching names and types.",
                edge_id=edge_id,
            )
        )


def _cycle_errors(
    nodes: dict[str, GraphNode],
    adjacency: defaultdict[str, list[str]],
) -> list[ValidationErrorItem]:
    state: dict[str, int] = {}
    errors: list[ValidationErrorItem] = []

    def visit(node_id: str) -> None:
        state[node_id] = 1
        for dependent_id in adjacency[node_id]:
            if state.get(dependent_id) == 1:
                errors.append(
                    ValidationErrorItem(
                        code="dependency_cycle",
                        message="Calls edges must form an acyclic dependency graph.",
                        node_id=dependent_id,
                    )
                )
            elif state.get(dependent_id, 0) == 0:
                visit(dependent_id)
        state[node_id] = 2

    for node_id in nodes:
        if state.get(node_id, 0) == 0:
            visit(node_id)
    return errors
