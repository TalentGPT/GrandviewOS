/**
 * OpenClaw Bridge API — reads local OpenClaw filesystem data
 * and exposes it as REST endpoints for GrandviewOS
 */
import { Router } from 'express'
import { readdir, readFile, writeFile, stat, mkdir } from 'fs/promises'
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

// --- Trello API (dynamic board sync) ---

const TRELLO_KEY = process.env.TRELLO_API_KEY || ''
const TRELLO_TOKEN_VAL = process.env.TRELLO_API_TOKEN || ''
const TRELLO_CONFIG_FILE = join(WORKSPACE_DIR, 'memory', 'trello-config.json')

interface TrelloConfig {
  boardId: string
  boardUrl: string
  boardName: string
  lastSynced: string | null
}

async function loadTrelloConfig(): Promise<TrelloConfig | null> {
  try {
    const content = await readFile(TRELLO_CONFIG_FILE, 'utf-8')
    return JSON.parse(content)
  } catch { return null }
}

async function saveTrelloConfig(config: TrelloConfig): Promise<void> {
  await mkdir(join(WORKSPACE_DIR, 'memory'), { recursive: true })
  await writeFile(TRELLO_CONFIG_FILE, JSON.stringify(config, null, 2))
}

// List all Trello boards for the user
router.get('/trello/boards', async (_req, res) => {
  try {
    const url = `https://api.trello.com/1/members/me/boards?key=${TRELLO_KEY}&token=${TRELLO_TOKEN_VAL}&fields=name,url,shortLink`
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!resp.ok) { res.status(resp.status).json({ error: 'Trello API error' }); return }
    const boards = await resp.json() as Array<{ name: string; url: string; shortLink: string; id: string }>
    res.json({ boards: boards.map(b => ({ id: b.id, name: b.name, url: b.url, shortLink: b.shortLink })) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// Get current Trello config
router.get('/trello/config', async (_req, res) => {
  const config = await loadTrelloConfig()
  res.json(config || { boardId: null, boardUrl: null, boardName: null, lastSynced: null })
})

// Connect a Trello board (and trigger sync)
router.post('/trello/connect', async (req, res) => {
  try {
    const { boardUrl, boardId: directBoardId } = req.body as { boardUrl?: string; boardId?: string }
    let boardId = directBoardId || ''
    if (boardUrl) {
      const match = boardUrl.match(/trello\.com\/b\/([^/]+)/)
      if (!match) { res.status(400).json({ error: 'Invalid Trello board URL' }); return }
      boardId = match[1]
    }
    if (!boardId) { res.status(400).json({ error: 'No board ID provided' }); return }

    // Fetch board info
    const infoUrl = `https://api.trello.com/1/boards/${boardId}?key=${TRELLO_KEY}&token=${TRELLO_TOKEN_VAL}&fields=name,url,shortLink`
    const infoResp = await fetch(infoUrl, { signal: AbortSignal.timeout(15000) })
    if (!infoResp.ok) { res.status(400).json({ error: 'Could not fetch board info' }); return }
    const boardInfo = await infoResp.json() as { name: string; url: string; shortLink: string }

    // Sync board data
    const syncData = await syncTrelloBoard(boardId)
    const now = new Date().toISOString()

    const config: TrelloConfig = {
      boardId,
      boardUrl: boardInfo.url,
      boardName: boardInfo.name,
      lastSynced: now,
    }
    await saveTrelloConfig(config)

    // Save trello-state.md for backward compat
    await saveTrelloStateMd(boardInfo.name, now, syncData)

    res.json({ ok: true, config, board: { boardName: boardInfo.name, lastSynced: now, lists: syncData } })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// Sync current board
router.post('/trello/sync', async (req, res) => {
  try {
    const config = await loadTrelloConfig()
    if (!config?.boardId) { res.status(400).json({ error: 'No board configured' }); return }

    const syncData = await syncTrelloBoard(config.boardId)
    const now = new Date().toISOString()
    config.lastSynced = now
    await saveTrelloConfig(config)
    await saveTrelloStateMd(config.boardName, now, syncData)

    res.json({ ok: true, board: { boardName: config.boardName, lastSynced: now, lists: syncData } })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

async function syncTrelloBoard(boardId: string): Promise<Array<{ list: string; listId: string; count: number; cards: Array<{ id: string; title: string; labels: string[]; due: string | null }> }>> {
  const url = `https://api.trello.com/1/boards/${boardId}/lists?key=${TRELLO_KEY}&token=${TRELLO_TOKEN_VAL}&cards=open&card_fields=name,labels,due,dateLastActivity`
  const resp = await fetch(url, { signal: AbortSignal.timeout(30000) })
  if (!resp.ok) throw new Error(`Trello API error: ${resp.status}`)
  const lists = await resp.json() as Array<{ id: string; name: string; cards: Array<{ id: string; name: string; labels: Array<{ name: string }>; due: string | null }> }>

  return lists.map(l => ({
    list: l.name,
    listId: l.id,
    count: l.cards.length,
    cards: l.cards.map(c => ({
      id: c.id,
      title: c.name,
      labels: c.labels.map(lb => lb.name).filter(Boolean),
      due: c.due || null,
    })),
  }))
}

async function saveTrelloStateMd(boardName: string, syncTime: string, lists: Array<{ list: string; count: number; cards: Array<{ title: string; labels: string[] }> }>): Promise<void> {
  let md = `# ${boardName}\nLast synced: ${syncTime}\n\n`
  for (const l of lists) {
    md += `## ${l.list} (${l.count})\n`
    if (l.cards.length === 0) {
      md += '- _empty_\n'
    } else {
      for (const c of l.cards) {
        const labelStr = c.labels.length > 0 ? ` (${c.labels.join(', ')})` : ''
        md += `- ${c.title}${labelStr}\n`
      }
    }
    md += '\n'
  }
  await writeFile(join(MEMORY_DIR, 'trello-state.md'), md)
}

// --- Trello CRUD endpoints ---

// Create card
router.post('/trello/cards', async (req, res) => {
  try {
    const { listId, name, desc, due, labels } = req.body
    if (!listId || !name) { res.status(400).json({ error: 'listId and name required' }); return }
    const params = new URLSearchParams({ idList: listId, name, key: TRELLO_KEY, token: TRELLO_TOKEN_VAL })
    if (desc) params.set('desc', desc)
    if (due) params.set('due', due)
    const resp = await fetch(`https://api.trello.com/1/cards?${params}`, { method: 'POST', signal: AbortSignal.timeout(15000) })
    if (!resp.ok) { res.status(resp.status).json({ error: 'Trello API error' }); return }
    res.json(await resp.json())
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// Get card details
router.get('/trello/cards/:cardId', async (req, res) => {
  try {
    const url = `https://api.trello.com/1/cards/${req.params.cardId}?key=${TRELLO_KEY}&token=${TRELLO_TOKEN_VAL}&fields=name,desc,due,labels,idList,closed&actions=commentCard&actions_limit=10`
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!resp.ok) { res.status(resp.status).json({ error: 'Trello API error' }); return }
    res.json(await resp.json())
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// Update card
router.put('/trello/cards/:cardId', async (req, res) => {
  try {
    const params = new URLSearchParams({ key: TRELLO_KEY, token: TRELLO_TOKEN_VAL })
    const { name, desc, due, idList } = req.body
    if (name !== undefined) params.set('name', name)
    if (desc !== undefined) params.set('desc', desc)
    if (due !== undefined) params.set('due', due)
    if (idList !== undefined) params.set('idList', idList)
    const resp = await fetch(`https://api.trello.com/1/cards/${req.params.cardId}?${params}`, { method: 'PUT', signal: AbortSignal.timeout(15000) })
    if (!resp.ok) { res.status(resp.status).json({ error: 'Trello API error' }); return }
    res.json(await resp.json())
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// Move card
router.put('/trello/cards/:cardId/move', async (req, res) => {
  try {
    const { listId } = req.body
    if (!listId) { res.status(400).json({ error: 'listId required' }); return }
    const params = new URLSearchParams({ idList: listId, key: TRELLO_KEY, token: TRELLO_TOKEN_VAL })
    const resp = await fetch(`https://api.trello.com/1/cards/${req.params.cardId}?${params}`, { method: 'PUT', signal: AbortSignal.timeout(15000) })
    if (!resp.ok) { res.status(resp.status).json({ error: 'Trello API error' }); return }
    res.json(await resp.json())
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// Archive card
router.put('/trello/cards/:cardId/archive', async (req, res) => {
  try {
    const params = new URLSearchParams({ closed: 'true', key: TRELLO_KEY, token: TRELLO_TOKEN_VAL })
    const resp = await fetch(`https://api.trello.com/1/cards/${req.params.cardId}?${params}`, { method: 'PUT', signal: AbortSignal.timeout(15000) })
    if (!resp.ok) { res.status(resp.status).json({ error: 'Trello API error' }); return }
    res.json(await resp.json())
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// Delete card
router.delete('/trello/cards/:cardId', async (req, res) => {
  try {
    const resp = await fetch(`https://api.trello.com/1/cards/${req.params.cardId}?key=${TRELLO_KEY}&token=${TRELLO_TOKEN_VAL}`, { method: 'DELETE', signal: AbortSignal.timeout(15000) })
    if (!resp.ok) { res.status(resp.status).json({ error: 'Trello API error' }); return }
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// Create list
router.post('/trello/lists', async (req, res) => {
  try {
    const { boardId, name } = req.body
    if (!boardId || !name) { res.status(400).json({ error: 'boardId and name required' }); return }
    const params = new URLSearchParams({ name, idBoard: boardId, key: TRELLO_KEY, token: TRELLO_TOKEN_VAL })
    const resp = await fetch(`https://api.trello.com/1/lists?${params}`, { method: 'POST', signal: AbortSignal.timeout(15000) })
    if (!resp.ok) { res.status(resp.status).json({ error: 'Trello API error' }); return }
    res.json(await resp.json())
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// Add label to card
router.post('/trello/cards/:cardId/labels', async (req, res) => {
  try {
    const { labelId } = req.body
    if (!labelId) { res.status(400).json({ error: 'labelId required' }); return }
    const resp = await fetch(`https://api.trello.com/1/cards/${req.params.cardId}/idLabels?value=${labelId}&key=${TRELLO_KEY}&token=${TRELLO_TOKEN_VAL}`, { method: 'POST', signal: AbortSignal.timeout(15000) })
    if (!resp.ok) { res.status(resp.status).json({ error: 'Trello API error' }); return }
    res.json(await resp.json())
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// Add comment to card
router.post('/trello/cards/:cardId/comments', async (req, res) => {
  try {
    const { text } = req.body
    if (!text) { res.status(400).json({ error: 'text required' }); return }
    const resp = await fetch(`https://api.trello.com/1/cards/${req.params.cardId}/actions/comments?text=${encodeURIComponent(text)}&key=${TRELLO_KEY}&token=${TRELLO_TOKEN_VAL}`, { method: 'POST', signal: AbortSignal.timeout(15000) })
    if (!resp.ok) { res.status(resp.status).json({ error: 'Trello API error' }); return }
    res.json(await resp.json())
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// Get board lists (for move-to dropdown)
router.get('/trello/boards/:boardId/lists', async (req, res) => {
  try {
    const url = `https://api.trello.com/1/boards/${req.params.boardId}/lists?key=${TRELLO_KEY}&token=${TRELLO_TOKEN_VAL}&fields=name`
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!resp.ok) { res.status(resp.status).json({ error: 'Trello API error' }); return }
    res.json(await resp.json())
  } catch (err) { res.status(500).json({ error: String(err) }) }
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
