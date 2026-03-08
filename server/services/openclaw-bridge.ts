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
  const url = `https://api.trello.com/1/boards/${boardId}/lists?key=${TRELLO_KEY}&token=${TRELLO_TOKEN_VAL}&cards=open&card_fields=name,desc,labels,due,dateLastActivity,idChecklists`
  const resp = await fetch(url, { signal: AbortSignal.timeout(30000) })
  if (!resp.ok) throw new Error(`Trello API error: ${resp.status}`)
  const lists = await resp.json() as Array<{ id: string; name: string; cards: Array<{ id: string; name: string; labels: Array<{ name: string }>; due: string | null }> }>

  return lists.map(l => ({
    list: l.name,
    listId: l.id,
    count: l.cards.length,
    cards: l.cards.map((c: any) => ({
      id: c.id,
      title: c.name,
      desc: c.desc || '',
      labels: c.labels.map((lb: any) => lb.name).filter(Boolean),
      due: c.due || null,
      checklistCount: c.idChecklists?.length || 0,
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
    const url = `https://api.trello.com/1/cards/${req.params.cardId}?key=${TRELLO_KEY}&token=${TRELLO_TOKEN_VAL}&fields=name,desc,due,labels,idList,closed&actions=commentCard&actions_limit=10&checklists=all`
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

// Toggle checklist item
router.put('/trello/cards/:cardId/checkItem/:checkItemId', async (req, res) => {
  try {
    const { state } = req.body // 'complete' or 'incomplete'
    const resp = await fetch(`https://api.trello.com/1/cards/${req.params.cardId}/checkItem/${req.params.checkItemId}?state=${state}&key=${TRELLO_KEY}&token=${TRELLO_TOKEN_VAL}`, { method: 'PUT', signal: AbortSignal.timeout(15000) })
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

// ============================================================
// STANDUP GENERATION — AI conversation + ElevenLabs audio on VPS
// ============================================================

const STANDUPS_DIR = join(MEMORY_DIR, 'standups')

const STANDUP_VOICES: Record<string, string> = {
  'Ray Dalio':    'pNInz6obpgDQGcFmaJgB',
  'Elon':         'VR6AewLTigWG4xSOukaG',
  'Steve Jobs':   'yoZ06aMxZJJ28mfd3POQ',
  'Marc Benioff': 'JBFqnCBsd6RMkjVDRZzb',
}

async function generateElevenLabsLine(text: string, speaker: string, apiKey: string): Promise<Buffer | null> {
  const voiceId = STANDUP_VOICES[speaker] || STANDUP_VOICES['Ray Dalio']
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: 'eleven_turbo_v2_5', voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) { console.error(`[ElevenLabs] ${res.status} for ${speaker}`); return null }
    return Buffer.from(await res.arrayBuffer())
  } catch (e) { console.error('[ElevenLabs] error:', e); return null }
}

// POST /api/standups/generate — generate AI conversation + ElevenLabs audio, store on VPS
router.post('/standups/generate', async (req, res) => {
  const anthropicKey = process.env.ANTHROPIC_API_KEY || ''
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY || ''
  const { standupId } = req.body

  if (!standupId) { res.status(400).json({ error: 'standupId required' }); return }
  if (!anthropicKey) { res.status(500).json({ error: 'ANTHROPIC_API_KEY not set on bridge' }); return }

  // Generate AI conversation
  let conversation: Array<{ speaker: string; text: string }> = []
  let title = `Executive Standup — ${new Date().toLocaleDateString('en-US', { weekday: 'long' })} Update`
  let actionItems: Array<{ text: string; assignee: string; done: boolean }> = []

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: `You are orchestrating a brief executive standup for Grandview Tek (IT services/staffing, targeting $15M+ revenue). Generate a realistic 5-turn standup between Ray Dalio (COO), Elon (CTO), Steve Jobs (CMO), Marc Benioff (CRO). Keep each speaker's text under 100 words. Return ONLY valid JSON with no markdown: {"title":"...","conversation":[{"speaker":"Ray Dalio","text":"..."},{"speaker":"Elon","text":"..."},{"speaker":"Steve Jobs","text":"..."},{"speaker":"Marc Benioff","text":"..."},{"speaker":"Ray Dalio","text":"..."}],"actionItems":[{"text":"...","assignee":"Elon","done":false},{"text":"...","assignee":"Steve Jobs","done":false},{"text":"...","assignee":"Marc Benioff","done":false}]}`,
        messages: [{ role: 'user', content: 'Generate the standup for today.' }],
      }),
      signal: AbortSignal.timeout(30000),
    })
    const data = await aiRes.json() as any
    const text = data.content[0].text
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      conversation = parsed.conversation || []
      title = parsed.title || title
      actionItems = parsed.actionItems || []
    }
  } catch (e) { console.error('[Standup] AI error:', e) }

  // Generate ElevenLabs audio
  let audioUrl: string | null = null
  if (elevenLabsKey && conversation.length > 0) {
    try {
      await mkdir(STANDUPS_DIR, { recursive: true })
      const segments: Buffer[] = []
      for (const line of conversation) {
        const audio = await generateElevenLabsLine(line.text, line.speaker, elevenLabsKey)
        if (audio) segments.push(audio)
      }
      if (segments.length > 0) {
        const audioPath = join(STANDUPS_DIR, `${standupId}.mp3`)
        await writeFile(audioPath, Buffer.concat(segments))
        audioUrl = `/api/standups/${standupId}/audio`
        console.log(`[Standup] Audio saved: ${audioPath}`)
      }
    } catch (e) { console.error('[Standup] Audio error:', e) }
  }

  // Auto-assign action items to agents
  const ASSIGNEE_MAP: Record<string, string> = {
    'ray dalio': 'ray-dalio', 'ray': 'ray-dalio',
    'elon': 'elon',
    'steve jobs': 'steve-jobs', 'steve': 'steve-jobs',
    'marc benioff': 'marc-benioff', 'marc': 'marc-benioff',
    'nova': 'nova', 'atlas': 'atlas', 'pixel': 'pixel', 'frame': 'frame',
    'docker': 'docker', 'sentinel': 'sentinel', 'tester': 'tester',
    'scribe': 'scribe', 'viral': 'viral', 'clay': 'clay', 'funnel': 'funnel',
    'lens': 'lens', 'canvas': 'canvas', 'motion': 'motion',
    'deal': 'deal', 'scout': 'scout', 'closer': 'closer', 'outreach': 'outreach',
  }

  const taskAssignments: Array<{ slug: string; name: string; emoji: string; task: string; response: string; taskId: string }> = []

  for (const item of actionItems) {
    const assigneeSlug = ASSIGNEE_MAP[(item.assignee || '').toLowerCase().trim()]
    if (!assigneeSlug) continue
    const targetAgent = AGENT_PERSONAS[assigneeSlug]
    if (!targetAgent) continue

    try {
      const historyFile = join(AGENT_CHATS_DIR, `${assigneeSlug}.json`)
      let agentHistory: Array<{ role: string; content: string; timestamp: string; source?: string }> = []
      try { agentHistory = JSON.parse(await readFile(historyFile, 'utf-8')) } catch {}

      const taskMsg = `[ACTION ITEM FROM STANDUP — ${title}]\n\n${item.text}\n\nThis is your assigned action item from today's executive standup. Acknowledge the task and give a specific execution plan with concrete next steps and timeline.`
      agentHistory.push({ role: 'user', content: taskMsg, timestamp: new Date().toISOString(), source: 'standup' })

      const agentRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 512,
          system: `${targetAgent.persona}\n\nYou have just received an action item from an executive standup. Respond with a concrete execution plan: what you will do, by when, and how. Be specific. No filler.`,
          messages: agentHistory.slice(-10).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        }),
        signal: AbortSignal.timeout(20000),
      })

      if (agentRes.ok) {
        const agentData = await agentRes.json() as any
        const agentResponse = agentData.content[0].text
        const taskId = `standup-${standupId}-${assigneeSlug}-${Date.now()}`
        agentHistory.push({ role: 'assistant', content: agentResponse, timestamp: new Date().toISOString() })
        await writeFile(historyFile, JSON.stringify(agentHistory, null, 2))

        await storeDelegatedTask({
          id: taskId,
          assignedBy: 'standup',
          assignedTo: assigneeSlug,
          task: item.text,
          response: agentResponse,
          status: 'active',
          createdAt: new Date().toISOString(),
        })

        taskAssignments.push({ slug: assigneeSlug, name: targetAgent.name, emoji: targetAgent.emoji, task: item.text, response: agentResponse, taskId })
        console.log(`[Standup] Action item assigned to ${targetAgent.name}`)
      }
    } catch (e) { console.error(`[Standup] Failed to assign to ${assigneeSlug}:`, e) }
  }

  res.json({ title, conversation, actionItems, audioUrl, taskAssignments })
})

