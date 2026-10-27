# Forge

Forge is an early-stage developer environment that combines source-code editing with a visual, node-based representation of software architecture.

## Current Foundation

This repository currently includes:

- A React + TypeScript + Vite application shell.
- A developer-tool style layout (header, module sidebar, workspace).
- An empty-project state describing upcoming phases.
- Initial project/graph TypeScript interfaces for future features.
- Architecture documentation under `/docs`.

## Prerequisites

- Node.js 20+
- npm 10+

## Installation

```bash
npm install
```

## Development Commands

```bash
npm run dev      # Start local development server
npm run build    # Type-check and create production build
npm run lint     # Run Oxlint
npm run preview  # Preview production build locally
```

## Current Status

Implemented in this phase:

- Foundation shell and modular frontend structure.
- Initial domain model interfaces for project and graph concepts.
- Documentation for architecture and project model direction.

Not implemented yet:

- Visual graph editor interactions.
- Code editor integration.
- AI proposal workflow and approval controls.
- Validation engine and source synchronization.
