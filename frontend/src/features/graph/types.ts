export interface FunctionParameter {
  name: string
  type: string
  default?: string | number | boolean | null
}

export interface FunctionPort {
  name: string
  type: string
}

export interface FunctionConfiguration {
  parameters: FunctionParameter[]
  return_type: string
}

export interface GraphNode {
  id: string
  type: string
  name: string
  config: FunctionConfiguration
  inputs: FunctionPort[]
  outputs: FunctionPort[]
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  type: string
}

export interface Graph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface ValidationErrorItem {
  code: string
  message: string
  node_id?: string | null
  edge_id?: string | null
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationErrorItem[]
}

export interface GraphPreviewResponse {
  valid: boolean
  syntax_valid: boolean
  code: string
}
