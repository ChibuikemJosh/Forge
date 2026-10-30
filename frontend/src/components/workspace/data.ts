/* Mock data for the Workspace graph page. No backend calls — this shape
   mirrors docs/project-model.md (layers → files → typed edges) so a real
   analyser can replace it without changing component props. */

export type Complexity = "simple" | "moderate" | "complex";
export type Severity = "critical" | "warning" | "info";

export interface LayerMeta {
  id: string;
  name: string;
  desc: string;
  complexity: Complexity;
  fileCount: number;
  accent: string; // token class suffix, e.g. "layer-api" → text-layer-api
}

export interface FileMeta {
  id: string;
  layerId: string;
  name: string;
  path: string;
  desc: string;
  complexity: Complexity;
  imports: string[]; // file ids
}

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  fileId: string;
  line: number;
  detail: string;
  remediation: string;
  diff: { removed: string; added: string };
}

export interface TestResult {
  id: string;
  name: string;
  file: string;
  status: "passed" | "failed" | "skipped";
  duration: string;
}

export const PROJECT = {
  name: "orders-api",
  branch: "main",
  language: "Python 3.12",
  framework: "FastAPI · pytest",
  root: "orders-api",
} as const;

export const LAYERS: LayerMeta[] = [
  { id: "api", name: "API & Routers", desc: "FastAPI routers, request handling, auth dependencies, route wiring.", complexity: "moderate", fileCount: 12, accent: "sky" },
  { id: "schemas", name: "Schemas & Models", desc: "Pydantic request/response schemas and shared domain types.", complexity: "simple", fileCount: 9, accent: "violet" },
  { id: "services", name: "Domain Services", desc: "Orders, payments and inventory business logic. No HTTP here.", complexity: "complex", fileCount: 18, accent: "rose" },
  { id: "data", name: "Data & Repositories", desc: "SQLAlchemy models, repositories, migrations and sessions.", complexity: "moderate", fileCount: 14, accent: "amber" },
  { id: "core", name: "Core & Config", desc: "Settings, security, logging, exceptions and app factory.", complexity: "moderate", fileCount: 8, accent: "emerald" },
  { id: "tests", name: "Tests & Fixtures", desc: "pytest suites, factories and integration fixtures.", complexity: "simple", fileCount: 21, accent: "zinc" },
];

/** Overview dependency edges: source layer depends-on / calls target. */
export const LAYER_EDGES: { source: string; target: string; count: number; kind: string }[] = [
  { source: "api", target: "schemas", count: 27, kind: "dependency" },
  { source: "api", target: "services", count: 34, kind: "execution" },
  { source: "api", target: "core", count: 19, kind: "dependency" },
  { source: "services", target: "data", count: 42, kind: "data" },
  { source: "services", target: "schemas", count: 23, kind: "data" },
  { source: "services", target: "core", count: 16, kind: "dependency" },
  { source: "data", target: "core", count: 11, kind: "dependency" },
  { source: "tests", target: "api", count: 31, kind: "dependency" },
  { source: "tests", target: "services", count: 38, kind: "dependency" },
  { source: "tests", target: "data", count: 17, kind: "dependency" },
];

const f = (id: string, layerId: string, name: string, path: string, desc: string, complexity: Complexity, imports: string[] = []): FileMeta =>
  ({ id, layerId, name, path, desc, complexity, imports });

