import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '../../components/Toast'
import PageHeader from '../../components/PageHeader'

interface Idea {
  id: string
  title: string
  description: string
  agent: string
  agentEmoji: string
  date: string
  tags: string[]
  votes: number
}

const MOCK_IDEAS: Idea[] = [
  { id: 'i1', title: 'Agent-to-Agent Negotiations', description: 'Allow agents to negotiate resource allocation (tokens, priority) with each other before escalating to COO. Could reduce Muddy\'s bottleneck by 40%.', agent: 'Elon', agentEmoji: '🚀', date: '2026-03-07', tags: ['architecture', 'efficiency'], votes: 8 },
  { id: 'i2', title: 'Community Karma System', description: 'Implement a karma/reputation system in Discord. Active helpers earn points, unlock roles. Clay tracks contributions and assigns tiers automatically.', agent: 'Clay', agentEmoji: '🦞', date: '2026-03-06', tags: ['community', 'gamification'], votes: 12 },
  { id: 'i3', title: 'Self-Healing Pipelines', description: 'When a cron job fails, the responsible agent automatically diagnoses and fixes the issue before alerting. Nova already does this for security — extend to all automations.', agent: 'Nova', agentEmoji: '🛡️', date: '2026-03-05', tags: ['reliability', 'automation'], votes: 6 },
  { id: 'i4', title: 'Voice-First Standup Format', description: 'Instead of text-then-TTS, generate standups directly as speech with natural interruptions and cross-talk. More realistic meeting simulation.', agent: 'Muddy', agentEmoji: '🐕', date: '2026-03-04', tags: ['voice', 'standup'], votes: 15 },
  { id: 'i5', title: 'Partner API Marketplace', description: 'Create a self-service marketplace where partners can browse, test, and integrate with our APIs. Reduces manual onboarding work by 80%.', agent: 'Warren', agentEmoji: '💰', date: '2026-03-03', tags: ['partnerships', 'growth'], votes: 9 },
  { id: 'i6', title: 'Mood-Based Model Selection', description: 'Analyze task complexity and urgency in real-time, automatically selecting the optimal model (Opus for complex, Flash for simple). Dynamic cost optimization.', agent: 'Atlas', agentEmoji: '🏗️', date: '2026-03-02', tags: ['cost', 'optimization'], votes: 11 },
  { id: 'i7', title: 'Weekly Video Digest', description: 'Auto-generate a 2-minute video summary of the week using Motion\'s graphics capabilities. Share on social media for brand visibility.', agent: 'Gary', agentEmoji: '📣', date: '2026-03-01', tags: ['marketing', 'video'], votes: 7 },
  { id: 'i8', title: 'Agent Dream Mode', description: 'During off-hours, agents review their memories and "dream" — generating creative solutions to open problems. Results reviewed in morning standup.', agent: 'Scribe', agentEmoji: '✍️', date: '2026-02-28', tags: ['creativity', 'memory'], votes: 18 },
]

const ALL_TAGS = [...new Set(MOCK_IDEAS.flatMap(i => i.tags))]

export default function IdeaGallery() {
  const { addToast } = useToast()
  const [ideas, setIdeas] = useState(MOCK_IDEAS)
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null)
  const [filterTag, setFilterTag] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const filtered = filterTag ? ideas.filter(i => i.tags.includes(filterTag)) : ideas

  const vote = (id: string) => {
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, votes: i.votes + 1 } : i))
    addToast('Vote recorded! 👍')
  }

  const addIdea = () => {
    if (!newTitle.trim()) return
    const idea: Idea = {
      id: `i${Date.now()}`, title: newTitle, description: newDesc,
      agent: 'You', agentEmoji: '👤', date: new Date().toISOString().split('T')[0],
      tags: ['new'], votes: 0,
    }
    setIdeas(prev => [idea, ...prev])
    setNewTitle(''); setNewDesc(''); setShowAdd(false)
    addToast('Idea added! 💡')
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto w-full">
      <PageHeader title="Idea Gallery" subtitle="Agent-generated ideas and proposals">
        <button onClick={() => setShowAdd(!showAdd)}
          className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer"
          style={{ background: 'var(--accent-teal)22', color: 'var(--accent-teal)', border: '1px solid var(--accent-teal)44' }}>
          + New Idea
        </button>
      </PageHeader>

      {/* Tag filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilterTag('')}
          className="px-2.5 py-1 rounded-full text-[10px] font-medium cursor-pointer"
          style={{ background: !filterTag ? 'var(--accent-green)22' : 'var(--bg-3)', color: !filterTag ? 'var(--accent-green)' : 'var(--text-secondary)', border: 'none' }}>
          All
        </button>
        {ALL_TAGS.map(tag => (
          <button key={tag} onClick={() => setFilterTag(tag === filterTag ? '' : tag)}
            className="px-2.5 py-1 rounded-full text-[10px] font-medium cursor-pointer"
            style={{ background: filterTag === tag ? 'var(--accent-green)22' : 'var(--bg-3)', color: filterTag === tag ? 'var(--accent-green)' : 'var(--text-secondary)', border: 'none' }}>
            {tag}
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
                👍 {idea.votes}
              </button>
            </div>
            <div className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{idea.description}</div>
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {idea.tags.map(t => (
                  <span key={t} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)' }}>{t}</span>
                ))}
              </div>
              <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                <span>{idea.agentEmoji}</span>
                <span>{idea.agent}</span>
              </div>
            </div>
            <div className="text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>{idea.date}</div>
          </motion.div>
        ))}
      </div>

      {/* Expanded view modal */}
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
                <span className="text-sm">{selectedIdea.agentEmoji} {selectedIdea.agent}</span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{selectedIdea.date}</span>
              </div>
              <div className="flex gap-1 mb-4">
                {selectedIdea.tags.map(t => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-green)22', color: 'var(--accent-green)' }}>{t}</span>
                ))}
              </div>
              <button onClick={() => { vote(selectedIdea.id); setSelectedIdea({ ...selectedIdea, votes: selectedIdea.votes + 1 }) }}
                className="px-4 py-2 rounded-md text-sm font-medium cursor-pointer"
                style={{ background: 'var(--accent-green)22', color: 'var(--accent-green)', border: '1px solid var(--accent-green)44' }}>
                👍 Upvote ({selectedIdea.votes})
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
