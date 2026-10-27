# Forge Project Model Direction (Task A)

Forge will require a project model that maps visual components to real source-code artifacts. Task A keeps this model intentionally small while clarifying future direction.

## Current foundation model

The frontend currently defines a minimal model (`src/core/project-model/types.ts`) with:

- `ForgeProject`: project identity, language, model version, and graph.
- `ProjectGraph`: collections of nodes and connections.
- `ProjectNode`: component unit with category, interface ports, and optional implementation path.
- `NodePort`: typed input/output interface port.
- `NodeConnection`: relationship between nodes with explicit kind semantics.

Connection kinds are currently:

- `data`
- `execution`
- `dependency`

These are intentionally distinct to avoid treating all relationships as interchangeable.

## Future model direction

A future component representation is expected to include:

- Stable component ID.
- Component type/category.
- Human-readable name.
- Typed inputs/outputs.
- Configurable properties.
- Source location / implementation reference.
- Dependency references.
- Version and validation state.

A future graph model will include component instances and typed connections with validated semantics.

## Task A boundaries

Not implemented in Task A:

- Graph engine behavior.
- Source-code synchronization.
- Persistence schema.
- Code generation.
- AI proposal model contracts.

This keeps the foundation understandable while reserving room for incremental model evolution.
