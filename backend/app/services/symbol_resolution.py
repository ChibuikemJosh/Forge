"""Structural symbol resolution for indexed Python projects."""

from __future__ import annotations

from collections import defaultdict

from app.schemas.code_intelligence import CodeIndex, IndexedClass, IndexedFunction
from app.schemas.resolution import (
    ResolutionResult,
    ResolutionStatus,
    SymbolRelationship,
)
from app.schemas.security import SourceReference


def _module_id(project_id: str, module_name: str) -> str:
    return f"{project_id}:module:{module_name}"


def _resolve_module_name(
    current_module: str, imported: str | None, level: int
) -> str | None:
    if level == 0:
        return imported
    parts = current_module.split(".")
    if level > len(parts):
        return None
    base = parts[:-level]
    if imported:
        return ".".join(base + [imported]) if base else imported
    return ".".join(base) if base else None


class SymbolResolver:
    """Resolve structural relationships using an existing CodeIndex."""

    def resolve(self, index: CodeIndex) -> ResolutionResult:
        relationships: list[SymbolRelationship] = []
        relationship_counter = 0

        def next_id() -> str:
            nonlocal relationship_counter
            relationship_counter += 1
            return f"rel-{relationship_counter}"

        modules_by_name = {module.module: module for module in index.modules}
        functions_by_id = {function.id: function for function in index.functions}
        classes_by_id = {cls.id: cls for cls in index.classes}

        functions_by_module_name: dict[str, list[IndexedFunction]] = defaultdict(list)
        for function in index.functions:
            functions_by_module_name[(function.module, function.name)].append(function)

        classes_by_module_name: dict[str, list[IndexedClass]] = defaultdict(list)
        for cls in index.classes:
            classes_by_module_name[(cls.module, cls.name)].append(cls)

        # Module-level imports and dependencies.
        imported_modules_per_module: dict[str, set[str]] = defaultdict(set)
        for module in index.modules:
            for imported in module.imports:
                target_module_name = _resolve_module_name(
                    module.module, imported.module, imported.level
                )
                if target_module_name is None:
                    continue
                imported_modules_per_module[module.module].add(target_module_name)

                # Import symbol relationships.
                if imported.is_from:
                    for name in imported.names:
                        target_module = modules_by_name.get(target_module_name)
                        target_symbol_id: str | None = None
                        status = ResolutionStatus.UNRESOLVED
                        evidence = (
                            f"Imported name '{name}' from module "
                            f"'{target_module_name}', which is not indexed."
                        )
                        if target_module is not None:
                            candidates = functions_by_module_name.get(
                                (target_module_name, name), []
                            ) + classes_by_module_name.get(
                                (target_module_name, name), []
                            )
                            if len(candidates) == 1:
                                target_symbol_id = candidates[0].id
                                status = ResolutionStatus.RESOLVED
                                evidence = (
                                    f"Resolved import '{name}' to "
                                    f"'{target_symbol_id}'."
                                )
                            elif len(candidates) > 1:
                                status = ResolutionStatus.AMBIGUOUS
                                evidence = (
                                    f"Imported name '{name}' matches multiple "
                                    f"symbols in '{target_module_name}'."
                                )
                            else:
                                evidence = (
                                    f"Imported name '{name}' not found in "
                                    f"indexed module '{target_module_name}'."
                                )
                        source_ref = SourceReference(
                            project_id=index.project_id,
                            file_path=module.file_path,
                            module=module.module,
                            symbol=module.module,
                            line_start=imported.line_start,
                            line_end=imported.line_end,
                            file_hash=module.file_hash,
                        )
                        relationships.append(
                            SymbolRelationship(
                                relationship_id=next_id(),
                                source_symbol_id=_module_id(
                                    index.project_id, module.module
                                ),
                                target_symbol_id=target_symbol_id,
                                relationship_type="imports_symbol",
                                status=status,
                                source=source_ref,
                                evidence=evidence,
                            )
                        )
                else:
                    # import module
                    status = (
                        ResolutionStatus.RESOLVED
                        if target_module_name in modules_by_name
                        else ResolutionStatus.UNRESOLVED
                    )
                    evidence = (
                        f"Module import '{target_module_name}' "
                        + ("resolved." if status == ResolutionStatus.RESOLVED else "not indexed.")
                    )
                    source_ref = SourceReference(
                        project_id=index.project_id,
                        file_path=module.file_path,
                        module=module.module,
                        symbol=module.module,
                        line_start=imported.line_start,
                        line_end=imported.line_end,
                        file_hash=module.file_hash,
                    )
                    relationships.append(
                        SymbolRelationship(
                            relationship_id=next_id(),
                            source_symbol_id=_module_id(
                                index.project_id, module.module
                            ),
                            target_symbol_id=(
                                _module_id(index.project_id, target_module_name)
                                if status == ResolutionStatus.RESOLVED
                                else None
                            ),
                            relationship_type="imports_module",
                            status=status,
                            source=source_ref,
                            evidence=evidence,
                        )
                    )

        # Module dependencies.
        for module_name, imported_modules in imported_modules_per_module.items():
            for target_module_name in imported_modules:
                status = (
                    ResolutionStatus.RESOLVED
                    if target_module_name in modules_by_name
                    else ResolutionStatus.UNRESOLVED
                )
                source_module = modules_by_name.get(module_name)
                source_ref = SourceReference(
                    project_id=index.project_id,
                    file_path=source_module.file_path if source_module else "",
                    module=module_name,
                    symbol=module_name,
                    line_start=1,
                    line_end=1,
                    file_hash=source_module.file_hash if source_module else None,
                )
                relationships.append(
                    SymbolRelationship(
                        relationship_id=next_id(),
                        source_symbol_id=_module_id(index.project_id, module_name),
                        target_symbol_id=(
                            _module_id(index.project_id, target_module_name)
                            if status == ResolutionStatus.RESOLVED
                            else None
                        ),
                        relationship_type="depends_on_module",
                        status=status,
                        source=source_ref,
                        evidence=(
                            f"Module '{module_name}' depends on "
                            f"'{target_module_name}' "
                            + ("(indexed)." if status == ResolutionStatus.RESOLVED else "(not indexed).")
                        ),
                    )
                )

        # Class method definitions.
        for cls in index.classes:
            for method_id in cls.method_ids:
                method = functions_by_id.get(method_id)
                source_ref = method.source if method is not None else cls.source
                relationships.append(
                    SymbolRelationship(
                        relationship_id=next_id(),
                        source_symbol_id=cls.id,
                        target_symbol_id=method_id,
                        relationship_type="defines_method",
                        status=ResolutionStatus.RESOLVED,
                        source=source_ref,
                        evidence=f"Class '{cls.name}' defines method '{method.name if method else method_id}'.",
                    )
                )

        # Cross-module and local function calls.
        for function in index.functions:
            module_imports = next(
                (m.imports for m in index.modules if m.module == function.module),
                [],
            )
            import_map: dict[str, list[tuple[str, str]]] = defaultdict(list)
            for imp in module_imports:
                if imp.is_from and imp.module is not None:
                    target_module_name = _resolve_module_name(
                        function.module, imp.module, imp.level
                    )
                    if target_module_name is None:
                        continue
                    for idx, name in enumerate(imp.names):
                        aliases = imp.aliases if imp.aliases else [None] * len(imp.names)
                        alias = aliases[idx] if idx < len(aliases) else None
                        local_name = alias or name
                        import_map[local_name].append(
                            (target_module_name, name)
                        )
                elif not imp.is_from and imp.module is not None:
                    # import module [as alias]
                    target_module_name = _resolve_module_name(
                        function.module, imp.module, imp.level
                    )
                    if target_module_name is None:
                        continue
                    for idx, name in enumerate(imp.names):
                        aliases = imp.aliases if imp.aliases else [None] * len(imp.names)
                        alias = aliases[idx] if idx < len(aliases) else None
                        local_name = alias or name
                        # module import: map local module name to module
                        import_map[local_name].append(
                            (target_module_name, name)
                        )

            for call in function.calls:
                callee = call.callee
                target_symbol_id: str | None = None
                status = ResolutionStatus.UNRESOLVED
                evidence = f"Call expression '{callee}' could not be resolved."

                if "." not in callee:
                    # Same-module candidates.
                    same_module_candidates = [
                        candidate.id
                        for candidate in index.functions
                        if candidate.module == function.module
                        and candidate.name == callee
                        and candidate.id != function.id
                    ]
                    # Imported candidates.
                    imported_candidates: list[str] = []
                    for target_module_name, original_name in import_map.get(
                        callee, []
                    ):
                        imported_candidates.extend(
                            candidate.id
                            for candidate in functions_by_module_name.get(
                                (target_module_name, original_name), []
                            )
                        )
                        imported_candidates.extend(
                            candidate.id
                            for candidate in classes_by_module_name.get(
                                (target_module_name, original_name), []
                            )
                        )
                    all_candidates = same_module_candidates + imported_candidates
                    # Deduplicate while preserving order.
                    seen: set[str] = set()
                    unique_candidates: list[str] = []
                    for candidate_id in all_candidates:
                        if candidate_id not in seen:
                            seen.add(candidate_id)
                            unique_candidates.append(candidate_id)
                    if len(unique_candidates) == 1:
                        target_symbol_id = unique_candidates[0]
                        status = ResolutionStatus.RESOLVED
                        evidence = f"Resolved call '{callee}' to '{target_symbol_id}'."
                    elif len(unique_candidates) > 1:
                        status = ResolutionStatus.AMBIGUOUS
                        evidence = (
                            f"Call '{callee}' matches multiple candidates: "
                            f"{', '.join(unique_candidates)}."
                        )
                elif callee.count(".") == 1:
                    obj_name, method_name = callee.split(".")
                    # Try imported class first.
                    target_classes: list[IndexedClass] = []
                    for target_module_name, original_name in import_map.get(
                        obj_name, []
                    ):
                        target_classes.extend(
                            cls
                            for cls in classes_by_module_name.get(
                                (target_module_name, original_name), []
                            )
                        )
                    # Then same-module class.
                    target_classes.extend(
                        cls
                        for cls in index.classes
                        if cls.module == function.module and cls.name == obj_name
                    )
                    method_candidates: list[str] = []
                    for cls in target_classes:
                        for method_id in cls.method_ids:
                            method = functions_by_id.get(method_id)
                            if method is not None and method.name == method_name:
                                method_candidates.append(method_id)
                    seen_methods: set[str] = set()
                    unique_methods: list[str] = []
                    for method_id in method_candidates:
                        if method_id not in seen_methods:
                            seen_methods.add(method_id)
                            unique_methods.append(method_id)
                    if len(unique_methods) == 1:
                        target_symbol_id = unique_methods[0]
                        status = ResolutionStatus.RESOLVED
                        evidence = (
                            f"Resolved method call '{callee}' to "
                            f"'{target_symbol_id}'."
                        )
                    elif len(unique_methods) > 1:
                        status = ResolutionStatus.AMBIGUOUS
                        evidence = (
                            f"Method call '{callee}' matches multiple methods: "
                            f"{', '.join(unique_methods)}."
                        )
                    else:
                        evidence = (
                            f"Method '{method_name}' not found on resolved "
                            f"class '{obj_name}'."
                        )
                else:
                    evidence = (
                        f"Call '{callee}' has unsupported complexity for resolution."
                    )

                source_ref = SourceReference(
                    project_id=index.project_id,
                    file_path=function.source.file_path if function.source else "",
                    module=function.module,
                    symbol=function.qualified_name,
                    line_start=call.line_start,
                    line_end=call.line_end,
                    file_hash=(
                        function.source.file_hash if function.source else None
                    ),
                )
                relationships.append(
                    SymbolRelationship(
                        relationship_id=next_id(),
                        source_symbol_id=function.id,
                        target_symbol_id=target_symbol_id,
                        relationship_type="calls",
                        status=status,
                        source=source_ref,
                        evidence=evidence,
                    )
                )

        resolved_count = sum(
            1 for r in relationships if r.status == ResolutionStatus.RESOLVED
        )
        ambiguous_count = sum(
            1 for r in relationships if r.status == ResolutionStatus.AMBIGUOUS
        )
        unresolved_count = sum(
            1 for r in relationships if r.status == ResolutionStatus.UNRESOLVED
        )
        return ResolutionResult(
            project_id=index.project_id,
            relationships=relationships,
            resolved_count=resolved_count,
            ambiguous_count=ambiguous_count,
            unresolved_count=unresolved_count,
        )
