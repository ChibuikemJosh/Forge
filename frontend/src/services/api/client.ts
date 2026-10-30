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
import type { DemoOrderResult, FixApplicationResponse, FixProposal, ReviewDecisionRequest, ReviewDecisionRecord, SecurityAnalysisResponse } from '../../features/security/types'

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
    let detail = ""
    try { const b = (await response.json()) as { detail?: string }; if (b?.detail) detail = `: ${b.detail}` } catch { /* non-JSON */ }
    throw new Error(`Request failed: ${response.status} ${response.statusText}${detail}`)
  }

  return (await response.json()) as T
}

export function apiUrl(path: string): string { return `${apiBaseUrl}${path}` }

export async function analyzeSecurity(opts?: { corrected?: boolean; verify?: boolean; signal?: AbortSignal }): Promise<SecurityAnalysisResponse> {
  const q = new URLSearchParams()
  if (opts?.corrected) q.set("corrected", "true")
  if (opts?.verify === false) q.set("verify", "false")
  const qs = q.toString()
  return requestJson<SecurityAnalysisResponse>(`/api/security/analyze${qs ? `?${qs}` : ""}`, { method: "POST", signal: opts?.signal })
}
export async function getProposal(id: string, signal?: AbortSignal): Promise<FixProposal> {
  return requestJson<FixProposal>(`/api/security/proposals/${encodeURIComponent(id)}`, { signal })
}
export async function reviewProposal(id: string, body: ReviewDecisionRequest, signal?: AbortSignal): Promise<ReviewDecisionRecord> {
  return requestJson<ReviewDecisionRecord>(`/api/security/proposals/${encodeURIComponent(id)}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal })
}
export async function applyProposal(id: string, signal?: AbortSignal): Promise<FixApplicationResponse> {
  return requestJson<FixApplicationResponse>(`/api/security/proposals/${encodeURIComponent(id)}/apply`, { method: "POST", signal })
}
export async function rollbackProposal(id: string, signal?: AbortSignal): Promise<FixApplicationResponse> {
  return requestJson<FixApplicationResponse>(`/api/security/proposals/${encodeURIComponent(id)}/rollback`, { method: "POST", signal })
}
/** Must not throw on 4xx — 403 is a meaningful result. */
export async function tryDemoOrder(state: "vulnerable" | "corrected", orderId: string, customerId: string, signal?: AbortSignal): Promise<DemoOrderResult> {
  const started = performance.now()
  const url = `${apiBaseUrl}/api/demo/${state}/orders/${encodeURIComponent(orderId)}`
  let response: Response
  try {
    response = await fetch(url, { headers: { Accept: "application/json", "x-customer-id": customerId }, signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw new Error(`Request failed: could not reach the Forge backend at ${url}`, { cause: error })
  }
  let body: unknown = null
  try { body = await response.json() } catch { body = null }
  return { status: response.status, body, durationMs: Math.round(performance.now() - started) }
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
