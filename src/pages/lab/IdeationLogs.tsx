import { useState } from 'react'
import { motion } from 'framer-motion'
import PageHeader from '../../components/PageHeader'

interface IdeationEntry {
  id: string
  timestamp: string
  date: string
  topic: string
  participants: Array<{ name: string; emoji: string }>
  keyIdeas: string[]
  outcomes: string
}

const MOCK_ENTRIES: IdeationEntry[] = [
  {
    id: 'ie1', timestamp: '2026-03-07 08:30 UTC', date: '2026-03-07',
    topic: 'V2 Module Architecture',
    participants: [{ name: 'Muddy', emoji: '🐕' }, { name: 'Elon', emoji: '🚀' }, { name: 'Pixel', emoji: '🎨' }],
    keyIdeas: ['Three-module navigation: Ops | Brain | Lab', 'Each module gets its own tab set', 'Shared design system across modules'],
    outcomes: 'Approved three-module architecture. Brain focuses on memory and automation. Lab focuses on experimentation.',
  },
  {
    id: 'ie2', timestamp: '2026-03-06 14:00 UTC', date: '2026-03-06',
    topic: 'Cost Optimization Strategy',
    participants: [{ name: 'Muddy', emoji: '🐕' }, { name: 'Atlas', emoji: '🏗️' }, { name: 'Nova', emoji: '🛡️' }],
    keyIdeas: ['Route simple tasks to Haiku/Flash instead of Opus', 'Cache common queries to reduce token usage', 'Implement per-agent budget caps'],
    outcomes: 'Decided to implement dynamic model routing. Atlas to build the routing logic. Target: 30% cost reduction.',
  },
  {
    id: 'ie3', timestamp: '2026-03-05 10:00 UTC', date: '2026-03-05',
    topic: 'Community Growth Tactics',
    participants: [{ name: 'Gary', emoji: '📣' }, { name: 'Clay', emoji: '🦞' }, { name: 'Viral', emoji: '📱' }],
    keyIdeas: ['Launch referral program with karma rewards', 'Weekly "Agent of the Week" spotlight', 'Partner cross-promotion in newsletters'],
    outcomes: 'Gary to implement referral tracking. Clay to run weekly spotlight feature. Target: 1000 members by end of March.',
  },
  {
    id: 'ie4', timestamp: '2026-03-04 16:00 UTC', date: '2026-03-04',
    topic: 'Voice Standup Enhancement',
    participants: [{ name: 'Muddy', emoji: '🐕' }, { name: 'Elon', emoji: '🚀' }],
    keyIdeas: ['Add cross-talk and natural interruptions', 'Emotion detection in voice tone', 'Auto-generate meeting summary slides'],
    outcomes: 'Prototype cross-talk feature. Elon to research emotion synthesis. Low priority — current system works well.',
  },
  {
    id: 'ie5', timestamp: '2026-03-03 09:00 UTC', date: '2026-03-03',
    topic: 'Partnership Expansion',
    participants: [{ name: 'Warren', emoji: '💰' }, { name: 'Deal', emoji: '🤝' }, { name: 'Scout', emoji: '🔭' }],
    keyIdeas: ['Target developer tools market', 'Offer free tier for open-source projects', 'Build partner API documentation portal'],
    outcomes: 'Scout to research top 20 developer tool companies. Deal to draft partnership tiers. Warren to review pricing strategy.',
  },
  {
    id: 'ie6', timestamp: '2026-03-01 11:30 UTC', date: '2026-03-01',
    topic: 'Agent Memory Architecture',
    participants: [{ name: 'Muddy', emoji: '🐕' }, { name: 'Atlas', emoji: '🏗️' }, { name: 'Scribe', emoji: '✍️' }],
    keyIdeas: ['Hierarchical memory: daily → weekly → monthly distillation', 'Shared knowledge base across agents', 'Memory search with semantic similarity'],
    outcomes: 'Adopted hierarchical memory model. Atlas to implement memory search API. Scribe to define knowledge base schema.',
  },
]

export default function IdeationLogs() {
  const [entries] = useState(MOCK_ENTRIES)
  const [filterTopic, setFilterTopic] = useState('')
  const [filterAgent, setFilterAgent] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const allTopics = [...new Set(entries.map(e => e.topic))]
  const allAgents = [...new Set(entries.flatMap(e => e.participants.map(p => p.name)))]

  const filtered = entries.filter(e => {
    if (filterTopic && e.topic !== filterTopic) return false
    if (filterAgent && !e.participants.some(p => p.name === filterAgent)) return false
    return true
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto w-full">
      <PageHeader title="Ideation Logs" subtitle="Chronological log of brainstorming sessions">
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{filtered.length} sessions</span>
      </PageHeader>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div>
          <label className="text-[10px] block mb-1" style={{ color: 'var(--text-secondary)' }}>Topic</label>
          <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)}
            className="px-3 py-1.5 rounded text-xs cursor-pointer"
            style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)' }}>
            <option value="">All Topics</option>
            {allTopics.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] block mb-1" style={{ color: 'var(--text-secondary)' }}>Agent</label>
          <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)}
            className="px-3 py-1.5 rounded text-xs cursor-pointer"
            style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)' }}>
            <option value="">All Agents</option>
            {allAgents.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Timeline */}
      <div className="border-l-2 ml-4 pl-6 space-y-4" style={{ borderColor: 'var(--accent-green)33' }}>
        {filtered.map(entry => {
          const isExpanded = expanded[entry.id]
          return (
            <motion.div key={entry.id} layout>
              <div
                onClick={() => setExpanded(p => ({ ...p, [entry.id]: !p[entry.id] }))}
                className="rounded-lg p-4 cursor-pointer hover:border-[var(--accent-green)] transition-colors relative"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
                {/* Timeline dot */}
                <div className="absolute -left-[31px] top-5 w-3 h-3 rounded-full" style={{ background: 'var(--accent-green)', border: '2px solid var(--bg-primary)' }} />

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{entry.topic}</span>
                    <span className="text-xs transition-transform" style={{ color: 'var(--text-secondary)', display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                  </div>
                  <span className="text-[10px]" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{entry.timestamp}</span>
                </div>

                <div className="flex gap-1 mb-2">
                  {entry.participants.map(p => (
                    <span key={p.name} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-3)' }}>
                      {p.emoji} {p.name}
                    </span>
                  ))}
                </div>

                {isExpanded && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-divider)' }}>
                    <div className="mb-3">
                      <div className="text-xs font-semibold mb-2" style={{ color: 'var(--accent-green)' }}>💡 Key Ideas</div>
                      {entry.keyIdeas.map((idea, i) => (
                        <div key={i} className="flex items-start gap-2 mb-1.5">
                          <span className="text-xs mt-0.5" style={{ color: 'var(--accent-green)' }}>•</span>
                          <span className="text-sm">{idea}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="text-xs font-semibold mb-1" style={{ color: 'var(--accent-teal)' }}>📋 Outcomes</div>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{entry.outcomes}</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
