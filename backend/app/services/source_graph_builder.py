"""Build a read-only SourceGraph from indexed code and resolved relationships."""

from __future__ import annotations

import re
from typing import Any

from app.schemas.code_intelligence import CodeIndex, IndexedClass, IndexedFunction
from app.schemas.resolution import ResolutionResult, ResolutionStatus
from app.schemas.security import SourceReference
from app.schemas.source_graph import (
    SourceGraph,
    SourceGraphEdge,
    SourceGraphNode,
    SourceGraphSummary,
)
from app.services.project_workspace import ProjectReference


_ROUTE_DECORATOR_RE = re.compile(
    r"\.(?P<method>get|post|put|patch|delete|options|head|api_route)\s*\(\s*"
    r"(?P<quote>['\"])(?P<path>[^'\"]*)(?P=quote)",
    re.IGNORECASE,
)


def _route_info(decorators: list[str]) -> tuple[str | None, str | None]:
    for decorator in decorators:
        match = _ROUTE_DECORATOR_RE.search(decorator)
        if match:
            return match.group("method").upper(), match.group("path")
    return None, None


class SourceGraphBuilder:
    """Convert CodeIndex and ResolutionResult into a SourceGraph."""

    def build(
        self,
        project: ProjectReference,
        index: CodeIndex,
        resolution: ResolutionResult,
    ) -> SourceGraph:
        nodes: list[SourceGraphNode] = []
        edges: list[SourceGraphEdge] = []
        edge_counter = 0

        def next_edge_id() -> str:
            nonlocal edge_counter
            edge_counter += 1
            return f"edge-{edge_counter}"

        project_node_id = f"project:{project.project_id}"
        nodes.append(
            SourceGraphNode(
                id=project_node_id,
                type="project",
                name=project.name,
                qualified_name=project.relative_path,
                module=None,
                file_path=None,
                source=None,
                file_hash=None,
                metadata={"relative_path": project.relative_path},
            )
        )

        # Module pseudo-id -> node id mapping.
        module_node_ids: dict[str, str] = {}
        module_by_name: dict[str, Any] = {m.module: m for m in index.modules}
        function_by_id: dict[str, IndexedFunction] = {
            f.id: f for f in index.functions
        }
        class_by_id: dict[str, IndexedClass] = {c.id: c for c in index.classes}

        for module in index.modules:
            node_id = f"module:{project.project_id}:{module.file_path}"
            module_node_ids[module.module] = node_id
            module_node_ids[f"{project.project_id}:module:{module.module}"] = node_id
            source_ref = SourceReference(
                project_id=project.project_id,
                file_path=module.file_path,
                module=module.module,
                symbol=module.module,
                line_start=1,
                line_end=1,
                file_hash=module.file_hash,
            )
            nodes.append(
                SourceGraphNode(
                    id=node_id,
                    type="module",
                    name=module.module.split(".")[-1] or module.module,
                    qualified_name=module.module,
                    module=module.module,
                    file_path=module.file_path,
                    source=source_ref,
                    file_hash=module.file_hash,
                    metadata={"import_count": len(module.imports)},
                )
            )
            edges.append(
                SourceGraphEdge(
                    id=next_edge_id(),
                    source=project_node_id,
                    target=node_id,
                    type="CONTAINS",
                    status=ResolutionStatus.RESOLVED,
                    observed=True,
                    source_ref=source_ref,
                    evidence="Project contains module.",
                )
            )

        for indexed_class in index.classes:
            node_id = indexed_class.id
            nodes.append(
                SourceGraphNode(
                    id=node_id,
                    type="class",
                    name=indexed_class.name,
                    qualified_name=indexed_class.qualified_name,
                    module=indexed_class.module,
                    file_path=indexed_class.source.file_path,
                    source=indexed_class.source,
                    file_hash=indexed_class.source.file_hash,
                    metadata={
                        "bases": indexed_class.bases,
                        "decorators": indexed_class.decorators,
                    },
                )
            )
            module_node_id = module_node_ids.get(indexed_class.module)
            if module_node_id is not None:
                edges.append(
                    SourceGraphEdge(
                        id=next_edge_id(),
                        source=module_node_id,
                        target=node_id,
                        type="DEFINES",
                        status=ResolutionStatus.RESOLVED,
                        observed=True,
                        source_ref=indexed_class.source,
                        evidence="Module defines class.",
                    )
                )

        for indexed_function in index.functions:
            node_type = "method" if indexed_function.class_name is not None else "function"
            route_method, route_path = _route_info(indexed_function.decorators)
            if route_method is not None:
                node_type = "function"
            node_id = indexed_function.id
            nodes.append(
                SourceGraphNode(
                    id=node_id,
                    type=node_type,
                    name=indexed_function.name,
                    qualified_name=indexed_function.qualified_name,
                    module=indexed_function.module,
                    file_path=indexed_function.source.file_path,
                    source=indexed_function.source,
                    file_hash=indexed_function.source.file_hash,
                    metadata={
                        "kind": indexed_function.kind,
                        "decorators": indexed_function.decorators,
                        "parameters": [p.name for p in indexed_function.parameters],
                        "return_annotation": indexed_function.return_annotation,
                        "is_route": route_method is not None,
                        "route_method": route_method,
                        "route_path": route_path,
                    },
                )
            )
            if indexed_function.class_name is not None:
                class_node = next(
                    (
                        c
                        for c in index.classes
                        if c.module == indexed_function.module
                        and c.name == indexed_function.class_name
                    ),
                    None,
                )
                if class_node is not None:
                    edges.append(
                        SourceGraphEdge(
                            id=next_edge_id(),
                            source=class_node.id,
                            target=node_id,
                            type="DEFINES_METHOD",
                            status=ResolutionStatus.RESOLVED,
                            observed=True,
                            source_ref=indexed_function.source,
                            evidence="Class defines method.",
                        )
                    )
            else:
                module_node_id = module_node_ids.get(indexed_function.module)
                if module_node_id is not None:
                    edges.append(
                        SourceGraphEdge(
                            id=next_edge_id(),
                            source=module_node_id,
                            target=node_id,
                            type="DEFINES",
                            status=ResolutionStatus.RESOLVED,
                            observed=True,
                            source_ref=indexed_function.source,
                            evidence="Module defines function.",
                        )
                    )

            if route_method is not None:
                route_node_id = (
                    f"route:{project.project_id}:{indexed_function.source.file_path}:"
                    f"{indexed_function.qualified_name}"
                )
                nodes.append(
                    SourceGraphNode(
                        id=route_node_id,
                        type="route",
                        name=f"{route_method} {route_path or ''}".strip(),
                        qualified_name=indexed_function.qualified_name,
                        module=indexed_function.module,
                        file_path=indexed_function.source.file_path,
                        source=indexed_function.source,
                        file_hash=indexed_function.source.file_hash,
                        metadata={
                            "http_method": route_method,
                            "path": route_path,
                            "handler": indexed_function.qualified_name,
                        },
                    )
                )
                edges.append(
                    SourceGraphEdge(
                        id=next_edge_id(),
                        source=node_id,
                        target=route_node_id,
                        type="HANDLES_ROUTE",
                        status=ResolutionStatus.RESOLVED,
                        observed=True,
                        source_ref=indexed_function.source,
                        evidence="Function handles route based on framework decorator.",
                    )
                )

        # Resolution relationships -> graph edges.
        for relationship in resolution.relationships:
            source_id = self._map_symbol_id(
                relationship.source_symbol_id, module_node_ids, function_by_id, class_by_id
            )
            target_id = (
                self._map_symbol_id(
                    relationship.target_symbol_id,
                    module_node_ids,
                    function_by_id,
                    class_by_id,
                )
                if relationship.target_symbol_id is not None
                else None
            )
            # Avoid duplicate structural edges already represented.
            if relationship.relationship_type == "defines_method":
                continue
            edge_type = self._edge_type_for(relationship.relationship_type)
            if edge_type is None:
                continue
            # Skip module pseudo edges when module node missing.
            if source_id is None:
                continue
            if target_id is None and relationship.status == ResolutionStatus.RESOLVED:
                continue
            edges.append(
                SourceGraphEdge(
                    id=next_edge_id(),
                    source=source_id,
                    target=target_id,
                    type=edge_type,
                    status=relationship.status,
                    observed=True,
                    source_ref=relationship.source,
                    evidence=relationship.evidence,
                )
            )

        errors = [f"{e.file_path}: {e.message}" for e in index.errors]
        graph = SourceGraph(
            project_id=project.project_id,
            project_name=project.name,
            relative_path=project.relative_path,
            nodes=nodes,
            edges=edges,
            errors=errors,
        )
        graph.summary = self._summary(graph)
        return graph

    def _map_symbol_id(
        self,
        symbol_id: str | None,
        module_node_ids: dict[str, str],
        function_by_id: dict[str, Any],
        class_by_id: dict[str, Any],
    ) -> str | None:
        if symbol_id is None:
            return None
        if symbol_id in module_node_ids:
            return module_node_ids[symbol_id]
        if symbol_id in function_by_id or symbol_id in class_by_id:
            return symbol_id
        # Module pseudo id -> module node id.
        if symbol_id.startswith(f"{function_by_id and list(function_by_id.values())[0].id.split(':')[0]}:module:"):
            # generic fallback not reliable; try parse
            pass
        if ":module:" in symbol_id:
            module_name = symbol_id.split(":module:", 1)[-1]
            # find module node by module name
            for key, value in module_node_ids.items():
                if key.endswith(module_name) or key == module_name:
                    return value
        return None

    def _edge_type_for(self, relationship_type: str) -> str | None:
        mapping = {
            "imports_symbol": "IMPORTS",
            "imports_module": "IMPORTS",
            "depends_on_module": "DEPENDS_ON",
            "calls": "CALLS",
        }
        return mapping.get(relationship_type)

    def _summary(self, graph: SourceGraph) -> SourceGraphSummary:
        node_types = [node.type for node in graph.nodes]
        resolved = sum(1 for e in graph.edges if e.status == ResolutionStatus.RESOLVED)
        ambiguous = sum(1 for e in graph.edges if e.status == ResolutionStatus.AMBIGUOUS)
        unresolved = sum(1 for e in graph.edges if e.status == ResolutionStatus.UNRESOLVED)
        return SourceGraphSummary(
            total_nodes=len(graph.nodes),
            total_edges=len(graph.edges),
            projects=sum(1 for t in node_types if t == "project"),
            modules=sum(1 for t in node_types if t == "module"),
            classes=sum(1 for t in node_types if t == "class"),
            functions=sum(1 for t in node_types if t == "function"),
            methods=sum(1 for t in node_types if t == "method"),
            routes=sum(1 for t in node_types if t == "route"),
            resolved_relationships=resolved,
            ambiguous_relationships=ambiguous,
            unresolved_relationships=unresolved,
        )
