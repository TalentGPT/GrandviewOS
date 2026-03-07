import { handleIntegrationsApi } from './integrations-api'
import type { Plugin, ViteDevServer } from 'vite'
import { execFile } from 'child_process'
import { readdir, readFile, stat, access, writeFile, mkdir, unlink } from 'fs/promises'
import { createReadStream, createWriteStream } from 'fs'
import { join, resolve } from 'path'
import { homedir } from 'os'
import { randomBytes } from 'crypto'
import { pipeline } from 'stream/promises'

export const OPENCLAW_DIR = join(homedir(), '.openclaw')
export const SESSIONS_DIR = join(OPENCLAW_DIR, 'agents', 'main', 'sessions')
export const AGENTS_DIR = join(OPENCLAW_DIR, 'agents')
export const CONFIG_FILE = join(OPENCLAW_DIR, 'openclaw.json')
export const WORKSPACE_DIR = join(OPENCLAW_DIR, 'workspace')
export const STANDUPS_DIR = join(WORKSPACE_DIR, 'grandview-os', 'data', 'standups')
export const DOCS_DIR = join(WORKSPACE_DIR, 'grandview-os', 'data', 'generated-docs')
export const COST_LOG_DIR = join(WORKSPACE_DIR, 'grandview-os', 'data', 'cost-logs')
export const GRANDVIEW_CONFIG_DIR = join(homedir(), '.grandviewos')
export const GRANDVIEW_CONFIG_FILE = join(GRANDVIEW_CONFIG_DIR, 'config.json')

export const MAX_FILE_SIZE = 1024 * 1024 // 1MB

// ---- AUTHENTICATION ----

let cachedApiKey: string | null = null

export async function getApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey

  // 1. Check environment variable
  if (process.env.MUDDY_API_KEY) {
    cachedApiKey = process.env.MUDDY_API_KEY
    return cachedApiKey
  }

  // 2. Check config file
  try {
    const raw = await readFile(GRANDVIEW_CONFIG_FILE, 'utf-8')
    const config = JSON.parse(raw) as { apiKey?: string }
    if (config.apiKey) {
      cachedApiKey = config.apiKey
      return cachedApiKey
    }
  } catch { /* no config file yet */ }

  // 3. Generate a new key
  const newKey = randomBytes(32).toString('hex')
  await mkdir(GRANDVIEW_CONFIG_DIR, { recursive: true })
  await writeFile(GRANDVIEW_CONFIG_FILE, JSON.stringify({ apiKey: newKey }, null, 2))
  cachedApiKey = newKey
  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log('║  GrandviewOS API Key (auto-generated, first run):   ║')
  console.log(`║  ${newKey}  ║`)
  console.log('╚══════════════════════════════════════════════════════╝\n')
  return cachedApiKey
}

export function checkAuth(_req: import('http').IncomingMessage, _apiKey: string): boolean {
  // Auth disabled — open access
  return true
}

// ---- RATE LIMITING ----

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

const rateLimitBuckets: Record<string, RateLimitConfig> = {
  'standup-create': { maxRequests: 1, windowMs: 60000 },
  'doc-generate': { maxRequests: 1, windowMs: 60000 },
  'workspace-write': { maxRequests: 10, windowMs: 60000 },
}

const rateLimitStore = new Map<string, number[]>()

export function checkRateLimit(ip: string, bucket: string): boolean {
  const config = rateLimitBuckets[bucket]
  if (!config) return true

  const key = `${ip}:${bucket}`
  const now = Date.now()
  const timestamps = rateLimitStore.get(key) ?? []

  // Remove expired timestamps
  const valid = timestamps.filter(t => now - t < config.windowMs)

  if (valid.length >= config.maxRequests) {
    rateLimitStore.set(key, valid)
    return false
  }

  valid.push(now)
  rateLimitStore.set(key, valid)
  return true
}

// Clean up rate limit store every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, timestamps] of rateLimitStore.entries()) {
    const valid = timestamps.filter(t => now - t < 120000)
    if (valid.length === 0) rateLimitStore.delete(key)
    else rateLimitStore.set(key, valid)
  }
}, 300000)

// ---- PATH VALIDATION ----

const SAFE_ID_RE = /^[a-zA-Z0-9_-]+$/
const SAFE_FILENAME_RE = /^[a-zA-Z0-9_.-]+$/

export function validateAgentId(id: string): boolean {
  return SAFE_ID_RE.test(id) && id.length <= 64
}

export function validateFileName(name: string): boolean {
  return SAFE_FILENAME_RE.test(name) && !name.includes('..') && name.length <= 255
}

// ---- SESSION CACHE ----

interface CachedSession {
  mtime: number
  data: ParsedSession
}

const sessionCache = new Map<string, CachedSession>()

// Clear stale cache entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of sessionCache.entries()) {
    if (now - entry.mtime > 300000) sessionCache.delete(key)
  }
}, 300000)

// ---- TYPES ----

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

export async function fileExists(path: string): Promise<boolean> {
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
    // Check cache (only for non-message requests)
    if (!includeMessages) {
      const fileStat = await stat(filePath)
      const mtimeMs = fileStat.mtimeMs
      const cached = sessionCache.get(filePath)
      if (cached && cached.mtime === mtimeMs) {
        // Still need to check isActive
        const isActive = await fileExists(filePath + '.lock')
        return { ...cached.data, isActive }
      }
    }

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

    const result: ParsedSession = {
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

    // Cache non-message results
    if (!includeMessages) {
      const fileStat = await stat(filePath)
      sessionCache.set(filePath, { mtime: fileStat.mtimeMs, data: result })
    }

    return result
  } catch {
    return null
  }
}

