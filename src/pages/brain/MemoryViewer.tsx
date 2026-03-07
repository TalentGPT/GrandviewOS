import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { PageSkeleton } from '../../components/Skeleton'
import { fetchAgents } from '../../api/client'

interface MemoryFile {
  name: string
  path: string
  content: string
  date?: string
}

const MOCK_AGENTS = [
  { id: 'main', name: 'Muddy', emoji: '🐕' },
  { id: 'workspace', name: 'Main Workspace', emoji: '📁' },
]

function extractDate(filename: string): string | undefined {
  const m = filename.match(/(\d{4}-\d{2}-\d{2})/)
  return m?.[1]
}

export default function MemoryViewer() {
  const [agents, setAgents] = useState<Array<{ id: string; name: string; emoji: string }>>([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [memoryFiles, setMemoryFiles] = useState<MemoryFile[]>([])
  const [selectedFile, setSelectedFile] = useState<MemoryFile | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'files' | 'timeline'>('files')

  useEffect(() => {
    const load = async () => {
      const { data } = await fetchAgents()
      if (data && data.length > 0) {
        const mapped = data.map(a => ({ id: a.id, name: a.name, emoji: a.id === 'main' ? '🐕' : '📁' }))
        setAgents(mapped)
        setSelectedAgent(mapped[0].id)
      } else {
        setAgents(MOCK_AGENTS)
        setSelectedAgent(MOCK_AGENTS[0].id)
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedAgent) return
    const loadMemory = async () => {
      // Fetch MEMORY.md
      const files: MemoryFile[] = []
      try {
        const res = await fetch(`/api/workspace/${selectedAgent}/MEMORY.md`)
        if (res.ok) {
          const data = await res.json() as { content: string }
          files.push({ name: 'MEMORY.md', path: 'MEMORY.md', content: data.content })
        }
      } catch { /* ignore */ }

      // Fetch agent files to find memory/*.md
      try {
        const res = await fetch(`/api/agents/${selectedAgent}/files`)
        if (res.ok) {
          const agentFiles = await res.json() as Array<{ name: string; size: number }>
          const memFiles = agentFiles.filter(f => f.name.endsWith('.md'))
          for (const f of memFiles) {
            if (f.name === 'MEMORY.md') continue
            try {
              const fRes = await fetch(`/api/workspace/${selectedAgent}/${f.name}`)
              if (fRes.ok) {
                const fData = await fRes.json() as { content: string }
                files.push({ name: f.name, path: f.name, content: fData.content, date: extractDate(f.name) })
              }
            } catch { /* ignore */ }
          }
        }
      } catch { /* ignore */ }

      if (files.length === 0) {
        // Mock data
        files.push({
          name: 'MEMORY.md', path: 'MEMORY.md',
          content: '# Long-Term Memory\n\n## Key Decisions\n- 2026-03-01: Adopted multi-model strategy\n- 2026-02-15: Established 3-department structure\n\n## Lessons Learned\n- Agent-to-agent meetings produce better action items\n- Cost tracking must be visible at all times\n- Morning standups at 08:00 UTC catch most issues',
        })
        files.push({
          name: '2026-03-07.md', path: 'memory/2026-03-07.md', date: '2026-03-07',
          content: '# March 7, 2026\n\n## Sessions\n- Phase 6 build: Brain + Lab modules\n- Newsletter draft completed\n- Security audit running\n\n## Key Events\n- Partnership proposals sent to TechCorp, AIFlow\n- Community grew by 18 members',
        })
        files.push({
          name: '2026-03-06.md', path: 'memory/2026-03-06.md', date: '2026-03-06',
          content: '# March 6, 2026\n\n## Sessions\n- Sprint review\n- Auth middleware patch\n- 14 tickets closed\n\n## Key Events\n- Nova found critical XSS vulnerability — patched\n- Landing page conversion at 4.2%',
        })
        files.push({
          name: '2026-03-05.md', path: 'memory/2026-03-05.md', date: '2026-03-05',
          content: '# March 5, 2026\n\n## Sessions\n- SDK documentation progress\n- Community pulse analysis\n\n## Key Events\n- First micro-sponsorship deal closed ($500/mo)\n- Partner portal positive feedback',
        })
      }

      setMemoryFiles(files)
      setSelectedFile(files[0] ?? null)
    }
    loadMemory()
  }, [selectedAgent])

  const filteredFiles = search
    ? memoryFiles.filter(f => f.name.toLowerCase().includes(search.toLowerCase()) || f.content.toLowerCase().includes(search.toLowerCase()))
    : memoryFiles

  const timelineFiles = [...filteredFiles].filter(f => f.date).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  if (loading) return <PageSkeleton />

  const agent = agents.find(a => a.id === selectedAgent)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col md:flex-row gap-0 md:h-[calc(100vh-96px)] -m-4 md:-m-6">
      {/* Left sidebar: agents + files */}
      <div className="w-full md:w-60 shrink-0 overflow-y-auto border-b md:border-b-0 md:border-r p-4" style={{ background: 'var(--bg-2)', borderColor: 'var(--border-divider)' }}>
        <div className="text-[10px] font-semibold tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>AGENTS</div>
        {agents.map(a => (
          <button
            key={a.id}
            onClick={() => setSelectedAgent(a.id)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left mb-1 cursor-pointer transition-colors hover:bg-[var(--bg-3)]"
            style={{
              background: selectedAgent === a.id ? 'var(--accent-purple)11' : 'transparent',
              color: selectedAgent === a.id ? 'var(--accent-purple)' : 'var(--text-primary)',
              border: selectedAgent === a.id ? '1px solid var(--accent-purple)33' : '1px solid transparent',
            }}
          >
            <span>{a.emoji}</span>
            <span>{a.name}</span>
          </button>
        ))}

        <div className="text-[10px] font-semibold tracking-wider mt-6 mb-3" style={{ color: 'var(--text-secondary)' }}>MEMORY FILES</div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search memory..."
          className="w-full px-2 py-1.5 rounded-md text-xs mb-3 focus:outline-none focus:ring-1 focus:ring-[var(--accent-purple)]"
          style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)' }}
        />

        {/* View toggle */}
        <div className="flex gap-1 mb-3">
          <button onClick={() => setView('files')} className="flex-1 px-2 py-1 rounded text-[10px] font-medium cursor-pointer"
            style={{ background: view === 'files' ? 'var(--accent-purple)22' : 'var(--bg-3)', color: view === 'files' ? 'var(--accent-purple)' : 'var(--text-secondary)', border: 'none' }}>
            📄 Files
          </button>
          <button onClick={() => setView('timeline')} className="flex-1 px-2 py-1 rounded text-[10px] font-medium cursor-pointer"
            style={{ background: view === 'timeline' ? 'var(--accent-purple)22' : 'var(--bg-3)', color: view === 'timeline' ? 'var(--accent-purple)' : 'var(--text-secondary)', border: 'none' }}>
            📅 Timeline
          </button>
        </div>

        {view === 'files' ? (
          filteredFiles.map(f => (
            <button
              key={f.path}
              onClick={() => setSelectedFile(f)}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs text-left mb-1 cursor-pointer transition-colors hover:bg-[var(--bg-3)]"
              style={{
                background: selectedFile?.path === f.path ? 'var(--accent-purple)11' : 'transparent',
                color: selectedFile?.path === f.path ? 'var(--accent-purple)' : 'var(--text-primary)',
                border: selectedFile?.path === f.path ? '1px solid var(--accent-purple)33' : '1px solid transparent',
              }}
            >
              <span>📄 {f.name}</span>
              {f.date && <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{f.date}</span>}
            </button>
          ))
        ) : (
          <div className="border-l-2 ml-2 pl-3" style={{ borderColor: 'var(--accent-purple)33' }}>
            {timelineFiles.map(f => (
              <button
                key={f.path}
                onClick={() => setSelectedFile(f)}
                className="w-full text-left mb-3 cursor-pointer hover:opacity-80"
                style={{ background: 'none', border: 'none', padding: 0 }}
              >
                <div className="text-[10px] font-semibold" style={{ color: 'var(--accent-purple)' }}>{f.date}</div>
                <div className="text-xs" style={{ color: selectedFile?.path === f.path ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{f.name}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        {selectedFile ? (
          <>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">{agent?.emoji}</span>
              <span className="text-lg font-semibold">{agent?.name}</span>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>›</span>
              <span className="text-sm" style={{ color: 'var(--accent-purple)' }}>{selectedFile.name}</span>
            </div>
            {search && (
              <div className="text-xs mb-3 px-2 py-1 rounded" style={{ background: 'var(--accent-purple)11', color: 'var(--accent-purple)' }}>
                🔍 Showing results for &quot;{search}&quot;
              </div>
            )}
            <div className="prose prose-invert max-w-none rounded-lg p-5 workspace-markdown" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedFile.content}</ReactMarkdown>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-3">🧠</div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Select a memory file to view</div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
