import type { SecretEntry, IntegrationEntry, McpServer, McpTool, LlmProvider, AgentPermissions } from '../types/integrations'

const API_BASE = '/api'
const AUTH_KEY_STORAGE = 'grandviewos-api-key'

function getKey(): string | null {
  return localStorage.getItem(AUTH_KEY_STORAGE)
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const key = getKey()
  const headers: Record<string, string> = { ...(options?.headers as Record<string, string> ?? {}) }
  if (key) headers['X-Muddy-Key'] = key
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

function jsonBody(data: unknown): RequestInit {
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }
}

// Secrets
export const fetchSecrets = () => apiFetch<SecretEntry[]>('/secrets')
export const createSecret = (data: { name: string; type: string; value: string }) =>
  apiFetch<SecretEntry>('/secrets', { method: 'POST', ...jsonBody(data) })
export const updateSecret = (id: string, data: { name?: string; type?: string; value?: string }) =>
  apiFetch<{ ok: boolean }>(`/secrets/${id}`, { method: 'PATCH', ...jsonBody(data) })
export const deleteSecret = (id: string) =>
  apiFetch<{ ok: boolean }>(`/secrets/${id}`, { method: 'DELETE' })

// Integrations
export const fetchIntegrations = () => apiFetch<IntegrationEntry[]>('/integrations')
export const createIntegration = (data: Partial<IntegrationEntry>) =>
  apiFetch<IntegrationEntry>('/integrations', { method: 'POST', ...jsonBody(data) })
export const updateIntegration = (id: string, data: Partial<IntegrationEntry>) =>
  apiFetch<IntegrationEntry>(`/integrations/${id}`, { method: 'PATCH', ...jsonBody(data) })
export const deleteIntegration = (id: string) =>
  apiFetch<{ ok: boolean }>(`/integrations/${id}`, { method: 'DELETE' })
export const testIntegration = (id: string) =>
  apiFetch<{ ok: boolean; status: string; message?: string }>(`/integrations/${id}/test`, { method: 'POST' })

// MCP Servers
export const fetchMcpServers = () => apiFetch<McpServer[]>('/mcp-servers')
export const createMcpServer = (data: Partial<McpServer>) =>
  apiFetch<McpServer>('/mcp-servers', { method: 'POST', ...jsonBody(data) })
export const deleteMcpServer = (id: string) =>
  apiFetch<{ ok: boolean }>(`/mcp-servers/${id}`, { method: 'DELETE' })
export const fetchMcpTools = (id: string) =>
  apiFetch<McpTool[]>(`/mcp-servers/${id}/tools`)

// LLM Providers
export const fetchLlmProviders = () => apiFetch<LlmProvider[]>('/llm-providers')
export const createLlmProvider = (data: Partial<LlmProvider>) =>
  apiFetch<LlmProvider>('/llm-providers', { method: 'POST', ...jsonBody(data) })
export const updateLlmProvider = (id: string, data: Partial<LlmProvider>) =>
  apiFetch<LlmProvider>(`/llm-providers/${id}`, { method: 'PATCH', ...jsonBody(data) })

// Agent Permissions
export const fetchAgentPermissions = () => apiFetch<AgentPermissions[]>('/agent-permissions')
export const updateAgentPermissions = (agentId: string, data: Partial<AgentPermissions>) =>
  apiFetch<AgentPermissions>(`/agent-permissions/${agentId}`, { method: 'PATCH', ...jsonBody(data) })
