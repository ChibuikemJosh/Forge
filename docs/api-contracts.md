# Forge Guard API Contracts

This document specifies the backend HTTP contracts consumed by Kenny's React
graph visualiser and Ram's orchestration layer. It is the source of truth for
integration. Endpoints are marked **Implemented** (served by the running
backend and covered by tests) or **Proposed** (contract only; not yet served).

Base URL (local development): `http://127.0.0.1:8000`

All request/response bodies are JSON. The backend never writes files, never
executes generated code, and never applies a fix without a human review
decision (the apply flow is not implemented in this MVP).

---

## Security analysis

### POST /api/security/analyze — Implemented

Analyse the controlled vulnerable or corrected demo state. Returns the stable
rule, the evidence-backed finding (vulnerable state only), the semantic graph,
a review-only fix proposal, and an executed verification result.

**Request**

| Parameter | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `corrected` | boolean | no | `false` | Analyse `secure_get_order` (corrected) vs `vulnerable_get_order`. |
| `verify` | boolean | no | `true` | Execute the controlled endpoint verification and attach `verification`. Set `false` to skip. |

No request body.

**Response (200)** — `SecurityAnalysisResponse`

```json
{
  "analysis_id": "analysis-order-ownership-vulnerable",
  "project_id": "controlled-fastapi-order-demo",
  "status": "completed",
  "outcome": "confirmed",
  "rule": {
    "rule_id": "order-ownership-authorization",
    "title": "Authenticated customers may access only their own orders",
    "invariant": "The authenticated customer ID must be compared with the retrieved order owner before the order is returned."
  },
  "finding": {
    "finding_id": "finding-order-ownership-001",
    "rule_id": "order-ownership-authorization",
    "severity": "high",
    "title": "Order ownership authorization is missing",
    "description": "The endpoint authenticates a customer and retrieves an order but returns it without checking the order owner.",
    "affected_route": "/api/demo/vulnerable/orders/{order_id}",
    "source": {
      "file_path": "backend/app/security_demo.py",
      "symbol": "vulnerable_get_order",
      "line_start": 31,
      "line_end": 37
    },
    "evidence": {
      "authenticated_customer": true,
      "retrieves_order": true,
      "checks_order_ownership": false,
      "ownership_expression": null,
      "source": { "file_path": "backend/app/security_demo.py", "symbol": "vulnerable_get_order" }
    },
    "impact": "One authenticated customer can read another customer's order.",
    "suggested_remediation": "Compare the authenticated customer ID with order.owner_id and return HTTP 403 when they differ.",
    "analysis_status": "completed",
    "verification_status": "passed"
  },
  "graph": {
    "nodes": [
      { "id": "request", "type": "request", "label": "Order request", "source": null, "finding_ids": [] },
      { "id": "authenticate", "type": "authentication", "label": "Authenticate customer", "source": { "file_path": "backend/app/security_demo.py", "symbol": "vulnerable_get_order" }, "finding_ids": [] },
      { "id": "retrieve", "type": "order_retrieval", "label": "Retrieve order", "source": { "file_path": "backend/app/security_demo.py", "symbol": "vulnerable_get_order" }, "finding_ids": [] },
      { "id": "response", "type": "response", "label": "Return order", "source": { "file_path": "backend/app/security_demo.py", "symbol": "vulnerable_get_order" }, "finding_ids": ["finding-order-ownership-001"] }
    ],
    "edges": [
      { "id": "request-authenticate", "source": "request", "target": "authenticate", "relationship": "authenticates", "observed": true, "finding_ids": [] },
      { "id": "authenticate-retrieve", "source": "authenticate", "target": "retrieve", "relationship": "retrieves", "observed": true, "finding_ids": [] },
      { "id": "retrieve-response", "source": "retrieve", "target": "response", "relationship": "exposes", "observed": true, "finding_ids": ["finding-order-ownership-001"] }
    ]
  },
  "fix_proposal": {
    "proposal_id": "proposal-order-ownership-001",
    "finding_id": "finding-order-ownership-001",
    "file_path": "backend/app/security_demo.py",
    "unified_diff": null,
    "explanation": "Add an ownership comparison after order retrieval and reject a non-owner with HTTP 403.",
    "review_status": "pending",
    "application_status": "not_applied"
  },
  "verification": {
    "verification_id": "verification-finding-order-ownership-001",
    "finding_id": "finding-order-ownership-001",
    "tested": "Authenticated customer cannot retrieve another customer's order.",
    "executed": true,
    "passed": true,
    "status": "passed",
    "summary": "Expected HTTP 200; received HTTP 200.",
    "error": null
  },
  "error": null
}
```

