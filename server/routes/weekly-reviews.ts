import { Router } from 'express'
import prisma from '../db.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const reviews = await prisma.weeklyReview.findMany({
      where: { tenantId: req.tenantId! },
      orderBy: { weekStart: 'desc' },
    })
    res.json(reviews)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.post('/generate', async (req, res) => {
  try {
    const { weekStart, weekEnd } = req.body
    const start = new Date(weekStart)
    const end = new Date(weekEnd)

    // Query sessions from the given week
    const sessions = await prisma.session.findMany({
      where: {
        tenantId: req.tenantId!,
        startedAt: { gte: start, lte: end },
      },
      include: { agent: true },
    })

    const sessionsRun = sessions.length
    const totalCost = sessions.reduce((s, x) => s + x.totalCost, 0)
    const tokensUsed = sessions.reduce((s, x) => s + x.totalTokens, 0)

    // Top agents by session count
    const agentCounts: Record<string, { name: string; count: number; cost: number }> = {}
    for (const s of sessions) {
      const name = s.agent?.name || 'Unknown'
      if (!agentCounts[name]) agentCounts[name] = { name, count: 0, cost: 0 }
      agentCounts[name].count++
      agentCounts[name].cost += s.totalCost
    }
    const topAgents = Object.values(agentCounts).sort((a, b) => b.count - a.count).slice(0, 5)

    const summary = `Week of ${start.toISOString().split('T')[0]}: ${sessionsRun} sessions, ${tokensUsed} tokens, $${totalCost.toFixed(2)} total cost.`
    const highlights = topAgents.length > 0
      ? [`Top agent: ${topAgents[0].name} (${topAgents[0].count} sessions)`, `Total cost: $${totalCost.toFixed(2)}`]
      : ['No sessions this week']

    const review = await prisma.weeklyReview.create({
      data: {
        tenantId: req.tenantId!,
        weekStart: start,
        weekEnd: end,
        summary,
        metrics: { sessionsRun, totalCost, tokensUsed, topAgents },
        highlights,
      },
    })
    res.json(review)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
