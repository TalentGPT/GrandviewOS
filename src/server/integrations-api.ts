/**
 * Integrations & Secrets Management — Backend API handlers
 * Data stored in ~/.grandviewos/ as JSON files
 * Secrets encrypted with AES-256-GCM
 */

import { readFile, writeFile, mkdir, access } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import { randomBytes, createCipheriv } from 'crypto'
import type { IncomingMessage, ServerResponse } from 'http'

const GRANDVIEW_DIR = join(homedir(), '.grandviewos')
const VAULT_DIR = join(GRANDVIEW_DIR, 'vault')
const SECRETS_FILE = join(VAULT_DIR, 'secrets.json')
const MASTER_KEY_FILE = join(VAULT_DIR, 'master.key')
const INTEGRATIONS_FILE = join(GRANDVIEW_DIR, 'integrations.json')
const MCP_SERVERS_FILE = join(GRANDVIEW_DIR, 'mcp-servers.json')
const LLM_PROVIDERS_FILE = join(GRANDVIEW_DIR, 'llm-providers.json')
const AGENT_PERMISSIONS_FILE = join(GRANDVIEW_DIR, 'agent-permissions.json')

// ---- Helpers ----

async function fileExists(path: string): Promise<boolean> {
  try { await access(path); return true } catch { return false }
}

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true })
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path, 'utf-8')
    return JSON.parse(raw) as T
  } catch { return fallback }
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await ensureDir(join(path, '..').replace(/\/[^/]+$/, ''))
  await writeFile(path, JSON.stringify(data, null, 2))
}

