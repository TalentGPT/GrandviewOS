import express from 'express'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { readdir, readFile, writeFile, unlink } from 'fs/promises'
import { execFile } from 'child_process'
import {
  getApiKey,
  checkAuth,
  checkRateLimit,
  validateAgentId,
  validateFileName,
  getSessions,
  getSessionTranscript,
  getAgents,
  getSystemHealth,
  getConfig,
  getWorkspaceFile,
  saveWorkspaceFile as saveWsFile,
  getAgentFiles,
  runStandup,
  listStandups,
  generateDocs,
  loadGeneratedDocs,
  getCostBreakdown,
  getCostHistory,
  logDailyCost,
  listCronJobs,
  fileExists,
  MAX_FILE_SIZE,
  SESSIONS_DIR,
  WORKSPACE_DIR,
  STANDUPS_DIR,
  GRANDVIEW_CONFIG_FILE,
} from './src/server/api.ts'

function param(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] ?? ''
  return val ?? ''
}

const app = express()
const PORT = parseInt(process.env.PORT || '5000', 10)

app.use(express.json({ limit: '1mb' }))

const __dirname = join(fileURLToPath(import.meta.url), '..')
const distPath = join(__dirname, 'dist')

let apiKey = ''
const initPromise = getApiKey().then(key => { apiKey = key })

const sseClients = new Set<express.Response>()

setInterval(async () => {
  if (sseClients.size === 0) return
  try {
    const { sessions } = await getSessions(20)
    const health = await getSystemHealth()
    const data = JSON.stringify({
      type: 'session:update',
      sessions,
      health,
      timestamp: new Date().toISOString(),
    })
    for (const client of sseClients) {
      client.write(`data: ${data}\n\n`)
    }
  } catch { /* ignore */ }
}, 5000)

setInterval(() => { logDailyCost().catch(() => {}) }, 300000)
setTimeout(() => { logDailyCost().catch(() => {}) }, 5000)

app.post('/api/auth/verify', async (req, res) => {
  await initPromise
  if (checkAuth(req, apiKey)) {
    res.json({ valid: true })
  } else {
    res.status(401).json({ valid: false, error: 'Invalid API key' })
  }
})

app.get('/api/events', async (req, res) => {
  await initPromise
  if (!checkAuth(req, apiKey)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
  sseClients.add(res)
  req.on('close', () => { sseClients.delete(res) })
})

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (!checkAuth(req, apiKey)) {
    res.status(401).json({ error: 'Unauthorized. Provide X-Muddy-Key header.' })
    return
  }
  next()
}

app.use('/api', async (_req, _res, next) => {
  await initPromise
  next()
})

app.get('/api/sessions', authMiddleware, async (req, res) => {
  const limit = parseInt(req.query.limit as string || '50')
  const offset = parseInt(req.query.offset as string || '0')
  const { sessions, total } = await getSessions(limit, offset)
  res.json({ sessions, total })
})

app.get('/api/sessions/:id/transcript', authMiddleware, async (req, res) => {
  const session = await getSessionTranscript(param(req.params.id))
  if (session) {
    res.json(session)
  } else {
    res.status(404).json({ error: 'Session not found' })
  }
})

app.post('/api/sessions/:id/kill', authMiddleware, async (req, res) => {
  try {
    const files = await readdir(SESSIONS_DIR)
    const lockFile = files.find(f => f.startsWith(param(req.params.id)) && f.endsWith('.jsonl.lock'))
    if (lockFile) {
      await unlink(join(SESSIONS_DIR, lockFile))
      res.json({ ok: true })
    } else {
      res.status(404).json({ error: 'Session lock not found' })
    }
  } catch {
    res.status(500).json({ error: 'Failed to kill session' })
  }
})

app.get('/api/agents', authMiddleware, async (_req, res) => {
  const agents = await getAgents()
  res.json(agents)
})

app.get('/api/agents/:id/files', authMiddleware, async (req, res) => {
  if (!validateAgentId(param(req.params.id))) {
    res.status(400).json({ error: 'Invalid agent ID' })
    return
  }
  const files = await getAgentFiles(param(req.params.id))
  res.json(files)
})

app.get('/api/workspace/:agentId/:fileName', authMiddleware, async (req, res) => {
  const agentId = param(req.params.agentId)
  const fileName = param(req.params.fileName)
  if (!validateAgentId(agentId) || !validateFileName(fileName)) {
    res.status(400).json({ error: 'Invalid agent ID or file name' })
    return
  }
  const content = await getWorkspaceFile(agentId, fileName)
  if (content !== null) {
    res.json({ content })
  } else {
    res.status(404).json({ error: 'File not found' })
  }
})

