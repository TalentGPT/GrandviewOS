import { Router } from 'express'
import prisma from '../db.js'

const router = Router()

// GET /api/standups
router.get('/', async (req, res) => {
  try {
    const standups = await prisma.standup.findMany({
      where: { tenantId: req.tenantId! },
      orderBy: { triggeredAt: 'desc' },
    })
    // Map to frontend StandupResponse shape
    const mapped = standups.map(s => ({
      id: s.id,
      title: s.title,
      date: s.triggeredAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      time: s.triggeredAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false }) + ' UTC',
      status: s.status === 'completed' ? 'complete' : s.status as any,
      participants: (s.participants as any[]) || [],
      conversation: (s.transcript as any[]) || [],
      actionItems: (s.actionItems as any[]) || [],
      audioFile: s.audioPath || undefined,
      createdAt: s.triggeredAt.toISOString(),
    }))
    res.json(mapped)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/standups — trigger new standup
router.post('/', async (req, res) => {
  try {
    const standup = await prisma.standup.create({
      data: {
        tenantId: req.tenantId!,
        title: `Executive Standup — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
        participants: [
          { name: 'Ray Dalio', emoji: '📊', role: 'COO', voice: 'en-US-GuyNeural' },
          { name: 'Elon', emoji: '🚀', role: 'CTO', voice: 'en-US-ChristopherNeural' },
          { name: 'Gary', emoji: '📣', role: 'CMO', voice: 'en-US-JasonNeural' },
          { name: 'Ray Lane', emoji: '💰', role: 'CRO', voice: 'en-GB-RyanNeural' },
        ],
        transcript: [
          { speaker: 'Ray Dalio', text: 'Good morning team. Let\'s run through status updates.' },
          { speaker: 'Elon', text: 'Engineering shipped 3 PRs. Build pipeline green.' },
          { speaker: 'Gary', text: 'Newsletter open rate hit 34%. Community growing well.' },
          { speaker: 'Ray Lane', text: 'Revenue pipeline healthy. TechCorp proposal in review.' },
          { speaker: 'Ray Dalio', text: 'Solid updates. Action items compiled. Reconvene tomorrow.' },
        ],
        actionItems: [
          { text: 'Ship cost breakdown view', assignee: 'Elon', done: false },
          { text: 'Complete TechCorp case study', assignee: 'Gary', done: false },
          { text: 'Close TechCorp deal', assignee: 'Ray Lane', done: false },
        ],
        status: 'completed',
        completedAt: new Date(),
      },
    })
    res.json({ id: standup.id, status: 'started' })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/standups/:id
router.get('/:id', async (req, res) => {
  try {
    const s = await prisma.standup.findFirst({ where: { id: req.params.id, tenantId: req.tenantId! } })
    if (!s) { res.status(404).json({ error: 'Standup not found' }); return }
    res.json({
      id: s.id, title: s.title,
      date: s.triggeredAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      time: s.triggeredAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false }) + ' UTC',
      status: s.status === 'completed' ? 'complete' : s.status,
      participants: s.participants || [],
      conversation: s.transcript || [],
      actionItems: s.actionItems || [],
      audioFile: s.audioPath || undefined,
      createdAt: s.triggeredAt.toISOString(),
    })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/standups/:id/audio
router.get('/:id/audio', async (_req, res) => {
  res.status(404).json({ error: 'Audio not available in DB mode' })
})

// PATCH /api/standups/:id/action-items/:idx
router.patch('/:id/action-items/:idx', async (req, res) => {
  try {
    const s = await prisma.standup.findFirst({ where: { id: req.params.id, tenantId: req.tenantId! } })
    if (!s) { res.status(404).json({ error: 'Not found' }); return }
    const items = (s.actionItems as any[]) || []
    const idx = parseInt(req.params.idx)
    if (items[idx]) {
      items[idx].done = !items[idx].done
      await prisma.standup.update({ where: { id: s.id }, data: { actionItems: items } })
    }
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
