import { Router } from 'express'
import prisma from '../db.js'

const router = Router()

// Map DB Integration to frontend IntegrationEntry shape
function mapIntegration(i: any) {
  const config = (i.config || {}) as Record<string, any>
  return {
    id: i.id,
    type: i.type,
    name: i.name,
    icon: config.icon || '🔌',
    auth_method: config.auth_method || 'api_key',
    required_secrets: config.required_secrets || [],
    configured_secrets: config.configured_secrets || {},
    config: config.extra || {},
    status: i.status,
    last_used: i.lastUsed?.toISOString() || null,
    is_custom: config.is_custom || false,
  }
}

router.get('/', async (req, res) => {
  try {
    const integrations = await prisma.integration.findMany({ where: { tenantId: req.tenantId! } })
    res.json(integrations.map(mapIntegration))
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.post('/', async (req, res) => {
  try {
    const { type, name, icon, auth_method, required_secrets, config: extra } = req.body
    const integration = await prisma.integration.create({
      data: {
        tenantId: req.tenantId!,
        type: type || 'custom',
        name: name || 'Custom Integration',
        status: 'disconnected',
        config: { icon: icon || '🔌', auth_method: auth_method || 'api_key', required_secrets: required_secrets || [], configured_secrets: {}, extra: extra || {}, is_custom: true },
      },
    })
    res.json(mapIntegration(integration))
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const existing = await prisma.integration.findFirst({ where: { id: req.params.id, tenantId: req.tenantId! } })
    if (!existing) { res.status(404).json({ error: 'Not found' }); return }
    const oldConfig = (existing.config || {}) as Record<string, any>
    const newConfig = { ...oldConfig }
    if (req.body.configured_secrets) newConfig.configured_secrets = req.body.configured_secrets
    if (req.body.config) newConfig.extra = req.body.config
    if (req.body.icon) newConfig.icon = req.body.icon
    const updated = await prisma.integration.update({
      where: { id: req.params.id },
      data: { status: req.body.status || existing.status, config: newConfig },
    })
    res.json(mapIntegration(updated))
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await prisma.integration.deleteMany({ where: { id: req.params.id, tenantId: req.tenantId! } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.post('/:id/test', async (req, res) => {
  try {
    const i = await prisma.integration.findFirst({ where: { id: req.params.id, tenantId: req.tenantId! } })
    if (!i) { res.status(404).json({ error: 'Not found' }); return }
    // MVP: simulate test
    await prisma.integration.update({ where: { id: i.id }, data: { status: 'connected', lastUsed: new Date() } })
    res.json({ ok: true, status: 'connected' })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
