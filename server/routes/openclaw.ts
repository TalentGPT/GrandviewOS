import { Router } from 'express'
import prisma from '../db.js'
import { OpenClawConnector } from '../services/openclaw-connector.js'

const router = Router()

async function getConnector(tenantId: string): Promise<OpenClawConnector> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  return new OpenClawConnector(tenant?.openclawUrl || '', tenant?.openclawToken || '')
}

// Delete sample/seed sessions (keep only synced ones)
router.post('/cleanup', async (req, res) => {
  try {
    const deleted = await prisma.session.deleteMany({
      where: { tenantId: req.tenantId!, title: { startsWith: 'Sample Session' } },
    })
    res.json({ ok: true, deleted: deleted.count })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.post('/connect', async (req, res) => {
  try {
    const { url, token } = req.body
    console.log('[OpenClaw Connect] url:', url, 'token:', token ? '***' : 'MISSING')
    const connector = new OpenClawConnector(url, token)
    const health = await connector.getHealth()
    if (health) {
      await prisma.tenant.update({ where: { id: req.tenantId! }, data: { openclawUrl: url, openclawToken: token } })
      res.json({ ok: true, health })
    } else {
      res.json({ ok: false, error: 'Could not connect' })
    }
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.get('/sessions', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const sessions = await connector.getSessions()
    res.json(sessions)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.get('/sessions/:id/transcript', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const transcript = await connector.getTranscript(req.params.id)
    res.json(transcript)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.post('/sessions/:id/kill', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const result = await connector.killSession(req.params.id)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.get('/cron-jobs', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const jobs = await connector.getCronJobs()
    res.json(jobs)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.post('/sync', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const sessions = await connector.getSessions()

    // Load agents for slug matching
    const agents = await prisma.agent.findMany({ where: { tenantId: req.tenantId! } })
    const agentsBySlug = new Map(agents.map(a => [a.slug, a.id]))

    let synced = 0
    for (const s of sessions) {
      // Match agent slug to agentId
      let agentId: string | null = null
      if (s.agent && s.agent !== 'unknown') {
        agentId = agentsBySlug.get(s.agent) || null
      }

      await prisma.session.upsert({
        where: { id: s.id },
        create: {
          id: s.id, tenantId: req.tenantId!, openclawId: s.id, title: s.title,
          model: s.model, provider: s.provider, messageCount: s.messageCount,
          totalTokens: s.totalTokens, totalCost: s.totalCost, isActive: s.isActive,
          startedAt: new Date(s.timestamp), lastActivity: new Date(s.lastActivity),
          ...(agentId ? { agentId } : {}),
        },
        update: {
          title: s.title, messageCount: s.messageCount, totalTokens: s.totalTokens,
          totalCost: s.totalCost, isActive: s.isActive, lastActivity: new Date(s.lastActivity),
          ...(agentId ? { agentId } : {}),
        },
      })
      synced++
    }
    res.json({ ok: true, synced })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
