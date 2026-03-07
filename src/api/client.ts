import type { ApiSession, ApiAgent, SystemHealth, ApiConfig, SessionMessage } from '../types/api'

const API_BASE = '/api'

interface FetchResult<T> {
  data: T | null
  error: string | null
}

async function apiFetch<T>(path: string): Promise<FetchResult<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`)
    if (!res.ok) {
      return { data: null, error: `HTTP ${res.status}` }
    }
    const data = (await res.json()) as T
    return { data, error: null }
  } catch (err) {
    return { data: null, error: String(err) }
  }
}

export async function fetchSessions(): Promise<FetchResult<ApiSession[]>> {
  return apiFetch<ApiSession[]>('/sessions')
}

export async function fetchSessionTranscript(id: string): Promise<FetchResult<ApiSession & { messages: SessionMessage[] }>> {
  return apiFetch<ApiSession & { messages: SessionMessage[] }>(`/sessions/${id}/transcript`)
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
  return apiFetch<{ content: string }>(`/workspace/${agentId}/${fileName}`)
}

export async function fetchAgentFiles(agentId: string): Promise<FetchResult<Array<{ name: string; size: number }>>> {
  return apiFetch<Array<{ name: string; size: number }>>(`/agents/${agentId}/files`)
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
