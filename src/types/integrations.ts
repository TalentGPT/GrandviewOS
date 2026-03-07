// Integrations & Secrets Management Types

export type SecretType = 'api_key' | 'ssh_key' | 'oauth_token' | 'env_var' | 'certificate'

export interface SecretEntry {
  id: string
  name: string
  type: SecretType
  hint: string            // last 4 chars only
  created_at: string
  updated_at: string
  last_rotated: string
}

export type IntegrationStatus = 'connected' | 'disconnected' | 'needs_config'

export interface IntegrationEntry {
  id: string
  type: string
  name: string
  icon: string
  auth_method: string
  required_secrets: string[]
  configured_secrets: Record<string, string>  // secret_field → secret_id
  config: Record<string, string>
  status: IntegrationStatus
  last_used: string | null
  is_custom: boolean
}

export type McpAuthType = 'none' | 'bearer' | 'api_key'
export type McpStatus = 'online' | 'offline' | 'unknown'

export interface McpServer {
  id: string
  name: string
  url: string
  auth_type: McpAuthType
  credential_secret_id: string | null
  status: McpStatus
  tool_count: number
  connected_agents: string[]
}

export interface McpTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export type LlmProviderStatus = 'active' | 'inactive' | 'error'

export interface LlmModel {
  id: string
  name: string
  enabled: boolean
  is_default: boolean
}

export interface LlmProvider {
  id: string
  provider: string
  name: string
  api_key_secret_id: string | null
  base_url: string | null
  status: LlmProviderStatus
  models: LlmModel[]
}

export interface AgentPermissions {
  agent_id: string
  agent_name: string
  allowed_integrations: string[]
  allowed_tools: string[]
  allowed_models: string[]
  deny_tools: string[]
}