For the corrected state `finding` and `fix_proposal` are `null`, the graph
contains an `authorization` node and an `authorizes` edge, and
`verification.passed` is `true` (expects HTTP 403).

`outcome` is the machine-readable security conclusion: `confirmed` for an
evidence-backed vulnerability, `satisfied` when the rule is met,
`inconclusive` when evidence or verification is insufficient, and `failed`
when analysis could not run. `status` remains the operation status and is
`completed` for the first three outcomes.

### Fix proposal lifecycle

`POST /api/security/analyze` registers the deterministic controlled proposal
when a confirmed finding is returned. The proposal remains pending until a
human decision is recorded:

```http
GET  /api/security/proposals/{proposal_id}
POST /api/security/proposals/{proposal_id}/review
POST /api/security/proposals/{proposal_id}/apply
POST /api/security/proposals/{proposal_id}/rollback
```

Review input requires `decision`, `reviewer`, and `actor`. Only `actor=human`
can approve or reject a pending proposal. Applying requires approval, the
exact controlled file path, an unchanged source hash, and an unambiguous
deterministic patch boundary. The apply response reports `application_status`
and `verification_status` separately. A failed verification is never reported
as passed, and rollback is available when an application changed the file.

**Error responses**

- `200` with `"status": "failed"` and `"error"` populated when analysis could not
  run (the backend never fabricates a finding or reports success on failure).
- `422` for invalid query parameters.

**Consumer notes:** Kenny renders `graph` for the vulnerable path; Ram reads
`finding`, `fix_proposal`, and `verification` to drive the review loop.

### GET /api/security/rules/order-ownership — Implemented

Returns the stable rule definition independent of any finding.

**Response (200)** — `SecurityRule`

```json
{
  "rule_id": "order-ownership-authorization",
  "title": "Authenticated customers may access only their own orders",
  "invariant": "The authenticated customer ID must be compared with the retrieved order owner before the order is returned."
}
```

**Error responses**

- `404` for any other rule identifier (only one rule exists in this MVP).

**Consumer notes:** Ram and Kenny can display the rule title/invariant next to
findings and graph nodes.

### Demo endpoints (controlled example) — Implemented

These serve the two reproducible states so analysis, verification, and
graph/data can be demonstrated end to end.

```http
GET /api/demo/vulnerable/orders/{order_id}
GET /api/demo/corrected/orders/{order_id}
```

Required header: `x-customer-id`.

| State | Header | `order-alice` (owner) | `order-bob` (not owner) | No header |
|---|---|---|---|---|
| vulnerable | `customer-alice` | 200, owner Alice | 200, owner Bob ← flaw | 401 |
| corrected | `customer-alice` | 200, owner Alice | 403 | 401 |

**Error responses:** `401` missing authentication, `404` unknown order,
`403` corrected-state non-owner.


## Human review and fix application — Proposed (not implemented)

These contracts are defined so Ram's orchestration layer has a stable target.
None are served by the current backend.

### POST /api/security/review-decision — Proposed

Record a human review decision on a fix proposal.

**Request** — `ReviewDecisionRecord` (minus `decision_id`/`decided_at`, which
the server assigns):

```json
{
  "proposal_id": "proposal-order-ownership-001",
  "decision": "approved",
  "reviewer": "ram",
  "reason": "Ownership check matches the suggested remediation."
}
```

**Response (200)** — the stored `ReviewDecisionRecord` with `decision_id` and
`decided_at` populated.

**Error responses:** `404` unknown proposal; `409` proposal already decided;
`422` invalid decision value.

**Status transitions:** `FixProposal.review_status` moves `pending → approved |
rejected`. A rejected proposal must not be applied.

