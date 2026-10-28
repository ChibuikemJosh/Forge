# Forge

Forge is an early-stage developer environment that pairs source-code work with
a visual representation of real software components. Deliverable 1 provides a
small, working graph-to-Python workflow for two connected Function nodes.

## Current implementation

- React + TypeScript + Vite landing page preserved at `/`.
- Separate graph workspace at `/workspace`.
- FastAPI backend with health, graph validation, and Python preview endpoints.
- Pydantic graph contract with Function nodes and `calls` edges.
- Deterministic Python generation with standard-library syntax validation.
- Backend tests for graph invariants, generation, API behavior, and health.

The graph preview does not write files. AI integration, source synchronization,
approval workflows, persistence, databases, Redis, and Monaco are intentionally
deferred.

## Repository layout

```text
frontend/   React, TypeScript, Vite application
backend/    FastAPI application, graph services, and pytest tests
docs/       Architecture, project model, and graph-to-code documentation
```

## Prerequisites

- Node.js 20.19+ (or 22.12+)
- npm 10+
- Python 3.11+

## Run the frontend

From `frontend/`:

```powershell
npm install
npm run dev
```

The development server runs at `http://localhost:5173`. The frontend uses
`VITE_API_BASE_URL` when set and otherwise calls
`http://127.0.0.1:8000`. Copy `frontend/.env.example` to `frontend/.env.local`
to override it.

Useful checks:

```powershell
npm run lint
npm run build
npm run preview
```

## Run the backend

From `backend/`, create and activate a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Start FastAPI:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Run backend tests from `backend/`:

```powershell
pytest
```

## Graph-to-Python workflow

The workspace submits a graph containing `find_products` and
`search_products`. The `calls` edge points from caller to callee:

```text
find_products ──calls──> search_products
```

The backend validates the complete graph, resolves a stable dependency order,
generates both functions, and checks the result with `ast.parse()` before
returning a preview. The unimplemented leaf function raises
`NotImplementedError`; Forge does not invent an algorithm.

See [docs/graph-to-code.md](docs/graph-to-code.md) for the contract and
supported patterns.

## Limitations and planned work

The initial generator supports only Function nodes, Python-compatible simple
type names, acyclic graphs, and at most one `calls` edge per caller. Caller and
callee parameters must match by name and type. Other relationship types,
editable graph construction, project persistence, source mapping, AI proposals,
change approval, and code editing are future work.

See [docs/architecture.md](docs/architecture.md) and
[docs/project-model.md](docs/project-model.md) for the architectural direction.
