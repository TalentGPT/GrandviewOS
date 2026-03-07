import { Router } from 'express'
import prisma from '../db.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { source, ideaId } = req.query
    const where: any = { tenantId: req.tenantId! }
    if (source) where.source = source as string
    if (ideaId) where.ideaId = ideaId as string
    const logs = await prisma.ideationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    res.json(logs)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.post('/', async (req, res) => {
  try {
    const { content, source, ideaId } = req.body
    const log = await prisma.ideationLog.create({
      data: {
        tenantId: req.tenantId!,
        content,
        source: source || null,
        ideaId: ideaId || null,
      },
    })
    res.json(log)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