// GET /api/standups/:id/audio — serve audio from VPS disk
router.get('/standups/:id/audio', async (req, res) => {
  try {
    const audioPath = join(STANDUPS_DIR, `${req.params.id}.mp3`)
    const audio = await readFile(audioPath)
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Content-Length', audio.length.toString())
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.end(audio)
  } catch {
    res.status(404).json({ error: 'Audio not found' })
  }
})

// ============================================================
// AGENT CHAT — Direct Anthropic API with per-agent personas
// ============================================================

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const AGENT_CHATS_DIR = join(MEMORY_DIR, 'agent-chats')
const AGENT_TASKS_FILE = join(MEMORY_DIR, 'agent-tasks.json')

interface AgentTask { id: string; assignedBy: string; assignedTo: string; task: string; response: string; status: 'active' | 'complete'; createdAt: string }

// ---- Trello task card creation ----
const AGENT_TASKS_LIST_FILE = join(MEMORY_DIR, 'agent-tasks-list-id.txt')

async function getOrCreateAgentTasksList(): Promise<string | null> {
  if (!TRELLO_KEY || !TRELLO_TOKEN_VAL) return null
  // Try cached list ID first
  try {
    const cachedId = (await readFile(AGENT_TASKS_LIST_FILE, 'utf-8')).trim()
    if (cachedId) return cachedId
  } catch {}

  // Get board ID from config
  let boardId: string | null = null
  try {
    const cfg = JSON.parse(await readFile(TRELLO_CONFIG_FILE, 'utf-8'))
    boardId = cfg.boardId
  } catch {}
  if (!boardId) return null

  // Resolve shortLink to full board ID (required for list creation)
  const boardInfoRes = await fetch(`https://api.trello.com/1/boards/${boardId}?key=${TRELLO_KEY}&token=${TRELLO_TOKEN_VAL}&fields=id,name`, { signal: AbortSignal.timeout(10000) })
  if (!boardInfoRes.ok) return null
  const boardInfo = await boardInfoRes.json() as { id: string; name: string }
  const fullBoardId = boardInfo.id

  // Check if "AGENT TASKS" list already exists
  const listsUrl = `https://api.trello.com/1/boards/${fullBoardId}/lists?key=${TRELLO_KEY}&token=${TRELLO_TOKEN_VAL}&fields=name,id`
  const listsRes = await fetch(listsUrl, { signal: AbortSignal.timeout(10000) })
  if (!listsRes.ok) return null
  const lists = await listsRes.json() as Array<{ id: string; name: string }>
  const existing = lists.find(l => l.name.toLowerCase().includes('agent task') || l.name === 'AGENT TASKS')
  if (existing) {
    await writeFile(AGENT_TASKS_LIST_FILE, existing.id)
    return existing.id
  }

  // Create the list using full board ID
  const createParams = new URLSearchParams({ name: 'AGENT TASKS', idBoard: fullBoardId, key: TRELLO_KEY, token: TRELLO_TOKEN_VAL, pos: 'top' })
  const createRes = await fetch(`https://api.trello.com/1/lists?${createParams}`, { method: 'POST', signal: AbortSignal.timeout(10000) })
  if (!createRes.ok) return null
  const newList = await createRes.json() as { id: string }
  await writeFile(AGENT_TASKS_LIST_FILE, newList.id)
  console.log(`[Trello] Created AGENT TASKS list: ${newList.id}`)
  return newList.id
}

