"""Standard-library AST indexer for Python projects."""

from __future__ import annotations

import ast
from pathlib import Path
from typing import Iterable

from app.schemas.code_intelligence import (
    CodeIndex,
    IndexedAttributeAccess,
    IndexedCall,
    IndexedClass,
    IndexedFunction,
    IndexedImport,
    IndexedParameter,
    IndexingError,
    ModuleIndex,
)
from app.schemas.security import SourceReference
from app.services.project_workspace import WorkspaceError, WorkspaceService


class PythonIndexer:
    """Parse Python source files into a structured :class:`CodeIndex`."""

    def index_project(
        self, workspace: WorkspaceService, project_id: str
    ) -> CodeIndex:
        manifest = workspace.manifest(project_id)
        sources: list[tuple[str, str]] = []
        errors: list[IndexingError] = []
        for project_file in manifest.files:
            if project_file.language != "python":
                continue
            if not project_file.readable:
                errors.append(
                    IndexingError(
                        file_path=project_file.path,
                        message=project_file.error or "File is not readable.",
                    )
                )
                continue
            try:
                content = workspace.read_file(project_id, project_file.path)
            except WorkspaceError as error:
                errors.append(
                    IndexingError(file_path=project_file.path, message=str(error))
                )
                continue
            sources.append((project_file.path, content))
        file_hashes = {
            project_file.path: project_file.sha256
            for project_file in manifest.files
            if project_file.sha256 is not None
        }
        index = self.index_sources(project_id, sources, file_hashes=file_hashes)
        index.errors = errors + index.errors
        index.files = [f.path for f in manifest.files if f.language == "python"]
        return index

    def index_sources(
        self,
        project_id: str,
        sources: Iterable[tuple[str, str]],
        file_hashes: dict[str, str] | None = None,
    ) -> CodeIndex:
        modules: list[ModuleIndex] = []
        classes: list[IndexedClass] = []
        functions: list[IndexedFunction] = []
        errors: list[IndexingError] = []
        parsed_files: list[str] = []

        for relative_path, source in sources:
            parsed_files.append(relative_path)
            try:
                tree = ast.parse(source, filename=relative_path)
            except SyntaxError as error:
                errors.append(
                    IndexingError(file_path=relative_path, message=str(error))
                )
                continue

            module_name = _module_name(relative_path)
            module_imports: list[IndexedImport] = []
            module_class_ids: list[str] = []
            module_function_ids: list[str] = []

            # Collect imports.
            for node in tree.body:
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        module_imports.append(
                            IndexedImport(
                                module=None,
                                names=[alias.name],
                                aliases=[alias.asname],
                                alias=alias.asname,
                                level=0,
                                is_from=False,
                                line_start=node.lineno,
                                line_end=node.end_lineno or node.lineno,
                            )
                        )
                elif isinstance(node, ast.ImportFrom):
                    names = [alias.name for alias in node.names]
                    module_imports.append(
                        IndexedImport(
                            module=node.module,
                            names=names,
                            aliases=[a.asname for a in node.names],
                            alias=node.names[0].asname if node.names else None,
                            level=node.level,
                            is_from=True,
                            line_start=node.lineno,
                            line_end=node.end_lineno or node.lineno,
                        )
                    )

            # Collect classes and their methods.
            for node in tree.body:
                if not isinstance(node, ast.ClassDef):
                    continue
                class_id = _symbol_id(project_id, relative_path, node.name)
                bases = [_safe_unparse(base) for base in node.bases]
                decorators = [_safe_unparse(dec) for dec in node.decorator_list]
                method_ids: list[str] = []
                # Index methods (direct children only).
                for item in node.body:
                    if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        func = self._index_function(
                            item,
                            project_id,
                            relative_path,
                            module_name,
                            class_name=node.name,
                            qualified_prefix=node.name,
                        )
                        functions.append(func)
                        method_ids.append(func.id)
                        module_function_ids.append(func.id)
                        # Nested functions inside methods.
                        self._index_nested(
                            item.body,
                            project_id,
                            relative_path,
                            module_name,
                            class_name=None,
                            qualified_prefix=func.qualified_name,
                            functions=functions,
                            module_function_ids=module_function_ids,
                        )
                # Nested classes? skip for MVP depth; top-level only.
                classes.append(
                    IndexedClass(
                        id=class_id,
                        name=node.name,
                        qualified_name=node.name,
                        module=module_name,
                        bases=bases,
                        decorators=decorators,
                        method_ids=method_ids,
                        source=SourceReference(
                            project_id=project_id,
                            file_path=relative_path,
                            module=module_name,
                            symbol=node.name,
                            line_start=node.lineno,
                            line_end=node.end_lineno or node.lineno,
                        ),
                        line_start=node.lineno,
                        line_end=node.end_lineno or node.lineno,
                    )
                )
                module_class_ids.append(class_id)

            # Collect top-level functions.
            for node in tree.body:
                if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    continue
                func = self._index_function(
                    node,
                    project_id,
                    relative_path,
                    module_name,
                    class_name=None,
                    qualified_prefix="",
                )
                functions.append(func)
                module_function_ids.append(func.id)
                self._index_nested(
                    node.body,
                    project_id,
                    relative_path,
                    module_name,
                    class_name=None,
                    qualified_prefix=func.qualified_name,
                    functions=functions,
                    module_function_ids=module_function_ids,
                )

            modules.append(
                ModuleIndex(
                    module=module_name,
                    file_path=relative_path,
                    imports=module_imports,
                    class_ids=module_class_ids,
                    function_ids=module_function_ids,
                )
            )

        if file_hashes:
            for module in modules:
                module.file_hash = file_hashes.get(module.file_path)
            for indexed_class in classes:
                if indexed_class.source is not None:
                    indexed_class.source.file_hash = file_hashes.get(
                        indexed_class.source.file_path
                    )
            for indexed_function in functions:
                if indexed_function.source is not None:
                    indexed_function.source.file_hash = file_hashes.get(
                        indexed_function.source.file_path
                    )
        return CodeIndex(
            project_id=project_id,
            files=parsed_files,
            modules=modules,
            classes=classes,
            functions=functions,
            errors=errors,
        )

    def _index_function(
        self,
        node: ast.FunctionDef | ast.AsyncFunctionDef,
        project_id: str,
        relative_path: str,
        module_name: str,
        class_name: str | None,
        qualified_prefix: str,
    ) -> IndexedFunction:
        if qualified_prefix:
            qualified_name = f"{qualified_prefix}.{node.name}"
        else:
            qualified_name = node.name
        kind = "method" if class_name is not None else "function"
        if isinstance(node, ast.AsyncFunctionDef):
            kind = f"async_{kind}"
        symbol_id = _symbol_id(project_id, relative_path, qualified_name)
        decorators = [_safe_unparse(dec) for dec in node.decorator_list]
        parameters = _extract_parameters(node.args)
        return_annotation = (
            _safe_unparse(node.returns) if node.returns is not None else None
        )
        calls = _collect_calls(node, qualified_name)
        attribute_accesses = _collect_attribute_accesses(node, qualified_name)
        return IndexedFunction(
            id=symbol_id,
            name=node.name,
            qualified_name=qualified_name,
            kind=kind,
            module=module_name,
            class_name=class_name,
            decorators=decorators,
            parameters=parameters,
            return_annotation=return_annotation,
            calls=calls,
            attribute_accesses=attribute_accesses,
            source=SourceReference(
                project_id=project_id,
                file_path=relative_path,
                module=module_name,
                symbol=qualified_name,
                line_start=node.lineno,
                line_end=node.end_lineno or node.lineno,
            ),
            line_start=node.lineno,
            line_end=node.end_lineno or node.lineno,
        )

    def _index_nested(
        self,
        body,
        project_id,
        relative_path,
        module_name,
        class_name,
        qualified_prefix,
        functions,
        module_function_ids,
    ):
        for stmt in body:
            if isinstance(stmt, (ast.FunctionDef, ast.AsyncFunctionDef)):
                nested_prefix = (
                    qualified_prefix + '.<locals>' if qualified_prefix else '<locals>'
                )
                func = self._index_function(
                    stmt,
                    project_id,
                    relative_path,
                    module_name,
                    class_name=None,
                    qualified_prefix=nested_prefix,
                )
                functions.append(func)
                module_function_ids.append(func.id)
                self._index_nested(
                    stmt.body,
                    project_id,
                    relative_path,
                    module_name,
                    None,
                    func.qualified_name,
                    functions,
                    module_function_ids,
                )
            elif isinstance(stmt, (ast.For, ast.While, ast.If, ast.With, ast.Try)):
                nested_body = list(getattr(stmt, 'body', []))
                nested_body += list(getattr(stmt, 'orelse', []))
                nested_body += list(getattr(stmt, 'finalbody', []))
                for handler in getattr(stmt, 'handlers', []):
                    nested_body += list(getattr(handler, 'body', []))
                self._index_nested(
                    nested_body,
                    project_id,
                    relative_path,
                    module_name,
                    class_name,
                    qualified_prefix,
                    functions,
                    module_function_ids,
                )

