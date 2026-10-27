# Forge Project Model (Initial)

The initial model captures only foundation concepts required for the first application shell.

## Entities

- `ForgeProject`: project identity, language target, model version, and graph.
- `ProjectGraph`: node and connection collections.
- `ProjectNode`: reusable component unit with a category, interface ports, and optional implementation path.
- `NodePort`: typed input/output contract for nodes.
- `NodeConnection`: relationship between nodes with `data`, `execution`, or `dependency` semantics.

## Current Scope

- In-memory model only.
- No persistence or source synchronization yet.
- No graph validation engine yet.
- No runtime execution or code generation.

This intentionally provides a stable base for future graph editing and validation phases.
