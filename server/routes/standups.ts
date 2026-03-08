import { Router } from 'express'
import prisma from '../db.js'
import { OpenClawConnector } from '../services/openclaw-connector.js'

async function getConnector(_tenantId: string): Promise<OpenClawConnector> {
  const url = process.env.OPENCLAW_BRIDGE_URL || 'http://3.145.179.193:7100'
  const token = process.env.OPENCLAW_BRIDGE_TOKEN || 'gv-bridge-2026'
  return new OpenClawConnector(url, token)
}

const router = Router()

// GET /api/standups
router.get('/', async (req, res) => {
  try {
    const standups = await prisma.standup.findMany({
      where: { tenantId: req.tenantId! },
      orderBy: { triggeredAt: 'desc' },
    })
    const mapped = standups.map(s => ({
      id: s.id,
      title: s.title,
      date: s.triggeredAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      time: s.triggeredAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false }) + ' UTC',
      status: s.status === 'completed' ? 'complete' : s.status as any,
      participants: (s.participants as any[]) || [],
      conversation: (s.transcript as any[]) || [],
      actionItems: (s.actionItems as any[]) || [],
      audioFile: s.audioPath ? `/api/standups/${s.id}/audio` : undefined,
      hasAudio: !!s.audioPath,
      createdAt: s.triggeredAt.toISOString(),
    }))
    res.json(mapped)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/standups — trigger new standup via bridge
router.post('/', async (req, res) => {
  // Create placeholder record first to get an ID
  const standup = await prisma.standup.create({
    data: {
      tenantId: req.tenantId!,
      title: `Executive Standup — ${new Date().toLocaleDateString('en-US', { weekday: 'long' })} Update`,
      participants: [
        { name: 'Ray Dalio', emoji: '📊', role: 'COO' },
        { name: 'Elon', emoji: '🚀', role: 'CTO' },
        { name: 'Steve Jobs', emoji: '🍎', role: 'CMO' },
        { name: 'Marc Benioff', emoji: '☁️', role: 'CRO' },
      ],
      transcript: [],
      actionItems: [],
      status: 'processing',
    },
  }).catch(err => { res.status(500).json({ error: String(err) }); return null })

  if (!standup) return

  try {
    // Call bridge for AI generation + ElevenLabs audio (bridge has both keys)
    const connector = await getConnector(req.tenantId!)
    const result = await connector.post<{
      title: string
      conversation: Array<{ speaker: string; text: string }>
      actionItems: Array<{ text: string; assignee: string; done: boolean }>
      audioUrl: string | null
    }>('/api/standups/generate', { standupId: standup.id })

    const { title, conversation, actionItems, audioUrl } = result || {}

    // Update DB with results
    const updated = await prisma.standup.update({
      where: { id: standup.id },
      data: {
        title: title || standup.title,
        transcript: conversation || [],
        actionItems: actionItems || [],
        audioPath: audioUrl || null,
        status: 'completed',
        completedAt: new Date(),
      },
    })

    res.json({
      id: updated.id,
      status: 'complete',
      title: updated.title,
      date: updated.triggeredAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      time: updated.triggeredAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false }) + ' UTC',
      participants: (updated.participants as any[]) || [],
      conversation: (updated.transcript as any[]) || [],
      actionItems: (updated.actionItems as any[]) || [],
      audioFile: audioUrl ? `/api/standups/${updated.id}/audio` : undefined,
      hasAudio: !!audioUrl,
      createdAt: updated.triggeredAt.toISOString(),
    })
  } catch (err) {
    // Update to failed
    await prisma.standup.update({ where: { id: standup.id }, data: { status: 'failed' } }).catch(() => {})
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
      audioFile: s.audioPath ? `/api/standups/${s.id}/audio` : undefined,
      hasAudio: !!s.audioPath,
      createdAt: s.triggeredAt.toISOString(),
    })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/standups/:id/audio — proxy to bridge
router.get('/:id/audio', async (req, res) => {
  try {
    const s = await prisma.standup.findFirst({ where: { id: req.params.id } })
    if (!s?.audioPath) { res.status(404).json({ error: 'Audio not available' }); return }

    const connector = await getConnector(req.tenantId || '')
    const bridgeUrl = connector.getBridgeUrl(`/api/standups/${req.params.id}/audio`)
    const audioRes = await fetch(bridgeUrl, {
      headers: { 'Authorization': `Bearer ${connector.getToken()}` },
    })
    if (!audioRes.ok) { res.status(404).json({ error: 'Audio not found on bridge' }); return }
    const audio = Buffer.from(await audioRes.arrayBuffer())
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Content-Length', audio.length.toString())
    res.end(audio)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// PATCH /api/standups/:id — update title
router.patch('/:id', async (req, res) => {
  try {
    const { title } = req.body
    console.log(`[PATCH standup] id=${req.params.id} tenantId=${req.tenantId} title="${title}"`)
    if (!title?.trim()) { res.status(400).json({ error: 'title required' }); return }
    // Try without tenantId filter first to diagnose
    const s = await prisma.standup.findFirst({ where: { id: req.params.id } })
    console.log(`[PATCH standup] found=${!!s} standup_tenantId=${s?.tenantId}`)
    if (!s) { res.status(404).json({ error: 'Standup not found' }); return }
    if (s.tenantId !== req.tenantId) { res.status(403).json({ error: `Tenant mismatch: standup=${s.tenantId} request=${req.tenantId}` }); return }
    const updated = await prisma.standup.update({ where: { id: s.id }, data: { title: title.trim() } })
    res.json({ ok: true, title: updated.title })
  } catch (err) {
    console.error('[PATCH standup] error:', err)
    res.status(500).json({ error: String(err) })
  }
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
