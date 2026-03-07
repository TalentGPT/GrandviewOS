import type { Plugin, ViteDevServer } from 'vite'
import { exec } from 'child_process'
import { readdir, readFile, stat, access } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'

const OPENCLAW_DIR = join(homedir(), '.openclaw')
const SESSIONS_DIR = join(OPENCLAW_DIR, 'agents', 'main', 'sessions')
const AGENTS_DIR = join(OPENCLAW_DIR, 'agents')
const CONFIG_FILE = join(OPENCLAW_DIR, 'openclaw.json')
const WORKSPACE_DIR = join(OPENCLAW_DIR, 'workspace')

interface JsonlSession {
  type: string
  id?: string
  timestamp?: string
  message?: {
    role: string
    content: Array<{ type: string; text?: string; name?: string; input?: unknown }>
    model?: string
    provider?: string
    usage?: {
      input: number
      output: number
      cacheRead: number
      cacheWrite: number
      totalTokens: number
      cost: { input: number; output: number; cacheRead: number; cacheWrite: number; total: number }
    }
    stopReason?: string
  }
  customType?: string
  data?: Record<string, unknown>
}

interface ParsedSession {
  id: string
  timestamp: string
  lastActivity: string
  model: string
  provider: string
  messageCount: number
  totalTokens: number
  totalCost: number
  isActive: boolean
  title: string
  messages: Array<{
    role: string
    content: string
    timestamp: string
    model?: string
    provider?: string
    usage?: {
      input: number
      output: number
      cacheRead: number
      cacheWrite: number
      totalTokens: number
      cost: { input: number; output: number; cacheRead: number; cacheWrite: number; total: number }
    }
    stopReason?: string
    isToolCall?: boolean
    toolName?: string
  }>
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function extractTextContent(content: Array<{ type: string; text?: string; name?: string; input?: unknown }>): string {
  return content
    .filter(c => c.type === 'text' && c.text)
    .map(c => c.text)
    .join('\n')
}

function extractTitle(messages: ParsedSession['messages']): string {
  for (const msg of messages) {
    if (msg.role === 'user' && msg.content) {
      // Strip metadata blocks
      const clean = msg.content.replace(/Conversation info \(untrusted metadata\):\n```json\n[\s\S]*?```\n\n/g, '').trim()
      if (clean && !clean.startsWith('Read HEARTBEAT')) {
        return clean.slice(0, 80) + (clean.length > 80 ? '...' : '')
      }
    }
  }
  return 'Untitled Session'
}

async function parseSessionFile(filePath: string, includeMessages = false): Promise<ParsedSession | null> {
  try {
    const raw = await readFile(filePath, 'utf-8')
    const lines = raw.trim().split('\n')

    let sessionId = ''
    let sessionTimestamp = ''
    let model = ''
    let provider = ''
    let lastTimestamp = ''
    let totalTokens = 0
    let totalCost = 0
    let messageCount = 0
    const messages: ParsedSession['messages'] = []

    for (const line of lines) {
      const obj: JsonlSession = JSON.parse(line)

      if (obj.type === 'session' && obj.id) {
        sessionId = obj.id
        sessionTimestamp = obj.timestamp ?? ''
      }

      if (obj.type === 'model_change') {
        const data = obj as unknown as { modelId?: string; provider?: string }
        if (data.modelId) model = data.modelId
        if (data.provider) provider = data.provider
      }

      if (obj.type === 'message' && obj.message) {
        messageCount++
        if (obj.timestamp) lastTimestamp = obj.timestamp

        const usage = obj.message.usage
        if (usage) {
          totalTokens += usage.totalTokens
          totalCost += usage.cost?.total ?? 0
        }

        if (obj.message.model) model = obj.message.model
        if (obj.message.provider) provider = obj.message.provider

        if (includeMessages) {
          const hasToolUse = obj.message.content?.some(c => c.type === 'tool_use' || c.type === 'tool_result')
          const toolName = obj.message.content?.find(c => c.type === 'tool_use')?.name

          messages.push({
            role: obj.message.role,
            content: extractTextContent(obj.message.content ?? []),
            timestamp: obj.timestamp ?? '',
            model: obj.message.model,
            provider: obj.message.provider,
            usage: usage,
            stopReason: obj.message.stopReason,
            isToolCall: hasToolUse ?? false,
            toolName: toolName ?? undefined,
          })
        }
      }
    }

    if (!sessionId) return null

    const isActive = await fileExists(filePath + '.lock')

    return {
      id: sessionId,
      timestamp: sessionTimestamp,
      lastActivity: lastTimestamp || sessionTimestamp,
      model,
      provider,
      messageCount,
      totalTokens,
      totalCost,
      isActive,
      title: includeMessages ? extractTitle(messages) : '',
      messages: includeMessages ? messages : [],
    }
  } catch {
    return null
  }
}

async function getSessions(): Promise<ParsedSession[]> {
  try {
    const files = await readdir(SESSIONS_DIR)
    const jsonlFiles = files
      .filter(f => f.endsWith('.jsonl') && !f.includes('.deleted'))
      .sort()
      .slice(-50) // Last 50 sessions

    const sessions = await Promise.all(
      jsonlFiles.map(f => parseSessionFile(join(SESSIONS_DIR, f)))
    )

    return sessions
      .filter((s): s is ParsedSession => s !== null)
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
  } catch {
    return []
  }
}

async function getSessionTranscript(sessionId: string): Promise<ParsedSession | null> {
  try {
    const files = await readdir(SESSIONS_DIR)
    const match = files.find(f => f.startsWith(sessionId) && f.endsWith('.jsonl') && !f.includes('.deleted'))
    if (!match) return null
    return parseSessionFile(join(SESSIONS_DIR, match), true)
  } catch {
    return null
  }
}

async function getAgents(): Promise<Array<{
  id: string; name: string; workspace: string; hasSoul: boolean;
  hasIdentity: boolean; hasMemory: boolean; soulSnippet: string; files: string[]
}>> {
  try {
    const agents: Array<{
      id: string; name: string; workspace: string; hasSoul: boolean;
      hasIdentity: boolean; hasMemory: boolean; soulSnippet: string; files: string[]
    }> = []

    // Check agents dir
    const agentDirs = await readdir(AGENTS_DIR)
    for (const dir of agentDirs) {
      const agentPath = join(AGENTS_DIR, dir, 'agent')
      if (await fileExists(agentPath)) {
        const files = await readdir(agentPath).catch(() => [] as string[])
        const hasSoul = files.includes('SOUL.md')
        const hasIdentity = files.includes('IDENTITY.md')
        const hasMemory = files.includes('MEMORY.md')
        let soulSnippet = ''
        if (hasSoul) {
          const soul = await readFile(join(agentPath, 'SOUL.md'), 'utf-8').catch(() => '')
          soulSnippet = soul.slice(0, 200)
        }
        agents.push({ id: dir, name: dir, workspace: agentPath, hasSoul, hasIdentity, hasMemory, soulSnippet, files })
      }
    }

    // Also check workspace root for standard files
    const wsPath = WORKSPACE_DIR
    if (await fileExists(wsPath)) {
      const wsFiles = await readdir(wsPath).catch(() => [] as string[])
      const mdFiles = wsFiles.filter(f => f.endsWith('.md'))
      if (mdFiles.length > 0) {
        const hasSoul = mdFiles.includes('SOUL.md')
        let soulSnippet = ''
        if (hasSoul) {
          const soul = await readFile(join(wsPath, 'SOUL.md'), 'utf-8').catch(() => '')
          soulSnippet = soul.slice(0, 200)
        }
        agents.push({
          id: 'workspace',
          name: 'Main Workspace',
          workspace: wsPath,
          hasSoul,
          hasIdentity: mdFiles.includes('IDENTITY.md'),
          hasMemory: mdFiles.includes('MEMORY.md'),
          soulSnippet,
          files: mdFiles,
        })
      }
    }

    return agents
  } catch {
    return []
  }
}

function runCommand(cmd: string): Promise<string> {
  return new Promise((resolve) => {
    exec(cmd, { timeout: 10000 }, (error, stdout, stderr) => {
      resolve(error ? stderr || error.message : stdout)
    })
  })
}

async function getSystemHealth(): Promise<{
  gatewayRunning: boolean; gatewayPid: number | null; gatewayPort: number | null;
  totalSessions: number; activeSessions: number; version: string; uptime: string
}> {
  const statusOutput = await runCommand('openclaw gateway status 2>&1')
  const running = statusOutput.includes('state active') || statusOutput.includes('running')
  const pidMatch = statusOutput.match(/pid (\d+)/)
  const portMatch = statusOutput.match(/port[=:](\d+)/)
  const versionMatch = statusOutput.match(/Version[:\s]+(\S+)/i) ?? statusOutput.match(/lastTouchedVersion.*?(\d+\.\d+\.\d+)/)

  let totalSessions = 0
  let activeSessions = 0
  try {
    const files = await readdir(SESSIONS_DIR)
    totalSessions = files.filter(f => f.endsWith('.jsonl') && !f.includes('.deleted')).length
    activeSessions = files.filter(f => f.endsWith('.jsonl.lock')).length
  } catch { /* empty */ }

  // Get version from config if not in status output
  let version = versionMatch?.[1] ?? ''
  if (!version) {
    try {
      const config = JSON.parse(await readFile(CONFIG_FILE, 'utf-8'))
      version = (config.meta?.lastTouchedVersion as string) ?? 'unknown'
    } catch { version = 'unknown' }
  }

  return {
    gatewayRunning: running,
    gatewayPid: pidMatch ? parseInt(pidMatch[1]) : null,
    gatewayPort: portMatch ? parseInt(portMatch[1]) : null,
    totalSessions,
    activeSessions,
    version,
    uptime: running ? 'active' : 'stopped',
  }
}

async function getConfig(): Promise<{
  model: { primary: string; fallbacks: string[] }; workspace: string;
  channels: Record<string, { enabled: boolean }>; agentCount: number; maxConcurrent: number
}> {
  try {
    const raw = await readFile(CONFIG_FILE, 'utf-8')
    const config = JSON.parse(raw) as {
      agents?: { defaults?: { model?: { primary?: string; fallbacks?: string[] }; workspace?: string; maxConcurrent?: number } }
      channels?: Record<string, { enabled?: boolean }>
    }
    const agents = await readdir(AGENTS_DIR).catch(() => [] as string[])

    return {
      model: {
        primary: config.agents?.defaults?.model?.primary ?? 'unknown',
        fallbacks: config.agents?.defaults?.model?.fallbacks ?? [],
      },
      workspace: config.agents?.defaults?.workspace ?? WORKSPACE_DIR,
      channels: Object.fromEntries(
        Object.entries(config.channels ?? {}).map(([k, v]) => [k, { enabled: v.enabled ?? false }])
      ),
      agentCount: agents.length,
      maxConcurrent: config.agents?.defaults?.maxConcurrent ?? 4,
    }
  } catch {
    return { model: { primary: 'unknown', fallbacks: [] }, workspace: '', channels: {}, agentCount: 0, maxConcurrent: 4 }
  }
}

async function getWorkspaceFile(agentId: string, fileName: string): Promise<string | null> {
  // Try agent workspace
  const agentPath = join(AGENTS_DIR, agentId, 'agent', fileName)
  if (await fileExists(agentPath)) {
    return readFile(agentPath, 'utf-8')
  }
  // Try main workspace
  const wsPath = join(WORKSPACE_DIR, fileName)
  if (await fileExists(wsPath)) {
    return readFile(wsPath, 'utf-8')
  }
  return null
}

async function getAgentFiles(agentId: string): Promise<Array<{ name: string; size: number }>> {
  const agentPath = join(AGENTS_DIR, agentId, 'agent')
  try {
    const files = await readdir(agentPath)
    const results: Array<{ name: string; size: number }> = []
    for (const f of files) {
      const s = await stat(join(agentPath, f)).catch(() => null)
      if (s?.isFile()) {
        results.push({ name: f, size: s.size })
      }
    }
    return results
  } catch {
    return []
  }
}

export function openclawApiPlugin(): Plugin {
  return {
    name: 'openclaw-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          next()
          return
        }

        res.setHeader('Content-Type', 'application/json')

        try {
          const url = new URL(req.url, 'http://localhost')

          if (url.pathname === '/api/sessions') {
            const sessions = await getSessions()
            res.end(JSON.stringify(sessions))
            return
          }

          const transcriptMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/transcript$/)
          if (transcriptMatch) {
            const session = await getSessionTranscript(transcriptMatch[1])
            if (session) {
              res.end(JSON.stringify(session))
            } else {
              res.statusCode = 404
              res.end(JSON.stringify({ error: 'Session not found' }))
            }
            return
          }

          const killMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/kill$/)
          if (killMatch && req.method === 'POST') {
            // Attempt to kill session by removing lock file
            try {
              const files = await readdir(SESSIONS_DIR)
              const lockFile = files.find(f => f.startsWith(killMatch[1]) && f.endsWith('.jsonl.lock'))
              if (lockFile) {
                const { unlink } = await import('fs/promises')
                await unlink(join(SESSIONS_DIR, lockFile))
              }
            } catch { /* ignore */ }
            res.end(JSON.stringify({ ok: true }))
            return
          }