export async function getSessions(limit = 50, offset = 0): Promise<{ sessions: ParsedSession[]; total: number }> {
  try {
    const files = await readdir(SESSIONS_DIR)
    const jsonlFiles = files
      .filter(f => f.endsWith('.jsonl') && !f.includes('.deleted'))
      .sort()

    const total = jsonlFiles.length
    const sliced = jsonlFiles.slice(-(offset + limit)).slice(0, limit)

    const sessions = await Promise.all(
      sliced.map(f => parseSessionFile(join(SESSIONS_DIR, f)))
    )

    const sorted = sessions
      .filter((s): s is ParsedSession => s !== null)
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())

    return { sessions: sorted, total }
  } catch {
    return { sessions: [], total: 0 }
  }
}

export async function getSessionTranscript(sessionId: string): Promise<ParsedSession | null> {
  try {
    const files = await readdir(SESSIONS_DIR)
    const match = files.find(f => f.startsWith(sessionId) && f.endsWith('.jsonl') && !f.includes('.deleted'))
    if (!match) return null
    return parseSessionFile(join(SESSIONS_DIR, match), true)
  } catch {
    return null
  }
}

export async function getAgents(): Promise<Array<{
  id: string; name: string; workspace: string; hasSoul: boolean;
  hasIdentity: boolean; hasMemory: boolean; soulSnippet: string; files: string[]
}>> {
  try {
    const agents: Array<{
      id: string; name: string; workspace: string; hasSoul: boolean;
      hasIdentity: boolean; hasMemory: boolean; soulSnippet: string; files: string[]
    }> = []

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
    execFile('bash', ['-c', cmd], { timeout: 10000 }, (error, stdout, stderr) => {
      resolve(error ? stderr || error.message : stdout)
    })
  })
}

export async function getSystemHealth(): Promise<{
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

export async function getConfig(): Promise<{
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

export async function getWorkspaceFile(agentId: string, fileName: string): Promise<string | null> {
  if (!validateAgentId(agentId) || !validateFileName(fileName)) return null

  const agentDir = join(AGENTS_DIR, agentId, 'agent')
  const agentPath = join(agentDir, fileName)
  // Verify resolved path is within expected directory
  if (!resolve(agentPath).startsWith(resolve(agentDir))) return null

  if (await fileExists(agentPath)) {
    return readFile(agentPath, 'utf-8')
  }

  const wsPath = join(WORKSPACE_DIR, fileName)
  if (!resolve(wsPath).startsWith(resolve(WORKSPACE_DIR))) return null

  if (await fileExists(wsPath)) {
    return readFile(wsPath, 'utf-8')
  }
  return null
}

export async function saveWorkspaceFile(agentId: string, fileName: string, content: string): Promise<boolean> {
  if (!validateAgentId(agentId) || !validateFileName(fileName)) return false
  if (Buffer.byteLength(content, 'utf-8') > MAX_FILE_SIZE) return false

  const agentDir = join(AGENTS_DIR, agentId, 'agent')
  const agentPath = join(agentDir, fileName)
  if (!resolve(agentPath).startsWith(resolve(agentDir))) return false

  if (await fileExists(agentDir)) {
    await writeFile(agentPath, content, 'utf-8')
    return true
  }

  const wsPath = join(WORKSPACE_DIR, fileName)
  if (!resolve(wsPath).startsWith(resolve(WORKSPACE_DIR))) return false
  await writeFile(wsPath, content, 'utf-8')
  return true
}

export async function getAgentFiles(agentId: string): Promise<Array<{ name: string; size: number }>> {
  if (!validateAgentId(agentId)) return []
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

// ---- STANDUP SYSTEM ----

interface StandupData {
  id: string
  title: string
  date: string
  time: string
  status: 'running' | 'complete' | 'error'
  participants: Array<{ name: string; emoji: string; role: string; voice: string }>
  conversation: Array<{ speaker: string; text: string }>
  actionItems: Array<{ text: string; assignee: string; done: boolean }>
  audioFile?: string
  createdAt: string
}

const AGENT_VOICES: Record<string, { voice: string; emoji: string; role: string }> = {
  'Muddy': { voice: 'en-US-GuyNeural', emoji: '🐕', role: 'COO' },
  'Elon': { voice: 'en-US-ChristopherNeural', emoji: '🚀', role: 'CTO' },
  'Gary': { voice: 'en-US-JasonNeural', emoji: '📣', role: 'CMO' },
  'Warren': { voice: 'en-GB-RyanNeural', emoji: '💰', role: 'CRO' },
}

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true })
}

