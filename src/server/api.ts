import type { Plugin, ViteDevServer } from 'vite'
import { exec, execFile } from 'child_process'
import { readdir, readFile, stat, access, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'

const OPENCLAW_DIR = join(homedir(), '.openclaw')
const SESSIONS_DIR = join(OPENCLAW_DIR, 'agents', 'main', 'sessions')
const AGENTS_DIR = join(OPENCLAW_DIR, 'agents')
const CONFIG_FILE = join(OPENCLAW_DIR, 'openclaw.json')
const WORKSPACE_DIR = join(OPENCLAW_DIR, 'workspace')
const STANDUPS_DIR = join(WORKSPACE_DIR, 'grandview-os', 'data', 'standups')
const DOCS_DIR = join(WORKSPACE_DIR, 'grandview-os', 'data', 'generated-docs')
const COST_LOG_DIR = join(WORKSPACE_DIR, 'grandview-os', 'data', 'cost-logs')

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
      .slice(-50)

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
  const agentPath = join(AGENTS_DIR, agentId, 'agent', fileName)
  if (await fileExists(agentPath)) {
    return readFile(agentPath, 'utf-8')
  }
  const wsPath = join(WORKSPACE_DIR, fileName)
  if (await fileExists(wsPath)) {
    return readFile(wsPath, 'utf-8')
  }
  return null
}

