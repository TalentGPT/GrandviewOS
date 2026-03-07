import type { ApiSession, ApiAgent, SystemHealth, ApiConfig, SessionMessage, StandupResponse, CostBreakdown, DailyCostEntry } from '../types/api'

const API_BASE = '/api'
const AUTH_KEY_STORAGE = 'grandviewos-api-key'

// ---- Auth helpers ----

export function getStoredApiKey(): string | null {
  return localStorage.getItem(AUTH_KEY_STORAGE)
}

export function setStoredApiKey(key: string): void {
  localStorage.setItem(AUTH_KEY_STORAGE, key)
}

export function clearStoredApiKey(): void {
  localStorage.removeItem(AUTH_KEY_STORAGE)
}

export async function verifyApiKey(key: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/verify`, {
      method: 'POST',
      headers: { 'X-Muddy-Key': key },
    })
    return res.ok
  } catch {
    return false
  }
}

// ---- Fetch wrapper with auth ----

interface FetchResult<T> {
  data: T | null
  error: string | null
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<FetchResult<T>> {
  try {
    const key = getStoredApiKey()
    const headers: Record<string, string> = {
      ...(options?.headers as Record<string, string> ?? {}),
    }
    if (key) {
      headers['X-Muddy-Key'] = key
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

    if (res.status === 401) {
      clearStoredApiKey()
      window.location.reload()
      return { data: null, error: 'Unauthorized' }
    }

    if (!res.ok) {
      return { data: null, error: `HTTP ${res.status}` }
    }
    const data = (await res.json()) as T
    return { data, error: null }
  } catch (err) {
    return { data: null, error: String(err) }
  }
}

export async function fetchSessions(limit = 50, offset = 0): Promise<FetchResult<{ sessions: ApiSession[]; total: number }>> {
  return apiFetch<{ sessions: ApiSession[]; total: number }>(`/sessions?limit=${limit}&offset=${offset}`)
}

export async function fetchSessionTranscript(id: string): Promise<FetchResult<ApiSession & { messages: SessionMessage[] }>> {
  return apiFetch<ApiSession & { messages: SessionMessage[] }>(`/sessions/${encodeURIComponent(id)}/transcript`)
}

export async function killSession(id: string): Promise<FetchResult<{ ok: boolean }>> {
  return apiFetch<{ ok: boolean }>(`/sessions/${encodeURIComponent(id)}/kill`, { method: 'POST' })
}

export async function fetchAgents(): Promise<FetchResult<ApiAgent[]>> {
  return apiFetch<ApiAgent[]>('/agents')
}

export async function fetchSystemHealth(): Promise<FetchResult<SystemHealth>> {
  return apiFetch<SystemHealth>('/system/health')
}

export async function fetchConfig(): Promise<FetchResult<ApiConfig>> {
  return apiFetch<ApiConfig>('/config')
}

export async function fetchWorkspaceFile(agentId: string, fileName: string): Promise<FetchResult<{ content: string }>> {
  return apiFetch<{ content: string }>(`/workspace/${encodeURIComponent(agentId)}/${encodeURIComponent(fileName)}`)
}

export async function saveWorkspaceFile(agentId: string, fileName: string, content: string): Promise<FetchResult<{ ok: boolean }>> {
  return apiFetch<{ ok: boolean }>(`/workspace/${encodeURIComponent(agentId)}/${encodeURIComponent(fileName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
}

export async function fetchAgentFiles(agentId: string): Promise<FetchResult<Array<{ name: string; size: number }>>> {
  return apiFetch<Array<{ name: string; size: number }>>(`/agents/${encodeURIComponent(agentId)}/files`)
}

// Standups
export async function triggerStandup(): Promise<FetchResult<{ id: string; status: string }>> {
  return apiFetch<{ id: string; status: string }>('/standups', { method: 'POST' })
}

export async function fetchStandups(): Promise<FetchResult<StandupResponse[]>> {
  return apiFetch<StandupResponse[]>('/standups')
}

export async function fetchStandup(id: string): Promise<FetchResult<StandupResponse>> {
  return apiFetch<StandupResponse>(`/standups/${encodeURIComponent(id)}`)
}

export function getStandupAudioUrl(id: string): string {
  const key = getStoredApiKey()
  return `${API_BASE}/standups/${encodeURIComponent(id)}/audio${key ? `?key=${encodeURIComponent(key)}` : ''}`
}

// Docs
export async function fetchGeneratedDocs(): Promise<FetchResult<Record<string, string>>> {
  return apiFetch<Record<string, string>>('/docs')
}

export async function regenerateDocs(): Promise<FetchResult<Record<string, string>>> {
  return apiFetch<Record<string, string>>('/docs/generate', { method: 'POST' })
}

// Cost
export async function fetchCostBreakdown(): Promise<FetchResult<CostBreakdown>> {
  return apiFetch<CostBreakdown>('/cost/breakdown')
}

export async function fetchCostHistory(days: number = 7): Promise<FetchResult<DailyCostEntry[]>> {
  return apiFetch<DailyCostEntry[]>(`/cost/history?days=${days}`)
}

// SSE
export function createEventSource(onMessage: (data: Record<string, unknown>) => void, onError?: () => void): EventSource {
  const key = getStoredApiKey()
  const url = `${API_BASE}/events${key ? `?key=${encodeURIComponent(key)}` : ''}`
  const es = new EventSource(url)
  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data as string) as Record<string, unknown>
      onMessage(data)
    } catch { /* ignore parse errors */ }
  }
  es.onerror = () => {
    if (onError) onError()
  }
  return es
}

// Model pricing per million tokens
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4-6': { input: 15, output: 75 },
  'claude-opus-4-5': { input: 15, output: 75 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-sonnet-4': { input: 3, output: 15 },
  'claude-haiku-3-5': { input: 0.25, output: 1.25 },
}

export function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  return `$${cost.toFixed(2)}`
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
  return String(tokens)
}

export function getModelColor(model: string): string {
  if (model.includes('opus')) return 'var(--model-opus)'
  if (model.includes('sonnet')) return 'var(--model-sonnet)'
  if (model.includes('haiku')) return 'var(--model-haiku)'
  if (model.includes('gemini') && model.includes('flash')) return 'var(--model-gemini-flash)'
  if (model.includes('gemini')) return 'var(--model-gemini-pro)'
  if (model.includes('codex')) return 'var(--model-codex)'
  return 'var(--text-secondary)'
}

export function getModelShortName(model: string): string {
  if (model.includes('opus-4-6')) return 'Opus 4.6'
  if (model.includes('opus-4-5')) return 'Opus 4.5'
  if (model.includes('sonnet-4-6')) return 'Sonnet 4.6'
  if (model.includes('sonnet-4')) return 'Sonnet 4'
  if (model.includes('haiku')) return 'Haiku'
  return model.split('/').pop()?.split('-').slice(0, 2).join(' ') ?? model
}
