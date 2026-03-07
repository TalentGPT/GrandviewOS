import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '../../components/Toast'
import { PageSkeleton } from '../../components/Skeleton'

type ProjectStatus = 'backlog' | 'in-progress' | 'review' | 'done'

interface Project {
  id: string
  title: string
  agents: Array<{ name: string; emoji: string }>
  status: ProjectStatus
  lastUpdate: string
  linkedSessions: number
  description: string
}

const COLUMNS: { key: ProjectStatus; label: string; color: string }[] = [
  { key: 'backlog', label: 'Backlog', color: 'var(--text-secondary)' },
  { key: 'in-progress', label: 'In Progress', color: 'var(--accent-teal)' },
  { key: 'review', label: 'Review', color: 'var(--accent-orange)' },
  { key: 'done', label: 'Done', color: 'var(--accent-green)' },
]

const INITIAL_PROJECTS: Project[] = [
  { id: 'p1', title: 'Brain Module V2', agents: [{ name: 'Muddy', emoji: '🐕' }, { name: 'Pixel', emoji: '🎨' }], status: 'in-progress', lastUpdate: '2h ago', linkedSessions: 8, description: 'Memory viewer, daily briefs, automations, project tracking' },
  { id: 'p2', title: 'Lab Module V2', agents: [{ name: 'Muddy', emoji: '🐕' }, { name: 'Frame', emoji: '🖼️' }], status: 'in-progress', lastUpdate: '3h ago', linkedSessions: 5, description: 'Idea gallery, prototype fleet, weekly reviews, ideation logs' },
  { id: 'p3', title: 'TechCorp Partnership', agents: [{ name: 'Warren', emoji: '💰' }, { name: 'Deal', emoji: '🤝' }], status: 'review', lastUpdate: '1d ago', linkedSessions: 12, description: 'API integration partnership with TechCorp' },
  { id: 'p4', title: 'Community Growth 1K', agents: [{ name: 'Gary', emoji: '📣' }, { name: 'Clay', emoji: '🦞' }], status: 'in-progress', lastUpdate: '6h ago', linkedSessions: 20, description: 'Grow Discord community to 1000 members' },
  { id: 'p5', title: 'Security Hardening', agents: [{ name: 'Elon', emoji: '🚀' }, { name: 'Nova', emoji: '🛡️' }], status: 'done', lastUpdate: '2d ago', linkedSessions: 15, description: 'CSRF protection, rate limiting, dependency audit' },
  { id: 'p6', title: 'AIFlow Demo', agents: [{ name: 'Warren', emoji: '💰' }], status: 'backlog', lastUpdate: '3d ago', linkedSessions: 2, description: 'Prepare and run demo call with AIFlow' },
  { id: 'p7', title: 'DataStream Pipeline', agents: [{ name: 'Scout', emoji: '🔭' }], status: 'backlog', lastUpdate: '4d ago', linkedSessions: 1, description: 'Data integration partnership exploration' },
  { id: 'p8', title: 'Voice Standup System', agents: [{ name: 'Muddy', emoji: '🐕' }, { name: 'Atlas', emoji: '🏗️' }], status: 'done', lastUpdate: '5d ago', linkedSessions: 18, description: 'TTS-based agent-to-agent voice meetings' },
]

export default function ProjectTracking() {
  const { addToast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/projects')
        if (res.ok) {
          const data = await res.json() as Project[]
          if (data.length > 0) { setProjects(data); setLoading(false); return }
        }
      } catch { /* ignore */ }
      setProjects(INITIAL_PROJECTS)
      setLoading(false)
    }
    load()
  }, [])

  const moveProject = (id: string, newStatus: ProjectStatus) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status: newStatus, lastUpdate: 'just now' } : p))
    addToast(`Moved to ${COLUMNS.find(c => c.key === newStatus)?.label}`)
  }

  const addProject = () => {
    if (!newTitle.trim()) return
    const p: Project = {
      id: `p${Date.now()}`, title: newTitle, agents: [{ name: 'Muddy', emoji: '🐕' }],
      status: 'backlog', lastUpdate: 'just now', linkedSessions: 0, description: '',
    }
    setProjects(prev => [...prev, p])
    setNewTitle('')
    setShowAdd(false)
    addToast('Project added')
  }

  if (loading) return <PageSkeleton />

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Project Tracking</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Track progress across multi-agent projects</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer"
          style={{ background: 'var(--accent-purple)22', color: 'var(--accent-purple)', border: '1px solid var(--accent-purple)44' }}>
          + New Project
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4">
            <div className="rounded-lg p-4 flex gap-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--accent-purple)33' }}>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Project title..."
                onKeyDown={e => { if (e.key === 'Enter') addProject() }}
                className="flex-1 px-3 py-1.5 rounded text-sm focus:outline-none" style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)' }} />
              <button onClick={addProject} className="px-4 py-1.5 rounded text-xs font-medium cursor-pointer"
                style={{ background: 'var(--accent-green)22', color: 'var(--accent-green)', border: '1px solid var(--accent-green)44' }}>Add</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map(col => {
          const colProjects = projects.filter(p => p.status === col.key)
          return (
            <div key={col.key}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold" style={{ color: col.color }}>{col.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: col.color + '22', color: col.color }}>{colProjects.length}</span>
              </div>
              <div className="flex flex-col gap-2 min-h-[200px] rounded-lg p-2" style={{ background: 'var(--bg-secondary)', border: `1px solid ${col.color}22` }}>
                {colProjects.map(p => (
                  <motion.div key={p.id} layout
                    className="rounded-lg p-3 cursor-default"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}>
                    <div className="text-sm font-medium mb-1">{p.title}</div>
                    {p.description && <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{p.description}</div>}
                    <div className="flex gap-1 mb-2">
                      {p.agents.map(a => (
                        <span key={a.name} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-hover)' }}>
                          {a.emoji} {a.name}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                      <span>{p.lastUpdate}</span>
                      <span>{p.linkedSessions} sessions</span>
                    </div>
                    {/* Move buttons */}
                    <div className="flex gap-1 mt-2">
                      {COLUMNS.filter(c => c.key !== p.status).map(c => (
                        <button key={c.key} onClick={() => moveProject(p.id, c.key)}
                          className="px-1.5 py-0.5 rounded text-[9px] font-medium cursor-pointer"
                          style={{ background: c.color + '11', color: c.color, border: `1px solid ${c.color}33` }}>
                          → {c.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
