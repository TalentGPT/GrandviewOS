import { Router } from 'express'
import prisma from '../db.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const perms = await prisma.agentPermission.findMany({
      where: { tenantId: req.tenantId! },
      include: { agent: { select: { name: true, slug: true } } },
    })
    res.json(perms.map(p => ({
      agent_id: p.agent.slug,
      agent_name: p.agent.name,
      allowed_integrations: (p.allowedIntegrations as string[]) || [],
      allowed_tools: (p.allowedTools as string[]) || [],
      allowed_models: (p.allowedModels as string[]) || [],
      deny_tools: [],
    })))
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.patch('/:agent', async (req, res) => {
  try {
    const agent = await prisma.agent.findFirst({ where: { tenantId: req.tenantId!, slug: req.params.agent } })
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return }

    const existing = await prisma.agentPermission.findUnique({
      where: { tenantId_agentId: { tenantId: req.tenantId!, agentId: agent.id } },
    })

    const data = {
      allowedModels: req.body.allowed_models || ['*'],
      allowedTools: req.body.allowed_tools || ['*'],
      allowedIntegrations: req.body.allowed_integrations || ['*'],
    }

    if (existing) {
      await prisma.agentPermission.update({ where: { id: existing.id }, data })
    } else {
      await prisma.agentPermission.create({
        data: { tenantId: req.tenantId!, agentId: agent.id, ...data },
      })
    }

    res.json({ agent_id: agent.slug, agent_name: agent.name, ...data, deny_tools: [] })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