async function generateStandupConversation(): Promise<Array<{ speaker: string; text: string }>> {
  // Try to use OpenClaw CLI for real AI conversation
  try {
    const result = await new Promise<string>((res, rej) => {
      execFile('openclaw', ['run', '--model', 'anthropic/claude-sonnet-4-6', '--prompt',
        `You are simulating an executive standup meeting for an AI company. Generate a JSON array of conversation turns. Each turn has "speaker" (one of: Muddy, Elon, Gary, Warren) and "text". Muddy is COO, Elon is CTO, Gary is CMO, Warren is CRO. Make it realistic, covering engineering, marketing, revenue, and action items. 5-7 turns. Return ONLY valid JSON array, no markdown.`
      ], { timeout: 30000 }, (err, stdout) => {
        if (err) rej(err)
        else res(stdout)
      })
    })
    // Try to parse the result
    const jsonMatch = result.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Array<{ speaker: string; text: string }>
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].speaker && parsed[0].text) {
        return parsed
      }
    }
  } catch {
    // Fallback to hardcoded
  }

  const today = new Date().toISOString().split('T')[0]
  return [
    { speaker: 'Muddy', text: `Good morning team. Let's run through our status for ${today}. We have a lot of moving pieces — I want crisp updates from each department. Elon, engineering first.` },
    { speaker: 'Elon', text: "Engineering is in good shape. We shipped 3 PRs yesterday — the WebSocket integration for real-time updates, the workspace file save endpoint, and a security patch Nova flagged. Build pipeline is green. One blocker: we need to decide on the chart library for the cost breakdown view. I'm recommending we keep it lightweight with inline SVG sparklines." },
    { speaker: 'Gary', text: "Marketing had a strong day. Newsletter open rate hit 34% — our best yet. Community grew by 18 members this week. Clay handled 12 support questions without escalation. I'm working on the case study for the TechCorp partnership — should be ready by tomorrow. Social engagement is up 23% week over week." },
    { speaker: 'Warren', text: "Revenue update: TechCorp proposal is in final review — expecting a signature this week. AIFlow wants a demo call, which I've scheduled for Thursday. Pipeline is healthy at $4,500 monthly recurring. New lead from DataStream looks promising for a data integration partnership." },
    { speaker: 'Muddy', text: "Solid updates across the board. Let me compile the action items. Elon — finalize the chart library decision and ship the cost breakdown view. Gary — complete the TechCorp case study and prep the partnership announcement. Warren — close the TechCorp deal and run the AIFlow demo. I'll update the CEO brief and monitor overnight costs. Let's reconvene tomorrow at the same time." },
  ]
}

function extractActionItems(_conversation: Array<{ speaker: string; text: string }>): Array<{ text: string; assignee: string; done: boolean }> {
  return [
    { text: 'Finalize chart library decision for cost breakdown', assignee: 'Elon', done: false },
    { text: 'Ship cost breakdown view in Task Manager', assignee: 'Elon', done: false },
    { text: 'Complete TechCorp partnership case study', assignee: 'Gary', done: false },
    { text: 'Prep partnership announcement for social channels', assignee: 'Gary', done: false },
    { text: 'Close TechCorp deal — get signature', assignee: 'Warren', done: false },
    { text: 'Run AIFlow demo call on Thursday', assignee: 'Warren', done: false },
    { text: 'Update CEO brief with latest progress', assignee: 'Muddy', done: false },
    { text: 'Monitor overnight cost trends', assignee: 'Muddy', done: false },
  ]
}

async function generateTTSAudio(text: string, voice: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('edge-tts', ['--text', text, '--voice', voice, '--write-media', outputPath], { timeout: 30000 }, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

async function hasFfmpeg(): Promise<boolean> {
  return new Promise((res) => {
    execFile('which', ['ffmpeg'], (err) => res(!err))
  })
}

async function concatenateAudioFiles(files: string[], outputPath: string): Promise<void> {
  if (files.length === 0) return

  // Try ffmpeg first
  if (await hasFfmpeg()) {
    const concatStr = files.join('|')
    return new Promise((resolve, reject) => {
      execFile('ffmpeg', ['-i', `concat:${concatStr}`, '-acodec', 'copy', '-y', outputPath],
        { timeout: 30000 }, (error) => {
          if (error) reject(error)
          else resolve()
        })
    })
  }

  // Fallback: stream-based concatenation
  const writeStream = createWriteStream(outputPath)
  for (const file of files) {
    await pipeline(createReadStream(file), writeStream, { end: false })
  }
  writeStream.end()
  await new Promise<void>((resolve, reject) => {
    writeStream.on('finish', resolve)
    writeStream.on('error', reject)
  })
}

export async function runStandup(standupId: string): Promise<StandupData> {
  await ensureDir(STANDUPS_DIR)
  const standupDir = join(STANDUPS_DIR, standupId)
  await ensureDir(standupDir)

  const conversation = await generateStandupConversation()
  const actionItems = extractActionItems(conversation)
  const now = new Date()

  const standupData: StandupData = {
    id: standupId,
    title: `Executive Standup — ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
    date: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false }) + ' UTC',
    status: 'running',
    participants: Object.entries(AGENT_VOICES).map(([name, info]) => ({
      name, emoji: info.emoji, role: info.role, voice: info.voice,
    })),
    conversation,
    actionItems,
    createdAt: now.toISOString(),
  }

  await writeFile(join(standupDir, 'data.json'), JSON.stringify(standupData, null, 2))

  const audioSegments: string[] = []
  try {
    for (let i = 0; i < conversation.length; i++) {
      const msg = conversation[i]
      const voiceInfo = AGENT_VOICES[msg.speaker]
      if (!voiceInfo) continue
      const segmentPath = join(standupDir, `segment-${i}.mp3`)
      await generateTTSAudio(msg.text, voiceInfo.voice, segmentPath)
      audioSegments.push(segmentPath)
    }

    const fullAudioPath = join(standupDir, 'full-meeting.mp3')
    if (audioSegments.length > 0) {
      await concatenateAudioFiles(audioSegments, fullAudioPath)
      standupData.audioFile = fullAudioPath
    }

    standupData.status = 'complete'
  } catch (err) {
    standupData.status = 'error'
    console.error('TTS generation error:', err)
  }

  await writeFile(join(standupDir, 'data.json'), JSON.stringify(standupData, null, 2))

  // Send to Telegram if configured
  try {
    const configRaw = await readFile(GRANDVIEW_CONFIG_FILE, 'utf-8').catch(() => '{}')
    const gvConfig = JSON.parse(configRaw) as { telegramBotToken?: string; telegramChatId?: string }
    if (gvConfig.telegramBotToken && gvConfig.telegramChatId) {
      const summary = `📋 *Standup Complete*\n${standupData.title}\n\n` +
        conversation.map(m => `*${m.speaker}:* ${m.text.slice(0, 100)}...`).join('\n')
      await fetch(`https://api.telegram.org/bot${gvConfig.telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: gvConfig.telegramChatId, text: summary, parse_mode: 'Markdown' }),
      }).catch(() => {})
    }
  } catch { /* ignore telegram errors */ }

  return standupData
}