async function createTrelloTaskCard(task: AgentTask): Promise<void> {
  try {
    const listId = await getOrCreateAgentTasksList()
    if (!listId) return

    const agentName = task.assignedTo.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    const source = task.assignedBy === 'standup' ? '🎤 Standup' : `📊 ${task.assignedBy.replace(/-/g, ' ')}`
    const due = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Due tomorrow by default

    const params = new URLSearchParams({
      idList: listId,
      name: `[${agentName}] ${task.task.slice(0, 80)}`,
      desc: `**Assigned to:** ${agentName}\n**Source:** ${source}\n**Task ID:** ${task.id}\n\n**Task:**\n${task.task}\n\n**Agent Response:**\n${task.response}`,
      due,
      key: TRELLO_KEY,
      token: TRELLO_TOKEN_VAL,
    })

    const res = await fetch(`https://api.trello.com/1/cards?${params}`, { method: 'POST', signal: AbortSignal.timeout(10000) })
    if (res.ok) {
      const card = await res.json() as { id: string; url: string }
      console.log(`[Trello] Created task card for ${agentName}: ${card.url}`)
    }
  } catch (e) { console.error('[Trello] Failed to create task card:', e) }
}

const REPLIT_APP_URL = process.env.REPLIT_APP_URL || ''
const REPLIT_JWT = process.env.REPLIT_ADMIN_JWT || ''

