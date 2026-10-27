export type NodeCategory =
  | 'function'
  | 'algorithm'
  | 'api'
  | 'database'
  | 'cache'
  | 'schema'
  | 'ui'
  | 'test'
  | 'custom'

export interface NodePort {
  id: string
  name: string
  dataType: string
  required: boolean
}

export interface ProjectNode {
  id: string
  name: string
  category: NodeCategory
  description?: string
  inputs: NodePort[]
  outputs: NodePort[]
  implementationPath?: string
}

export type ConnectionKind = 'data' | 'execution' | 'dependency'

export interface NodeConnection {
  id: string
  kind: ConnectionKind
  sourceNodeId: string
  sourcePortId?: string
  targetNodeId: string
  targetPortId?: string
}

export interface ProjectGraph {
  nodes: ProjectNode[]
  connections: NodeConnection[]
}

export interface ForgeProject {
  id: string
  name: string
  language: 'python'
  version: string
  graph: ProjectGraph
}