function genId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString('hex')}`
}

// ---- Encryption ----

let cachedMasterKey: Buffer | null = null

async function getMasterKey(): Promise<Buffer> {
  if (cachedMasterKey) return cachedMasterKey
  await ensureDir(VAULT_DIR)
  if (await fileExists(MASTER_KEY_FILE)) {
    cachedMasterKey = await readFile(MASTER_KEY_FILE)
    return cachedMasterKey
  }
  const key = randomBytes(32)
  await writeFile(MASTER_KEY_FILE, key, { mode: 0o600 })
  cachedMasterKey = key
  return key
}

function encrypt(plaintext: string, key: Buffer): { encrypted: string; iv: string; tag: string } {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  }
}

/* decrypt — reserved for future secret retrieval
function decrypt(encrypted: string, iv: string, tag: string, key: Buffer): string {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  return decipher.update(Buffer.from(encrypted, 'base64'), undefined, 'utf-8') + decipher.final('utf-8')
} */

// ---- Stored types (internal, with encrypted fields) ----

interface StoredSecret {
  id: string
  name: string
  type: string
  encrypted_value: string
  iv: string
  tag: string
  hint: string
  created_at: string
  updated_at: string
  last_rotated: string
}

interface StoredIntegration {
  id: string
  type: string
  name: string
  icon: string
  auth_method: string
  required_secrets: string[]
  configured_secrets: Record<string, string>
  config: Record<string, string>
  status: string
  last_used: string | null
  is_custom: boolean
}

interface StoredMcpServer {
  id: string
  name: string
  url: string
  auth_type: string
  credential_secret_id: string | null
  status: string
  tool_count: number
  connected_agents: string[]
}

interface StoredLlmProvider {
  id: string
  provider: string
  name: string
  api_key_secret_id: string | null
  base_url: string | null
  status: string
  models: Array<{ id: string; name: string; enabled: boolean; is_default: boolean }>
}

interface StoredAgentPermissions {
  agent_id: string
  agent_name: string
  allowed_integrations: string[]
  allowed_tools: string[]
  allowed_models: string[]
  deny_tools: string[]
}

// ---- Request body parser ----

function parseBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk.toString() })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

// ---- Default integrations catalog ----

function getDefaultIntegrations(): StoredIntegration[] {
  return [
    { id: 'int_github', type: 'github', name: 'GitHub', icon: '🐙', auth_method: 'bearer_token', required_secrets: ['github_token'], configured_secrets: {}, config: {}, status: 'disconnected', last_used: null, is_custom: false },
    { id: 'int_slack', type: 'slack', name: 'Slack', icon: '💬', auth_method: 'oauth_token', required_secrets: ['slack_bot_token'], configured_secrets: {}, config: {}, status: 'disconnected', last_used: null, is_custom: false },
    { id: 'int_telegram', type: 'telegram', name: 'Telegram', icon: '✈️', auth_method: 'bot_token', required_secrets: ['telegram_bot_token'], configured_secrets: {}, config: {}, status: 'disconnected', last_used: null, is_custom: false },
    { id: 'int_aws', type: 'aws', name: 'AWS', icon: '☁️', auth_method: 'access_key', required_secrets: ['aws_access_key', 'aws_secret_key'], configured_secrets: {}, config: {}, status: 'disconnected', last_used: null, is_custom: false },
    { id: 'int_postgres', type: 'postgres', name: 'PostgreSQL', icon: '🐘', auth_method: 'connection_string', required_secrets: ['postgres_url'], configured_secrets: {}, config: {}, status: 'disconnected', last_used: null, is_custom: false },
    { id: 'int_stripe', type: 'stripe', name: 'Stripe', icon: '💳', auth_method: 'api_key', required_secrets: ['stripe_api_key'], configured_secrets: {}, config: {}, status: 'disconnected', last_used: null, is_custom: false },
    { id: 'int_openai', type: 'openai', name: 'OpenAI', icon: '🤖', auth_method: 'api_key', required_secrets: ['openai_api_key'], configured_secrets: {}, config: {}, status: 'disconnected', last_used: null, is_custom: false },
    { id: 'int_anthropic', type: 'anthropic', name: 'Anthropic', icon: '🧠', auth_method: 'api_key', required_secrets: ['anthropic_api_key'], configured_secrets: {}, config: {}, status: 'disconnected', last_used: null, is_custom: false },
    { id: 'int_google', type: 'google', name: 'Google AI', icon: '🔮', auth_method: 'api_key', required_secrets: ['google_api_key'], configured_secrets: {}, config: {}, status: 'disconnected', last_used: null, is_custom: false },
  ]
}

function getDefaultLlmProviders(): StoredLlmProvider[] {
  return [
    { id: 'llm_anthropic', provider: 'anthropic', name: 'Anthropic', api_key_secret_id: null, base_url: 'https://api.anthropic.com', status: 'inactive', models: [
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', enabled: true, is_default: true },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', enabled: true, is_default: false },
      { id: 'claude-haiku-3-5', name: 'Claude Haiku 3.5', enabled: true, is_default: false },
    ]},
    { id: 'llm_openai', provider: 'openai', name: 'OpenAI', api_key_secret_id: null, base_url: 'https://api.openai.com', status: 'inactive', models: [
      { id: 'gpt-4o', name: 'GPT-4o', enabled: true, is_default: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', enabled: true, is_default: false },
    ]},
    { id: 'llm_google', provider: 'google', name: 'Google AI', api_key_secret_id: null, base_url: 'https://generativelanguage.googleapis.com', status: 'inactive', models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', enabled: true, is_default: true },
      { id: 'gemini-2.0-pro', name: 'Gemini 2.0 Pro', enabled: true, is_default: false },
    ]},
    { id: 'llm_custom', provider: 'custom', name: 'Custom / Local', api_key_secret_id: null, base_url: null, status: 'inactive', models: [] },
  ]
}

// ---- Initialize files on first access ----

async function ensureDataFiles(): Promise<void> {
  await ensureDir(VAULT_DIR)
  if (!await fileExists(SECRETS_FILE)) await writeJson(SECRETS_FILE, [])
  if (!await fileExists(INTEGRATIONS_FILE)) await writeJson(INTEGRATIONS_FILE, getDefaultIntegrations())
  if (!await fileExists(MCP_SERVERS_FILE)) await writeJson(MCP_SERVERS_FILE, [])
  if (!await fileExists(LLM_PROVIDERS_FILE)) await writeJson(LLM_PROVIDERS_FILE, getDefaultLlmProviders())
  if (!await fileExists(AGENT_PERMISSIONS_FILE)) await writeJson(AGENT_PERMISSIONS_FILE, [])
}

let initialized = false

async function init(): Promise<void> {
  if (initialized) return
  await ensureDataFiles()
  initialized = true
}

// ---- Route handler ----

export async function handleIntegrationsApi(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string
): Promise<boolean> {
  await init()

  // ---- SECRETS ----
  if (pathname === '/api/secrets' && method === 'GET') {
    const secrets = await readJson<StoredSecret[]>(SECRETS_FILE, [])
    const masked = secrets.map(s => ({
      id: s.id, name: s.name, type: s.type, hint: s.hint,
      created_at: s.created_at, updated_at: s.updated_at, last_rotated: s.last_rotated,
    }))
    res.end(JSON.stringify(masked))
    return true
  }

  if (pathname === '/api/secrets' && method === 'POST') {
    const body = JSON.parse(await parseBody(req)) as { name: string; type: string; value: string }
    const key = await getMasterKey()
    const { encrypted, iv, tag } = encrypt(body.value, key)
    const hint = body.value.length >= 4 ? '••••' + body.value.slice(-4) : '••••'
    const now = new Date().toISOString()
    const secret: StoredSecret = {
      id: genId('sec'), name: body.name, type: body.type,
      encrypted_value: encrypted, iv, tag, hint,
      created_at: now, updated_at: now, last_rotated: now,
    }
    const secrets = await readJson<StoredSecret[]>(SECRETS_FILE, [])
    secrets.push(secret)
    await writeJson(SECRETS_FILE, secrets)
    res.end(JSON.stringify({ id: secret.id, name: secret.name, type: secret.type, hint: secret.hint, created_at: now, updated_at: now, last_rotated: now }))
    return true
  }

  const secretMatch = pathname.match(/^\/api\/secrets\/([^/]+)$/)
  if (secretMatch && method === 'PATCH') {
    const id = secretMatch[1]
    const body = JSON.parse(await parseBody(req)) as { name?: string; type?: string; value?: string }
    const secrets = await readJson<StoredSecret[]>(SECRETS_FILE, [])
    const idx = secrets.findIndex(s => s.id === id)
    if (idx === -1) { res.statusCode = 404; res.end(JSON.stringify({ error: 'Not found' })); return true }
    const now = new Date().toISOString()
    if (body.name) secrets[idx].name = body.name
    if (body.type) secrets[idx].type = body.type
    if (body.value) {
      const key = await getMasterKey()
      const { encrypted, iv, tag } = encrypt(body.value, key)
      secrets[idx].encrypted_value = encrypted
      secrets[idx].iv = iv
      secrets[idx].tag = tag
      secrets[idx].hint = body.value.length >= 4 ? '••••' + body.value.slice(-4) : '••••'
      secrets[idx].last_rotated = now
    }
    secrets[idx].updated_at = now
    await writeJson(SECRETS_FILE, secrets)
    res.end(JSON.stringify({ ok: true }))
    return true
  }

  if (secretMatch && method === 'DELETE') {
    const id = secretMatch[1]
    let secrets = await readJson<StoredSecret[]>(SECRETS_FILE, [])
    secrets = secrets.filter(s => s.id !== id)
    await writeJson(SECRETS_FILE, secrets)
    res.end(JSON.stringify({ ok: true }))
    return true
  }

  // ---- INTEGRATIONS ----
  if (pathname === '/api/integrations' && method === 'GET') {
    const integrations = await readJson<StoredIntegration[]>(INTEGRATIONS_FILE, [])
    res.end(JSON.stringify(integrations))
    return true
  }

  if (pathname === '/api/integrations' && method === 'POST') {
    const body = JSON.parse(await parseBody(req)) as Partial<StoredIntegration>
    const integration: StoredIntegration = {
      id: genId('int'), type: body.type ?? 'custom', name: body.name ?? 'Custom Integration',
      icon: body.icon ?? '🔌', auth_method: body.auth_method ?? 'api_key',
      required_secrets: body.required_secrets ?? [], configured_secrets: body.configured_secrets ?? {},
      config: body.config ?? {}, status: 'needs_config', last_used: null, is_custom: true,
    }
    const integrations = await readJson<StoredIntegration[]>(INTEGRATIONS_FILE, [])
    integrations.push(integration)
    await writeJson(INTEGRATIONS_FILE, integrations)
    res.end(JSON.stringify(integration))
    return true
  }

  const intMatch = pathname.match(/^\/api\/integrations\/([^/]+)$/)
  if (intMatch && method === 'PATCH') {
    const id = intMatch[1]
    const body = JSON.parse(await parseBody(req)) as Partial<StoredIntegration>
    const integrations = await readJson<StoredIntegration[]>(INTEGRATIONS_FILE, [])
    const idx = integrations.findIndex(i => i.id === id)
    if (idx === -1) { res.statusCode = 404; res.end(JSON.stringify({ error: 'Not found' })); return true }
    Object.assign(integrations[idx], body, { id }) // preserve id
    await writeJson(INTEGRATIONS_FILE, integrations)
    res.end(JSON.stringify(integrations[idx]))
    return true
  }

  if (intMatch && method === 'DELETE') {
    const id = intMatch[1]
    let integrations = await readJson<StoredIntegration[]>(INTEGRATIONS_FILE, [])
    integrations = integrations.filter(i => i.id !== id)
    await writeJson(INTEGRATIONS_FILE, integrations)
    res.end(JSON.stringify({ ok: true }))
    return true
  }

  const intTestMatch = pathname.match(/^\/api\/integrations\/([^/]+)\/test$/)
  if (intTestMatch && method === 'POST') {
    // MVP: simulate test connection
    const id = intTestMatch[1]
    const integrations = await readJson<StoredIntegration[]>(INTEGRATIONS_FILE, [])
    const idx = integrations.findIndex(i => i.id === id)
    if (idx === -1) { res.statusCode = 404; res.end(JSON.stringify({ error: 'Not found' })); return true }
    const hasSecrets = integrations[idx].required_secrets.every(
      s => integrations[idx].configured_secrets[s]
    )
    if (hasSecrets) {
      integrations[idx].status = 'connected'
      integrations[idx].last_used = new Date().toISOString()
      await writeJson(INTEGRATIONS_FILE, integrations)
      res.end(JSON.stringify({ ok: true, status: 'connected' }))
    } else {
      integrations[idx].status = 'needs_config'
      await writeJson(INTEGRATIONS_FILE, integrations)
      res.end(JSON.stringify({ ok: false, status: 'needs_config', message: 'Missing required secrets' }))
    }
    return true
  }

  // ---- MCP SERVERS ----
  if (pathname === '/api/mcp-servers' && method === 'GET') {
    const servers = await readJson<StoredMcpServer[]>(MCP_SERVERS_FILE, [])
    res.end(JSON.stringify(servers))
    return true
  }

  if (pathname === '/api/mcp-servers' && method === 'POST') {
    const body = JSON.parse(await parseBody(req)) as Partial<StoredMcpServer>
    const server: StoredMcpServer = {
      id: genId('mcp'), name: body.name ?? 'MCP Server', url: body.url ?? '',
      auth_type: body.auth_type ?? 'none', credential_secret_id: body.credential_secret_id ?? null,
      status: 'unknown', tool_count: 0, connected_agents: body.connected_agents ?? [],
    }
    const servers = await readJson<StoredMcpServer[]>(MCP_SERVERS_FILE, [])
    servers.push(server)
    await writeJson(MCP_SERVERS_FILE, servers)
    res.end(JSON.stringify(server))
    return true
  }

  const mcpMatch = pathname.match(/^\/api\/mcp-servers\/([^/]+)$/)
  if (mcpMatch && method === 'DELETE') {
    const id = mcpMatch[1]
    let servers = await readJson<StoredMcpServer[]>(MCP_SERVERS_FILE, [])
    servers = servers.filter(s => s.id !== id)
    await writeJson(MCP_SERVERS_FILE, servers)
    res.end(JSON.stringify({ ok: true }))
    return true
  }

  const mcpToolsMatch = pathname.match(/^\/api\/mcp-servers\/([^/]+)\/tools$/)
  if (mcpToolsMatch && method === 'GET') {
    // MVP: return mock tools
    res.end(JSON.stringify([
      { name: 'read_file', description: 'Read a file from the workspace', input_schema: { type: 'object', properties: { path: { type: 'string' } } } },
      { name: 'write_file', description: 'Write content to a file', input_schema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } } } },
      { name: 'execute', description: 'Execute a shell command', input_schema: { type: 'object', properties: { command: { type: 'string' } } } },
    ]))
    return true
  }

  // ---- LLM PROVIDERS ----
  if (pathname === '/api/llm-providers' && method === 'GET') {
    const providers = await readJson<StoredLlmProvider[]>(LLM_PROVIDERS_FILE, [])
    res.end(JSON.stringify(providers))
    return true
  }

  if (pathname === '/api/llm-providers' && method === 'POST') {
    const body = JSON.parse(await parseBody(req)) as Partial<StoredLlmProvider>
    const provider: StoredLlmProvider = {
      id: genId('llm'), provider: body.provider ?? 'custom', name: body.name ?? 'Custom Provider',
      api_key_secret_id: body.api_key_secret_id ?? null, base_url: body.base_url ?? null,
      status: 'inactive', models: body.models ?? [],
    }
    const providers = await readJson<StoredLlmProvider[]>(LLM_PROVIDERS_FILE, [])
    providers.push(provider)
    await writeJson(LLM_PROVIDERS_FILE, providers)
    res.end(JSON.stringify(provider))
    return true
  }

  const llmMatch = pathname.match(/^\/api\/llm-providers\/([^/]+)$/)
  if (llmMatch && method === 'PATCH') {
    const id = llmMatch[1]
    const body = JSON.parse(await parseBody(req)) as Partial<StoredLlmProvider>
    const providers = await readJson<StoredLlmProvider[]>(LLM_PROVIDERS_FILE, [])
    const idx = providers.findIndex(p => p.id === id)
    if (idx === -1) { res.statusCode = 404; res.end(JSON.stringify({ error: 'Not found' })); return true }
    Object.assign(providers[idx], body, { id })
    await writeJson(LLM_PROVIDERS_FILE, providers)
    res.end(JSON.stringify(providers[idx]))
    return true
  }

  // ---- AGENT PERMISSIONS ----
  if (pathname === '/api/agent-permissions' && method === 'GET') {
    const perms = await readJson<StoredAgentPermissions[]>(AGENT_PERMISSIONS_FILE, [])
    res.end(JSON.stringify(perms))
    return true
  }

  const permMatch = pathname.match(/^\/api\/agent-permissions\/([^/]+)$/)
  if (permMatch && method === 'PATCH') {
    const agentId = permMatch[1]
    const body = JSON.parse(await parseBody(req)) as Partial<StoredAgentPermissions>
    const perms = await readJson<StoredAgentPermissions[]>(AGENT_PERMISSIONS_FILE, [])
    const idx = perms.findIndex(p => p.agent_id === agentId)
    if (idx === -1) {
      // Create new entry
      const entry: StoredAgentPermissions = {
        agent_id: agentId, agent_name: body.agent_name ?? agentId,
        allowed_integrations: body.allowed_integrations ?? ['*'],
        allowed_tools: body.allowed_tools ?? ['*'],
        allowed_models: body.allowed_models ?? ['*'],
        deny_tools: body.deny_tools ?? [],
      }
      perms.push(entry)
      await writeJson(AGENT_PERMISSIONS_FILE, perms)
      res.end(JSON.stringify(entry))
    } else {
      Object.assign(perms[idx], body, { agent_id: agentId })
      await writeJson(AGENT_PERMISSIONS_FILE, perms)
      res.end(JSON.stringify(perms[idx]))
    }
    return true
  }

  return false
}
