import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import StatCard from '../components/StatCard'
import { PageSkeleton } from '../components/Skeleton'
import { sessions as mockSessions, cronJobs, overnightLog } from '../data/mockSessions'
import type { Session, TranscriptMessage } from '../data/mockSessions'

const models = [
  { name: 'Claude Opus 4.6', desc: 'Primary research & orchestration', icon: '🔴', status: 'Active', cost: '$28.40', tokens: '3.2M', sessions: 22, color: 'var(--model-opus)' },
  { name: 'Claude Opus 4.5 Antigravity', desc: 'Secondary complex tasks', icon: '🔴', status: 'Active', cost: '$12.10', tokens: '1.8M', sessions: 8, color: 'var(--model-opus)' },
  { name: 'Gemini 3 Pro Preview', desc: 'Video & heavy context', icon: '🔵', status: 'Active', cost: '$8.20', tokens: '1.1M', sessions: 7, color: 'var(--model-gemini-pro)' },
  { name: 'GPT-5.3-Codex', desc: 'Backend code & QA audit', icon: '🟤', status: 'Active', cost: '$6.80', tokens: '0.8M', sessions: 5, color: 'var(--model-codex)' },
  { name: 'Gemini 3 Flash', desc: 'Community & growth — fast context', icon: '⚡', status: 'Active', cost: '$4.50', tokens: '0.5M', sessions: 4, color: 'var(--model-gemini-flash)' },
  { name: 'Nano Banana Pro', desc: 'Creative & graphics generation', icon: '🍌', status: 'Standby', cost: '$2.96', tokens: '0.2M', sessions: 4, color: 'var(--model-nano)' },
]

type Tab = 'sessions' | 'cron' | 'overnight'

