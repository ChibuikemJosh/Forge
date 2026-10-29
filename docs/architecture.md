# Forge Guard Architecture

## Boundaries

Forge Guard remains a modular monolith:

```text
frontend/   React presentation and graph visualisation
backend/    FastAPI contracts, controlled example, analysis, verification
docs/       Shared architecture and workflow documentation
```

The backend is authoritative for analysis status, findings, graph evidence,
fix-proposal status, and verification results. The frontend renders returned
data and must not infer that a missing UI node proves a source vulnerability.

## Backend modules

- `backend/app/main.py` configures FastAPI and mounts routers.
- `backend/app/security_demo.py` contains the isolated vulnerable/corrected
  order endpoint and in-memory fixtures.
- `backend/app/schemas/security.py` defines shared findings, evidence, graph,
  proposal, and verification objects.
- `backend/app/services/security_analysis.py` performs deterministic AST
  analysis of the controlled example and builds semantic graph data.
- `backend/app/services/security_verification.py` executes the controlled
  endpoint checks and records actual outcomes.
- `backend/app/api/routers/security.py` exposes the minimum analysis contract.

The earlier Function graph contract and `/api/graph/*` endpoints remain
available for the existing graph-to-Python demonstration.

## Source-of-truth decision

Forge Guard uses a controlled code-first approach for this MVP. The detector
inspects the actual source of the controlled FastAPI functions using Python's
standard `ast` module. It checks for:

1. authentication through `_authenticate_customer`;
2. order retrieval through the in-memory order collection;
3. an ownership comparison involving `order.owner_id` and the authenticated
   customer before return.

The graph is derived from those observed source facts. It is not treated as
proof independently of source analysis.

## Agents and tools

Agents make bounded decisions and coordinate workflows. Tools expose explicit
capabilities. This backend provides analysis and verification tool contracts;
it does not implement Ram's orchestrator or Bisal's Meta model client.

The backend returns a review-only `FixProposal`. Applying a proposal requires a
future human-review and controlled patch boundary; no file is modified by the
current endpoints.

## Deferred work

- General FastAPI/Python project analysis
- Additional vulnerability categories
- Meta model integration
- Agent orchestration
- Human approval and patch application
- Persistence and project loading
- Production authentication
- Full graph visualiser integration
