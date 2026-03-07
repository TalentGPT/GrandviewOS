import { Router } from 'express'
import prisma from '../db.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const providers = await prisma.llmProvider.findMany({ where: { tenantId: req.tenantId! } })
    res.json(providers.map(p => ({
      id: p.id, provider: p.provider, name: p.name,
      api_key_secret_id: p.secretId, base_url: null,
      status: p.isActive ? 'active' : 'inactive',
      models: (p.models as any[]) || [],
    })))
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.post('/', async (req, res) => {
  try {
    const provider = await prisma.llmProvider.create({
      data: {
        tenantId: req.tenantId!,
        provider: req.body.provider || 'custom',
        name: req.body.name || 'Custom',
        models: req.body.models || [],
        secretId: req.body.api_key_secret_id || null,
      },
    })
    res.json({ id: provider.id, provider: provider.provider, name: provider.name, api_key_secret_id: provider.secretId, base_url: null, status: 'inactive', models: provider.models })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const data: any = {}
    if (req.body.name) data.name = req.body.name
    if (req.body.models) data.models = req.body.models
    if (req.body.api_key_secret_id !== undefined) data.secretId = req.body.api_key_secret_id
    if (req.body.status) data.isActive = req.body.status === 'active'
    const updated = await prisma.llmProvider.update({ where: { id: req.params.id }, data })
    res.json({ id: updated.id, provider: updated.provider, name: updated.name, api_key_secret_id: updated.secretId, base_url: null, status: updated.isActive ? 'active' : 'inactive', models: updated.models })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
