import { Router } from 'express'
import { randomBytes, createCipheriv } from 'crypto'
import prisma from '../db.js'

const router = Router()
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0'.repeat(64)

function encrypt(value: string): { encrypted: string; iv: string } {
  const iv = randomBytes(16)
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(64, '0').slice(0, 64), 'hex')
  const cipher = createCipheriv('aes-256-cbc', key, iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf-8'), cipher.final()])
  return { encrypted: encrypted.toString('base64'), iv: iv.toString('base64') }
}

router.get('/', async (req, res) => {
  try {
    const secrets = await prisma.secret.findMany({ where: { tenantId: req.tenantId! } })
    res.json(secrets.map(s => ({
      id: s.id, name: s.name, type: s.type,
      hint: '••••' + s.encryptedValue.slice(-4),
      created_at: s.createdAt.toISOString(),
      updated_at: s.createdAt.toISOString(),
      last_rotated: s.lastRotated.toISOString(),
    })))
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, type, value } = req.body as { name: string; type: string; value: string }
    const { encrypted, iv } = encrypt(value)
    const secret = await prisma.secret.create({
      data: { tenantId: req.tenantId!, name, type, encryptedValue: encrypted, iv },
    })
    res.json({
      id: secret.id, name: secret.name, type: secret.type,
      hint: '••••' + value.slice(-4),
      created_at: secret.createdAt.toISOString(),
      updated_at: secret.createdAt.toISOString(),
      last_rotated: secret.lastRotated.toISOString(),
    })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const data: any = {}
    if (req.body.name) data.name = req.body.name
    if (req.body.type) data.type = req.body.type
    if (req.body.value) {
      const { encrypted, iv } = encrypt(req.body.value)
      data.encryptedValue = encrypted
      data.iv = iv
      data.lastRotated = new Date()
    }
    await prisma.secret.updateMany({ where: { id: req.params.id, tenantId: req.tenantId! }, data })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await prisma.secret.deleteMany({ where: { id: req.params.id, tenantId: req.tenantId! } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