def _module_name(relative_path: str) -> str:
    path = Path(relative_path)
    parts = list(path.with_suffix("").parts)
    if parts and parts[-1] == "__init__":
        parts = parts[:-1]
    return ".".join(parts)


def _symbol_id(project_id: str, relative_path: str, qualified_name: str) -> str:
    return f"{project_id}:{relative_path}:{qualified_name}"


def _safe_unparse(node: ast.AST) -> str:
    try:
        return ast.unparse(node)
    except Exception:  # pragma: no cover - defensive
        return "<unparseable>"


def _extract_parameters(args: ast.arguments) -> list[IndexedParameter]:
    parameters: list[IndexedParameter] = []
    positional = list(args.args)
    defaults = list(args.defaults)
    default_offset = len(positional) - len(defaults)
    for index, arg in enumerate(positional):
        default = None
        default_index = index - default_offset
        if default_index >= 0 and default_index < len(defaults):
            default = _safe_unparse(defaults[default_index])
        parameters.append(
            IndexedParameter(
                name=arg.arg,
                annotation=_safe_unparse(arg.annotation) if arg.annotation else None,
                default=default,
                kind="positional",
            )
        )
    if args.vararg is not None:
        parameters.append(
            IndexedParameter(
                name=args.vararg.arg,
                annotation=(
                    _safe_unparse(args.vararg.annotation)
                    if args.vararg.annotation
                    else None
                ),
                default=None,
                kind="vararg",
            )
        )
    for index, arg in enumerate(args.kwonlyargs):
        default = None
        # 1. Ensure the index is safe within kw_defaults
        if index < len(args.kw_defaults):
            node = args.kw_defaults[index]
    
            # 2. Check that the node itself is not a literal Python None
            if node is not None:
                default = _safe_unparse(node)

        parameters.append(
            IndexedParameter(
                name=arg.arg,
                annotation=_safe_unparse(arg.annotation) if arg.annotation else None,
                default=default,
                kind="keyword_only",
            )
        )
    if args.kwarg is not None:
        parameters.append(
            IndexedParameter(
                name=args.kwarg.arg,
                annotation=(
                    _safe_unparse(args.kwarg.annotation)
                    if args.kwarg.annotation
                    else None
                ),
                default=None,
                kind="kwarg",
            )
        )
    return parameters