export async function listStandups(): Promise<StandupData[]> {
  try {
    await ensureDir(STANDUPS_DIR)
    const dirs = await readdir(STANDUPS_DIR)
    const standups: StandupData[] = []
    for (const dir of dirs.sort().reverse()) {
      const dataPath = join(STANDUPS_DIR, dir, 'data.json')
      if (await fileExists(dataPath)) {
        const raw = await readFile(dataPath, 'utf-8')
        standups.push(JSON.parse(raw) as StandupData)
      }
    }
    return standups
  } catch {
    return []
  }
}

// ---- DOCS GENERATION ----

export async function generateDocs(): Promise<Record<string, string>> {
  const docs: Record<string, string> = {}
  const agents = await getAgents()
  const { sessions } = await getSessions()
  const config = await getConfig()
  const health = await getSystemHealth()

  const activeSessions = sessions.filter(s => s.isActive)
  const totalTokens = sessions.reduce((sum, s) => sum + s.totalTokens, 0)
  const totalCost = sessions.reduce((sum, s) => sum + s.totalCost, 0)

  docs['Overview'] = `# GrandviewOS — System Overview\n\n*Auto-generated on ${new Date().toISOString().split('T')[0]}*\n\n## System Status\n- **Gateway:** ${health.gatewayRunning ? '🟢 Online' : '🔴 Offline'}\n- **Version:** ${health.version}\n- **Total Sessions:** ${health.totalSessions}\n- **Active Sessions:** ${health.activeSessions}\n- **Agents Registered:** ${agents.length}\n\n## Tech Stack\n- **Frontend:** React 19 + TypeScript + Tailwind CSS 4\n- **Build:** Vite 7 with HMR\n- **AI Runtime:** OpenClaw\n- **Primary Model:** ${config.model.primary}`

  docs['Task Manager'] = `# Task Manager\n\n*Auto-generated from ${sessions.length} sessions*\n\n## Current Statistics\n- **Active Sessions:** ${activeSessions.length}\n- **Total Sessions:** ${sessions.length}\n- **Total Tokens:** ${totalTokens >= 1000000 ? (totalTokens / 1000000).toFixed(1) + 'M' : totalTokens >= 1000 ? (totalTokens / 1000).toFixed(1) + 'K' : totalTokens}\n- **Total Cost:** $${totalCost.toFixed(2)}`

  docs['Organization Chart'] = `# Organization Chart\n\n## Hierarchy\n\`\`\`\n        👤 CEO (Marcelo)\n             │\n        🐕 COO (Muddy)\n        ┌────┼────┐\n   🚀 CTO  📣 CMO  💰 CRO\n   (Elon)  (Gary)  (Warren)\n\`\`\`\n\n## Registered Agents (${agents.length})\n${agents.map(a => `- **${a.name}** — ${a.hasSoul ? '✅ SOUL' : '❌ SOUL'} ${a.hasMemory ? '✅ MEM' : '❌ MEM'} (${a.files.length} files)`).join('\n')}`

  docs['Team Workspaces'] = `# Team Workspaces\n\n${agents.map(a => `### ${a.name}\n- **Path:** \`${a.workspace}\`\n- **Files:** ${a.files.join(', ') || 'None'}`).join('\n\n')}`

  docs['Voice Standup'] = `# Voice Standup System\n\n## Agent Voice Assignments\n| Agent | Voice | Role |\n|-------|-------|------|\n| Muddy 🐕 | en-US-GuyNeural | COO |\n| Elon 🚀 | en-US-ChristopherNeural | CTO |\n| Gary 📣 | en-US-JasonNeural | CMO |\n| Warren 💰 | en-GB-RyanNeural | CRO |`

  docs['Memory Architecture'] = `# Memory Architecture\n\n## Memory Types\n- **Daily Notes** (\`memory/YYYY-MM-DD.md\`)\n- **Long-term Memory** (\`MEMORY.md\`) — Found in ${agents.filter(a => a.hasMemory).length}/${agents.length} agents`

  await ensureDir(DOCS_DIR)
  for (const [key, content] of Object.entries(docs)) {
    await writeFile(join(DOCS_DIR, `${key}.md`), content)
  }

  return docs
}

