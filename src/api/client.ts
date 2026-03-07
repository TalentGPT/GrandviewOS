import type { ApiSession, ApiAgent, SystemHealth, ApiConfig, SessionMessage, StandupResponse, CostBreakdown, DailyCostEntry } from '../types/api'

const API_BASE = '/api'
const TOKEN_KEY = 'grandviewos-jwt'
const LEGACY_KEY = 'grandviewos-api-key'

// ---- Auth helpers ----

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_KEY)
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(LEGACY_KEY)
}

// Legacy compat
export function getStoredApiKey(): string | null {
  return getStoredToken()
}

export function setStoredApiKey(key: string): void {
  setStoredToken(key)
}

export function clearStoredApiKey(): void {
  clearStoredToken()
}

export async function verifyApiKey(_key: string): Promise<boolean> {
  return true
}

export async function login(email: string, password: string): Promise<{ token: string; user: any; tenant: any } | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) return null
    const data = await res.json() as { token: string; user: any; tenant: any }
    setStoredToken(data.token)
    return data
  } catch {
    return null
  }
}

export async function register(tenantName: string, email: string, password: string, name?: string): Promise<{ token: string; user: any; tenant: any } | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantName, email, password, name }),
    })
    if (!res.ok) return null
    const data = await res.json() as { token: string; user: any; tenant: any }
    setStoredToken(data.token)
    return data
  } catch {
    return null
  }
}

// ---- Fetch wrapper with auth ----

