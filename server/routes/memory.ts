import { Router } from 'express'
import { readdir, readFile, stat } from 'fs/promises'
import { join } from 'path'

const router = Router()
const WORKSPACE_DIR = process.env.OPENCLAW_WORKSPACE || '/home/ubuntu/.openclaw/workspace'
const MEMORY_DIR = join(WORKSPACE_DIR, 'memory')
const MEMORY_MD = join(WORKSPACE_DIR, 'MEMORY.md')

// GET /api/memory/main — read MEMORY.md
router.get('/main', async (_req, res) => {
  try {
    const content = await readFile(MEMORY_MD, 'utf-8')
    res.json({ name: 'MEMORY.md', content })
  } catch (err) {
    res.status(404).json({ error: 'MEMORY.md not found' })
  }
})

// GET /api/memory/files — list files in memory/
router.get('/files', async (_req, res) => {
  try {
    const entries = await readdir(MEMORY_DIR)
    const files: Array<{ name: string; size: number; modified: string }> = []
    for (const name of entries) {
      try {
        const s = await stat(join(MEMORY_DIR, name))
        if (s.isFile()) {
          files.push({ name, size: s.size, modified: s.mtime.toISOString() })
        }
      } catch { /* skip */ }
    }
    files.sort((a, b) => b.modified.localeCompare(a.modified))
    res.json({ files })
  } catch (err) {
    res.json({ files: [] })
  }
})

// GET /api/memory/files/:name — read a specific memory file
router.get('/files/:name', async (req, res) => {
  try {
    const name = req.params.name
    // Prevent path traversal
    if (name.includes('/') || name.includes('..')) {
      res.status(400).json({ error: 'Invalid filename' })
      return
    }
    const content = await readFile(join(MEMORY_DIR, name), 'utf-8')
    res.json({ name, content })
  } catch (err) {
    res.status(404).json({ error: 'File not found' })
  }
})

export default router
