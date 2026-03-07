import { Router } from 'express'
import prisma from '../db.js'

const router = Router()

// GET /api/sessions/stats — must be before /:id
router.get('/stats', async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({ where: { tenantId: req.tenantId! } })
    const active = sessions.filter(s => s.isActive).length
    const totalTokens = sessions.reduce((s, x) => s + x.totalTokens, 0)
    const totalCost = sessions.reduce((s, x) => s + x.totalCost, 0)
    res.json({ total: sessions.length, active, totalTokens, totalCost })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/sessions/sync
router.post('/sync', async (req, res) => {
  res.json({ ok: true, synced: 0 })
})

// GET /api/sessions
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string || '50')
    const offset = parseInt(req.query.offset as string || '0')

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where: { tenantId: req.tenantId! },
        orderBy: { lastActivity: 'desc' },
        skip: offset,
        take: limit,
        include: { agent: { select: { slug: true, name: true } } },
      }),
      prisma.session.count({ where: { tenantId: req.tenantId! } }),
    ])

    // Map to frontend ApiSession shape
    const mapped = sessions.map(s => ({
      id: s.openclawId || s.id,
      timestamp: s.startedAt.toISOString(),
      lastActivity: s.lastActivity.toISOString(),
      model: s.model,
      provider: s.provider || '',
      messageCount: s.messageCount,
      totalTokens: s.totalTokens,
      totalCost: s.totalCost,
      isActive: s.isActive,
      messages: [],
      title: s.title || 'Untitled Session',
      lastMessage: s.lastMessage || undefined,
    }))

    res.json({ sessions: mapped, total })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/sessions/:id
router.get('/:id', async (req, res) => {
  try {
    const session = await prisma.session.findFirst({
      where: { tenantId: req.tenantId!, OR: [{ id: req.params.id }, { openclawId: req.params.id }] },
    })
    if (!session) { res.status(404).json({ error: 'Session not found' }); return }
    res.json(session)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/sessions/:id/transcript — fetch live from bridge
router.get('/:id/transcript', async (req, res) => {
  try {
    const session = await prisma.session.findFirst({
      where: { tenantId: req.tenantId!, OR: [{ id: req.params.id }, { openclawId: req.params.id }] },
    })
    if (!session) { res.status(404).json({ error: 'Session not found' }); return }

    // Try fetching live transcript from bridge
    const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId! } })
    if (tenant?.openclawUrl && tenant?.openclawToken) {
      try {
        const bridgeRes = await fetch(`${tenant.openclawUrl}/api/sessions/${encodeURIComponent(session.openclawId || session.id)}/transcript`, {
          headers: { 'Authorization': `Bearer ${tenant.openclawToken}` },
          signal: AbortSignal.timeout(10000),
        })
        if (bridgeRes.ok) {
          const data = await bridgeRes.json() as any
          res.json({
            id: session.openclawId || session.id,
            timestamp: session.startedAt.toISOString(),
            lastActivity: session.lastActivity.toISOString(),
            model: data.model || session.model,
            provider: data.provider || session.provider || '',
            messageCount: data.messageCount || session.messageCount,
            totalTokens: data.totalTokens || session.totalTokens,
            totalCost: data.totalCost || session.totalCost,
            isActive: session.isActive,
            title: session.title || 'Untitled Session',
            messages: data.messages || [],
          })
          return
        }
      } catch { /* fall through to DB */ }
    }

    res.json({
      id: session.openclawId || session.id,
      timestamp: session.startedAt.toISOString(),
      lastActivity: session.lastActivity.toISOString(),
      model: session.model,
      provider: session.provider || '',
      messageCount: session.messageCount,
      totalTokens: session.totalTokens,
      totalCost: session.totalCost,
      isActive: session.isActive,
      title: session.title || 'Untitled Session',
      messages: (session.transcript as any[]) || [],
    })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/sessions/:id/kill
router.post('/:id/kill', async (req, res) => {
  try {
    const session = await prisma.session.findFirst({
      where: { tenantId: req.tenantId!, OR: [{ id: req.params.id }, { openclawId: req.params.id }] },
    })
    if (!session) { res.status(404).json({ error: 'Session not found' }); return }
    await prisma.session.update({ where: { id: session.id }, data: { isActive: false, status: 'completed', endedAt: new Date() } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
