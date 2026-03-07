/**
 * OpenClaw Bridge API — reads local OpenClaw filesystem data
 * and exposes it as REST endpoints for GrandviewOS
 */
import { Router } from 'express'
import { readdir, readFile, stat } from 'fs/promises'
import { join } from 'path'

const router = Router()
const OPENCLAW_DIR = process.env.OPENCLAW_DIR || '/home/ubuntu/.openclaw'

// --- Helpers ---

async function readJsonl(filePath: string): Promise<any[]> {
  try {
    const content = await readFile(filePath, 'utf-8')
    return content.trim().split('\n').filter(Boolean).map(line => {
      try { return JSON.parse(line) } catch { return null }
    }).filter(Boolean)
  } catch { return [] }
}

async function getSessionFiles(): Promise<string[]> {
  const files: string[] = []
  const agentsDir = join(OPENCLAW_DIR, 'agents')
  try {
    const agents = await readdir(agentsDir)
    for (const agent of agents) {
      const sessDir = join(agentsDir, agent, 'sessions')
      try {
        const sessions = await readdir(sessDir)
        for (const s of sessions) {
          if (s.endsWith('.jsonl')) files.push(join(sessDir, s))
        }
      } catch { /* no sessions dir */ }
    }
  } catch { /* no agents dir */ }
  return files
}

function extractSessionMeta(lines: any[], filePath: string) {
  const sessionLine = lines.find(l => l.type === 'session')
  const modelLine = lines.find(l => l.type === 'model_change')
  const messages = lines.filter(l => l.type === 'message')
  const costLines = lines.filter(l => l.type === 'usage' || l.type === 'custom' && l.customType === 'cost')
  
  // Calculate tokens and cost from message usage entries
  let totalTokens = 0
  let totalCost = 0
  for (const l of lines) {
    const usage = l.message?.usage || l.usage
    if (usage) {
      totalTokens += usage.totalTokens || ((usage.input || 0) + (usage.output || 0) + (usage.cacheRead || 0) + (usage.cacheWrite || 0))
      const cost = typeof usage.cost === 'object' ? usage.cost.total || 0 : (usage.cost || 0)
      totalCost += cost
    }
  }

  const id = sessionLine?.id || filePath.split('/').pop()?.replace('.jsonl', '') || 'unknown'
  const lastMessage = messages[messages.length - 1]
  const firstTimestamp = sessionLine?.timestamp || lines[0]?.timestamp
  const lastTimestamp = lastMessage?.timestamp || lines[lines.length - 1]?.timestamp

  // Extract title from first user message
  let title = `Session ${id.slice(0, 8)}`
  const firstUserMsg = messages.find(l => l.message?.role === 'user')
  if (firstUserMsg) {
    const content = firstUserMsg.message?.content
    let text = ''
    if (typeof content === 'string') text = content
    else if (Array.isArray(content)) text = content.map((c: any) => c.text || '').join('')
    text = text.trim().replace(/\n/g, ' ')
    if (text.length > 0) title = text.slice(0, 60) + (text.length > 60 ? '…' : '')
  }

  return {
    id,
    title,
    model: modelLine?.modelId || 'unknown',
    provider: modelLine?.provider || 'unknown',
    messageCount: messages.length,
    totalTokens,
    totalCost: Math.round(totalCost * 10000) / 10000,
    isActive: false, // will be updated below
    timestamp: firstTimestamp,
    lastActivity: lastTimestamp,
    agent: filePath.includes('/agents/') ? filePath.split('/agents/')[1]?.split('/')[0] : 'unknown',
  }
}

// --- Routes ---

// Health check
router.get('/health', (_req, res) => {
  res.json({ ok: true, gatewayRunning: true, version: 'bridge-1.0', timestamp: new Date().toISOString() })
})

