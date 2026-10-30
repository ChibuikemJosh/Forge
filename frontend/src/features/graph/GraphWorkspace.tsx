import { useMemo, useState } from "react"
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { EXAMPLE_GRAPH } from "./exampleGraph"
import type { GraphPreviewResponse, ValidationResult } from "./types"
import { previewGraph, validateGraph } from "../../services/api/client"

const flowNodes: Node[] = [
  {
    id: "node_find_products",
    position: { x: 360, y: 180 },
    data: { label: "find_products\nFunction" },
    style: { background: "#2b1915", border: "1px solid #c2410c", color: "#f4f4f5", width: 180, padding: 14 },
  },
  {
    id: "node_search_products",
    position: { x: 40, y: 180 },
    data: { label: "search_products\nFunction" },
    style: { background: "#18181b", border: "1px solid #52525b", color: "#f4f4f5", width: 180, padding: 14 },
  },
]

const flowEdges: Edge[] = [
  {
    id: "edge_find_to_search",
    source: "node_find_products",
    target: "node_search_products",
    label: "calls",
    animated: true,
    style: { stroke: "#c2410c", strokeWidth: 2 },
    labelStyle: { fill: "#ff7a29", fontFamily: "JetBrains Mono, monospace", fontSize: 11 },
    labelBgStyle: { fill: "#131315" },
  },
]

export function GraphWorkspace() {
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [preview, setPreview] = useState<GraphPreviewResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const graphDescription = useMemo(
    () => "find_products calls search_products with matching query and limit parameters.",
    [],
  )

  async function handlePreview() {
    setLoading(true)
    setError(null)
    setPreview(null)
    try {
      const validationResult = await validateGraph(EXAMPLE_GRAPH)
      setValidation(validationResult)
      if (!validationResult.valid) return
      setPreview(await previewGraph(EXAMPLE_GRAPH))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The graph request failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="font-mono text-[11px] tracking-[0.18em] text-ember-bright">GRAPH WORKSPACE · DELIVERABLE 1</p>
          <h1 className="mt-3 font-display text-4xl font-light tracking-tight text-zinc-50">Graph to Python</h1>
          <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-zinc-300">
            Submit a small, real graph to FastAPI. The backend validates every node and edge before producing a
            deterministic Python preview.
          </p>
        </div>
        <button
          type="button"
          onClick={handlePreview}
          disabled={loading}
          className="rounded-sm bg-ember px-5 py-3 text-[15px] font-bold text-white hover:bg-ember-soft disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-white"
        >
          {loading ? "Validating..." : "Validate and preview Python"}
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="overflow-hidden rounded-md border border-line bg-panel" aria-label="Function graph">
          <div className="border-b border-line px-4 py-3">
            <p className="font-mono text-[11px] tracking-wide text-zinc-400">SUPPORTED GRAPH · CALLS EDGE</p>
            <p className="mt-2 text-[15px] text-zinc-200">{graphDescription}</p>
          </div>
          <div className="h-[360px]">
            <ReactFlow nodes={flowNodes} edges={flowEdges} fitView colorMode="dark" nodesConnectable={false} zoomOnScroll={false} proOptions={{ hideAttribution: false }}>
              <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#2e2e33" />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
        </section>

        <section className="rounded-md border border-line bg-panel" aria-live="polite">
          <div className="border-b border-line px-4 py-3">
            <p className="font-mono text-[11px] tracking-wide text-zinc-400">BACKEND RESULT</p>
          </div>
          <div className="space-y-5 p-4">
            {!validation && !error && (
              <p className="text-[15px] leading-relaxed text-zinc-400">
                Run the preview to see authoritative validation and generated Python.
              </p>
            )}
            {error && <p className="rounded-sm border border-red-900 bg-red-950/30 p-3 text-[14px] text-red-200">{error}</p>}
            {validation && (
              <div>
                <p className={validation.valid ? "text-emerald-300" : "text-red-300"}>
                  {validation.valid ? "Graph valid" : "Graph invalid"}
                </p>
                {validation.errors.length > 0 && (
                  <ul className="mt-2 space-y-2 text-[13px] text-red-200">
                    {validation.errors.map((item) => (
                      <li key={`${item.code}-${item.node_id ?? item.edge_id ?? "graph"}`}>
                        <span className="font-mono">{item.code}</span>: {item.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {preview && (
              <div>
                <p className="mb-2 text-[14px] text-emerald-300">Python syntax valid · preview only</p>
                <pre className="overflow-x-auto rounded-sm border border-line bg-coal p-4 font-mono text-[12px] leading-relaxed text-zinc-300">
                  <code>{preview.code}</code>
                </pre>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