app.put('/api/workspace/:agentId/:fileName', authMiddleware, async (req, res) => {
  const agentId = param(req.params.agentId)
  const fileName = param(req.params.fileName)
  if (!validateAgentId(agentId) || !validateFileName(fileName)) {
    res.status(400).json({ error: 'Invalid agent ID or file name' })
    return
  }
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.socket.remoteAddress ?? 'unknown'
  if (!checkRateLimit(clientIp, 'workspace-write')) {
    res.status(429).json({ error: 'Too many requests. Try again later.' })
    return
  }
  const { content } = req.body as { content: string }
  if (Buffer.byteLength(content, 'utf-8') > MAX_FILE_SIZE) {
    res.status(413).json({ error: 'File content too large. Max 1MB.' })
    return
  }
  const ok = await saveWsFile(agentId, fileName, content)
  if (!ok) {
    res.status(400).json({ error: 'Failed to save file' })
    return
  }
  res.json({ ok })
})

app.get('/api/system/health', authMiddleware, async (_req, res) => {
  const health = await getSystemHealth()
  res.json(health)
})

app.get('/api/config', authMiddleware, async (_req, res) => {
  const config = await getConfig()
  res.json(config)
})

app.post('/api/standups', authMiddleware, async (req, res) => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.socket.remoteAddress ?? 'unknown'
  if (!checkRateLimit(clientIp, 'standup-create')) {
    res.status(429).json({ error: 'Too many requests. Max 1 standup per minute.' })
    return
  }
  const standupId = `standup-${Date.now()}`
  res.json({ id: standupId, status: 'started' })
  runStandup(standupId).catch(err => console.error('Standup error:', err))
})

app.get('/api/standups', authMiddleware, async (_req, res) => {
  const standupsList = await listStandups()
  res.json(standupsList)
})

app.get('/api/standups/:id', authMiddleware, async (req, res) => {
  const id = param(req.params.id)
  if (!validateAgentId(id.replace(/\./g, ''))) {
    res.status(400).json({ error: 'Invalid standup ID' })
    return
  }
  const dataPath = join(STANDUPS_DIR, id, 'data.json')
  if (await fileExists(dataPath)) {
    const raw = await readFile(dataPath, 'utf-8')
    res.json(JSON.parse(raw))
  } else {
    res.status(404).json({ error: 'Standup not found' })
  }
})

app.get('/api/standups/:id/audio', authMiddleware, async (req, res) => {
  const id = param(req.params.id)
  if (!validateAgentId(id.replace(/\./g, ''))) {
    res.status(400).json({ error: 'Invalid standup ID' })
    return
  }
  const audioPath = join(STANDUPS_DIR, id, 'full-meeting.mp3')
  if (await fileExists(audioPath)) {
    const audioData = await readFile(audioPath)
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Content-Length', audioData.length.toString())
    res.end(audioData)
  } else {
    res.status(404).json({ error: 'Audio not found' })
  }
})

app.get('/api/docs', authMiddleware, async (_req, res) => {
  const docs = await loadGeneratedDocs()
  res.json(docs)
})

app.post('/api/docs/generate', authMiddleware, async (req, res) => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.socket.remoteAddress ?? 'unknown'
  if (!checkRateLimit(clientIp, 'doc-generate')) {
    res.status(429).json({ error: 'Too many requests. Max 1 doc generation per minute.' })
    return
  }
  const docs = await generateDocs()
  res.json(docs)
})

app.get('/api/cost/breakdown', authMiddleware, async (_req, res) => {
  const breakdown = await getCostBreakdown()
  res.json(breakdown)
})

app.get('/api/cost/history', authMiddleware, async (req, res) => {
  const days = parseInt(req.query.days as string || '7')
  const history = await getCostHistory(days)
  res.json(history)
})

app.get('/api/cron-jobs', authMiddleware, async (_req, res) => {
  const jobs = await listCronJobs()
  res.json(jobs)
})

app.post('/api/cron-jobs', authMiddleware, async (req, res) => {
  const { name, schedule, command } = req.body as { name: string; schedule: string; command: string }
  const result = await new Promise<string>((r) => {
    execFile('openclaw', ['cron', 'create', '--name', name, '--schedule', schedule, '--command', command],
      { timeout: 10000 }, (err, stdout) => r(err ? err.message : stdout))
  })
  res.json({ ok: true, result: result.trim() })
})

app.patch('/api/cron-jobs/:id', authMiddleware, async (req, res) => {
  const { action } = req.body as { action: 'pause' | 'resume' }
  const result = await new Promise<string>((r) => {
    execFile('openclaw', ['cron', action, param(req.params.id)],
      { timeout: 10000 }, (err, stdout) => r(err ? err.message : stdout))
  })
  res.json({ ok: true, result: result.trim() })
})

app.delete('/api/cron-jobs/:id', authMiddleware, async (req, res) => {
  const result = await new Promise<string>((r) => {
    execFile('openclaw', ['cron', 'delete', param(req.params.id)],
      { timeout: 10000 }, (err, stdout) => r(err ? err.message : stdout))
  })
  res.json({ ok: true, result: result.trim() })
})

