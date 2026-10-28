export const NAV_LINKS = [
  { label: "Capabilities", href: "#capabilities" },
  { label: "Workflow", href: "#workflow" },
  { label: "Model", href: "#model" },
  { label: "Stack", href: "#stack" },
] as const;

export type ForgeNodeId = "api" | "schema" | "service" | "test";

export interface ForgeNodeMeta {
  id: ForgeNodeId;
  name: string;
  kind: string;
  file: string;
  detail: string;
  position: { x: number; y: number };
}

export const FORGE_NODES: readonly ForgeNodeMeta[] = [
  { id: "api", name: "GET /api/health", kind: "API", file: "app/api/health.py", detail: "FastAPI route. Returns status + service name.", position: { x: 24, y: 36 } },
  { id: "schema", name: "HealthResponse", kind: "Schema", file: "app/schemas.py", detail: "Typed response shape shared by API and client.", position: { x: 336, y: 24 } },
  { id: "service", name: "forge-api", kind: "Service", file: "app/main.py", detail: "Application entry. Mounts routers, sets CORS.", position: { x: 168, y: 196 } },
  { id: "test", name: "test_health", kind: "Test", file: "tests/test_health.py", detail: "Asserts GET /api/health returns 200 · ok.", position: { x: 408, y: 208 } },
];

export const FORGE_NODE_BY_ID: Record<ForgeNodeId, ForgeNodeMeta> = Object.fromEntries(
  FORGE_NODES.map((node) => [node.id, node]),
) as Record<ForgeNodeId, ForgeNodeMeta>;

export const CAPABILITIES = [
  { n: "01", title: "Visual graph, real components", body: "Nodes are not drawings. Every block maps to a function, schema, API or test in your repo — with typed ports and a source location.", tag: "Graph editor" },
  { n: "02", title: "Code and graph stay in sync", body: "Edit the code, the graph updates. Move a node, the source follows. One project model, viewed two ways — never two copies drifting apart.", tag: "Source mapping" },
  { n: "03", title: "AI proposes. You approve.", body: "AI changes arrive as reviewable proposals against the graph — what it touches, what it connects, what breaks — before anything is written.", tag: "AI proposals" },
  { n: "04", title: "Typed connections, checked", body: "Data, execution and dependency edges carry different rules and are validated independently. Invalid wiring fails before it runs.", tag: "Validation" },
] as const;

export const CONNECTIONS = [
  { kind: "data", meaning: "Values flowing from a source port to a target port", example: "HealthResponse → client.ts" },
  { kind: "execution", meaning: "Control-flow ordering between components", example: "main.py → mounts router" },
  { kind: "dependency", meaning: "A component depends on another's definition", example: "test_health → GET /api/health" },
] as const;

export const STACK = [
  { layer: "Frontend", items: "React 19 · TypeScript · Vite · Tailwind CSS 4 · React Router · React Flow · Motion" },
  { layer: "Backend", items: "FastAPI · Python 3.11+ · Uvicorn · pytest" },
  { layer: "Contract", items: "GET /api/health · VITE_API_BASE_URL · CORS for local Vite origins" },
  { layer: "Model", items: "ForgeProject · python · typed data / execution / dependency edges" },
] as const;