export const FILES: FileMeta[] = [
  // api
  f("api-main", "api", "main.py", "app/main.py", "App factory wiring: mounts routers, middleware, exception handlers.", "moderate", ["api-orders", "api-users", "core-config"]),
  f("api-orders", "api", "orders.py", "app/api/orders.py", "Order CRUD + checkout endpoints. Thin — delegates to OrderService.", "complex", ["svc-orders", "sch-orders", "core-deps"]),
  f("api-users", "api", "users.py", "app/api/users.py", "Registration, profile and API-key endpoints.", "moderate", ["svc-users", "sch-users", "core-deps"]),
  f("api-payments", "api", "payments.py", "app/api/payments.py", "Payment intent + webhook endpoints (Stripe callbacks).", "complex", ["svc-payments", "sch-payments"]),
  f("api-deps-router", "api", "router.py", "app/api/router.py", "Aggregates all routers under /api/v1.", "simple", ["api-orders", "api-users", "api-payments"]),
  // schemas
  f("sch-orders", "schemas", "order.py", "app/schemas/order.py", "OrderCreate / OrderOut / OrderLine schemas with validators.", "moderate", ["sch-common"]),
  f("sch-users", "schemas", "user.py", "app/schemas/user.py", "UserIn / UserOut, password-strength validator.", "simple", ["sch-common"]),
  f("sch-payments", "schemas", "payment.py", "app/schemas/payment.py", "PaymentIntent and webhook payload schemas.", "moderate", ["sch-common"]),
  f("sch-common", "schemas", "common.py", "app/schemas/common.py", "BaseModel config, pagination params, error envelope.", "simple", []),
  // services
  f("svc-orders", "services", "order_service.py", "app/services/order_service.py", "Order lifecycle: create, price, confirm, cancel. Transaction boundary.", "complex", ["data-order-repo", "svc-pricing", "sch-orders"]),
  f("svc-payments", "services", "payment_service.py", "app/services/payment_service.py", "Charges, refunds and idempotent webhook handling.", "complex", ["data-payment-repo", "core-config"]),
  f("svc-users", "services", "user_service.py", "app/services/user_service.py", "Accounts, hashing, API-key issue/revoke.", "moderate", ["data-user-repo", "core-security"]),
  f("svc-pricing", "services", "pricing.py", "app/services/pricing.py", "Line pricing, discounts and tax rounding rules.", "moderate", ["sch-orders"]),
  f("svc-inventory", "services", "inventory.py", "app/services/inventory.py", "Stock reservation with optimistic locking.", "complex", ["data-order-repo", "svc-orders"]),
  // data
  f("data-order-repo", "data", "order_repo.py", "app/db/order_repo.py", "Order queries and persistence. Eager-loads lines.", "moderate", ["data-models", "data-session"]),
  f("data-payment-repo", "data", "payment_repo.py", "app/db/payment_repo.py", "Payment records keyed by provider event id.", "moderate", ["data-models", "data-session"]),
  f("data-user-repo", "data", "user_repo.py", "app/db/user_repo.py", "User lookups by email / api-key hash.", "simple", ["data-models", "data-session"]),
  f("data-models", "data", "models.py", "app/db/models.py", "SQLAlchemy models: Order, OrderLine, User, Payment.", "complex", []),
  f("data-session", "data", "session.py", "app/db/session.py", "Engine, session factory and get_db dependency.", "simple", ["core-config"]),
  // core
  f("core-config", "core", "config.py", "app/core/config.py", "pydantic-settings: env, database URL, provider keys.", "moderate", []),
  f("core-security", "core", "security.py", "app/core/security.py", "Password hashing (argon2), token helpers.", "moderate", ["core-config"]),
  f("core-deps", "core", "deps.py", "app/core/deps.py", "Shared FastAPI dependencies: db session, current user, roles.", "moderate", ["core-security", "data-session"]),
  f("core-errors", "core", "errors.py", "app/core/errors.py", "Domain exceptions mapped to HTTP responses.", "simple", []),
  // tests
  f("test-orders", "tests", "test_orders_api.py", "tests/test_orders_api.py", "End-to-end order flow via TestClient + test db.", "moderate", ["api-orders", "svc-orders"]),
  f("test-payments", "tests", "test_payments.py", "tests/test_payments.py", "Webhook idempotency and refund paths.", "moderate", ["svc-payments"]),
  f("test-pricing", "tests", "test_pricing.py", "tests/test_pricing.py", "Pricing rules incl. rounding edge cases.", "simple", ["svc-pricing"]),
  f("test-conftest", "tests", "conftest.py", "tests/conftest.py", "Fixtures: test engine, client, auth headers, factories.", "moderate", ["data-session", "core-config"]),
];

export const FILE_BY_ID: Record<string, FileMeta> = Object.fromEntries(FILES.map((x) => [x.id, x]));
export const LAYER_BY_ID: Record<string, LayerMeta> = Object.fromEntries(LAYERS.map((x) => [x.id, x]));
export const filesInLayer = (layerId: string) => FILES.filter((x) => x.layerId === layerId);

export const FINDINGS: Finding[] = [
  { id: "F-104", severity: "critical", title: "Webhook has no signature check", fileId: "api-payments", line: 88, detail: "POST /webhooks/stripe trusts the payload. Anyone can forge a paid event and mark orders paid.", remediation: "Verify the Stripe signature before parsing, reject with 400 on failure.", diff: { removed: "payload = await request.json()", added: "event = stripe.Webhook.construct_event(raw, sig, settings.stripe_secret)" } },
  { id: "F-098", severity: "critical", title: "N+1 query on order list", fileId: "data-order-repo", line: 41, detail: "list_orders() lazy-loads lines per order — 1 + N queries on the busiest endpoint.", remediation: "Eager-load lines with selectinload(Order.lines).", diff: { removed: "orders = session.scalars(stmt).all()", added: "stmt = stmt.options(selectinload(Order.lines))" } },
  { id: "F-087", severity: "warning", title: "Deprecated datetime.utcnow()", fileId: "svc-orders", line: 132, detail: "utcnow() is deprecated in 3.12 and produces naive datetimes mixed with aware ones.", remediation: "Use datetime.now(timezone.utc) everywhere in the service.", diff: { removed: "created = datetime.utcnow()", added: "created = datetime.now(timezone.utc)" } },
  { id: "F-076", severity: "warning", title: "No test covers refund path", fileId: "test-payments", line: 1, detail: "payment_service.refund() has 0 coverage. The charge path is covered; refunds are not.", remediation: "Add a refund test reusing the webhook fixture.", diff: { removed: "# (no refund test)", added: "def test_refund_is_idempotent(client, paid_order): ..." } },
  { id: "F-061", severity: "info", title: "pricing.py mixes tax + discount rules", fileId: "svc-pricing", line: 12, detail: "Two responsibilities in one 240-line module. Splitting makes both easier to test.", remediation: "Extract tax.py; keep pricing.py as the composition point.", diff: { removed: "def total(lines, region): ...  # tax + discount", added: "from app.services.tax import tax_for  # extracted" } },
];

