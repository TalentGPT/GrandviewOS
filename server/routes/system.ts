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
    const sessions = await prisma.session.findMany({
      where: { tenantId: req.tenantId! },
      include: { agent: { select: { name: true, slug: true } } },
    })
    const byModel: Record<string, { cost: number; tokens: number; sessions: number }> = {}
    const byAgent: Record<string, { cost: number; tokens: number; sessions: number }> = {}
    let totalCost = 0, totalTokens = 0

    for (const s of sessions) {
      const model = s.model || 'unknown'
      if (!byModel[model]) byModel[model] = { cost: 0, tokens: 0, sessions: 0 }
      byModel[model].cost += s.totalCost
      byModel[model].tokens += s.totalTokens
      byModel[model].sessions++

      const agentName = (s as any).agent?.name || 'Unassigned'
      if (!byAgent[agentName]) byAgent[agentName] = { cost: 0, tokens: 0, sessions: 0 }
      byAgent[agentName].cost += s.totalCost
      byAgent[agentName].tokens += s.totalTokens
      byAgent[agentName].sessions++

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
    const since = new Date(Date.now() - days * 86400000)

    // Try cost entries first
    const entries = await prisma.costEntry.findMany({
      where: { tenantId: req.tenantId!, date: { gte: since } },
      orderBy: { date: 'asc' },
    })

    if (entries.length > 0) {
      res.json(entries.map(e => ({
        date: e.date.toISOString().split('T')[0],
        totalCost: e.cost,
        totalTokens: e.tokensIn + e.tokensOut,
        byModel: { [e.model]: { cost: e.cost, tokens: e.tokensIn + e.tokensOut, sessions: e.sessions } },
        byAgent: {},
      })))
      return
    }

    // Fallback: aggregate from sessions
    const sessions = await prisma.session.findMany({
      where: { tenantId: req.tenantId!, startedAt: { gte: since } },
    })
    const byDay: Record<string, { cost: number; tokens: number; byModel: Record<string, { cost: number; tokens: number; sessions: number }> }> = {}
    for (const s of sessions) {
      const day = s.startedAt.toISOString().split('T')[0]
      if (!byDay[day]) byDay[day] = { cost: 0, tokens: 0, byModel: {} }
      byDay[day].cost += s.totalCost
      byDay[day].tokens += s.totalTokens
      const m = s.model || 'unknown'
      if (!byDay[day].byModel[m]) byDay[day].byModel[m] = { cost: 0, tokens: 0, sessions: 0 }
      byDay[day].byModel[m].cost += s.totalCost
      byDay[day].byModel[m].tokens += s.totalTokens
      byDay[day].byModel[m].sessions++
    }
    const result = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, d]) => ({
      date, totalCost: d.cost, totalTokens: d.tokens, byModel: d.byModel, byAgent: {},
    }))
    res.json(result)
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
router.get('/docs', async (req, res) => {
  try {
    const docs = await generateDocsFromAgents(req.tenantId!)
    res.json(docs)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/docs/generate
router.post('/docs/generate', async (req, res) => {
  try {
    const docs = await generateDocsFromAgents(req.tenantId!)
    res.json(docs)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

async function generateDocsFromAgents(tenantId: string): Promise<Record<string, string>> {
  const agents = await prisma.agent.findMany({ where: { tenantId }, orderBy: { slug: 'asc' } })
  const sessions = await prisma.session.findMany({ where: { tenantId } })
  const totalTokens = sessions.reduce((s, x) => s + x.totalTokens, 0)
  const totalCost = sessions.reduce((s, x) => s + x.totalCost, 0)

  const docs: Record<string, string> = {}

  docs['Overview'] = `# GrandviewOS

AI-powered operating system for managing agent teams.

## System Stats
- **Agents:** ${agents.length}
- **Sessions:** ${sessions.length}
- **Total Tokens:** ${totalTokens.toLocaleString()}
- **Total Cost:** $${totalCost.toFixed(2)}

*Generated at ${new Date().toISOString()}*`

  // Organization Chart
  const deptGroups: Record<string, typeof agents> = {}
  for (const a of agents) {
    const dept = a.department || 'General'
    if (!deptGroups[dept]) deptGroups[dept] = []
    deptGroups[dept].push(a)
  }
  let orgDoc = '# Organization Chart\n\n'
  for (const [dept, members] of Object.entries(deptGroups)) {
    orgDoc += `## ${dept}\n\n`
    for (const a of members) {
      orgDoc += `- **${a.emoji || '🤖'} ${a.name}** — ${a.role} (${a.primaryModel})\n`
      if (a.description) orgDoc += `  ${a.description}\n`
    }
    orgDoc += '\n'
  }
  docs['Organization Chart'] = orgDoc

  // Team Workspaces
  let wsDoc = '# Team Workspaces\n\nEach agent has workspace files that define their behavior.\n\n'
  wsDoc += '| Agent | Files Available |\n|-------|----------------|\n'
  for (const a of agents) {
    const files = ['SOUL.md', 'IDENTITY.md', 'USER.md', 'TOOLS.md', 'AGENTS.md', 'MEMORY.md', 'HEARTBEAT.md']
      .filter(f => {
        const field = f.replace('.md', '').toLowerCase() + 'Md'
        return (a as any)[field === 'soulMd' ? 'soulMd' : field]
      })
    wsDoc += `| ${a.emoji || ''} ${a.name} | ${files.join(', ') || 'None'} |\n`
  }
  docs['Team Workspaces'] = wsDoc

  // Sub-Agents & Spawning
  docs['Sub-Agents & Spawning'] = `# Sub-Agents & Spawning

Agents can spawn sub-agents for delegated tasks. Sub-agents inherit context from their parent and report back on completion.

## Current Agent Hierarchy

${agents.filter(a => !a.parentId).map(a => `- **${a.emoji || ''} ${a.name}** (${a.role})\n${agents.filter(c => c.parentId === a.id).map(c => `  - ${c.emoji || ''} ${c.name} (${c.role})`).join('\n')}`).join('\n')}`

  // Gateway vs Sub-Agents
  docs['Gateway vs Sub-Agents'] = `# Gateway vs Sub-Agents

## Gateway Mode
The gateway manages all agent routing and session lifecycle. Each agent can run in shared or dedicated gateway mode.

## Sub-Agent Mode
Sub-agents are spawned on-demand for specific tasks. They are ephemeral and terminate after completion.

## Agent Gateway Modes
${agents.map(a => `- **${a.name}**: ${a.gatewayMode}`).join('\n')}`

  // Voice Standup
  docs['Voice Standup'] = `# Voice Standup

The standup system enables scheduled or on-demand executive meetings between agents. Each standup generates a conversation transcript and action items.

## How It Works
1. Trigger a standup from the UI
2. Participating agents generate their status updates
3. A conversation transcript is produced
4. Action items are extracted and tracked`

  // Memory Architecture
  docs['Memory Architecture'] = `# Memory Architecture

Agents use a layered memory system:

- **SOUL.md** — Core identity and personality
- **MEMORY.md** — Long-term curated memories
- **Daily notes** — \`memory/YYYY-MM-DD.md\` files for session logs
- **HEARTBEAT.md** — Periodic check-in instructions

Memory entries are stored in the database and synced to agent workspace files.`

  // Task Manager
  docs['Task Manager'] = `# Task Manager

The Task Manager provides real-time visibility into all agent sessions.

## Features
- **Live Sessions** — View active and completed sessions
- **Cron Jobs** — Schedule recurring agent tasks
- **Cost Breakdown** — Track spending by model and agent
- **Overnight Log** — Review autonomous overnight activity

## Metrics
- Total sessions: ${sessions.length}
- Active sessions: ${sessions.filter(s => s.isActive).length}
- Total cost: $${totalCost.toFixed(2)}`

  // Partnership Pipeline
  docs['Partnership Pipeline'] = `# Partnership Pipeline

Track business partnerships through stages: Lead → Contact → Proposal → Negotiation → Closed.

Use the Projects page to manage pipeline items.`

  return docs
}

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
