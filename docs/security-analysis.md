# Forge Guard Security Analysis Contract

## Supported rule

Rule ID:

```text
order-ownership-authorization
```

Invariant:

> The authenticated customer ID must be compared with the retrieved order
> owner before the order is returned.

Authentication alone is not authorization. A valid customer identity must not
grant access to every order.

## Controlled example

`backend/app/security_demo.py` contains two explicit states:

- `vulnerable_get_order`: authenticates the customer, retrieves an order, and
  returns it without comparing ownership.
- `secure_get_order`: authenticates the customer, retrieves the order, compares
  `order.owner_id`, and returns HTTP 403 for a non-owner.

The demo uses in-memory fixtures and an `x-customer-id` header. It is not a
production authentication implementation.

## Analysis pipeline

```text
controlled function source
  → inspect.getsource
  → ast.parse
  → deterministic evidence extraction
  → finding construction
  → semantic graph construction
  → controlled endpoint verification
```

The vulnerable graph contains:

```text
Request → Authenticate customer → Retrieve order → Return order
```

The exposure edge is marked with the finding ID. The corrected graph contains:

```text
Request → Authenticate customer → Retrieve order
         → Verify ownership → Return order
```

Observed nodes and edges carry source references. The analyzer does not
fabricate source locations or claim full-project coverage.

## API

### Analyze

```http
POST /api/security/analyze
POST /api/security/analyze?corrected=true
```

Optional `verify=false` skips the endpoint verification step and returns no
verification result. The default executes verification.

The response contains:

- `rule`: stable rule definition;
- `finding`: a high-severity finding for the vulnerable state, otherwise
  `null`;
- `graph`: evidence-derived semantic graph;
- `fix_proposal`: review-pending remediation explanation, otherwise `null`;
- `verification`: whether the actual controlled request behaved as expected;
- `status`: `completed` or `failed`; `error` carries the reason when failed.

Analysis is never reported as completed when the analyzer could not run. If
analysis raises, the endpoint returns `status=failed` with no finding, fix
proposal, or verification, and an `error` message.

### Verification semantics

`VerificationResult` always records the actual outcome:

- `executed=true` and `passed=true` only when the request ran and matched the
  expected status;
- `executed=true` and `passed=false` with `status=failed` when the behavior did
  not match (a real failed verification is reported as failed, never passed);
- `executed=false` with `status=failed` and a non-null `error` when verification
  itself could not run.

No verification result is ever fabricated as passed.

### Rule

```http
GET /api/security/rules/order-ownership
```

### Demo endpoints

```http
GET /api/demo/vulnerable/orders/{order_id}
GET /api/demo/corrected/orders/{order_id}
```

Both require `x-customer-id`. The vulnerable route intentionally returns an
order owned by another customer; the corrected route returns HTTP 403.

## Limitations

This is a deterministic controlled-example detector, not a general-purpose
static analyzer. It supports only the known function patterns in
`security_demo.py`, one ownership rule, and in-memory order fixtures.

The remediation is a structured review proposal, not an applied patch. No
Meta model output is treated as evidence, and no generated or proposed code is
executed.