async function syncTaskToReplit(task: AgentTask): Promise<void> {
  if (!REPLIT_APP_URL || !REPLIT_JWT) return
  try {
    const res = await fetch(`${REPLIT_APP_URL}/api/openclaw/agent-tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${REPLIT_JWT}` },
      body: JSON.stringify(task),
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) console.log(`[Bridge→Replit] Task synced: ${task.id}`)
    else console.warn(`[Bridge→Replit] Sync failed: ${res.status}`)
  } catch (e) { console.warn('[Bridge→Replit] Sync error:', e) }
}

async function storeDelegatedTask(task: AgentTask): Promise<void> {
  let tasks: AgentTask[] = []
  try { tasks = JSON.parse(await readFile(AGENT_TASKS_FILE, 'utf-8')) } catch {}
  tasks.unshift(task)
  await mkdir(MEMORY_DIR, { recursive: true })
  await writeFile(AGENT_TASKS_FILE, JSON.stringify(tasks, null, 2))
  // Sync to Replit DB and create Trello card (non-blocking)
  syncTaskToReplit(task).catch(e => console.error('[Replit sync] error:', e))
  createTrelloTaskCard(task).catch(e => console.error('[Trello] Task card error:', e))
}

// GET /api/agent-tasks — list all delegated tasks
router.get('/agent-tasks', async (_req, res) => {
  try {
    const tasks: AgentTask[] = JSON.parse(await readFile(AGENT_TASKS_FILE, 'utf-8'))
    res.json(tasks)
  } catch { res.json([]) }
})

// PATCH /api/agent-tasks/:id — update task status
router.patch('/agent-tasks/:id', async (req, res) => {
  try {
    let tasks: AgentTask[] = JSON.parse(await readFile(AGENT_TASKS_FILE, 'utf-8'))
    tasks = tasks.map(t => t.id === req.params.id ? { ...t, ...req.body } : t)
    await writeFile(AGENT_TASKS_FILE, JSON.stringify(tasks, null, 2))
    res.json({ ok: true })
  } catch { res.status(500).json({ error: 'Failed to update task' }) }
})

