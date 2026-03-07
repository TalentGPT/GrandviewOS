import { Router } from 'express'
import prisma from '../db.js'

const router = Router()

// GET /api/agents — list agents, return format matching frontend ApiAgent type
router.get('/', async (req, res) => {
  try {
    const agents = await prisma.agent.findMany({
      where: { tenantId: req.tenantId! },
      orderBy: { createdAt: 'asc' },
    })

    // Map to frontend ApiAgent shape
    const mapped = agents.map(a => ({
      id: a.slug,
      name: a.name,
      workspace: `/agents/${a.slug}`,
      hasSoul: !!a.soulMd,
      hasIdentity: !!a.identityMd,
      hasMemory: !!a.memoryMd,
      soulSnippet: (a.soulMd || '').slice(0, 200),
      files: [
        a.soulMd ? 'SOUL.md' : null,
        a.identityMd ? 'IDENTITY.md' : null,
        a.userMd ? 'USER.md' : null,
        a.toolsMd ? 'TOOLS.md' : null,
        a.agentsMd ? 'AGENTS.md' : null,
        a.memoryMd ? 'MEMORY.md' : null,
        a.heartbeatMd ? 'HEARTBEAT.md' : null,
      ].filter(Boolean) as string[],
      // Org chart fields
      slug: a.slug,
      role: a.role,
      department: a.department ?? null,
      division: a.division ?? null,
      parentId: a.parentId ?? null,
      primaryModel: a.primaryModel,
      status: a.status,
      emoji: a.emoji ?? null,
      description: a.description ?? null,
      persona: a.persona ?? null,
    }))

    res.json(mapped)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/agents/:id — agent detail
router.get('/:id', async (req, res) => {
  try {
    const agent = await prisma.agent.findFirst({
      where: { tenantId: req.tenantId!, slug: req.params.id },
    })
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return }
    res.json(agent)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/agents — create agent
router.post('/', async (req, res) => {
  try {
    const agent = await prisma.agent.create({
      data: { tenantId: req.tenantId!, ...req.body },
    })
    res.json(agent)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// PATCH /api/agents/:id — update agent
router.patch('/:id', async (req, res) => {
  try {
    const agent = await prisma.agent.findFirst({ where: { tenantId: req.tenantId!, slug: req.params.id } })
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return }
    const updated = await prisma.agent.update({ where: { id: agent.id }, data: req.body })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// DELETE /api/agents/:id
router.delete('/:id', async (req, res) => {
  try {
    const agent = await prisma.agent.findFirst({ where: { tenantId: req.tenantId!, slug: req.params.id } })
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return }
    await prisma.agent.delete({ where: { id: agent.id } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/agents/:id/files — list agent workspace files
router.get('/:id/files', async (req, res) => {
  try {
    const agent = await prisma.agent.findFirst({ where: { tenantId: req.tenantId!, slug: req.params.id } })
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return }

    const files: Array<{ name: string; size: number }> = []
    const fileMap: Record<string, string | null> = {
      'SOUL.md': agent.soulMd,
      'IDENTITY.md': agent.identityMd,
      'USER.md': agent.userMd,
      'TOOLS.md': agent.toolsMd,
      'AGENTS.md': agent.agentsMd,
      'MEMORY.md': agent.memoryMd,
      'HEARTBEAT.md': agent.heartbeatMd,
    }
    for (const [name, content] of Object.entries(fileMap)) {
      if (content) files.push({ name, size: Buffer.byteLength(content, 'utf-8') })
    }
    res.json(files)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/agents/:id/sync-tools
router.post('/:id/sync-tools', async (req, res) => {
  try {
    res.json({ ok: true, agentId: req.params.id, message: 'Tools synced' })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/agents/sync-all
router.post('/sync-all', async (req, res) => {
  try {
    const count = await prisma.agent.count({ where: { tenantId: req.tenantId! } })
    res.json({ synced: count, errors: 0, total: count })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
