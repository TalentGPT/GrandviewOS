import { Router } from 'express'
import prisma from '../db.js'

const router = Router()

const FILE_MAP: Record<string, string> = {
  'SOUL.md': 'soulMd',
  'IDENTITY.md': 'identityMd',
  'USER.md': 'userMd',
  'TOOLS.md': 'toolsMd',
  'AGENTS.md': 'agentsMd',
  'MEMORY.md': 'memoryMd',
  'HEARTBEAT.md': 'heartbeatMd',
}

// GET /api/workspace/:agentId/:fileName
router.get('/:agentId/:fileName', async (req, res) => {
  try {
    const agent = await prisma.agent.findFirst({ where: { tenantId: req.tenantId!, slug: req.params.agentId } })
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return }
    const field = FILE_MAP[req.params.fileName]
    if (!field) { res.status(404).json({ error: 'File not found' }); return }
    const content = (agent as any)[field]
    if (content === null || content === undefined) { res.status(404).json({ error: 'File not found' }); return }
    res.json({ content })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// PUT /api/workspace/:agentId/:fileName
router.put('/:agentId/:fileName', async (req, res) => {
  try {
    const agent = await prisma.agent.findFirst({ where: { tenantId: req.tenantId!, slug: req.params.agentId } })
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return }
    const field = FILE_MAP[req.params.fileName]
    if (!field) { res.status(400).json({ error: 'Invalid file name' }); return }
    await prisma.agent.update({ where: { id: agent.id }, data: { [field]: req.body.content } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