### POST /api/security/apply-fix — Proposed

Apply an approved correction within a controlled scope.

**Request:**

```json
{
  "proposal_id": "proposal-order-ownership-001"
}
```

**Response (200):**

```json
{
  "proposal_id": "proposal-order-ownership-001",
  "application_status": "applied",
  "file_path": "backend/app/security_demo.py",
  "applied_diff": "...",
  "rollback_available": true,
  "verification": { ... }
}
```

**Preconditions:** `review_status == approved`; `application_status != applied`.
**Error responses:** `403` not approved; `409` already applied; `422` invalid
scope; `500` apply failure with `application_status: failed`.


### GET /api/health — Implemented

```json
{ "status": "ok", "service": "forge-api" }
```

---

## Graph (existing, preserved) — Implemented

### POST /api/graph/validate

Validates a Function-node graph without generating code. See
`docs/project-model.md`. Response: `ValidationResult { valid, errors[] }`.

### POST /api/graph/preview

Validates and generates deterministic Python. Response:
`GraphPreviewResponse { valid, syntax_valid, code }`; `422` on invalid graph.

**Consumer notes:** This is the pre-existing graph-to-Python contract, kept
separate from Forge Guard's security graph (`SecurityGraph` in
`schemas/security.py`). Kenny's visualiser consumes `SecurityGraph` from
`/api/security/analyze`, not the Function `Graph` schema.

---

## Schemas (backend source of truth)

Defined in `backend/app/schemas/security.py`:

| Model | Responsibility |
|---|---|
| `SecurityRule` | Stable rule definition (id, title, invariant) — independent of any finding. |
| `AnalysisEvidence` | Observed facts: authenticated_customer, retrieves_order, checks_order_ownership, ownership_expression, source. |
| `SecurityFinding` | Potential/confirmed violation: id, rule_id, severity, title, description, affected_route, source, evidence, impact, suggested_remediation, analysis_status, verification_status. |
| `SecurityGraphNode` / `SecurityGraphEdge` / `SecurityGraph` | Semantic graph derived from source evidence; stable ids, types, labels, source refs, `observed` flag, `finding_ids`. |
| `FixProposal` | Review-only remediation: id, finding_id, file_path, unified_diff, explanation, review_status, application_status. |
| `VerificationResult` | Actual verification outcome: tested, executed, passed, status, summary, error. |
| `SecurityAnalysisResponse` | Aggregate analyze response incl. `status` and `error`. |
| `ReviewDecision` / `ReviewDecisionRecord` | Human review decision (approved/rejected) appended to a proposal. |

Defined in `backend/app/schemas/graph.py` (existing, preserved):

| Model | Responsibility |
|---|---|
| `Graph` / `GraphNode` / `GraphEdge` | Function-node graph for validation and Python preview. |
| `ValidationResult` / `GraphPreviewResponse` | Graph validation and code preview output. |

## Status values

- `AnalysisStatus`: `completed`, `failed`
- `VerificationStatus`: `not_run`, `passed`, `failed`
- `ReviewStatus` (on `FixProposal`): `not_proposed`, `pending`, `approved`, `rejected`
- `ApplicationStatus` (on `FixProposal`): `not_applied`, `applied`, `failed`
- `ReviewDecision`: `approved`, `rejected`
- `Severity`: `high`, `info`

## Integration boundaries (who owns what)

| Concern | Owner | Contract |
|---|---|---|
| Backend schemas, analysis, graph, verification | This backend | `schemas/security.py`, `/api/security/*` |
| Agent orchestration / review loop | Ram | Consumes `SecurityAnalysisResponse`, `FixProposal`; drives `review-decision` / `apply-fix` (proposed) |
| Meta model tool | Bisal | Receives a `SecurityFinding`; returns structured explanation/fix proposal — not duplicated here |
| React graph visualiser | Kenny | Renders `SecurityGraph` from `/api/security/analyze`; backend returns data, Kenny renders |

No Meta model client, autonomous code modification, approval workflow,
database, Redis, or production authentication infrastructure is implemented.


## SourceGraph

See `docs/source-graph.md` for the SourceGraph endpoint and frontend contract.
