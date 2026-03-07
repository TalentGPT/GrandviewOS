import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '../../components/Toast'
import PageHeader from '../../components/PageHeader'
import { PageSkeleton } from '../../components/Skeleton'
import { fetchIdeas, createIdea, voteIdea, updateIdea, deleteIdea } from '../../api/client'

interface Idea {
  id: string
  title: string
  description: string
  status: string
  tags: string[]
  votes: number
  createdBy: string | null
  createdAt: string
}

const STATUS_OPTIONS = ['new', 'exploring', 'building', 'shipped', 'archived']
const STATUS_COLORS: Record<string, string> = {
  new: 'var(--accent-teal)',
  exploring: 'var(--accent-green)',
  building: 'var(--accent-orange)',
  shipped: 'var(--accent-green)',
  archived: 'var(--text-secondary)',
}

export default function IdeaGallery() {
  const { addToast } = useToast()
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null)
  const [filterTag, setFilterTag] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newTags, setNewTags] = useState('')

  const load = useCallback(async () => {
    const { data } = await fetchIdeas()
    if (data) setIdeas(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const allTags = [...new Set(ideas.flatMap(i => i.tags))]

  const filtered = ideas.filter(i => {
    if (filterTag && !i.tags.includes(filterTag)) return false
    if (filterStatus && i.status !== filterStatus) return false
    return true
  })

  const vote = async (id: string) => {
    const { data } = await voteIdea(id)
    if (data) {
      setIdeas(prev => prev.map(i => i.id === id ? { ...i, votes: data.votes } : i))
      if (selectedIdea?.id === id) setSelectedIdea({ ...selectedIdea, votes: data.votes })
      addToast('Vote recorded')
    }
  }

  const addIdea = async () => {
    if (!newTitle.trim()) return
    const tags = newTags.split(',').map(t => t.trim()).filter(Boolean)
    const { data } = await createIdea({ title: newTitle, description: newDesc, tags })
    if (data) {
      setIdeas(prev => [data, ...prev])
      setNewTitle(''); setNewDesc(''); setNewTags(''); setShowAdd(false)
      addToast('Idea added')
    }
  }

  const handleDelete = async (id: string) => {
    await deleteIdea(id)
    setIdeas(prev => prev.filter(i => i.id !== id))
    setSelectedIdea(null)
    addToast('Idea deleted')
  }

  const handleStatusChange = async (id: string, status: string) => {
    const { data } = await updateIdea(id, { status })
    if (data) {
      setIdeas(prev => prev.map(i => i.id === id ? { ...i, status } : i))
      if (selectedIdea?.id === id) setSelectedIdea({ ...selectedIdea, status })
      addToast(`Status → ${status}`)
    }
  }

  if (loading) return <PageSkeleton />

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto w-full">
      <PageHeader title="Idea Gallery" subtitle="Agent-generated ideas and proposals">
        <button onClick={() => setShowAdd(!showAdd)}
          className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer"
          style={{ background: 'var(--accent-teal)22', color: 'var(--accent-teal)', border: '1px solid var(--accent-teal)44' }}>
          + New Idea
        </button>
      </PageHeader>

      {/* Filters */}
      <div className="flex gap-2 mb-2 flex-wrap">
        <button onClick={() => setFilterTag('')}
          className="px-2.5 py-1 rounded-full text-[10px] font-medium cursor-pointer"
          style={{ background: !filterTag ? 'var(--accent-green)22' : 'var(--bg-3)', color: !filterTag ? 'var(--accent-green)' : 'var(--text-secondary)', border: 'none' }}>
          All
        </button>
        {allTags.map(tag => (
          <button key={tag} onClick={() => setFilterTag(tag === filterTag ? '' : tag)}
            className="px-2.5 py-1 rounded-full text-[10px] font-medium cursor-pointer"
            style={{ background: filterTag === tag ? 'var(--accent-green)22' : 'var(--bg-3)', color: filterTag === tag ? 'var(--accent-green)' : 'var(--text-secondary)', border: 'none' }}>
            {tag}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_OPTIONS.map(s => (
          <button key={s} onClick={() => setFilterStatus(s === filterStatus ? '' : s)}
            className="px-2.5 py-1 rounded-full text-[10px] font-medium cursor-pointer"
            style={{ background: filterStatus === s ? (STATUS_COLORS[s] || 'var(--accent-green)') + '22' : 'var(--bg-3)', color: filterStatus === s ? (STATUS_COLORS[s] || 'var(--accent-green)') : 'var(--text-secondary)', border: 'none' }}>
            {s}
          </button>
        ))}
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
            <div className="rounded-lg p-4 flex flex-col gap-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--accent-green)33' }}>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Idea title..."
                className="px-3 py-2 rounded text-sm focus:outline-none" style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)' }} />
              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description..." rows={3}
                className="px-3 py-2 rounded text-sm focus:outline-none resize-none" style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)' }} />
              <input value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="Tags (comma-separated)..."
                className="px-3 py-2 rounded text-sm focus:outline-none" style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)' }} />
              <button onClick={addIdea} className="self-end px-4 py-1.5 rounded text-xs font-medium cursor-pointer"
                style={{ background: 'var(--accent-green)22', color: 'var(--accent-green)', border: '1px solid var(--accent-green)44' }}>Add Idea</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.sort((a, b) => b.votes - a.votes).map(idea => (
          <motion.div key={idea.id} layout
            onClick={() => setSelectedIdea(idea)}
            className="rounded-lg p-4 cursor-pointer hover:border-[var(--accent-green)] transition-colors"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
            <div className="flex items-start justify-between mb-2">
              <div className="text-sm font-semibold">{idea.title}</div>
              <button onClick={e => { e.stopPropagation(); vote(idea.id) }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium cursor-pointer shrink-0"
                style={{ background: 'var(--accent-green)11', color: 'var(--accent-green)', border: '1px solid var(--accent-green)33' }}>
                ▲ {idea.votes}
              </button>
            </div>
            <div className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{idea.description}</div>
            <div className="flex items-center justify-between">
              <div className="flex gap-1 flex-wrap">
                {idea.tags.map(t => (
                  <span key={t} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)' }}>{t}</span>
                ))}
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: (STATUS_COLORS[idea.status] || 'var(--text-secondary)') + '22', color: STATUS_COLORS[idea.status] || 'var(--text-secondary)' }}>{idea.status}</span>
            </div>
            <div className="text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>{new Date(idea.createdAt).toLocaleDateString()}</div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>No ideas yet. Create one!</div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {selectedIdea && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-8"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setSelectedIdea(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="rounded-xl p-6 max-w-lg w-full"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{selectedIdea.title}</h2>
                <button onClick={() => setSelectedIdea(null)} className="text-sm cursor-pointer" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}>✕</button>
              </div>
              <p className="text-sm mb-4 leading-relaxed">{selectedIdea.description}</p>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(selectedIdea.createdAt).toLocaleDateString()}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: (STATUS_COLORS[selectedIdea.status] || 'var(--text-secondary)') + '22', color: STATUS_COLORS[selectedIdea.status] || 'var(--text-secondary)' }}>{selectedIdea.status}</span>
              </div>
              <div className="flex gap-1 mb-4">
                {selectedIdea.tags.map(t => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-green)22', color: 'var(--accent-green)' }}>{t}</span>
                ))}
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Status:</span>
                <select value={selectedIdea.status} onChange={e => handleStatusChange(selectedIdea.id, e.target.value)}
                  className="text-xs px-2 py-1 rounded cursor-pointer" style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)' }}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => vote(selectedIdea.id)}
                  className="px-4 py-2 rounded-md text-sm font-medium cursor-pointer"
                  style={{ background: 'var(--accent-green)22', color: 'var(--accent-green)', border: '1px solid var(--accent-green)44' }}>
                  ▲ Upvote ({selectedIdea.votes})
                </button>
                <button onClick={() => handleDelete(selectedIdea.id)}
                  className="px-4 py-2 rounded-md text-sm font-medium cursor-pointer"
                  style={{ background: 'var(--accent-red)22', color: 'var(--accent-red)', border: '1px solid var(--accent-red)44' }}>
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
