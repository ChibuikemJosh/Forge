# Forge Project Model

## Graph contract

A graph contains `nodes` and `edges`.

Each node has:

- `id`: stable unique identifier.
- `type`: currently `function`.
- `name`: Python function name.
- `config.parameters`: ordered parameter declarations with name, type, and
  optional simple default.
- `config.return_type`: supported return type name.
- `inputs` and `outputs`: optional explicit ports. When supplied, inputs must
  match parameters and the single output must match the return type.

Each edge has:

- `id`: stable unique identifier.
- `source`: caller/source node ID.
- `target`: callee/target node ID.
- `type`: relationship meaning.

## Initial relationship semantics

`calls` is the first fully supported relationship. Its direction is explicit:

```text
find_products ──calls──> search_products
```

This means `find_products` invokes `search_products`. The generated call uses
the caller's declared parameter names, and the caller/callee parameter lists
must match by name and type.

`passes_input` and `returns_output` are reserved relationship values. They are
rejected by Deliverable 1 rather than treated as aliases for `calls`.

## Validation rules

The backend rejects:

- duplicate node IDs or edge IDs;
- missing edge node references;
- unsupported node or relationship types;
- invalid or duplicate Python names;
- unsupported type names;
- inconsistent explicit ports;
- incompatible caller/callee parameters;
- self-calls;
- multiple calls edges from one caller;
- dependency cycles.

Validation returns structured error codes and relevant node or edge IDs. Code
generation cannot run successfully for an invalid graph.

## Evolution

The model deliberately supports only the feature that currently consumes it.
Future node types, data-flow and execution semantics, source locations,
versions, persistence, and project retrieval can be added as separate
contracts rather than weakening the meaning of the initial `calls` edge.
