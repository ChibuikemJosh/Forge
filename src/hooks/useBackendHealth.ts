import { useEffect, useState } from 'react'
import { fetchBackendHealth, type HealthResponse } from '../services/api/client'

export type BackendConnectionState = 'loading' | 'connected' | 'error'

interface BackendHealthStatus {
  state: BackendConnectionState
  serviceName: string
  errorMessage: string | null
}

const initialStatus: BackendHealthStatus = {
  state: 'loading',
  serviceName: 'forge-api',
  errorMessage: null,
}

export function useBackendHealth(): BackendHealthStatus {
  const [status, setStatus] = useState<BackendHealthStatus>(initialStatus)

  useEffect(() => {
    const controller = new AbortController()

    fetchBackendHealth(controller.signal)
      .then((payload: HealthResponse) => {
        setStatus({
          state: payload.status === 'ok' ? 'connected' : 'error',
          serviceName: payload.service,
          errorMessage:
            payload.status === 'ok'
              ? null
              : `Unexpected status value: ${payload.status}`,
        })
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        const message = error instanceof Error ? error.message : 'Unknown error'
        setStatus({ state: 'error', serviceName: 'forge-api', errorMessage: message })
      })

    return () => controller.abort()
  }, [])

  return status
}
