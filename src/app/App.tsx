import { AppHeader } from '../components/layout/AppHeader'
import { NavigationSidebar } from '../components/layout/NavigationSidebar'
import { WorkspacePanel } from '../components/layout/WorkspacePanel'
import type { ForgeProject } from '../core/project-model/types'
import { EmptyProjectState } from '../features/project/components/EmptyProjectState'
import { useBackendHealth } from '../hooks/useBackendHealth'
import '../styles/app-shell.css'

const initialProject: ForgeProject = {
  id: 'forge-workspace',
  name: 'Untitled Forge project',
  language: 'python',
  version: '0.1.0',
}

function App() {
  const backendStatus = useBackendHealth()

  return (
    <div className="app-shell">
      <AppHeader
        backendState={backendStatus.state}
        backendServiceName={backendStatus.serviceName}
        backendErrorMessage={backendStatus.errorMessage}
      />

      <div className="app-shell__body">
        <NavigationSidebar />
        <WorkspacePanel>
          <EmptyProjectState project={initialProject} />
        </WorkspacePanel>
      </div>
    </div>
  )
}

export default App
