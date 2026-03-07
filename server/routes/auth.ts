import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../db.js'
import { signToken, authMiddleware } from '../middleware/auth.js'

const router = Router()

router.post('/register', async (req, res) => {
  try {
    const { tenantName, email, password, name } = req.body as {
      tenantName: string; email: string; password: string; name?: string
    }

    if (!tenantName || !email || !password) {
      res.status(400).json({ error: 'tenantName, email, and password are required' })
      return
    }

    const slug = tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const existing = await prisma.tenant.findUnique({ where: { slug } })
    if (existing) {
      res.status(409).json({ error: 'Tenant already exists' })
      return
    }

    const hashed = await bcrypt.hash(password, 10)
    const tenant = await prisma.tenant.create({
      data: {
        name: tenantName,
        slug,
        users: {
          create: {
            email,
            password: hashed,
            name: name || email.split('@')[0],
            role: 'admin',
          },
        },
      },
      include: { users: true },
    })

    const user = tenant.users[0]
    const token = signToken({ userId: user.id, tenantId: tenant.id, email: user.email, role: user.role })
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role }, tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug } })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email: string; password: string }
    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' })
      return
    }

    const user = await prisma.user.findFirst({ where: { email }, include: { tenant: true } })
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    const token = signToken({ userId: user.id, tenantId: user.tenantId, email: user.email, role: user.role })
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role }, tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug } })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// Legacy verify endpoint for backward compat
router.post('/verify', (_req, res) => {
  res.json({ valid: true })
})

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { tenant: true },
    })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    res.json({
      id: user.id, email: user.email, name: user.name, role: user.role,
      tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug },
    })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
