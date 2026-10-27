import type { ReactNode } from 'react'

interface WorkspacePanelProps {
  children: ReactNode
}

export function WorkspacePanel({ children }: WorkspacePanelProps) {
  return <main className="workspace">{children}</main>
}
