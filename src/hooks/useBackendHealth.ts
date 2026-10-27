import { useEffect, useState } from 'react'
import { fetchBackendHealth, type HealthResponse } from '../services/api/client'

/** Connection states surfaced by the UI. */
export type BackendConnectionState = 'loading' | 'connected' | 'error'

export interface BackendHealthStatus {
  state: BackendConnectionState
  serviceName: string
  errorMessage: string | null
}

const initialStatus: BackendHealthStatus = {
  state: 'loading',
  serviceName: 'forge-api',
  errorMessage: null,
}

/**
 * Fetches the backend health endpoint once on mount, using an AbortSignal so
 * that unmounting (including React StrictMode's double-invoke in development)
 * does not leave stale state or pointless in-flight requests. No automatic
 * retries: the UI simply reports the real result.
 */
export function useBackendHealth(): BackendHealthStatus {
  const [status, setStatus] = useState<BackendHealthStatus>(initialStatus)

  useEffect(() => {
    const controller = new AbortController()

    fetchBackendHealth(controller.signal)
      .then((payload: HealthResponse) => {
        if (payload.status === 'ok') {
          setStatus({
            state: 'connected',
            serviceName: payload.service,
            errorMessage: null,
          })
        } else {
          setStatus({
            state: 'error',
            serviceName: payload.service,
            errorMessage: `Unexpected health status: "${payload.status}"`,
          })
        }
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
