import { Router } from 'express'
import prisma from '../db.js'

const router = Router()

// GET /api/system/health
router.get('/health', async (req, res) => {
  try {
    const tenantId = req.tenantId!
    const [totalSessions, activeSessions] = await Promise.all([
      prisma.session.count({ where: { tenantId } }),
      prisma.session.count({ where: { tenantId, isActive: true } }),
    ])
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })

    res.json({
      gatewayRunning: !!tenant?.openclawUrl,
      gatewayPid: null,
      gatewayPort: null,
      totalSessions,
      activeSessions,
      version: '2.0.0-db',
      uptime: 'active',
    })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/config
router.get('/config', async (req, res) => {
  try {
    const agentCount = await prisma.agent.count({ where: { tenantId: req.tenantId! } })
    res.json({
      model: { primary: 'claude-opus-4-6', fallbacks: ['claude-sonnet-4-6'] },
      workspace: '/workspace',
      channels: { telegram: { enabled: true } },
      agentCount,
      maxConcurrent: 4,
    })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/cost/breakdown
router.get('/cost/breakdown', async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({ where: { tenantId: req.tenantId! } })
    const byModel: Record<string, { cost: number; tokens: number; sessions: number }> = {}
    const byAgent: Record<string, { cost: number; tokens: number; sessions: number }> = {}
    let totalCost = 0, totalTokens = 0

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

    res.json({ byModel, byAgent, total: { cost: totalCost, tokens: totalTokens, sessions: sessions.length } })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/cost/history
router.get('/cost/history', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string || '7')
    const entries = await prisma.costEntry.findMany({
      where: {
        tenantId: req.tenantId!,
        date: { gte: new Date(Date.now() - days * 86400000) },
      },
      orderBy: { date: 'asc' },
    })
    res.json(entries.map(e => ({
      date: e.date.toISOString().split('T')[0],
      totalCost: e.cost,
      totalTokens: e.tokensIn + e.tokensOut,
      byModel: { [e.model]: { cost: e.cost, tokens: e.tokensIn + e.tokensOut, sessions: e.sessions } },
      byAgent: {},
    })))
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/briefs
router.get('/briefs', async (req, res) => {
  try {
    const dateParam = (req.query.date as string) ?? new Date().toISOString().split('T')[0]
    const sessions = await prisma.session.findMany({ where: { tenantId: req.tenantId! } })
    const daySessions = sessions.filter(s => s.startedAt.toISOString().startsWith(dateParam))
    res.json([{
      date: dateParam,
      agentsActive: 1,
      sessionsRun: daySessions.length,
      tokensUsed: daySessions.reduce((s, x) => s + x.totalTokens, 0),
      cost: daySessions.reduce((s, x) => s + x.totalCost, 0),
      events: daySessions.slice(0, 5).map(s => s.title || `Session ${s.id.slice(0, 8)}`),
    }])
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/projects
router.get('/projects', async (req, res) => {
  try {
    // Store projects as memory entries with type 'project'
    const entries = await prisma.memoryEntry.findMany({ where: { tenantId: req.tenantId!, type: 'project' } })
    res.json(entries.map(e => e.metadata || {}))
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/projects
router.post('/projects', async (req, res) => {
  try {
    await prisma.memoryEntry.create({
      data: { tenantId: req.tenantId!, type: 'project', date: new Date(), content: req.body.name || '', metadata: req.body },
    })
    res.json(req.body)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// PATCH /api/projects/:id
router.patch('/projects/:id', async (req, res) => {
  try {
    const entry = await prisma.memoryEntry.findFirst({ where: { id: req.params.id, tenantId: req.tenantId! } })
    if (!entry) { res.status(404).json({ error: 'Not found' }); return }
    const metadata = { ...(entry.metadata as any || {}), ...req.body }
    await prisma.memoryEntry.update({ where: { id: entry.id }, data: { metadata } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/ideas
router.get('/ideas', async (req, res) => {
  try {
    const entries = await prisma.memoryEntry.findMany({ where: { tenantId: req.tenantId!, type: 'idea' } })
    res.json(entries.map(e => e.metadata || {}))
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/ideas
router.post('/ideas', async (req, res) => {
  try {
    await prisma.memoryEntry.create({
      data: { tenantId: req.tenantId!, type: 'idea', date: new Date(), content: req.body.title || '', metadata: req.body },
    })
    res.json(req.body)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/reviews
router.get('/reviews', async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({ where: { tenantId: req.tenantId! } })
    const totalTokens = sessions.reduce((s, x) => s + x.totalTokens, 0)
    const totalCost = sessions.reduce((s, x) => s + x.totalCost, 0)
    res.json([{
      id: 'current',
      week: (req.query.week as string) ?? '2026-W10',
      startDate: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      highlights: ['System operational', `${sessions.length} sessions processed`],
      lowlights: [],
      metrics: { cost: totalCost, tokens: totalTokens, sessions: sessions.length },
      agentPerformance: [{ name: 'Main', emoji: '🐕', sessions: sessions.length, cost: totalCost, rating: 'good' }],
    }])
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/docs
router.get('/docs', async (_req, res) => {
  res.json({
    'Overview': '# GrandviewOS\n\nAI-powered operating system for managing agent teams.',
    'Architecture': '# Architecture\n\nPostgreSQL + Express + Prisma + React',
  })
})

// POST /api/docs/generate
router.post('/docs/generate', async (_req, res) => {
  res.json({
    'Overview': '# GrandviewOS\n\nAI-powered operating system for managing agent teams.\n\n*Regenerated at ' + new Date().toISOString() + '*',
  })
})

// GET /api/sync-state
router.get('/sync-state', async (_req, res) => {
  res.json({ agents: {} })
})

// GET /api/cron-jobs
router.get('/cron-jobs', async (req, res) => {
  try {
    const jobs = await prisma.cronJob.findMany({ where: { tenantId: req.tenantId! } })
    res.json(jobs.map(j => ({ id: j.id, name: j.name, schedule: j.schedule, status: j.status, lastRun: j.lastRun?.toISOString(), nextRun: j.nextRun?.toISOString() })))
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// SSE events endpoint
router.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)

  const interval = setInterval(async () => {
    try {
      const [sessions, totalSessions, activeSessions] = await Promise.all([
        prisma.session.findMany({ where: { tenantId: req.tenantId!, isActive: true }, take: 20, orderBy: { lastActivity: 'desc' } }),
        prisma.session.count({ where: { tenantId: req.tenantId! } }),
        prisma.session.count({ where: { tenantId: req.tenantId!, isActive: true } }),
      ])
      const data = JSON.stringify({
        type: 'session:update',
        sessions: sessions.map(s => ({
          id: s.openclawId || s.id, timestamp: s.startedAt.toISOString(), lastActivity: s.lastActivity.toISOString(),
          model: s.model, provider: s.provider || '', messageCount: s.messageCount, totalTokens: s.totalTokens,
          totalCost: s.totalCost, isActive: s.isActive, messages: [], title: s.title || 'Untitled',
        })),
        health: { gatewayRunning: true, totalSessions, activeSessions, version: '2.0.0-db', uptime: 'active' },
        timestamp: new Date().toISOString(),
      })
      res.write(`data: ${data}\n\n`)
    } catch { /* ignore */ }
  }, 5000)

  req.on('close', () => clearInterval(interval))
})

export default router