def _walk_without_nested_functions(node: ast.AST) -> Iterable[ast.AST]:
    for child in ast.iter_child_nodes(node):
        if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            continue
        yield child
        yield from _walk_without_nested_functions(child)


def _collect_calls(
    function_node: ast.FunctionDef | ast.AsyncFunctionDef, qualified_name: str
) -> list[IndexedCall]:
    calls: list[IndexedCall] = []
    for node in _walk_without_nested_functions(function_node):
        if isinstance(node, ast.Call):
            calls.append(
                IndexedCall(
                    callee=_safe_unparse(node.func),
                    line_start=node.lineno,
                    line_end=node.end_lineno or node.lineno,
                    containing_symbol=qualified_name,
                )
            )
    return calls


def _collect_attribute_accesses(
    function_node: ast.FunctionDef | ast.AsyncFunctionDef, qualified_name: str
) -> list[IndexedAttributeAccess]:
    accesses: list[IndexedAttributeAccess] = []
    seen: set[tuple[str, int]] = set()
    for node in _walk_without_nested_functions(function_node):
        if isinstance(node, ast.Attribute):
            key = (_safe_unparse(node), node.lineno)
            if key in seen:
                continue
            seen.add(key)
            accesses.append(
                IndexedAttributeAccess(
                    expression=_safe_unparse(node),
                    attribute=node.attr,
                    line_start=node.lineno,
                    line_end=node.end_lineno or node.lineno,
                )
            )
    return accesses