app.get('/api/briefs', authMiddleware, async (req, res) => {
  const dateParam = (req.query.date as string) ?? new Date().toISOString().split('T')[0]
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
  res.json([brief])
})

const PROJECTS_FILE = join(WORKSPACE_DIR, 'grandview-os', 'data', 'projects.json')

app.get('/api/projects', authMiddleware, async (_req, res) => {
  if (await fileExists(PROJECTS_FILE)) {
    const raw = await readFile(PROJECTS_FILE, 'utf-8')
    res.json(JSON.parse(raw))
  } else {
    res.json([])
  }
})

app.post('/api/projects', authMiddleware, async (req, res) => {
  const project = req.body as Record<string, unknown>
  let projects: Record<string, unknown>[] = []
  if (await fileExists(PROJECTS_FILE)) {
    projects = JSON.parse(await readFile(PROJECTS_FILE, 'utf-8')) as Record<string, unknown>[]
  }
  projects.push(project)
  const { mkdir } = await import('fs/promises')
  await mkdir(join(WORKSPACE_DIR, 'grandview-os', 'data'), { recursive: true })
  await writeFile(PROJECTS_FILE, JSON.stringify(projects, null, 2))
  res.json(project)
})

app.patch('/api/projects/:id', authMiddleware, async (req, res) => {
  const updates = req.body as Record<string, unknown>
  let projects: Array<Record<string, unknown>> = []
  if (await fileExists(PROJECTS_FILE)) {
    projects = JSON.parse(await readFile(PROJECTS_FILE, 'utf-8')) as Array<Record<string, unknown>>
  }
  projects = projects.map(p => (p as { id?: string }).id === param(req.params.id) ? { ...p, ...updates } : p)
  await writeFile(PROJECTS_FILE, JSON.stringify(projects, null, 2))
  res.json({ ok: true })
})

app.get('/api/reviews', authMiddleware, async (req, res) => {
  const { sessions: allSessions } = await getSessions()
  const totalTokens = allSessions.reduce((s, sess) => s + sess.totalTokens, 0)
  const totalCost = allSessions.reduce((s, sess) => s + sess.totalCost, 0)
  const review = {
    id: 'current',
    week: (req.query.week as string) ?? '2026-W10',
    startDate: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    highlights: ['System operational', `${allSessions.length} sessions processed`],
    lowlights: [],
    metrics: { cost: totalCost, tokens: totalTokens, sessions: allSessions.length },
    agentPerformance: [{ name: 'Main', emoji: '🐕', sessions: allSessions.length, cost: totalCost, rating: 'good' }],
  }
  res.json([review])
})

const IDEAS_FILE = join(WORKSPACE_DIR, 'grandview-os', 'data', 'ideas.json')

app.get('/api/ideas', authMiddleware, async (_req, res) => {
  if (await fileExists(IDEAS_FILE)) {
    res.end(await readFile(IDEAS_FILE, 'utf-8'))
  } else {
    res.json([])
  }
})

app.post('/api/ideas', authMiddleware, async (req, res) => {
  const idea = req.body as Record<string, unknown>
  let ideas: Record<string, unknown>[] = []
  if (await fileExists(IDEAS_FILE)) {
    ideas = JSON.parse(await readFile(IDEAS_FILE, 'utf-8')) as Record<string, unknown>[]
  }
  ideas.push(idea)
  const { mkdir } = await import('fs/promises')
  await mkdir(join(WORKSPACE_DIR, 'grandview-os', 'data'), { recursive: true })
  await writeFile(IDEAS_FILE, JSON.stringify(ideas, null, 2))
  res.json(idea)
})

app.post('/api/notifications/telegram', authMiddleware, async (req, res) => {
  const { message } = req.body as { message: string }
  try {
    const configRaw = await readFile(GRANDVIEW_CONFIG_FILE, 'utf-8')
    const gvConfig = JSON.parse(configRaw) as { telegramBotToken?: string; telegramChatId?: string }
    if (!gvConfig.telegramBotToken || !gvConfig.telegramChatId) {
      res.status(400).json({ error: 'Telegram not configured.' })
      return
    }
    const tgRes = await fetch(`https://api.telegram.org/bot${gvConfig.telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: gvConfig.telegramChatId, text: message, parse_mode: 'Markdown' }),
    })
    const tgData = await tgRes.json()
    res.json({ ok: true, telegram: tgData })
  } catch {
    res.status(500).json({ error: 'Failed to send Telegram message' })
  }
})

app.post('/api/notifications/test', authMiddleware, (_req, res) => {
  res.json({ ok: true, message: 'Notification endpoint ready' })
})

app.use(express.static(distPath))

app.get('*', (_req, res) => {
  res.sendFile(join(distPath, 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`GrandviewOS production server running on http://0.0.0.0:${PORT}`)
})
