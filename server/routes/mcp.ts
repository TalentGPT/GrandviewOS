import { Router } from 'express'
import prisma from '../db.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const servers = await prisma.mcpServer.findMany({ where: { tenantId: req.tenantId! } })
    res.json(servers.map(s => ({
      id: s.id, name: s.name, url: s.url,
      auth_type: s.authType, credential_secret_id: s.secretId,
      status: s.status, tool_count: ((s.tools as any[]) || []).length,
      connected_agents: [],
    })))
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.post('/', async (req, res) => {
  try {
    const server = await prisma.mcpServer.create({
      data: {
        tenantId: req.tenantId!,
        name: req.body.name || 'MCP Server',
        url: req.body.url || '',
        authType: req.body.auth_type || 'none',
        secretId: req.body.credential_secret_id || null,
      },
    })
    res.json({ id: server.id, name: server.name, url: server.url, auth_type: server.authType, credential_secret_id: server.secretId, status: server.status, tool_count: 0, connected_agents: [] })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await prisma.mcpServer.deleteMany({ where: { id: req.params.id, tenantId: req.tenantId! } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.get('/:id/tools', async (_req, res) => {
  res.json([
    { name: 'read_file', description: 'Read a file', input_schema: { type: 'object', properties: { path: { type: 'string' } } } },
    { name: 'write_file', description: 'Write a file', input_schema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } } } },
    { name: 'execute', description: 'Execute a command', input_schema: { type: 'object', properties: { command: { type: 'string' } } } },
  ])
})

export default router