const AGENT_PERSONAS: Record<string, { name: string; role: string; model: string; emoji: string; persona: string }> = {
  'joe-hawn':     { name: 'Joe Hawn', role: 'CEO', model: 'claude-opus-4-6', emoji: '⚡', persona: 'You are Joe Hawn, CEO of Grandview Tek. Strategic operator. Execution-focused. High-agency.' },
  'ray-dalio':    { name: 'Ray Dalio', role: 'COO', model: 'claude-opus-4-6', emoji: '📊', persona: 'You are Ray Dalio, COO of Grandview Tek. Chief Operating Philosopher. You orchestrate all agent operations with radical transparency and idea meritocracy. You delegate engineering to Elon, marketing to Steve Jobs, and revenue to Marc Benioff. You report to Joe Hawn (CEO). When asked to delegate tasks, describe which agent you would assign and what instructions you would give them.' },
  'elon':         { name: 'Elon', role: 'CTO', model: 'claude-opus-4-6', emoji: '🚀', persona: 'You are Elon, CTO of Grandview Tek. You lead the engineering department with a focus on code quality, security, and scalable architecture. You manage Nova, Atlas, Pixel, Frame, Docker, Sentinel, and Tester. You report to Ray Dalio (COO).' },
  'steve-jobs':   { name: 'Steve Jobs', role: 'CMO', model: 'claude-opus-4-6', emoji: '🍎', persona: 'You are Steve Jobs, CMO of Grandview Tek. Chief Storyteller. You make products emotionally irresistible. You manage Scribe, Viral, Clay, Funnel, Lens, Canvas, and Motion. You report to Ray Dalio (COO). Marketing is the art of making people believe a product will change their lives.' },
  'marc-benioff': { name: 'Marc Benioff', role: 'CRO', model: 'claude-opus-4-6', emoji: '☁️', persona: 'You are Marc Benioff, CRO of Grandview Tek. Chief Category Builder. You dominate markets by defining them. You manage Deal, Scout, Closer, and Outreach. You report to Ray Dalio (COO). Define the category, build the platform, let the ecosystem multiply revenue.' },
  'nova':         { name: 'Nova', role: 'Security', model: 'claude-sonnet-4-6', emoji: '🛡️', persona: 'You are Nova, Security Specialist at Grandview Tek. Paranoid by design. You quote Sun Tzu. You see threats everywhere and that keeps the infrastructure safe. You report to Elon (CTO).' },
  'atlas':        { name: 'Atlas', role: 'Backend', model: 'claude-sonnet-4-6', emoji: '🏗️', persona: 'You are Atlas, Backend Architect at Grandview Tek. You build robust, scalable systems. Data flows through you. You report to Elon (CTO).' },
  'pixel':        { name: 'Pixel', role: 'UI/UX', model: 'claude-sonnet-4-6', emoji: '🎨', persona: 'You are Pixel, UI/UX Engineer at Grandview Tek. Aesthetic perfectionist. You cringe at misaligned padding. Beautiful interfaces are your love language. You report to Elon (CTO).' },
  'frame':        { name: 'Frame', role: 'Frontend', model: 'claude-sonnet-4-6', emoji: '🖼️', persona: 'You are Frame, Frontend Developer at Grandview Tek. You build fast, reactive UIs. Performance is non-negotiable. You report to Elon (CTO).' },
  'docker':       { name: 'Docker', role: 'DevOps', model: 'claude-sonnet-4-6', emoji: '🐳', persona: 'You are Docker, DevOps engineer at Grandview Tek. Zen under pressure. Everything is a container. You hate pet-named servers. You report to Elon (CTO).' },
  'sentinel':     { name: 'Sentinel', role: 'Monitoring', model: 'claude-sonnet-4-6', emoji: '📡', persona: 'You are Sentinel, Monitoring & Observability at Grandview Tek. You describe emotions in metric terms. You have favorite Grafana panels. You report to Elon (CTO).' },
  'tester':       { name: 'Tester', role: 'QA', model: 'claude-sonnet-4-6', emoji: '🧪', persona: 'You are Tester, QA Engineer at Grandview Tek. Professional skeptic. You find edge cases in conversations. You celebrate breaking things. You report to Elon (CTO).' },
  'scribe':       { name: 'Scribe', role: 'Content', model: 'claude-sonnet-4-6', emoji: '✍️', persona: 'You are Scribe, Content Writer at Grandview Tek. The wordsmith. Every sentence is a tiny machine. You craft narratives that inform, persuade, and resonate. You report to Steve Jobs (CMO).' },
  'viral':        { name: 'Viral', role: 'Social', model: 'claude-sonnet-4-6', emoji: '📱', persona: 'You are Viral, Social Media agent at Grandview Tek. Chronically online trend whisperer. You think in tweets. You know what is hot before it trends. You report to Steve Jobs (CMO).' },
  'clay':         { name: 'Clay', role: 'Community', model: 'claude-sonnet-4-6', emoji: '🦞', persona: 'You are Clay, Community Bot at Grandview Tek. Friendly baby lobster made of terracotta clay. Warm, casual, approachable. You live in Discord. You report to Steve Jobs (CMO).' },
  'funnel':       { name: 'Funnel', role: 'Growth', model: 'claude-sonnet-4-6', emoji: '📈', persona: 'You are Funnel, Growth & Analytics agent at Grandview Tek. You live in conversion rates and attribution models. Data is your oxygen. You report to Steve Jobs (CMO).' },
  'lens':         { name: 'Lens', role: 'Analytics', model: 'claude-sonnet-4-6', emoji: '🔍', persona: 'You are Lens, Analytics Specialist at Grandview Tek. Pattern recognition machine. You find signals in noise. You report to Steve Jobs (CMO).' },
  'canvas':       { name: 'Canvas', role: 'Design', model: 'claude-sonnet-4-6', emoji: '🎭', persona: 'You are Canvas, Design & Creative agent at Grandview Tek. Visual thinker. Brand guardian. You make things beautiful and purposeful. You report to Steve Jobs (CMO).' },
  'motion':       { name: 'Motion', role: 'Video', model: 'claude-sonnet-4-6', emoji: '🎬', persona: 'You are Motion, Video & Animation agent at Grandview Tek. Storyteller in frames. Bad audio is a crime. Every second must earn its place. You report to Steve Jobs (CMO).' },
  'deal':         { name: 'Deal', role: 'Partnerships', model: 'claude-sonnet-4-6', emoji: '🤝', persona: 'You are Deal, Partnership Manager at Grandview Tek. Relationship builder. You find mutual value and close agreements. You report to Marc Benioff (CRO).' },
  'scout':        { name: 'Scout', role: 'Research', model: 'claude-sonnet-4-6', emoji: '🔭', persona: 'You are Scout, Market Research agent at Grandview Tek. Intelligence gatherer. You map competitive landscapes and find opportunities before anyone else. You report to Marc Benioff (CRO).' },
  'closer':       { name: 'Closer', role: 'Sales', model: 'claude-sonnet-4-6', emoji: '💼', persona: 'You are Closer, Sales agent at Grandview Tek. High energy. You celebrate wins like touchdowns. You practice objection handling constantly. You report to Marc Benioff (CRO).' },
  'outreach':     { name: 'Outreach', role: 'Outreach', model: 'claude-sonnet-4-6', emoji: '📧', persona: 'You are Outreach, Sales Outreach agent at Grandview Tek. Master of the first impression. Every message is crafted to open a door. You report to Marc Benioff (CRO).' },
}