function TranscriptPanel({ session, onClose }: { session: Session; onClose: () => void }) {
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed top-0 right-0 h-full w-[480px] z-40 overflow-y-auto border-l shadow-2xl"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-divider)' }}
    >
      <div className="sticky top-0 p-4 border-b flex items-center justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-divider)' }}>
        <div>
          <div className="text-sm font-semibold">{session.title}</div>
          <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            {session.agentEmoji} {session.agent} · <span style={{ color: session.modelColor }}>{session.model}</span> · {session.tokens} tokens · <span style={{ color: 'var(--accent-red)' }}>{session.cost}</span>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer text-sm hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-secondary)', background: 'none', border: 'none' }}>✕</button>
      </div>
      <div className="p-4 flex flex-col gap-3">
        {session.transcript.map((msg: TranscriptMessage, i: number) => (
          <div key={i} className="rounded-lg p-3" style={{
            background: msg.role === 'assistant' ? 'var(--bg-card)' : msg.role === 'system' ? 'var(--accent-teal)08' : 'var(--bg-hover)',
            borderLeft: `3px solid ${msg.role === 'assistant' ? 'var(--accent-teal)' : msg.role === 'system' ? 'var(--accent-gold)' : 'var(--accent-green)'}`,
          }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{
                color: msg.role === 'assistant' ? 'var(--accent-teal)' : msg.role === 'system' ? 'var(--accent-gold)' : 'var(--accent-green)',
              }}>
                {msg.role === 'assistant' ? `${session.agentEmoji} ${session.agent}` : msg.role === 'system' ? '⚙️ System' : '👤 Operator'}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{msg.timestamp}</span>
            </div>
            <pre className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{msg.content}</pre>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default function TaskManager() {
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('sessions')
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [isLive, setIsLive] = useState(true)
  const [_refreshCount, setRefreshCount] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600)
    return () => clearTimeout(t)
  }, [])

  const doRefresh = useCallback(() => setRefreshCount(c => c + 1), [])

  // Auto-refresh every 10s when live
  useEffect(() => {
    if (!isLive) return
    const interval = setInterval(doRefresh, 10000)
    return () => clearInterval(interval)
  }, [isLive, doRefresh])

  if (loading) return <PageSkeleton />

  const statusColor = (s: Session['statusType']) =>
    s === 'active' ? 'var(--accent-green)' : s === 'idle' ? '#FFC107' : 'var(--accent-red)'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Task Manager</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsLive(!isLive)}
            className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded-md"
            style={{ background: 'none', border: 'none' }}
          >
            <span className={`w-2.5 h-2.5 rounded-full inline-block ${isLive ? 'pulse-dot' : ''}`} style={{ background: isLive ? 'var(--accent-green)' : 'var(--text-secondary)' }}></span>
            <span className="text-sm font-medium" style={{ color: isLive ? 'var(--accent-green)' : 'var(--text-secondary)' }}>{isLive ? 'Live' : 'Paused'}</span>
          </button>
          <button onClick={doRefresh} className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer hover:bg-[var(--bg-active)] transition-colors" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-divider)' }}>
            Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="flex gap-3 mb-8">
        <StatCard label="Active" value={mockSessions.filter(s => s.statusType === 'active').length} icon="🟢" />
        <StatCard label="Idle" value={mockSessions.filter(s => s.statusType === 'idle').length} icon="💤" />
        <StatCard label="Total Sessions" value={50} icon="📊" />
        <StatCard label="Tokens Used" value="7.6M" icon="🔤" />
        <StatCard label="Total Cost" value="$62.96" color="var(--accent-red)" icon="💰" />
      </div>

      {/* Model Fleet */}
      <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Model Fleet</h2>
      <div className="grid grid-cols-3 gap-3 mb-8">
        {models.map(m => (
          <div key={m.name} className="rounded-lg p-4 hover:border-[var(--accent-teal)] transition-colors cursor-default" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{m.icon}</span>
                <div>
                  <div className="text-sm font-semibold">{m.name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{m.desc}</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{
                background: m.status === 'Active' ? 'var(--accent-green)22' : 'var(--bg-hover)',
                color: m.status === 'Active' ? 'var(--accent-green)' : 'var(--text-secondary)',
              }}>{m.status}</span>
            </div>
            <div className="flex gap-4 mt-3 text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: 'var(--accent-red)' }}>{m.cost}</span>
              <span style={{ color: 'var(--accent-teal)' }}>{m.tokens}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{m.sessions} sessions</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {([['sessions', 'Active Sessions'], ['cron', 'Cron Jobs'], ['overnight', 'Overnight Log']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-4 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-all"
            style={{
              background: tab === key ? 'var(--accent-teal)22' : 'transparent',
              color: tab === key ? 'var(--accent-teal)' : 'var(--text-secondary)',
              border: tab === key ? '1px solid var(--accent-teal)44' : '1px solid transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {tab === 'sessions' && (
          <motion.div key="sessions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-2">
            {mockSessions.map(s => (
              <div
                key={s.id}
                onClick={() => setSelectedSession(s)}
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${s.statusType === 'active' ? 'pulse-dot' : ''}`} style={{ background: statusColor(s.statusType) }}></span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.agentEmoji} {s.title}</div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{s.status}</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: s.modelColor + '22', color: s.modelColor }}>{s.model}</span>
                <span className="text-xs shrink-0" style={{ color: 'var(--accent-teal)', fontFamily: 'var(--font-mono)' }}>{s.tokens}</span>
                <span className="text-xs shrink-0" style={{ color: 'var(--accent-red)', fontFamily: 'var(--font-mono)' }}>{s.cost}</span>
                <span className="text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>{s.time}</span>
              </div>
            ))}
          </motion.div>
        )}

        {tab === 'cron' && (
          <motion.div key="cron" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-2">
            {cronJobs.map(j => (
              <div key={j.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${j.status === 'active' ? 'pulse-dot' : ''}`} style={{ background: j.status === 'active' ? 'var(--accent-green)' : j.status === 'paused' ? '#FFC107' : 'var(--accent-red)' }}></span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{j.agentEmoji} {j.name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{j.schedule} · Last: {j.lastRun} · Next: {j.nextRun}</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: j.modelColor + '22', color: j.modelColor }}>{j.model}</span>
                <span className="text-xs shrink-0" style={{ color: 'var(--accent-teal)', fontFamily: 'var(--font-mono)' }}>{j.tokens}</span>
                <span className="text-xs shrink-0" style={{ color: 'var(--accent-red)', fontFamily: 'var(--font-mono)' }}>{j.cost}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0" style={{
                  background: j.status === 'active' ? 'var(--accent-green)22' : j.status === 'paused' ? '#FFC10722' : 'var(--accent-red)22',
                  color: j.status === 'active' ? 'var(--accent-green)' : j.status === 'paused' ? '#FFC107' : 'var(--accent-red)',
                }}>{j.status}</span>
              </div>
            ))}
          </motion.div>
        )}

        {tab === 'overnight' && (
          <motion.div key="overnight" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-1.5">
            {overnightLog.map((entry, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg text-sm" style={{ background: 'var(--bg-card)' }}>
                <span className="text-xs shrink-0 w-16 text-right" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{entry.time}</span>
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{
                  background: entry.type === 'success' ? 'var(--accent-green)' : entry.type === 'warning' ? '#FFC107' : 'var(--accent-teal)',
                }}></span>
                <span style={{ color: 'var(--text-primary)' }}>{entry.event}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript slide-in */}
      <AnimatePresence>
        {selectedSession && <TranscriptPanel session={selectedSession} onClose={() => setSelectedSession(null)} />}
      </AnimatePresence>
    </motion.div>
  )
}
