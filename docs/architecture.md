# Forge Architecture

## Repository boundaries

Forge is a modular monolith with two independently run application parts:

```text
frontend/   React + TypeScript + Vite UI
backend/    FastAPI API and graph services
docs/       Architecture and model documentation
```

The frontend owns presentation, local workspace state, and API calls. The
backend owns the authoritative graph contract, validation, dependency
resolution, Python generation, and syntax validation. The frontend never
generates authoritative Python or duplicates the backend validation rules.

## Backend modules

- `backend/app/main.py` creates the FastAPI application, configures local CORS,
  and mounts routers.
- `backend/app/api/health.py` owns `GET /api/health`.
- `backend/app/api/routers/graph.py` owns graph HTTP endpoints only.
- `backend/app/schemas/graph.py` defines typed request and response models.
- `backend/app/services/graph_validation.py` validates graph identity,
  interfaces, supported relationships, and dependency structure.
- `backend/app/services/code_generation.py` turns a valid graph into stable
  Python and validates its syntax without executing it.

There is no database, cache, project persistence, or model provider in this
deliverable.

## Graph as source of truth

For supported graphs, Function node configuration is the source of truth for
function names, parameters, defaults, and return types. A `calls` edge points
from caller to callee. The generator must reject the entire graph if any
unsupported or inconsistent relationship is present; it never silently drops
edges.

## Preview-before-write

`POST /api/graph/preview` validates and generates code in memory. It does not
write project files. This keeps the developer in control and leaves room for a
future change manager to produce a reviewable diff before any approved write.

## Deferred controlled AI workflow

Future AI work should gather bounded graph and source context, request
structured operations, validate the proposal, produce a draft and diff, require
explicit approval, then apply and test approved changes. No agent sessions,
Meta Model API, automatic modification, or approval endpoint is implemented
yet.

## Future endpoints

The following are planned, not placeholders:

- `GET /api/projects/{project_id}/graph`
- `POST /api/agent/sessions`
- `POST /api/agent/sessions/{session_id}/messages`
- `GET /api/changes/{change_id}/diff`
- `POST /api/changes/{change_id}/apply`
- `POST /api/changes/{change_id}/validate`

## Frontend experiences

The landing page at `/` is preserved as the product introduction and includes
a non-editable React Flow project preview. The `/workspace` route is a separate,
small demonstration of the graph-to-Python API contract. React Flow is already
used by the project; Monaco and an editable graph authoring experience remain
future work.