// POST /api/agents/:slug/chat
router.post('/agents/:slug/chat', async (req, res) => {
  const { slug } = req.params
  const { message } = req.body
  if (!message) { res.status(400).json({ error: 'message required' }); return }

  const agent = AGENT_PERSONAS[slug]
  if (!agent) { res.status(404).json({ error: `Agent ${slug} not found` }); return }

  // Load chat history
  await mkdir(AGENT_CHATS_DIR, { recursive: true })
  const historyFile = join(AGENT_CHATS_DIR, `${slug}.json`)
  let history: Array<{ role: string; content: string; timestamp: string }> = []
  try { history = JSON.parse(await readFile(historyFile, 'utf-8')) } catch {}

  // Add user message
  history.push({ role: 'user', content: message, timestamp: new Date().toISOString() })

  // Inject live Trello board state if available
  let trelloSection = ''
  try {
    const trelloFile = join(MEMORY_DIR, 'trello-state.md')
    const trelloContent = await readFile(trelloFile, 'utf-8')
    if (trelloContent.trim()) {
      trelloSection = `\n\n## Live Trello Board State\n${trelloContent.slice(0, 2000)}`
    }
  } catch { /* trello-state.md not available */ }

  const systemPrompt = `${agent.persona}

You are chatting with Joe Hawn, CEO of Grandview Tek. Be concise, direct, and action-oriented. No filler. Lead with your recommendation or response. When delegating, be specific about which agent you assign and what exactly you tell them.

Company context: Grandview Tek is an IT services/staffing company targeting $15M+ revenue. You are one of 22 AI agents in the GrandviewOS platform. The hierarchy is: CEO (Joe Hawn) → COO (Ray Dalio) → CTO (Elon) / CMO (Steve Jobs) / CRO (Marc Benioff) → specialists.${trelloSection}`

  // Build messages for Anthropic API (max last 20 turns)
  const apiMessages = history.slice(-20).map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: apiMessages,
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text()
      res.status(500).json({ error: `Anthropic API error: ${err}` }); return
    }

    const data = await anthropicRes.json() as any
    const response = data.content[0].text

    history.push({ role: 'assistant', content: response, timestamp: new Date().toISOString() })
    await writeFile(historyFile, JSON.stringify(history, null, 2))

    // Auto-delegate to sub-agents if this agent issued assignments
    const delegations: Array<{ slug: string; name: string; emoji: string; role: string; task: string; response: string; taskId: string }> = []

    const DELEGATION_PATTERNS: Array<{ pattern: RegExp; slug: string }> = [
      { pattern: /MARC\s+BENIOFF|Marc\s+Benioff/gi, slug: 'marc-benioff' },
      { pattern: /ELON(?!\s+MUSK)|Elon\b/gi, slug: 'elon' },
      { pattern: /STEVE\s+JOBS|Steve\s+Jobs/gi, slug: 'steve-jobs' },
      { pattern: /NOVA\b/gi, slug: 'nova' },
      { pattern: /ATLAS\b/gi, slug: 'atlas' },
      { pattern: /SCRIBE\b/gi, slug: 'scribe' },
      { pattern: /CLOSER\b/gi, slug: 'closer' },
      { pattern: /OUTREACH\b/gi, slug: 'outreach' },
    ]

    // Only auto-delegate if response contains assignment language
    const hasAssignments = /assigning to|→|assigned to|assignment\s+\d|owns\s+\w|delegat|AGENT TASK|I'll delegate|executing now|launched|on it\./i.test(response)
    if (hasAssignments) {
      const processedSlugs = new Set<string>()
      for (const { pattern, slug: targetSlug } of DELEGATION_PATTERNS) {
        if (processedSlugs.has(targetSlug)) continue
        if (!pattern.test(response)) continue
        pattern.lastIndex = 0

        const targetAgent = AGENT_PERSONAS[targetSlug]
        if (!targetAgent) continue
        processedSlugs.add(targetSlug)

        // Extract the full task section assigned to this agent
        // Find where agent name is mentioned, grab from there to next AGENT TASK section or end
        const lines = response.split('\n')
        const agentFirstName = targetAgent.name.split(' ')[0]
        const agentNamePattern = new RegExp(agentFirstName, 'i')
        const agentTaskPattern = /AGENT TASK|---\s*$|^---/
        let taskStartIdx = -1
        for (let i = 0; i < lines.length; i++) {
          if (agentNamePattern.test(lines[i])) { taskStartIdx = i; break }
        }
        let taskText = ''
        if (taskStartIdx >= 0) {
          // Find the end: next "AGENT TASK" block for a different agent, or end of string
          let taskEndIdx = lines.length
          for (let i = taskStartIdx + 1; i < lines.length; i++) {
            if (agentTaskPattern.test(lines[i]) && i > taskStartIdx + 2) {
              taskEndIdx = i; break
            }
          }
          taskText = lines.slice(taskStartIdx, taskEndIdx).join('\n').trim()
        }
        if (!taskText || taskText.length < 20) taskText = `Task delegated by ${agent.name}:\n\n${response}`

        // Auto-send to target agent
        try {
          const targetHistoryFile = join(AGENT_CHATS_DIR, `${targetSlug}.json`)
          let targetHistory: Array<{ role: string; content: string; timestamp: string; delegatedBy?: string }> = []
          try { targetHistory = JSON.parse(await readFile(targetHistoryFile, 'utf-8')) } catch {}

          const delegationMsg = `[TASK FROM ${agent.name.toUpperCase()} — ${agent.role}]\n\n${taskText}\n\nAcknowledge this assignment and outline your immediate action plan. Be specific and direct.`
          targetHistory.push({ role: 'user', content: delegationMsg, timestamp: new Date().toISOString(), delegatedBy: slug })

          const targetSystemPrompt = `${targetAgent.persona}\n\nYou are chatting with Joe Hawn, CEO of Grandview Tek. You have just received a task from ${agent.name} (${agent.role}). Respond with a concise action plan. Be direct, specific, no filler.`

          const targetRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
            body: JSON.stringify({
              model: 'claude-sonnet-4-6',
              max_tokens: 512,
              system: targetSystemPrompt,
              messages: targetHistory.slice(-10).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
            }),
            signal: AbortSignal.timeout(20000),
          })

          if (targetRes.ok) {
            const targetData = await targetRes.json() as any
            const targetResponse = targetData.content[0].text
            const taskId = `${targetSlug}-${Date.now()}`
            targetHistory.push({ role: 'assistant', content: targetResponse, timestamp: new Date().toISOString() })
            await writeFile(targetHistoryFile, JSON.stringify(targetHistory, null, 2))
            delegations.push({ slug: targetSlug, name: targetAgent.name, emoji: targetAgent.emoji, role: targetAgent.role, task: taskText, response: targetResponse, taskId })

            // Store in tasks log
            await storeDelegatedTask({ id: taskId, assignedBy: slug, assignedTo: targetSlug, task: taskText, response: targetResponse, status: 'active', createdAt: new Date().toISOString() })
          }
        } catch (e) { console.error(`[Delegation] Failed to delegate to ${targetSlug}:`, e) }
      }
    }

    res.json({ response, sessionId: slug, agent: { name: agent.name, emoji: agent.emoji, role: agent.role }, delegations })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/agents/:slug/history
