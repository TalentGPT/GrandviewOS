import { Router } from 'express'
import prisma from '../db.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const ideas = await prisma.idea.findMany({
      where: { tenantId: req.tenantId! },
      orderBy: { createdAt: 'desc' },
    })
    res.json(ideas)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.post('/', async (req, res) => {
  try {
    const { title, description, tags, status, createdBy } = req.body
    const idea = await prisma.idea.create({
      data: {
        tenantId: req.tenantId!,
        title,
        description: description || '',
        tags: tags || [],
        status: status || 'new',
        createdBy: createdBy || null,
      },
    })
    res.json(idea)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { title, description, tags, status } = req.body
    const idea = await prisma.idea.updateMany({
      where: { id: req.params.id, tenantId: req.tenantId! },
      data: { ...(title !== undefined && { title }), ...(description !== undefined && { description }), ...(tags !== undefined && { tags }), ...(status !== undefined && { status }) },
    })
    if (idea.count === 0) return res.status(404).json({ error: 'Not found' })
    const updated = await prisma.idea.findUnique({ where: { id: req.params.id } })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await prisma.idea.deleteMany({ where: { id: req.params.id, tenantId: req.tenantId! } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.post('/:id/vote', async (req, res) => {
  try {
    const idea = await prisma.idea.findFirst({ where: { id: req.params.id, tenantId: req.tenantId! } })
    if (!idea) return res.status(404).json({ error: 'Not found' })
    const updated = await prisma.idea.update({ where: { id: req.params.id }, data: { votes: { increment: 1 } } })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