export async function loadGeneratedDocs(): Promise<Record<string, string>> {
  try {
    if (!await fileExists(DOCS_DIR)) return {}
    const files = await readdir(DOCS_DIR)
    const docs: Record<string, string> = {}
    for (const f of files) {
      if (f.endsWith('.md')) {
        const key = f.replace('.md', '')
        docs[key] = await readFile(join(DOCS_DIR, f), 'utf-8')
      }
    }
    return docs
  } catch {
    return {}
  }
}

// ---- COST TRACKING ----

interface DailyCostEntry {
  date: string
  totalCost: number
  totalTokens: number
  byModel: Record<string, { cost: number; tokens: number; sessions: number }>
  byAgent: Record<string, { cost: number; tokens: number; sessions: number }>
}

export async function getCostBreakdown(): Promise<{
  byModel: Record<string, { cost: number; tokens: number; sessions: number }>
  byAgent: Record<string, { cost: number; tokens: number; sessions: number }>
  total: { cost: number; tokens: number; sessions: number }
}> {
  const { sessions } = await getSessions()
  const byModel: Record<string, { cost: number; tokens: number; sessions: number }> = {}
  const byAgent: Record<string, { cost: number; tokens: number; sessions: number }> = {}
  let totalCost = 0
  let totalTokens = 0

  for (const s of sessions) {
    const model = s.model || 'unknown'
    if (!byModel[model]) byModel[model] = { cost: 0, tokens: 0, sessions: 0 }
    byModel[model].cost += s.totalCost
    byModel[model].tokens += s.totalTokens
    byModel[model].sessions++

    const agent = 'main'
    if (!byAgent[agent]) byAgent[agent] = { cost: 0, tokens: 0, sessions: 0 }
    byAgent[agent].cost += s.totalCost
    byAgent[agent].tokens += s.totalTokens
    byAgent[agent].sessions++

    totalCost += s.totalCost
    totalTokens += s.totalTokens
  }

  return { byModel, byAgent, total: { cost: totalCost, tokens: totalTokens, sessions: sessions.length } }
}

export async function logDailyCost(): Promise<DailyCostEntry> {
  await ensureDir(COST_LOG_DIR)
  const today = new Date().toISOString().split('T')[0]
  const breakdown = await getCostBreakdown()

  const entry: DailyCostEntry = {
    date: today,
    totalCost: breakdown.total.cost,
    totalTokens: breakdown.total.tokens,
    byModel: breakdown.byModel,
    byAgent: breakdown.byAgent,
  }

  await writeFile(join(COST_LOG_DIR, `${today}.json`), JSON.stringify(entry, null, 2))
  return entry
}

export async function getCostHistory(days: number = 7): Promise<DailyCostEntry[]> {
  await ensureDir(COST_LOG_DIR)
  const entries: DailyCostEntry[] = []
  const now = new Date()

  for (let i = 0; i < days; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const filePath = join(COST_LOG_DIR, `${dateStr}.json`)
    if (await fileExists(filePath)) {
      const raw = await readFile(filePath, 'utf-8')
      entries.push(JSON.parse(raw) as DailyCostEntry)
    }
  }
  return entries.reverse()
}

// ---- SSE ----

function setupSSE(server: ViteDevServer, apiKey: string): void {
  const clients: Set<import('http').ServerResponse> = new Set()

  server.middlewares.use((req, res, next) => {
    if (req.url?.split('?')[0] !== '/api/events') {
      next()
      return
    }

    // Auth check for SSE via query param
    if (!checkAuth(req, apiKey)) {
      res.statusCode = 401
      res.end(JSON.stringify({ error: 'Unauthorized' }))
      return
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
    clients.add(res)

    req.on('close', () => {
      clients.delete(res)
    })
  })

  // Broadcast session updates every 5 seconds
  setInterval(async () => {
    if (clients.size === 0) return
    try {
      const { sessions } = await getSessions(20)
      const health = await getSystemHealth()
      const data = JSON.stringify({
        type: 'session:update',
        sessions,
        health,
        timestamp: new Date().toISOString(),
      })
      for (const client of clients) {
        client.write(`data: ${data}\n\n`)
      }
    } catch { /* ignore */ }
  }, 5000)
}

// ---- COST LOG TIMER (instead of side-effect in GET) ----

function startCostLogTimer(): void {
  // Log cost every 5 minutes
  setInterval(() => {
    logDailyCost().catch(() => {})
  }, 300000)
  // Log once on startup after a short delay
  setTimeout(() => { logDailyCost().catch(() => {}) }, 5000)
}

// ---- REQUEST BODY PARSER ----

function parseBody(req: import('http').IncomingMessage, maxSize: number = MAX_FILE_SIZE): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > maxSize) {
        reject(new Error('PAYLOAD_TOO_LARGE'))
        req.destroy()
        return
      }
      body += chunk.toString()
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

// ---- CRON JOB HELPERS ----

export async function listCronJobs(): Promise<Array<{ id: string; name: string; schedule: string; status: string }>> {
  try {
    const result = await new Promise<string>((res) => {
      execFile('openclaw', ['cron', 'list', '--json'], { timeout: 10000 }, (err, stdout) => {
        res(err ? '[]' : stdout)
      })
    })
    const jsonMatch = result.match(/\[[\s\S]*\]/)
    if (jsonMatch) return JSON.parse(jsonMatch[0]) as Array<{ id: string; name: string; schedule: string; status: string }>
  } catch { /* ignore */ }
  return []
}