// List all sessions
router.get('/sessions', async (_req, res) => {
  try {
    const files = await getSessionFiles()
    const sessions = []
    for (const f of files) {
      const lines = await readJsonl(f)
      if (lines.length === 0) continue
      const meta = extractSessionMeta(lines, f)
      // Check if active (last activity within 5 min)
      if (meta.lastActivity) {
        const lastAct = new Date(meta.lastActivity).getTime()
        meta.isActive = Date.now() - lastAct < 5 * 60 * 1000
      }
      sessions.push(meta)
    }
    // Sort by last activity descending
    sessions.sort((a, b) => new Date(b.lastActivity || 0).getTime() - new Date(a.lastActivity || 0).getTime())
    res.json({ sessions })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// Get session transcript
router.get('/sessions/:id/transcript', async (req, res) => {
  try {
    const files = await getSessionFiles()
    const target = files.find(f => f.includes(req.params.id))
    if (!target) return res.status(404).json({ error: 'Session not found' })
    const lines = await readJsonl(target)
    const meta = extractSessionMeta(lines, target)
    const messages = lines.filter(l => l.type === 'message').map(l => {
      const usage = l.message?.usage
      return {
        role: l.message?.role || 'unknown',
        content: typeof l.message?.content === 'string' ? l.message.content : 
          Array.isArray(l.message?.content) ? l.message.content.map((c: any) => c.text || '').join('') : '',
        timestamp: l.timestamp,
        isToolCall: l.message?.content?.some?.((c: any) => c.type === 'tool_use') || false,
        toolName: l.message?.content?.find?.((c: any) => c.type === 'tool_use')?.name,
        usage: usage ? {
          totalTokens: usage.totalTokens || 0,
          cost: { total: typeof usage.cost === 'object' ? usage.cost.total || 0 : usage.cost || 0 },
        } : undefined,
      }
    })
    res.json({ ...meta, messages })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// List cron jobs
router.get('/cron-jobs', async (_req, res) => {
  try {
    const jobsFile = join(OPENCLAW_DIR, 'cron', 'jobs.json')
    const content = await readFile(jobsFile, 'utf-8')
    const data = JSON.parse(content)
    res.json(data.jobs || [])
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// System info
router.get('/system/health', async (_req, res) => {
  try {
    const files = await getSessionFiles()
    const cronFile = join(OPENCLAW_DIR, 'cron', 'jobs.json')
    let cronCount = 0
    try {
      const c = JSON.parse(await readFile(cronFile, 'utf-8'))
      cronCount = c.jobs?.length || 0
    } catch {}
    
    res.json({
      gatewayRunning: true,
      sessionCount: files.length,
      cronJobCount: cronCount,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// List workspace files for an agent
router.get('/agents/:slug/files', async (req, res) => {
  try {
    const workspaceDir = join(OPENCLAW_DIR, 'workspace')
    const files: Array<{ name: string; size: number }> = []
    try {
      const entries = await readdir(workspaceDir)
      for (const entry of entries) {
        try {
          const fp = join(workspaceDir, entry)
          const s = await stat(fp)
          if (s.isFile()) files.push({ name: entry, size: s.size })
        } catch { /* skip */ }
      }
    } catch { /* dir doesn't exist */ }
    res.json(files)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// Read workspace file content
router.get('/agents/:slug/files/:name', async (req, res) => {
  try {
    const filePath = join(OPENCLAW_DIR, 'workspace', req.params.name)
    const content = await readFile(filePath, 'utf-8')
    res.json({ content })
  } catch (err) {
    res.status(404).json({ error: 'File not found' })
  }
})

// --- Memory endpoints ---

const WORKSPACE_DIR = process.env.OPENCLAW_WORKSPACE || join(OPENCLAW_DIR, 'workspace')
const MEMORY_DIR = join(WORKSPACE_DIR, 'memory')
const MEMORY_MD = join(WORKSPACE_DIR, 'MEMORY.md')

router.get('/memory/main', async (_req, res) => {
  try {
    const content = await readFile(MEMORY_MD, 'utf-8')
    res.json({ name: 'MEMORY.md', content })
  } catch {
    res.status(404).json({ error: 'MEMORY.md not found' })
  }
})

router.get('/memory/files', async (_req, res) => {
  try {
    const entries = await readdir(MEMORY_DIR)
    const files: Array<{ name: string; size: number; modified: string }> = []
    for (const name of entries) {
      try {
        const s = await stat(join(MEMORY_DIR, name))
        if (s.isFile()) files.push({ name, size: s.size, modified: s.mtime.toISOString() })
      } catch { /* skip */ }
    }
    files.sort((a, b) => b.modified.localeCompare(a.modified))
    res.json({ files })
  } catch {
    res.json({ files: [] })
  }
})

router.get('/memory/files/:name', async (req, res) => {
  try {
    const name = req.params.name
    if (name.includes('/') || name.includes('..')) { res.status(400).json({ error: 'Invalid filename' }); return }
    const content = await readFile(join(MEMORY_DIR, name), 'utf-8')
    res.json({ name, content })
  } catch {
    res.status(404).json({ error: 'File not found' })
  }
})

// --- Automations (cron jobs with metadata) ---

router.get('/automations', async (_req, res) => {
  try {
    const jobsFile = join(OPENCLAW_DIR, 'cron', 'jobs.json')
    const content = await readFile(jobsFile, 'utf-8')
    const data = JSON.parse(content)
    const jobs = (data.jobs || []).map((j: any) => ({
      id: j.id,
      name: j.name || 'Unnamed',
      enabled: j.enabled ?? true,
      agent: j.agentId || 'main',
      schedule: j.schedule?.expr || j.schedule?.kind || 'unknown',
      timezone: j.schedule?.tz || 'UTC',
      scheduleKind: j.schedule?.kind || 'cron',
      sessionTarget: j.sessionTarget || 'isolated',
      lastRun: j.state?.lastRunAtMs ? new Date(j.state.lastRunAtMs).toISOString() : null,
      nextRun: j.state?.nextRunAtMs ? new Date(j.state.nextRunAtMs).toISOString() : null,
      lastStatus: j.state?.lastStatus || null,
      lastError: j.state?.lastError || null,
      consecutiveErrors: j.state?.consecutiveErrors || 0,
      description: j.payload?.message?.slice(0, 200) || '',
    }))
    res.json({ automations: jobs })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// --- Projects (parse trello-state.md) ---

function parseTrelloState(content: string): Array<{ list: string; count: number; cards: Array<{ title: string; labels: string[] }> }> {
  const lists: Array<{ list: string; count: number; cards: Array<{ title: string; labels: string[] }> }> = []
  let currentList: { list: string; count: number; cards: Array<{ title: string; labels: string[] }> } | null = null

  for (const line of content.split('\n')) {
    const headerMatch = line.match(/^## (.+?)(?:\s*\((\d+)\))?\s*$/)
    if (headerMatch) {
      if (currentList) lists.push(currentList)
      currentList = { list: headerMatch[1].trim(), count: parseInt(headerMatch[2] || '0'), cards: [] }
      continue
    }
    if (currentList && line.startsWith('- ')) {
      const cardText = line.slice(2).trim()
      if (cardText === '_empty_') continue
      // Extract labels in parentheses at end
      const labelMatch = cardText.match(/\(([^)]+)\)\s*$/)
      const labels = labelMatch ? labelMatch[1].split(',').map(l => l.trim()) : []
      const title = labelMatch ? cardText.slice(0, cardText.lastIndexOf('(')).trim() : cardText
      currentList.cards.push({ title, labels })
    }
  }
  if (currentList) lists.push(currentList)
  return lists
}

router.get('/projects', async (_req, res) => {
  try {
    const trelloFile = join(MEMORY_DIR, 'trello-state.md')
    const content = await readFile(trelloFile, 'utf-8')
    // Extract sync time
    const syncMatch = content.match(/Last synced: (.+)/)
    const lastSynced = syncMatch ? syncMatch[1].trim() : null
    // Extract board name
    const boardMatch = content.match(/^# (.+)/m)
    const boardName = boardMatch ? boardMatch[1].trim() : 'Projects'

    const lists = parseTrelloState(content)
    res.json({ boardName, lastSynced, lists })
  } catch (err) {
    res.status(404).json({ error: 'trello-state.md not found' })
  }
})

export default router
