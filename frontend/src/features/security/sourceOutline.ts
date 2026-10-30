export interface OutlineSymbol { name: string; line: number; kind: "data" | "function" | "endpoint"; note: string }
const NOTES: Record<string, string> = {
  ORDERS: "in-memory data",
  _authenticate_customer: "auth helper",
  vulnerable_get_order: "GET handler logic",
  secure_get_order: "reference",
  vulnerable_order_endpoint: "GET /api/demo/vulnerable/orders/{id}",
  corrected_order_endpoint: "GET /api/demo/corrected/orders/{id}",
};
export function buildOutline(source: string): OutlineSymbol[] {
  const out: OutlineSymbol[] = [];
  source.split("\n").forEach((line, idx) => {
    const def = /^def\s+([A-Za-z_][\w]*)/.exec(line);
    if (def) {
      const name = def[1];
      const isEndpoint = name.endsWith("_endpoint");
      out.push({ name, line: idx + 1, kind: isEndpoint ? "endpoint" : "function", note: NOTES[name] ?? "" });
      return;
    }
    if (/^ORDERS\b/.test(line)) out.push({ name: "ORDERS", line: idx + 1, kind: "data", note: NOTES.ORDERS });
  });
  return out;
}
