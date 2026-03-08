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

// Proxy automations from bridge
router.get('/automations', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const data = await connector.fetch<any>('/api/automations')
    res.json(data || { automations: [] })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// Trello board management (proxy to bridge)
router.get('/trello/boards', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const data = await connector.fetch<any>('/api/trello/boards')
    res.json(data || { boards: [] })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.get('/trello/config', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const data = await connector.fetch<any>('/api/trello/config')
    res.json(data || { boardId: null, boardUrl: null, boardName: null, lastSynced: null })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.post('/trello/connect', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const data = await connector.post<any>('/api/trello/connect', req.body)
    res.json(data || { ok: false, error: 'Bridge error' })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.post('/trello/sync', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const data = await connector.post<any>('/api/trello/sync', req.body || {})
    res.json(data || { ok: false, error: 'Bridge error' })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// Trello CRUD proxy routes
router.post('/trello/cards', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const data = await connector.post<any>('/api/trello/cards', req.body)
    res.json(data || { error: 'Bridge error' })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

router.get('/trello/cards/:cardId', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const data = await connector.fetch<any>(`/api/trello/cards/${req.params.cardId}`)
    res.json(data || { error: 'Not found' })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

router.put('/trello/cards/:cardId', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const data = await connector.put<any>(`/api/trello/cards/${req.params.cardId}`, req.body)
    res.json(data || { error: 'Bridge error' })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

router.put('/trello/cards/:cardId/move', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const data = await connector.put<any>(`/api/trello/cards/${req.params.cardId}/move`, req.body)
    res.json(data || { error: 'Bridge error' })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

router.put('/trello/cards/:cardId/archive', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const data = await connector.put<any>(`/api/trello/cards/${req.params.cardId}/archive`, {})
    res.json(data || { error: 'Bridge error' })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

router.delete('/trello/cards/:cardId', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const data = await connector.del<any>(`/api/trello/cards/${req.params.cardId}`)
    res.json(data || { ok: true })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

router.post('/trello/lists', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const data = await connector.post<any>('/api/trello/lists', req.body)
    res.json(data || { error: 'Bridge error' })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

router.post('/trello/cards/:cardId/labels', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const data = await connector.post<any>(`/api/trello/cards/${req.params.cardId}/labels`, req.body)
    res.json(data || { error: 'Bridge error' })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

router.post('/trello/cards/:cardId/comments', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const data = await connector.post<any>(`/api/trello/cards/${req.params.cardId}/comments`, req.body)
    res.json(data || { error: 'Bridge error' })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

router.put('/trello/cards/:cardId/checkItem/:checkItemId', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const data = await connector.put<any>(`/api/trello/cards/${req.params.cardId}/checkItem/${req.params.checkItemId}`, req.body)
    res.json(data || { ok: true })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

router.get('/trello/boards/:boardId/lists', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const data = await connector.fetch<any>(`/api/trello/boards/${req.params.boardId}/lists`)
    res.json(data || [])
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// Proxy projects from bridge
router.get('/projects', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const data = await connector.fetch<any>('/api/projects')
    res.json(data || { boardName: 'Projects', lastSynced: null, lists: [] })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// Agent Tasks
router.get('/agent-tasks', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    // Bypass cache — always fetch fresh task list
    const data = await connector.fetchUncached<any[]>('/api/agent-tasks')
    res.json(data || [])
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

router.patch('/agent-tasks/:id', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const data = await connector.post<any>(`/api/agent-tasks/${req.params.id}`, req.body)
    res.json(data || { ok: true })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// Agent Chat
router.post('/agents/:slug/chat', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const data = await connector.post<any>(`/api/agents/${req.params.slug}/chat`, req.body)
    res.json(data || { error: 'No response' })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

router.get('/agents/:slug/history', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const data = await connector.fetch<any>(`/api/agents/${req.params.slug}/history`)
    res.json(data || [])
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

router.get('/agents/sessions', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const data = await connector.fetch<any>('/api/agents/sessions')
    res.json(data || [])
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

router.delete('/agents/:slug/history', async (req, res) => {
  try {
    const connector = await getConnector(req.tenantId!)
    const data = await connector.del<any>(`/api/agents/${req.params.slug}/history`)
    res.json(data || { ok: true })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

export default router
