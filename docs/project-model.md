# Forge Project Model Direction

Forge will represent real software components (not just diagrams) so that the
graph, the code, and AI-assisted changes stay consistent. This document
describes the initial direction. Task A implements only a minimal foundation;
the full model is built incrementally with the features that need it.

## Current foundation model

Task A defines a deliberately small TypeScript model in
`src/core/project-model/types.ts`:

- `ForgeProject`: project id, name, supported language (`python`), and model
  version.

This type exists because the current empty-project UI displays these fields
concretely. Nothing more is defined yet because nothing uses it.

## Future component model

A future component is expected to identify:

- A stable unique ID.
- A component type/category (e.g. function, schema, API, test).
- A human-readable name.
- Typed input / output ports.
- Configurable properties.
- Its implementation/source location (mapping to real code).
- Dependencies on other components.
- Version and validation state.

## Future graph model

A future graph will contain component instances and typed connections.

Connection kinds are intentionally distinct and not interchangeable:

- **data** — values flowing from a source port to a target port.
- **execution** — control flow ordering between components.
- **dependency** — a component depends on another component's definition or
  interface.

Each kind carries different validity rules and different meaning for code
generation and analysis, so they will be validated independently rather than
treated as generic edges.

## Design principles

- The model must correspond to actual project components and source code, not
  exist solely as a visual diagram.
- Introduce schema pieces only when a concrete feature consumes them; avoid a
  large, speculative final schema before the initial implementation
  requirements are known.
- Keep the frontend and backend representations aligned; define a single
  source of truth (starting from the backend) when analysis features arrive,
  rather than maintaining duplicate conflicting models.

## Task A boundaries

Not implemented in Task A:

- Graph engine behaviour (node creation, connections, serialization).
- Source-code parsing / mapping.
- Persistence schema.
- Code generation.
- AI proposal model contracts.

These are scoped to later, explicitly defined tasks.