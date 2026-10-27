import type { BackendConnectionState } from '../../hooks/useBackendHealth'

interface AppHeaderProps {
  backendState: BackendConnectionState
  backendServiceName: string
  backendErrorMessage: string | null
}

function statusLabel(state: BackendConnectionState): string {
  switch (state) {
    case 'connected':
      return 'Backend connected'
    case 'error':
      return 'Backend unreachable'
    default:
      return 'Checking backend'
  }
}

export function AppHeader({
  backendState,
  backendServiceName,
  backendErrorMessage,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__eyebrow">Forge</span>
        <h1 className="app-header__title">Developer workspace</h1>
      </div>

      <div className="backend-status" role="status" aria-live="polite">
        <span className={`backend-status__badge backend-status__badge--${backendState}`}>
          {statusLabel(backendState)}
        </span>
        <span className="backend-status__detail">
          {backendServiceName}
          {backendErrorMessage ? ` — ${backendErrorMessage}` : ''}
        </span>
      </div>
    </header>
  )
}
