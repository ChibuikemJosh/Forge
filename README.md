# Forge Guard

Forge Guard is an early-stage graph based security analysis tool for
AI-assisted Python backend development. Its MVP detects one business-logic
authorization problem: an authenticated customer retrieving another
customer's order.

## Current implementation

- Preserved React + TypeScript + Vite landing page at `/`.
- Existing graph-to-Python workspace at `/workspace`.
- Controlled FastAPI vulnerable and corrected order example.
- Deterministic AST-based ownership analysis for that controlled example.
- Structured security findings, evidence, semantic graph data, fix proposals,
  and verification results.
- FastAPI endpoints for analysis and the stable order-ownership rule.
- Backend tests covering vulnerable and corrected behavior.

The analysis is deliberately narrow. It is not a general Python security
scanner and does not claim coverage of arbitrary FastAPI projects.

## Repository layout

```text
frontend/   React, TypeScript, Vite application and visualiser
backend/    FastAPI application, security models, services, and tests
docs/       Architecture, project model, graph-to-code, and security docs
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

The landing page runs at `http://localhost:5173`. The frontend uses
`VITE_API_BASE_URL` when set and otherwise calls
`http://127.0.0.1:8000`. Copy `frontend/.env.example` to
`frontend/.env.local` to override it.

```powershell
npm run lint
npm run build
```

## Run the backend

From `backend/`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Run tests:

```powershell
pytest
```

## Forge Guard demo

The controlled demo uses in-memory orders and an `x-customer-id` header as
minimal authentication input. It has two reproducible states:

```text
GET /api/demo/vulnerable/orders/order-bob
GET /api/demo/corrected/orders/order-bob
```

With `x-customer-id: customer-alice`, the vulnerable route returns Bob's order
while the corrected route returns HTTP 403. No real customer data or
production authentication infrastructure is involved.

Analyze the vulnerable state:

```powershell
curl -X POST http://127.0.0.1:8000/api/security/analyze
```

Analyze the corrected state:

```powershell
curl -X POST "http://127.0.0.1:8000/api/security/analyze?corrected=true"
```

The response contains the stable rule, evidence-backed finding (when present),
semantic graph, review-only remediation proposal, and an executed verification
result. The proposal is not applied automatically.

See [docs/security-analysis.md](docs/security-analysis.md) for the contract and
limitations.

## Existing graph-to-Python workflow

The `/workspace` route still demonstrates the original deterministic graph
workflow for two Function nodes. It is preserved separately from Forge Guard's
security graph and is documented in [docs/graph-to-code.md](docs/graph-to-code.md).

## Agent and tool boundaries

- Ram owns orchestration and the future agentic review loop.
- Bisal owns the reusable Meta model tool.
- Kenny owns the React graph visualiser and workspace UI.
- This backend owns the controlled example, security schemas, deterministic
  analysis, graph construction, and verification contracts.

No Meta model client, autonomous code modification, approval workflow,
database, Redis, or production authentication infrastructure is implemented.
