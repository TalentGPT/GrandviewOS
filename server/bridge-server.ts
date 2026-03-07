/**
 * OpenClaw Bridge Server — standalone Express server
 * Runs on VPS, exposes OpenClaw filesystem data as REST API
 * GrandviewOS on Replit connects to this
 */
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(import.meta.dirname || '.', '../.env') })

import express from 'express'
import cors from 'cors'
import bridgeRouter from './services/openclaw-bridge.js'

const app = express()
import 'dotenv/config'

const PORT = parseInt(process.env.BRIDGE_PORT || '7101')
const BRIDGE_TOKEN = process.env.BRIDGE_TOKEN || 'gv-bridge-2026'

// CORS — allow Replit origins
app.use(cors({ origin: true }))
app.use(express.json())

// Simple token auth
app.use((req, res, next) => {
  // Allow health check without auth
  if (req.path === '/api/health') return next()
  
  const token = req.headers['authorization']?.replace('Bearer ', '') || 
                req.headers['x-bridge-token'] as string
  if (token !== BRIDGE_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
})

// Mount bridge routes
app.use('/api', bridgeRouter)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌉 OpenClaw Bridge running on http://0.0.0.0:${PORT}`)
  console.log(`   Token: ${BRIDGE_TOKEN}`)
})
