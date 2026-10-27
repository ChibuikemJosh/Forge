import { AppHeader } from '../components/layout/AppHeader'
import { NavigationSidebar } from '../components/layout/NavigationSidebar'
import { WorkspacePanel } from '../components/layout/WorkspacePanel'
import type { ForgeProject } from '../core/project-model/types'
import { EmptyProjectState } from '../features/project/components/EmptyProjectState'
import '../styles/app-shell.css'

const initialProject: ForgeProject = {
  id: 'forge-demo',
  name: 'Untitled Forge Project',
  language: 'python',
  version: '0.1.0',
  graph: {
    nodes: [],
    connections: [],
  },
}

function App() {
  return (
    <div className="app-shell">
      <AppHeader />
      <div className="app-body">
        <NavigationSidebar />
        <WorkspacePanel>
          <EmptyProjectState project={initialProject} />
        </WorkspacePanel>
      </div>
    </div>
  )
}

export default App
