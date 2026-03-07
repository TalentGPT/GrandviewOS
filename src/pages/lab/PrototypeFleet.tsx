import { useState } from 'react'
import { motion } from 'framer-motion'
import StatCard from '../../components/StatCard'
import PageHeader from '../../components/PageHeader'
import { useToast } from '../../components/Toast'

type ProtoStatus = 'testing' | 'graduated' | 'archived'

interface Prototype {
  id: string
  name: string
  model: string
  modelColor: string
  description: string
  status: ProtoStatus
  created: string
  sessions: number
  avgTokens: string
  avgCost: string
  successRate: string
}

const MOCK_PROTOTYPES: Prototype[] = [
  { id: 'pr1', name: 'DeepResearch-v3', model: 'Opus 4.6 + Web Search', modelColor: 'var(--model-opus)', description: 'Extended research agent with deep web search and multi-source synthesis', status: 'testing', created: '2026-03-05', sessions: 12, avgTokens: '85K', avgCost: '$3.20', successRate: '92%' },
  { id: 'pr2', name: 'CodeReview-Fast', model: 'Sonnet 4.5 + GitHub', modelColor: 'var(--model-sonnet)', description: 'Lightweight code reviewer for PR approvals — faster than Codex for simple reviews', status: 'testing', created: '2026-03-03', sessions: 28, avgTokens: '12K', avgCost: '$0.15', successRate: '88%' },
  { id: 'pr3', name: 'CommunityBot-v2', model: 'Gemini Flash + RAG', modelColor: 'var(--model-gemini-flash)', description: 'Enhanced Clay with RAG over documentation. Better answers, lower hallucination rate.', status: 'graduated', created: '2026-02-20', sessions: 156, avgTokens: '8K', avgCost: '$0.04', successRate: '96%' },
  { id: 'pr4', name: 'WriterPro', model: 'Opus 4.6 + Style', modelColor: 'var(--model-opus)', description: 'Enhanced writing agent with style transfer and tone matching', status: 'testing', created: '2026-03-01', sessions: 8, avgTokens: '45K', avgCost: '$1.80', successRate: '85%' },
  { id: 'pr5', name: 'BudgetHawk', model: 'Haiku + Alerts', modelColor: 'var(--model-haiku)', description: 'Ultra-cheap cost monitoring agent. Runs on Haiku, monitors spend, sends alerts.', status: 'graduated', created: '2026-02-15', sessions: 340, avgTokens: '2K', avgCost: '$0.01', successRate: '99%' },
  { id: 'pr6', name: 'GPT5-Experiment', model: 'GPT-5', modelColor: '#666', description: 'Testing GPT-5 as alternative to Opus for orchestration tasks', status: 'archived', created: '2026-01-20', sessions: 45, avgTokens: '60K', avgCost: '$2.50', successRate: '72%' },
]

const STATUS_CONFIG: Record<ProtoStatus, { label: string; color: string }> = {
  'testing': { label: '🧪 Testing', color: 'var(--accent-teal)' },
  'graduated': { label: '🎓 Graduated', color: 'var(--accent-green)' },
  'archived': { label: '📦 Archived', color: 'var(--text-secondary)' },
}

export default function PrototypeFleet() {
  const { addToast } = useToast()
  const [prototypes, setPrototypes] = useState(MOCK_PROTOTYPES)
  const [filter, setFilter] = useState<ProtoStatus | ''>('')

  const filtered = filter ? prototypes.filter(p => p.status === filter) : prototypes
  const testing = prototypes.filter(p => p.status === 'testing').length
  const graduated = prototypes.filter(p => p.status === 'graduated').length

  const launch = (id: string) => {
    addToast('Prototype session launched! 🚀', 'info')
    setPrototypes(prev => prev.map(p => p.id === id ? { ...p, sessions: p.sessions + 1 } : p))
  }

  const updateStatus = (id: string, status: ProtoStatus) => {
    setPrototypes(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    addToast(`Status updated to ${STATUS_CONFIG[status].label}`)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto w-full">
      <PageHeader title="Prototype Fleet" subtitle="Experimental agent configurations and prototypes" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <StatCard label="Total Prototypes" value={prototypes.length} />
        <StatCard label="Testing" value={testing} color="var(--accent-teal)" />
        <StatCard label="Graduated" value={graduated} color="var(--accent-green)" />
        <StatCard label="Archived" value={prototypes.length - testing - graduated} />
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(['', 'testing', 'graduated', 'archived'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className="px-3 py-1 rounded-full text-xs font-medium cursor-pointer"
            style={{ background: filter === s ? 'var(--accent-green)22' : 'var(--bg-3)', color: filter === s ? 'var(--accent-green)' : 'var(--text-secondary)', border: 'none' }}>
            {s ? STATUS_CONFIG[s].label : 'All'}
          </button>
        ))}
      </div>

      {/* Prototype list */}
      <div className="flex flex-col gap-3">
        {filtered.map(p => {
          const sc = STATUS_CONFIG[p.status]
          return (
            <motion.div key={p.id} layout className="rounded-lg p-5"
              style={{ background: 'var(--bg-2)', border: `1px solid ${sc.color}22` }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold">{p.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: sc.color + '22', color: sc.color }}>{sc.label}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: p.modelColor + '22', color: p.modelColor }}>{p.model}</span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{p.description}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {p.status === 'testing' && (
                    <>
                      <button onClick={() => launch(p.id)} className="px-3 py-1 rounded text-[10px] font-medium cursor-pointer"
                        style={{ background: 'var(--accent-teal)22', color: 'var(--accent-teal)', border: '1px solid var(--accent-teal)44' }}>
                        🚀 Launch
                      </button>
                      <button onClick={() => updateStatus(p.id, 'graduated')} className="px-3 py-1 rounded text-[10px] font-medium cursor-pointer"
                        style={{ background: 'var(--accent-green)22', color: 'var(--accent-green)', border: '1px solid var(--accent-green)44' }}>
                        🎓 Graduate
                      </button>
                    </>
                  )}
                  {p.status !== 'archived' && (
                    <button onClick={() => updateStatus(p.id, 'archived')} className="px-3 py-1 rounded text-[10px] font-medium cursor-pointer"
                      style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)', border: '1px solid var(--border-divider)' }}>
                      📦 Archive
                    </button>
                  )}
                </div>
              </div>
              {/* Stats */}
              <div className="flex gap-6 mt-3 text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
                <span><span style={{ color: 'var(--text-secondary)' }}>Sessions:</span> <span style={{ color: 'var(--accent-teal)' }}>{p.sessions}</span></span>
                <span><span style={{ color: 'var(--text-secondary)' }}>Avg Tokens:</span> {p.avgTokens}</span>
                <span><span style={{ color: 'var(--text-secondary)' }}>Avg Cost:</span> <span style={{ color: 'var(--accent-red)' }}>{p.avgCost}</span></span>
                <span><span style={{ color: 'var(--text-secondary)' }}>Success:</span> <span style={{ color: 'var(--accent-green)' }}>{p.successRate}</span></span>
                <span><span style={{ color: 'var(--text-secondary)' }}>Created:</span> {p.created}</span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
