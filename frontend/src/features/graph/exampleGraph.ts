import type { Graph } from "./types"

export const EXAMPLE_GRAPH: Graph = {
  nodes: [
    {
      id: "node_find_products",
      type: "function",
      name: "find_products",
      config: {
        parameters: [
          { name: "query", type: "str" },
          { name: "limit", type: "int", default: 10 },
        ],
        return_type: "list",
      },
      inputs: [],
      outputs: [],
    },
    {
      id: "node_search_products",
      type: "function",
      name: "search_products",
      config: {
        parameters: [
          { name: "query", type: "str" },
          { name: "limit", type: "int", default: 10 },
        ],
        return_type: "list",
      },
      inputs: [],
      outputs: [],
    },
  ],
  edges: [
    {
      id: "edge_find_to_search",
      source: "node_find_products",
      target: "node_search_products",
      type: "calls",
    },
  ],
}