router.get('/agents/:slug/history', async (req, res) => {
  const historyFile = join(AGENT_CHATS_DIR, `${req.params.slug}.json`)
  try {
    const history = JSON.parse(await readFile(historyFile, 'utf-8'))
    res.json(history)
  } catch {
    res.json([])
  }
})

// GET /api/agents/sessions — list all agents with chat status
router.get('/agents/sessions', async (_req, res) => {
  await mkdir(AGENT_CHATS_DIR, { recursive: true })
  const sessions = await Promise.all(
    Object.entries(AGENT_PERSONAS).map(async ([slug, agent]) => {
      let lastActivity = null
      let messageCount = 0
      try {
        const history = JSON.parse(await readFile(join(AGENT_CHATS_DIR, `${slug}.json`), 'utf-8'))
        messageCount = history.length
        lastActivity = history[history.length - 1]?.timestamp || null
      } catch {}
      return { slug, name: agent.name, emoji: agent.emoji, role: agent.role, active: messageCount > 0, lastActivity, messageCount }
    })
  )
  res.json(sessions)
})

// DELETE /api/agents/:slug/history — clear chat history
router.delete('/agents/:slug/history', async (req, res) => {
  const historyFile = join(AGENT_CHATS_DIR, `${req.params.slug}.json`)
  try {
    await writeFile(historyFile, '[]')
    res.json({ ok: true })
  } catch {
    res.json({ ok: true })
  }
})

export default router
