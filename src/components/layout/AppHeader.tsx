import type { BackendConnectionState } from '../../hooks/useBackendHealth'

interface AppHeaderProps {
  backendState: BackendConnectionState
  backendServiceName: string
  backendErrorMessage: string | null
}

function getStatusLabel(state: BackendConnectionState): string {
  if (state === 'connected') {
    return 'Backend connected'
  }

  if (state === 'error') {
    return 'Backend unavailable'
  }

  return 'Checking backend'
}

export function AppHeader({
  backendState,
  backendServiceName,
  backendErrorMessage,
}: AppHeaderProps) {
  const statusLabel = getStatusLabel(backendState)

  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">Forge</p>
        <h1>Developer workspace</h1>
      </div>
      <div className="status-stack" role="status" aria-live="polite">
        <p className={`status status-${backendState}`}>{statusLabel}</p>
        <p className="status-meta">
          {backendServiceName}
          {backendErrorMessage ? ` — ${backendErrorMessage}` : ''}
        </p>
      </div>
    </header>
  )
}