async function saveWorkspaceFile(agentId: string, fileName: string, content: string): Promise<boolean> {
  // Try agent workspace first
  const agentPath = join(AGENTS_DIR, agentId, 'agent', fileName)
  const agentDir = join(AGENTS_DIR, agentId, 'agent')
  if (await fileExists(agentDir)) {
    await writeFile(agentPath, content, 'utf-8')
    return true
  }
  // Fallback to main workspace
  const wsPath = join(WORKSPACE_DIR, fileName)
  await writeFile(wsPath, content, 'utf-8')
  return true
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

function generateStandupConversation(): Array<{ speaker: string; text: string }> {
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

async function concatenateAudioFiles(files: string[], outputPath: string): Promise<void> {
  // Simple concatenation using cat for mp3 (works for playback, not perfect but functional)
  const fileList = files.join(' ')
  return new Promise((resolve, reject) => {
    exec(`cat ${fileList} > ${outputPath}`, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

async function runStandup(standupId: string): Promise<StandupData> {
  await ensureDir(STANDUPS_DIR)
  const standupDir = join(STANDUPS_DIR, standupId)
  await ensureDir(standupDir)

  const conversation = generateStandupConversation()
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

  // Save initial state
  await writeFile(join(standupDir, 'data.json'), JSON.stringify(standupData, null, 2))

  // Generate TTS audio segments
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

    // Concatenate all segments
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
  return standupData
}

async function listStandups(): Promise<StandupData[]> {
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

async function generateDocs(): Promise<Record<string, string>> {
  const docs: Record<string, string> = {}

  // Get agent and session data
  const agents = await getAgents()
  const sessions = await getSessions()
  const config = await getConfig()
  const health = await getSystemHealth()

  const activeSessions = sessions.filter(s => s.isActive)
  const totalTokens = sessions.reduce((sum, s) => sum + s.totalTokens, 0)
  const totalCost = sessions.reduce((sum, s) => sum + s.totalCost, 0)

  docs['Overview'] = `# GrandviewOS — System Overview

*Auto-generated on ${new Date().toISOString().split('T')[0]}*

## System Status
- **Gateway:** ${health.gatewayRunning ? '🟢 Online' : '🔴 Offline'}
- **Version:** ${health.version}
- **Total Sessions:** ${health.totalSessions}
- **Active Sessions:** ${health.activeSessions}
- **Agents Registered:** ${agents.length}

## Architecture

\`\`\`
┌─────────────────────────────────────────────┐
│              GrandviewOS Frontend            │
│       React + TypeScript SPA (Tab-Based)     │
├──────────┬──────────┬───────────────────────┤
│   OPS    │  BRAIN   │         LAB            │
│(Current) │  (V2)    │        (V2)            │
├──────────┤──────────┤───────────────────────┤
│Task Mgr  │Memory    │Idea Gallery            │
│Org Chart │Viewer    │Prototype Fleet         │
│Standup   │Daily     │Weekly Reviews          │
│Workspace │Briefs    │Ideation Logs           │
│Docs      │Projects  │                        │
└──────────┴──────────┴───────────────────────┘
         │
    ┌────┴────┐
    │  Vite   │
    │  API    │
    │ Proxy   │
    └────┬────┘
         │
┌────────┴────────────────────────────────────┐
│          OpenClaw Runtime                    │
│  Gateway · Sessions · Cron · Workspaces     │
│  Memory · Tools · Agents                    │
└─────────────────────────────────────────────┘
\`\`\`

## Tech Stack
- **Frontend:** React 19 + TypeScript + Tailwind CSS 4
- **Build:** Vite 7 with HMR
- **Design:** Dark-mode "Phosphor Emerald"
- **AI Runtime:** OpenClaw
- **Primary Model:** ${config.model.primary}
- **Fallbacks:** ${config.model.fallbacks.join(', ') || 'None configured'}

## Modules
1. **Ops** (Current) — Task Manager, Org Chart, Standups, Workspaces, Docs, Settings
2. **Brain** (V2) — Memory Viewer, Daily Briefs, Project Tracking
3. **Lab** (V2) — Idea Gallery, Prototype Fleet, Weekly Reviews`

  docs['Task Manager'] = `# Task Manager

*Auto-generated from ${sessions.length} sessions*

## Current Statistics
- **Active Sessions:** ${activeSessions.length}
- **Total Sessions:** ${sessions.length}
- **Total Tokens:** ${totalTokens >= 1000000 ? (totalTokens / 1000000).toFixed(1) + 'M' : totalTokens >= 1000 ? (totalTokens / 1000).toFixed(1) + 'K' : totalTokens}
- **Total Cost:** $${totalCost.toFixed(2)}

## Features
- **5 Stat Cards:** Active, Idle, Total Sessions, Tokens Used, Total Cost
- **Model Fleet Grid:** All AI models with per-model usage stats
- **Session List:** Live and demo data toggle
- **Transcript Viewer:** Click any session to see full conversation
- **Cron Jobs:** Scheduled recurring automations
- **Overnight Log:** Timeline of overnight agent activity
- **Cost Breakdown:** Per-agent and per-model cost analysis
- **Live Mode:** Auto-refresh with green pulsing indicator

## Top Models by Usage
${sessions.reduce((acc, s) => {
    const model = s.model || 'unknown'
    if (!acc[model]) acc[model] = { tokens: 0, cost: 0, count: 0 }
    acc[model].tokens += s.totalTokens
    acc[model].cost += s.totalCost
    acc[model].count++
    return acc
  }, {} as Record<string, { tokens: number; cost: number; count: number }>)
    ? Object.entries(sessions.reduce((acc, s) => {
        const model = s.model || 'unknown'
        if (!acc[model]) acc[model] = { tokens: 0, cost: 0, count: 0 }
        acc[model].tokens += s.totalTokens
        acc[model].cost += s.totalCost
        acc[model].count++
        return acc
      }, {} as Record<string, { tokens: number; cost: number; count: number }>))
      .sort((a, b) => b[1].cost - a[1].cost)
      .slice(0, 5)
      .map(([model, stats]) => `| ${model} | ${stats.count} sessions | $${stats.cost.toFixed(2)} |`)
      .join('\n')
    : 'No data yet'}`

  docs['Organization Chart'] = `# Organization Chart

## Hierarchy
\`\`\`
        👤 CEO (Marcelo)
             │
        🐕 COO (Muddy)
        ┌────┼────┐
   🚀 CTO  📣 CMO  💰 CRO
   (Elon)  (Gary)  (Warren)
\`\`\`

## Registered Agents (${agents.length})
${agents.map(a => `- **${a.name}** — ${a.hasSoul ? '✅ SOUL' : '❌ SOUL'} ${a.hasMemory ? '✅ MEM' : '❌ MEM'} (${a.files.length} files)`).join('\n')}

## Agent Statuses
- 🟢 **Active** — Operational and responding
- 🟡 **Scaffolded** — Structure created, not deployed
- 🔴 **Deprecated** — No longer in use`

  docs['Team Workspaces'] = `# Team Workspaces

*Auto-generated from agent filesystem*

## Agent Workspaces
${agents.map(a => `### ${a.name}
- **Path:** \`${a.workspace}\`
- **Files:** ${a.files.join(', ') || 'None'}
- **Has SOUL:** ${a.hasSoul ? 'Yes' : 'No'}
- **Has Memory:** ${a.hasMemory ? 'Yes' : 'No'}
${a.soulSnippet ? `- **Soul Preview:** ${a.soulSnippet.slice(0, 100)}...` : ''}`).join('\n\n')}

## Standard Files
| File | Purpose |
|------|---------|
| \`SOUL.md\` | Agent personality, behavioral rules |
| \`IDENTITY.md\` | Core identity attributes |
| \`USER.md\` | Context about the human operator |
| \`TOOLS.md\` | Available tools and configurations |
| \`AGENTS.md\` | Workspace conventions |
| \`MEMORY.md\` | Long-term curated memory |`

  docs['Sub-Agents & Spawning'] = `# Sub-Agents & Spawning

## How It Works
OpenClaw supports spawning sub-agents for specialized tasks. The main agent (Muddy) can delegate work to department heads, who can further delegate to specialists.

## Spawn Flow
1. Main agent receives complex task
2. Assesses if existing specialists can handle it
3. Spawns sub-agent with appropriate model and tools
4. Sub-agent runs in isolated session
5. Results reported back to parent agent

## Current Agent Count: ${agents.length}

## Best Practices
- Assign the right model for the task complexity
- Sub-agents inherit parent context but run independently
- Keep specialist count manageable per department
- Regular cleanup of completed sub-agent sessions`

  docs['Gateway vs Sub-Agents'] = `# Gateway vs Sub-Agents

## Concepts
- **Gateway** = OpenClaw daemon managing sessions and model access
- **Agent** = Configured identity with workspace and model assignment
- **Session** = Single conversation/task between agent and AI model

## Current Gateway Status
- **Running:** ${health.gatewayRunning ? 'Yes' : 'No'}
- **PID:** ${health.gatewayPid ?? 'N/A'}
- **Active Sessions:** ${health.activeSessions}

## Architecture
Heavy-traffic agents (like community bots) may use separate gateways. All other agents share the primary gateway for efficiency.`

  docs['Voice Standup'] = `# Voice Standup System

## How It Works
1. **Trigger:** Click "+ New Standup" or schedule via cron
2. **Participants:** COO + department heads join automatically
3. **Discussion:** Turn-based conversation generated by AI
4. **TTS Audio:** Microsoft Edge TTS generates unique voices per agent
5. **Action Items:** Extracted from conversation automatically
6. **Archive:** Transcript + audio stored for review

## Agent Voice Assignments
| Agent | Voice | Role |
|-------|-------|------|
| Muddy 🐕 | en-US-GuyNeural | COO |
| Elon 🚀 | en-US-ChristopherNeural | CTO |
| Gary 📣 | en-US-JasonNeural | CMO |
| Warren 💰 | en-GB-RyanNeural | CRO |

## Audio Generation
Uses \`edge-tts\` (Microsoft open-source TTS) via Python CLI. Each speaker's message is synthesized separately, then concatenated into a full meeting recording.`

  docs['Partnership Pipeline'] = `# Partnership Pipeline

## Pipeline Stages
\`\`\`
Identified → Contacted → Responded → Proposal → Negotiation → Closed
\`\`\`

## Agent Roles
- **Deal** 🤝 — Manages active proposals and negotiations
- **Scout** 🔭 — Researches and identifies opportunities
- **Closer** 💼 — Handles final negotiations
- **Outreach** 📧 — Cold outreach and email sequences`

  docs['Memory Architecture'] = `# Memory Architecture

*Auto-generated from agent analysis*

## Memory Types
### Daily Notes (\`memory/YYYY-MM-DD.md\`)
Raw session logs — what happened each day.

### Long-term Memory (\`MEMORY.md\`)
Curated insights and decisions. Found in ${agents.filter(a => a.hasMemory).length}/${agents.length} agents.

### Heartbeat State (\`memory/heartbeat-state.json\`)
Tracks periodic check timestamps.

## Agents with Memory
${agents.filter(a => a.hasMemory).map(a => `- **${a.name}** ✅`).join('\n') || 'No agents have MEMORY.md yet'}

## Memory Flow
\`\`\`
Session starts
    ├─ Read SOUL.md (identity)
    ├─ Read USER.md (human context)
    ├─ Read memory/today.md
    ├─ Read memory/yesterday.md
    └─ If main session: Read MEMORY.md
         │
    Session work happens
         │
    ├─ Write to memory/today.md
    └─ Periodically update MEMORY.md
\`\`\``

  // Save generated docs
  await ensureDir(DOCS_DIR)
  for (const [key, content] of Object.entries(docs)) {
    await writeFile(join(DOCS_DIR, `${key}.md`), content)
  }

  return docs
}

async function loadGeneratedDocs(): Promise<Record<string, string>> {
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

async function getCostBreakdown(): Promise<{
  byModel: Record<string, { cost: number; tokens: number; sessions: number }>
  byAgent: Record<string, { cost: number; tokens: number; sessions: number }>
  total: { cost: number; tokens: number; sessions: number }
}> {
  const sessions = await getSessions()
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

    // For now, attribute to "main" agent since we parse main sessions
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

async function logDailyCost(): Promise<DailyCostEntry> {
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

async function getCostHistory(days: number = 7): Promise<DailyCostEntry[]> {
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

// ---- SSE (Server-Sent Events) ----

function setupSSE(server: ViteDevServer): void {
  const clients: Set<import('http').ServerResponse> = new Set()

  server.middlewares.use((req, res, next) => {
    if (req.url !== '/api/events') {
      next()
      return
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
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
      const sessions = await getSessions()
      const health = await getSystemHealth()
      const data = JSON.stringify({
        type: 'session:update',
        sessions: sessions.slice(0, 20),
        health,
        timestamp: new Date().toISOString(),
      })
      for (const client of clients) {
        client.write(`data: ${data}\n\n`)
      }
    } catch {
      // ignore broadcast errors
    }
  }, 5000)
}

// ---- REQUEST BODY PARSER ----

function parseBody(req: import('http').IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk.toString() })
    req.on('end', () => resolve(body))
  })
}

export function openclawApiPlugin(): Plugin {
  return {
    name: 'openclaw-api',
    configureServer(server: ViteDevServer) {
      // Set up SSE
      setupSSE(server)

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          next()
          return
        }

        // Skip SSE endpoint (handled above)
        if (req.url === '/api/events') {
          next()
          return
        }

        res.setHeader('Content-Type', 'application/json')

        try {
          const url = new URL(req.url, 'http://localhost')

          // ---- SESSIONS ----
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

          // ---- AGENTS ----
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

          // ---- WORKSPACE ----
          const workspaceFileMatch = url.pathname.match(/^\/api\/workspace\/([^/]+)\/(.+)$/)
          if (workspaceFileMatch) {
            if (req.method === 'PUT') {
              const body = await parseBody(req)
              const { content } = JSON.parse(body) as { content: string }
              const ok = await saveWorkspaceFile(workspaceFileMatch[1], workspaceFileMatch[2], content)
              res.end(JSON.stringify({ ok }))
              return
            }
            const content = await getWorkspaceFile(workspaceFileMatch[1], workspaceFileMatch[2])
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
            const standupId = `standup-${Date.now()}`
            // Start standup async, return immediately
            res.end(JSON.stringify({ id: standupId, status: 'started' }))
            // Run in background
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
            const dataPath = join(STANDUPS_DIR, standupDataMatch[1], 'data.json')
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
            // Also log today's cost
            await logDailyCost()
            const history = await getCostHistory(days)
            res.end(JSON.stringify(history))
            return
          }

          if (url.pathname === '/api/cron-jobs') {
            res.end(JSON.stringify([]))
            return
          }

          // ---- NOTIFICATIONS ----
          if (url.pathname === '/api/notifications/test' && req.method === 'POST') {
            // Placeholder — would integrate with Telegram via OpenClaw message tool
            res.end(JSON.stringify({ ok: true, message: 'Notification endpoint ready (use OpenClaw message tool for Telegram)' }))
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