export function openclawApiPlugin(): Plugin {
  return {
    name: 'openclaw-api',
    configureServer(server: ViteDevServer) {
      let apiKey = ''

      // Initialize auth key and SSE
      const initPromise = getApiKey().then(key => {
        apiKey = key
        setupSSE(server, apiKey)
        startCostLogTimer()
      })

      // CORS middleware
      server.middlewares.use((req, res, next) => {
        const origin = req.headers.origin
        const allowedOrigins = ['http://localhost:7100', 'http://127.0.0.1:7100', 'http://0.0.0.0:7100']
        if (origin && allowedOrigins.includes(origin)) {
          res.setHeader('Access-Control-Allow-Origin', origin)
        }
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Muddy-Key')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }
        next()
      })

      // Auth endpoint (no auth required)
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/auth/verify' && req.method === 'POST') {
          await initPromise
          res.setHeader('Content-Type', 'application/json')
          if (checkAuth(req, apiKey)) {
            res.end(JSON.stringify({ valid: true }))
          } else {
            res.statusCode = 401
            res.end(JSON.stringify({ valid: false, error: 'Invalid API key' }))
          }
          return
        }
        next()
      })

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          next()
          return
        }

        // Skip SSE (handled separately) and auth verify
        if (req.url?.split('?')[0] === '/api/events' || req.url === '/api/auth/verify') {
          next()
          return
        }

        await initPromise

        // Auth check
        if (!checkAuth(req, apiKey)) {
          res.statusCode = 401
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Unauthorized. Provide X-Muddy-Key header.' }))
          return
        }

        const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.socket.remoteAddress ?? 'unknown'

        res.setHeader('Content-Type', 'application/json')

        try {
          const url = new URL(req.url, 'http://localhost')

          // ---- SESSIONS ----
          if (url.pathname === '/api/sessions') {
            const limit = parseInt(url.searchParams.get('limit') ?? '50')
            const offset = parseInt(url.searchParams.get('offset') ?? '0')
            const { sessions, total } = await getSessions(limit, offset)
            res.end(JSON.stringify({ sessions, total }))
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
            try {
              const files = await readdir(SESSIONS_DIR)
              const lockFile = files.find(f => f.startsWith(killMatch[1]) && f.endsWith('.jsonl.lock'))
              if (lockFile) {
                await unlink(join(SESSIONS_DIR, lockFile))
                res.end(JSON.stringify({ ok: true }))
              } else {
                res.statusCode = 404
                res.end(JSON.stringify({ error: 'Session lock not found' }))
              }
            } catch {
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'Failed to kill session' }))
            }
            return
          }

          // ---- AGENTS ----
          if (url.pathname === '/api/agents') {
            const agents = await getAgents()
            res.end(JSON.stringify(agents))
            return
          }

          const agentFilesMatch = url.pathname.match(/^\/api\/agents\/([^/]+)\/files$/)
          if (agentFilesMatch) {
            if (!validateAgentId(agentFilesMatch[1])) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Invalid agent ID' }))
              return
            }
            const files = await getAgentFiles(agentFilesMatch[1])
            res.end(JSON.stringify(files))
            return
          }

          // ---- WORKSPACE ----
          const workspaceFileMatch = url.pathname.match(/^\/api\/workspace\/([^/]+)\/(.+)$/)
          if (workspaceFileMatch) {
            const agentId = workspaceFileMatch[1]
            const fileName = workspaceFileMatch[2]

            if (!validateAgentId(agentId) || !validateFileName(fileName)) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Invalid agent ID or file name' }))
              return
            }

            if (req.method === 'PUT') {
              if (!checkRateLimit(clientIp, 'workspace-write')) {
                res.statusCode = 429
                res.end(JSON.stringify({ error: 'Too many requests. Try again later.' }))
                return
              }

              // Check Content-Length
              const contentLength = parseInt(req.headers['content-length'] ?? '0')
              if (contentLength > MAX_FILE_SIZE) {
                res.statusCode = 413
                res.end(JSON.stringify({ error: 'Payload too large. Max 1MB.' }))
                return
              }

              try {
                const body = await parseBody(req)
                const { content } = JSON.parse(body) as { content: string }
                if (Buffer.byteLength(content, 'utf-8') > MAX_FILE_SIZE) {
                  res.statusCode = 413
                  res.end(JSON.stringify({ error: 'File content too large. Max 1MB.' }))
                  return
                }
                const ok = await saveWorkspaceFile(agentId, fileName, content)
                if (!ok) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: 'Failed to save file' }))
                  return
                }
                res.end(JSON.stringify({ ok }))
              } catch (err) {
                if (err instanceof Error && err.message === 'PAYLOAD_TOO_LARGE') {
                  res.statusCode = 413
                  res.end(JSON.stringify({ error: 'Payload too large. Max 1MB.' }))
                } else {
                  throw err
                }
              }
              return
            }
            const content = await getWorkspaceFile(agentId, fileName)
            if (content !== null) {
              res.end(JSON.stringify({ content }))
            } else {
              res.statusCode = 404
              res.end(JSON.stringify({ error: 'File not found' }))
            }
            return
          }

          // ---- SYSTEM ----
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

          // ---- STANDUPS ----
          if (url.pathname === '/api/standups' && req.method === 'POST') {
            if (!checkRateLimit(clientIp, 'standup-create')) {
              res.statusCode = 429
              res.end(JSON.stringify({ error: 'Too many requests. Max 1 standup per minute.' }))
              return
            }
            const standupId = `standup-${Date.now()}`
            res.end(JSON.stringify({ id: standupId, status: 'started' }))
            runStandup(standupId).catch(err => console.error('Standup error:', err))
            return
          }

          if (url.pathname === '/api/standups' && req.method === 'GET') {
            const standupsList = await listStandups()
            res.end(JSON.stringify(standupsList))
            return
          }

          const standupDataMatch = url.pathname.match(/^\/api\/standups\/([^/]+)$/)
          if (standupDataMatch && req.method === 'GET') {
            const id = standupDataMatch[1]
            if (!validateAgentId(id.replace(/\./g, ''))) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Invalid standup ID' }))
              return
            }
            const dataPath = join(STANDUPS_DIR, id, 'data.json')
            if (await fileExists(dataPath)) {
              const raw = await readFile(dataPath, 'utf-8')
              res.end(raw)
            } else {
              res.statusCode = 404
              res.end(JSON.stringify({ error: 'Standup not found' }))
            }
            return
          }

          const standupAudioMatch = url.pathname.match(/^\/api\/standups\/([^/]+)\/audio$/)
          if (standupAudioMatch) {
            const audioPath = join(STANDUPS_DIR, standupAudioMatch[1], 'full-meeting.mp3')
            if (await fileExists(audioPath)) {
              const audioData = await readFile(audioPath)
              res.setHeader('Content-Type', 'audio/mpeg')
              res.setHeader('Content-Length', audioData.length.toString())
              res.end(audioData)
            } else {
              res.statusCode = 404
              res.end(JSON.stringify({ error: 'Audio not found' }))
            }
            return
          }

          // ---- DOCS ----
          if (url.pathname === '/api/docs' && req.method === 'GET') {
            const docs = await loadGeneratedDocs()
            res.end(JSON.stringify(docs))
            return
          }

          if (url.pathname === '/api/docs/generate' && req.method === 'POST') {
            if (!checkRateLimit(clientIp, 'doc-generate')) {
              res.statusCode = 429
              res.end(JSON.stringify({ error: 'Too many requests. Max 1 doc generation per minute.' }))
              return
            }
            const docs = await generateDocs()
            res.end(JSON.stringify(docs))
            return
          }

          // ---- COST ----
          if (url.pathname === '/api/cost/breakdown') {
            const breakdown = await getCostBreakdown()
            res.end(JSON.stringify(breakdown))
            return
          }

          if (url.pathname === '/api/cost/history') {
            const days = parseInt(url.searchParams.get('days') ?? '7')
            // No side effect — cost logging happens on timer
            const history = await getCostHistory(days)
            res.end(JSON.stringify(history))
            return
          }

          // ---- CRON JOBS ----
          if (url.pathname === '/api/cron-jobs' && req.method === 'GET') {
            const jobs = await listCronJobs()
            res.end(JSON.stringify(jobs))
            return
          }

          if (url.pathname === '/api/cron-jobs' && req.method === 'POST') {
            const body = await parseBody(req)
            const { name, schedule, command } = JSON.parse(body) as { name: string; schedule: string; command: string }
            const result = await new Promise<string>((res) => {
              execFile('openclaw', ['cron', 'create', '--name', name, '--schedule', schedule, '--command', command],
                { timeout: 10000 }, (err, stdout) => res(err ? err.message : stdout))
            })
            res.end(JSON.stringify({ ok: true, result: result.trim() }))
            return
          }

          const cronPatchMatch = url.pathname.match(/^\/api\/cron-jobs\/([^/]+)$/)
          if (cronPatchMatch && req.method === 'PATCH') {
            const body = await parseBody(req)
            const { action } = JSON.parse(body) as { action: 'pause' | 'resume' }
            const result = await new Promise<string>((res) => {
              execFile('openclaw', ['cron', action, cronPatchMatch[1]],
                { timeout: 10000 }, (err, stdout) => res(err ? err.message : stdout))
            })
            res.end(JSON.stringify({ ok: true, result: result.trim() }))
            return
          }

          if (cronPatchMatch && req.method === 'DELETE') {
            const result = await new Promise<string>((res) => {
              execFile('openclaw', ['cron', 'delete', cronPatchMatch[1]],
                { timeout: 10000 }, (err, stdout) => res(err ? err.message : stdout))
            })
            res.end(JSON.stringify({ ok: true, result: result.trim() }))
            return
          }

          // ---- BRIEFS ----
          if (url.pathname === '/api/briefs') {
            const dateParam = url.searchParams.get('date') ?? new Date().toISOString().split('T')[0]
            const { sessions: allSessions } = await getSessions()
            const daySessions = allSessions.filter(s => s.timestamp.startsWith(dateParam))
            const brief = {
              date: dateParam,
              agentsActive: new Set(daySessions.map(() => 'main')).size || 1,
              sessionsRun: daySessions.length,
              tokensUsed: daySessions.reduce((s, sess) => s + sess.totalTokens, 0),
              cost: daySessions.reduce((s, sess) => s + sess.totalCost, 0),
              events: daySessions.slice(0, 5).map(s => s.title || `Session ${s.id.slice(0, 8)}`),
            }
            res.end(JSON.stringify([brief]))
            return
          }

          // ---- PROJECTS ----
          const PROJECTS_FILE = join(WORKSPACE_DIR, 'grandview-os', 'data', 'projects.json')

          if (url.pathname === '/api/projects' && req.method === 'GET') {
            if (await fileExists(PROJECTS_FILE)) {
              const raw = await readFile(PROJECTS_FILE, 'utf-8')
              res.end(raw)
            } else {
              res.end(JSON.stringify([]))
            }
            return
          }

          if (url.pathname === '/api/projects' && req.method === 'POST') {
            const body = await parseBody(req)
            const project = JSON.parse(body) as Record<string, unknown>
            let projects: Record<string, unknown>[] = []
            if (await fileExists(PROJECTS_FILE)) {
              projects = JSON.parse(await readFile(PROJECTS_FILE, 'utf-8')) as Record<string, unknown>[]
            }
            projects.push(project)
            await ensureDir(join(WORKSPACE_DIR, 'grandview-os', 'data'))
            await writeFile(PROJECTS_FILE, JSON.stringify(projects, null, 2))
            res.end(JSON.stringify(project))
            return
          }

          const projectPatchMatch = url.pathname.match(/^\/api\/projects\/([^/]+)$/)
          if (projectPatchMatch && req.method === 'PATCH') {
            const body = await parseBody(req)
            const updates = JSON.parse(body) as Record<string, unknown>
            let projects: Array<Record<string, unknown>> = []
            if (await fileExists(PROJECTS_FILE)) {
              projects = JSON.parse(await readFile(PROJECTS_FILE, 'utf-8')) as Array<Record<string, unknown>>
            }
            projects = projects.map(p => (p as { id?: string }).id === projectPatchMatch[1] ? { ...p, ...updates } : p)
            await writeFile(PROJECTS_FILE, JSON.stringify(projects, null, 2))
            res.end(JSON.stringify({ ok: true }))
            return
          }

          // ---- REVIEWS ----
          if (url.pathname === '/api/reviews') {
            const { sessions: allSessions } = await getSessions()
            const totalTokens = allSessions.reduce((s, sess) => s + sess.totalTokens, 0)
            const totalCost = allSessions.reduce((s, sess) => s + sess.totalCost, 0)
            const review = {
              id: 'current',
              week: url.searchParams.get('week') ?? '2026-W10',
              startDate: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0],
              endDate: new Date().toISOString().split('T')[0],
              highlights: ['System operational', `${allSessions.length} sessions processed`],
              lowlights: [],
              metrics: { cost: totalCost, tokens: totalTokens, sessions: allSessions.length },
              agentPerformance: [{ name: 'Main', emoji: '🐕', sessions: allSessions.length, cost: totalCost, rating: 'good' }],
            }
            res.end(JSON.stringify([review]))
            return
          }

          // ---- IDEAS ----
          const IDEAS_FILE = join(WORKSPACE_DIR, 'grandview-os', 'data', 'ideas.json')

          if (url.pathname === '/api/ideas' && req.method === 'GET') {
            if (await fileExists(IDEAS_FILE)) {
              res.end(await readFile(IDEAS_FILE, 'utf-8'))
            } else {
              res.end(JSON.stringify([]))
            }
            return
          }

          if (url.pathname === '/api/ideas' && req.method === 'POST') {
            const body = await parseBody(req)
            const idea = JSON.parse(body) as Record<string, unknown>
            let ideas: Record<string, unknown>[] = []
            if (await fileExists(IDEAS_FILE)) {
              ideas = JSON.parse(await readFile(IDEAS_FILE, 'utf-8')) as Record<string, unknown>[]
            }
            ideas.push(idea)
            await ensureDir(join(WORKSPACE_DIR, 'grandview-os', 'data'))
            await writeFile(IDEAS_FILE, JSON.stringify(ideas, null, 2))
            res.end(JSON.stringify(idea))
            return
          }

          // ---- NOTIFICATIONS / TELEGRAM ----
          if (url.pathname === '/api/notifications/telegram' && req.method === 'POST') {
            const body = await parseBody(req)
            const { message } = JSON.parse(body) as { message: string }
            try {
              const configRaw = await readFile(GRANDVIEW_CONFIG_FILE, 'utf-8')
              const gvConfig = JSON.parse(configRaw) as { telegramBotToken?: string; telegramChatId?: string }
              if (!gvConfig.telegramBotToken || !gvConfig.telegramChatId) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Telegram not configured. Set telegramBotToken and telegramChatId in ~/.grandviewos/config.json' }))
                return
              }
              const tgRes = await fetch(`https://api.telegram.org/bot${gvConfig.telegramBotToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: gvConfig.telegramChatId, text: message, parse_mode: 'Markdown' }),
              })
              const tgData = await tgRes.json()
              res.end(JSON.stringify({ ok: true, telegram: tgData }))
            } catch {
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'Failed to send Telegram message' }))
            }
            return
          }

          if (url.pathname === '/api/notifications/test' && req.method === 'POST') {
            res.end(JSON.stringify({ ok: true, message: 'Notification endpoint ready' }))
            return
          }

          // ---- INTEGRATIONS / SECRETS / MCP / LLM / PERMISSIONS ----
          const handled = await handleIntegrationsApi(req, res, url.pathname, req.method ?? 'GET')
          if (handled) return

          res.statusCode = 404
          res.end(JSON.stringify({ error: 'Not found' }))
        } catch (err) {
          if (!res.headersSent) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: String(err) }))
          }
        }
      })
    },
  }
}