          if (url.pathname === '/api/agents') {
            const agents = await getAgents()
            res.end(JSON.stringify(agents))
            return
          }

          const agentFilesMatch = url.pathname.match(/^\/api\/agents\/([^/]+)\/files$/)
          if (agentFilesMatch) {
            const files = await getAgentFiles(agentFilesMatch[1])
            res.end(JSON.stringify(files))
            return
          }

          const workspaceFileMatch = url.pathname.match(/^\/api\/workspace\/([^/]+)\/(.+)$/)
          if (workspaceFileMatch) {
            const content = await getWorkspaceFile(workspaceFileMatch[1], workspaceFileMatch[2])
            if (content !== null) {
              res.end(JSON.stringify({ content }))
            } else {
              res.statusCode = 404
              res.end(JSON.stringify({ error: 'File not found' }))
            }
            return
          }

          if (url.pathname === '/api/system/health') {
            const health = await getSystemHealth()
            res.end(JSON.stringify(health))
            return
          }

          if (url.pathname === '/api/config') {
            const config = await getConfig()
            res.end(JSON.stringify(config))
            return
          }

          if (url.pathname === '/api/cron-jobs') {
            // OpenClaw doesn't have a direct cron list API easily parseable
            // Return empty - frontend will fall back to mock
            res.end(JSON.stringify([]))
            return
          }

          res.statusCode = 404
          res.end(JSON.stringify({ error: 'Not found' }))
        } catch (err) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(err) }))
        }
      })
    },
  }
}