interface FetchResult<T> {
  data: T | null
  error: string | null
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<FetchResult<T>> {
  try {
    const token = getStoredToken()
    const headers: Record<string, string> = {
      ...(options?.headers as Record<string, string> ?? {}),
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
      headers['X-Muddy-Key'] = token // legacy compat
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

    if (res.status === 401) {
      clearStoredToken()
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
  const token = getStoredToken()
  return `${API_BASE}/standups/${encodeURIComponent(id)}/audio${token ? `?key=${encodeURIComponent(token)}` : ''}`
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
  const token = getStoredToken()
  const url = `${API_BASE}/events${token ? `?key=${encodeURIComponent(token)}` : ''}`
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

// ---- Ideas ----

export async function fetchIdeas(): Promise<FetchResult<any[]>> {
  return apiFetch<any[]>('/ideas')
}

export async function createIdea(data: { title: string; description: string; tags?: string[]; status?: string; createdBy?: string }): Promise<FetchResult<any>> {
  return apiFetch<any>('/ideas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
}

export async function updateIdea(id: string, data: { title?: string; description?: string; tags?: string[]; status?: string }): Promise<FetchResult<any>> {
  return apiFetch<any>(`/ideas/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
}

export async function deleteIdea(id: string): Promise<FetchResult<{ ok: boolean }>> {
  return apiFetch<{ ok: boolean }>(`/ideas/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function voteIdea(id: string): Promise<FetchResult<any>> {
  return apiFetch<any>(`/ideas/${encodeURIComponent(id)}/vote`, { method: 'POST' })
}

// ---- Ideation Logs ----

export async function fetchIdeationLogs(params?: { source?: string; ideaId?: string }): Promise<FetchResult<any[]>> {
  const q = new URLSearchParams()
  if (params?.source) q.set('source', params.source)
  if (params?.ideaId) q.set('ideaId', params.ideaId)
  const qs = q.toString()
  return apiFetch<any[]>(`/ideation-logs${qs ? `?${qs}` : ''}`)
}

export async function createIdeationLog(data: { content: string; source?: string; ideaId?: string }): Promise<FetchResult<any>> {
  return apiFetch<any>('/ideation-logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
}

// ---- Weekly Reviews ----

export async function fetchWeeklyReviews(): Promise<FetchResult<any[]>> {
  return apiFetch<any[]>('/weekly-reviews')
}

export async function generateWeeklyReview(weekStart: string, weekEnd: string): Promise<FetchResult<any>> {
  return apiFetch<any>('/weekly-reviews/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ weekStart, weekEnd }) })
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

// ---- Memory ----

export async function fetchMemoryMain(): Promise<FetchResult<{ name: string; content: string }>> {
  return apiFetch<{ name: string; content: string }>('/memory/main')
}

export async function fetchMemoryFiles(): Promise<FetchResult<{ files: Array<{ name: string; size: number; modified: string }> }>> {
  return apiFetch<{ files: Array<{ name: string; size: number; modified: string }> }>('/memory/files')
}

export async function fetchMemoryFile(name: string): Promise<FetchResult<{ name: string; content: string }>> {
  return apiFetch<{ name: string; content: string }>(`/memory/files/${encodeURIComponent(name)}`)
}

// ---- Briefs ----

export interface Brief {
  date: string
  agentsActive: number
  sessionsRun: number
  tokensUsed: number
  cost: number
  events: string[]
}

export async function fetchBriefs(date?: string): Promise<FetchResult<Brief[]>> {
  const q = date ? `?date=${date}` : ''
  return apiFetch<Brief[]>(`/briefs${q}`)
}

// ---- Automations ----

export interface AutomationItem {
  id: string
  name: string
  enabled: boolean
  agent: string
  schedule: string
  timezone: string
  scheduleKind: string
  sessionTarget: string
  lastRun: string | null
  nextRun: string | null
  lastStatus: string | null
  lastError: string | null
  consecutiveErrors: number
  description: string
}

export async function fetchAutomations(): Promise<FetchResult<{ automations: AutomationItem[] }>> {
  return apiFetch<{ automations: AutomationItem[] }>('/openclaw/automations')
}

// ---- Projects (Trello) ----

export interface TrelloCard {
  id?: string
  title: string
  labels: string[]
  due?: string | null
}

export interface TrelloList {
  list: string
  listId?: string
  count: number
  cards: TrelloCard[]
}

export interface TrelloBoard {
  boardName: string
  lastSynced: string | null
  lists: TrelloList[]
}

export async function fetchProjects(): Promise<FetchResult<TrelloBoard>> {
  return apiFetch<TrelloBoard>('/openclaw/projects')
}

// Trello board management
export interface TrelloBoardInfo {
  id: string
  name: string
  url: string
  shortLink: string
}

export interface TrelloConfig {
  boardId: string | null
  boardUrl: string | null
  boardName: string | null
  lastSynced: string | null
}

export async function fetchTrelloBoards(): Promise<FetchResult<{ boards: TrelloBoardInfo[] }>> {
  return apiFetch<{ boards: TrelloBoardInfo[] }>('/openclaw/trello/boards')
}

export async function fetchTrelloConfig(): Promise<FetchResult<TrelloConfig>> {
  return apiFetch<TrelloConfig>('/openclaw/trello/config')
}

export async function connectTrelloBoard(boardUrl?: string, boardId?: string): Promise<FetchResult<{ ok: boolean; config: TrelloConfig; board: TrelloBoard }>> {
  return apiFetch<{ ok: boolean; config: TrelloConfig; board: TrelloBoard }>('/openclaw/trello/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ boardUrl, boardId }),
  })
}

export async function syncTrelloBoard(): Promise<FetchResult<{ ok: boolean; board: TrelloBoard }>> {
  return apiFetch<{ ok: boolean; board: TrelloBoard }>('/openclaw/trello/sync', { method: 'POST' })
}

// Trello CRUD
export async function createTrelloCard(listId: string, name: string, desc?: string): Promise<FetchResult<any>> {
  return apiFetch<any>('/openclaw/trello/cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listId, name, desc }) })
}

export async function updateTrelloCard(cardId: string, updates: { name?: string; desc?: string; due?: string; idList?: string }): Promise<FetchResult<any>> {
  return apiFetch<any>(`/openclaw/trello/cards/${encodeURIComponent(cardId)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
}

export async function moveTrelloCard(cardId: string, listId: string): Promise<FetchResult<any>> {
  return apiFetch<any>(`/openclaw/trello/cards/${encodeURIComponent(cardId)}/move`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listId }) })
}

export async function archiveTrelloCard(cardId: string): Promise<FetchResult<any>> {
  return apiFetch<any>(`/openclaw/trello/cards/${encodeURIComponent(cardId)}/archive`, { method: 'PUT' })
}

export async function deleteTrelloCard(cardId: string): Promise<FetchResult<any>> {
  return apiFetch<any>(`/openclaw/trello/cards/${encodeURIComponent(cardId)}`, { method: 'DELETE' })
}

export async function createTrelloList(boardId: string, name: string): Promise<FetchResult<any>> {
  return apiFetch<any>('/openclaw/trello/lists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ boardId, name }) })
}

export async function addTrelloComment(cardId: string, text: string): Promise<FetchResult<any>> {
  return apiFetch<any>(`/openclaw/trello/cards/${encodeURIComponent(cardId)}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
}

export async function getTrelloCardDetails(cardId: string): Promise<FetchResult<any>> {
  return apiFetch<any>(`/openclaw/trello/cards/${encodeURIComponent(cardId)}`)
}

export async function toggleTrelloCheckItem(cardId: string, checkItemId: string, state: 'complete' | 'incomplete'): Promise<FetchResult<any>> {
  return apiFetch<any>(`/openclaw/trello/cards/${encodeURIComponent(cardId)}/checkItem/${encodeURIComponent(checkItemId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  })
}

export async function getTrelloBoardLists(boardId: string): Promise<FetchResult<Array<{ id: string; name: string }>>> {
  return apiFetch<Array<{ id: string; name: string }>>(`/openclaw/trello/boards/${encodeURIComponent(boardId)}/lists`)
}

// ---- Agent Chat ----
export async function sendAgentMessage(slug: string, message: string): Promise<FetchResult<{ response: string; sessionId: string; agent: { name: string; emoji: string; role: string } }>> {
  return apiFetch(`/openclaw/agents/${encodeURIComponent(slug)}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
}

export async function fetchAgentHistory(slug: string): Promise<FetchResult<Array<{ role: string; content: string; timestamp: string }>>> {
  return apiFetch(`/openclaw/agents/${encodeURIComponent(slug)}/history`)
}

export async function fetchAgentSessions(): Promise<FetchResult<Array<{ slug: string; name: string; emoji: string; role: string; active: boolean; lastActivity: string | null; messageCount: number }>>> {
  return apiFetch('/openclaw/agents/sessions')
}

export async function clearAgentHistory(slug: string): Promise<FetchResult<{ ok: boolean }>> {
  return apiFetch(`/openclaw/agents/${encodeURIComponent(slug)}/history`, { method: 'DELETE' })
}

// ---- OpenClaw Connection ----

export async function connectOpenClaw(url: string, token: string): Promise<FetchResult<{ ok: boolean; health?: any }>> {
  return apiFetch('/openclaw/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, token }),
  })
}

export async function syncOpenClaw(): Promise<FetchResult<{ ok: boolean; synced?: number }>> {
  return apiFetch('/openclaw/sync', { method: 'POST' })
}

export async function fetchLiveSessions(): Promise<FetchResult<any[]>> {
  return apiFetch('/openclaw/sessions')
}

export async function fetchLiveCronJobs(): Promise<FetchResult<any[]>> {
  return apiFetch('/openclaw/cron-jobs')
}

// ---- Agent Chat ----

export async function sendAgentMessage(slug: string, message: string): Promise<FetchResult<{ response: string; sessionId: string }>> {
  return apiFetch<{ response: string; sessionId: string }>(`/agents/${encodeURIComponent(slug)}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
}

export async function fetchAgentHistory(slug: string): Promise<FetchResult<Array<{ role: string; content: string; timestamp: string }>>> {
  return apiFetch<Array<{ role: string; content: string; timestamp: string }>>(`/agents/${encodeURIComponent(slug)}/history`)
}

export async function fetchAgentSessions(): Promise<FetchResult<Array<{ slug: string; sessionId: string; active: boolean; lastActivity: string }>>> {
  return apiFetch<Array<{ slug: string; sessionId: string; active: boolean; lastActivity: string }>>('/agents/sessions')
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
