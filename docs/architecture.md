# Forge Architecture Foundation

## Current Structure

- `src/app`: application entry composition and top-level shell orchestration.
- `src/components/layout`: reusable layout primitives for header, navigation, and workspace regions.
- `src/features/project`: project-facing UI states, currently the empty project workspace state.
- `src/core/project-model`: core domain model types for projects, nodes, ports, and connections.
- `src/styles`: shared styling for the shell and layout.

## Planned Modules (Not Yet Implemented)

- `src/features/graph`: graph editor interactions and visualization.
- `src/features/code-editor`: code editing panel integration.
- `src/features/ai`: AI proposal UX, review, and approval flow.
- `src/core/node-registry`: reusable built-in and user-defined component definitions.
- `src/core/validation`: interface and connection validation logic.
- `src/services`: infrastructure adapters once external services are introduced.
- `src/hooks` and `src/types`: shared hooks and UI-level type aliases as they become necessary.

## Architecture Direction

Forge starts as a modular monolith in a single React + TypeScript application. Core domain types are kept separate from feature UI components so that future graph logic and AI proposal workflows can evolve without coupling domain modeling to presentation.
