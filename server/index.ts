import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { authMiddleware } from './middleware/auth.js'
import authRoutes from './routes/auth.js'
import agentRoutes from './routes/agents.js'
import sessionRoutes from './routes/sessions.js'
import standupRoutes from './routes/standups.js'
import integrationRoutes from './routes/integrations.js'
import secretRoutes from './routes/secrets.js'
import mcpRoutes from './routes/mcp.js'
import llmRoutes from './routes/llm.js'
import permissionRoutes from './routes/permissions.js'
import systemRoutes from './routes/system.js'
import workspaceRoutes from './routes/workspace.js'
import openclawRoutes from './routes/openclaw.js'

const app = express()
const PORT = parseInt(process.env.PORT || '3000', 10)
const __dirname = dirname(fileURLToPath(import.meta.url))
const distPath = join(__dirname, '..', 'dist')

// Middleware
app.use(cors())
app.use(helmet({ contentSecurityPolicy: false }))
app.use(express.json({ limit: '2mb' }))

// Auth routes (no auth required)
app.use('/api/auth', authRoutes)

// Auth middleware for all other /api routes
app.use('/api', authMiddleware)

// API routes — namespaced
app.use('/api/agents', agentRoutes)
app.use('/api/sessions', sessionRoutes)
app.use('/api/standups', standupRoutes)
app.use('/api/integrations', integrationRoutes)
app.use('/api/secrets', secretRoutes)
app.use('/api/mcp-servers', mcpRoutes)
app.use('/api/llm-providers', llmRoutes)
app.use('/api/agent-permissions', permissionRoutes)
app.use('/api/workspace', workspaceRoutes)
app.use('/api/openclaw', openclawRoutes)

// System routes mounted at /api/system AND root /api level
app.use('/api/system', systemRoutes)
// Mount the same router at /api for paths like /api/config, /api/cost/*, /api/briefs, etc.
app.use('/api', systemRoutes)

// Static files
app.use(express.static(distPath))

// SPA fallback
app.get('/{0,}(.*)', (_req, res) => {
  res.sendFile(join(distPath, 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`GrandviewOS server running on http://0.0.0.0:${PORT}`)
})

export default app
