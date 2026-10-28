/**
 * Minimal API client for the Forge FastAPI backend.
 *
 * The base URL is configurable through VITE_API_BASE_URL so the frontend can
 * target a locally running backend during development without hardcoding.
 */

export interface HealthResponse {
  status: string
  service: string
}

import type { Graph, GraphPreviewResponse, ValidationResult } from '../../features/graph/types'

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000'

function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined
  const trimmed = configured?.trim().replace(/\/+$/, '')
  return trimmed || DEFAULT_API_BASE_URL
}

const apiBaseUrl = resolveApiBaseUrl()

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${apiBaseUrl}${path}`

  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...init?.headers,
      },
    })
  } catch (error) {
    // Re-throw aborts unchanged so callers can detect them reliably; wrap
    // genuine network failures with a message that explains what was attempted.
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    throw new Error(`Request failed: could not reach the Forge backend at ${url}`, {
      cause: error,
    })
  }

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as T
}

export async function fetchBackendHealth(
  signal?: AbortSignal,
): Promise<HealthResponse> {
  return requestJson<HealthResponse>('/api/health', { signal })
}

export async function validateGraph(graph: Graph): Promise<ValidationResult> {
  return requestJson<ValidationResult>('/api/graph/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(graph),
  })
}

export async function previewGraph(graph: Graph): Promise<GraphPreviewResponse> {
  return requestJson<GraphPreviewResponse>('/api/graph/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(graph),
  })
}