export const TEST_RESULTS: TestResult[] = [
  { id: "t1", name: "test_create_order_happy_path", file: "tests/test_orders_api.py", status: "passed", duration: "0.42s" },
  { id: "t2", name: "test_checkout_requires_auth", file: "tests/test_orders_api.py", status: "passed", duration: "0.18s" },
  { id: "t3", name: "test_webhook_marks_order_paid", file: "tests/test_payments.py", status: "failed", duration: "0.31s" },
  { id: "t4", name: "test_webhook_replay_is_idempotent", file: "tests/test_payments.py", status: "passed", duration: "0.27s" },
  { id: "t5", name: "test_pricing_rounds_half_up", file: "tests/test_pricing.py", status: "passed", duration: "0.04s" },
  { id: "t6", name: "test_discount_never_negative_total", file: "tests/test_pricing.py", status: "passed", duration: "0.05s" },
  { id: "t7", name: "test_list_orders_eager_loads_lines", file: "tests/test_orders_api.py", status: "skipped", duration: "—" },
];

export const TERMINAL_LINES = [
  "$ pytest -q",
  "....F.s.                                                                 [100%]",
  "FAILED tests/test_payments.py::test_webhook_marks_order_paid — assert 400 == 200",
  "1 failed, 5 passed, 1 skipped in 1.27s",
  "$ python -m app.main  ·  uvicorn running on http://127.0.0.1:8000",
] as const;

/** Explorer tree: folders mirror the Python package layout. */
export interface TreeNode { name: string; path: string; fileId?: string; kind: "folder" | "py" | "config" | "md" | "test"; children?: TreeNode[] }
const py = (name: string, path: string, fileId: string): TreeNode => ({ name, path, fileId, kind: "py" });
export const FILE_TREE: TreeNode[] = [
  { name: "app", path: "app", kind: "folder", children: [
    { name: "api", path: "app/api", kind: "folder", children: [py("main.py", "app/main.py", "api-main"), py("orders.py", "app/api/orders.py", "api-orders"), py("users.py", "app/api/users.py", "api-users"), py("payments.py", "app/api/payments.py", "api-payments"), py("router.py", "app/api/router.py", "api-deps-router")] },
    { name: "schemas", path: "app/schemas", kind: "folder", children: [py("order.py", "app/schemas/order.py", "sch-orders"), py("user.py", "app/schemas/user.py", "sch-users"), py("payment.py", "app/schemas/payment.py", "sch-payments"), py("common.py", "app/schemas/common.py", "sch-common")] },
    { name: "services", path: "app/services", kind: "folder", children: [py("order_service.py", "app/services/order_service.py", "svc-orders"), py("payment_service.py", "app/services/payment_service.py", "svc-payments"), py("user_service.py", "app/services/user_service.py", "svc-users"), py("pricing.py", "app/services/pricing.py", "svc-pricing"), py("inventory.py", "app/services/inventory.py", "svc-inventory")] },
    { name: "db", path: "app/db", kind: "folder", children: [py("models.py", "app/db/models.py", "data-models"), py("order_repo.py", "app/db/order_repo.py", "data-order-repo"), py("payment_repo.py", "app/db/payment_repo.py", "data-payment-repo"), py("user_repo.py", "app/db/user_repo.py", "data-user-repo"), py("session.py", "app/db/session.py", "data-session")] },
    { name: "core", path: "app/core", kind: "folder", children: [py("config.py", "app/core/config.py", "core-config"), py("security.py", "app/core/security.py", "core-security"), py("deps.py", "app/core/deps.py", "core-deps"), py("errors.py", "app/core/errors.py", "core-errors")] },
  ]},
  { name: "tests", path: "tests", kind: "folder", children: [py("conftest.py", "tests/conftest.py", "test-conftest"), py("test_orders_api.py", "tests/test_orders_api.py", "test-orders"), py("test_payments.py", "tests/test_payments.py", "test-payments"), py("test_pricing.py", "tests/test_pricing.py", "test-pricing")] },
  { name: "pyproject.toml", path: "pyproject.toml", kind: "config" },
  { name: "requirements.txt", path: "requirements.txt", kind: "config" },
  { name: "README.md", path: "README.md", kind: "md" },
];
