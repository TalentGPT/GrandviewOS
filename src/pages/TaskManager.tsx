import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import StatCard from '../components/StatCard'
import PageHeader from '../components/PageHeader'
import { PageSkeleton } from '../components/Skeleton'
import { sessions as mockSessions, overnightLog } from '../data/mockSessions'
import { fetchSessions, fetchSessionTranscript, fetchLiveCronJobs, formatCost, formatTokens, getModelColor, getModelShortName, createEventSource } from '../api/client'
import ModelFleetGrid from '../components/ModelFleetGrid'
import CostBreakdownView from '../components/CostBreakdown'
import type { ApiSession, SessionMessage } from '../types/api'
import type { Session, TranscriptMessage } from '../data/mockSessions'

type Tab = 'sessions' | 'cron' | 'overnight' | 'costs'
type DataSource = 'live' | 'mock'

function apiToDisplaySession(s: ApiSession): Session & { lastMessage?: string } {
  const title = s.title && s.title !== 'Untitled Session' ? s.title : `Session started via ${s.isActive ? 'active run' : 'completed task'}`
  return {
    id: s.id,
    title,
    model: getModelShortName(s.model),
    modelColor: getModelColor(s.model),
    tokens: formatTokens(s.totalTokens),
    cost: formatCost(s.totalCost),
    status: s.isActive ? 'Running...' : `${s.messageCount} messages`,
    statusType: s.isActive ? 'active' : 'idle',
    time: getRelativeTime(s.lastActivity),
    agent: 'Main',
    agentEmoji: '🐕',
    transcript: [],
  }
}

function getRelativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function LiveTranscriptPanel({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [messages, setMessages] = useState<SessionMessage[]>([])
  const [sessionMeta, setSessionMeta] = useState<{ model: string; totalTokens: number; totalCost: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedTools, setExpandedTools] = useState<Record<number, boolean>>({})

  useEffect(() => {
    const load = async () => {
      const { data } = await fetchSessionTranscript(sessionId)
      if (data) {
        setMessages(data.messages)
        setSessionMeta({ model: data.model, totalTokens: data.totalTokens, totalCost: data.totalCost })
      }
      setLoading(false)
    }
    load()
  }, [sessionId])

  const toggleTool = (idx: number) => setExpandedTools(p => ({ ...p, [idx]: !p[idx] }))

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed top-0 right-0 h-full w-full md:w-[520px] z-40 overflow-y-auto border-l"
      style={{ background: 'var(--bg-1)', borderColor: 'var(--border-divider)', boxShadow: 'var(--shadow-lg)' }}
    >
      <div className="sticky top-0 p-4 border-b flex items-center justify-between z-10" style={{ background: 'var(--bg-2)', borderColor: 'var(--border-divider)' }}>
        <div>
          <div className="text-sm font-semibold">Session Transcript</div>
          <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            {sessionMeta && (
              <>
                <span style={{ color: getModelColor(sessionMeta.model) }}>{getModelShortName(sessionMeta.model)}</span>
                <span>·</span>
                <span style={{ color: 'var(--accent-teal)' }}>{formatTokens(sessionMeta.totalTokens)} tokens</span>
                <span>·</span>
                <span style={{ color: 'var(--accent-red)' }}>{formatCost(sessionMeta.totalCost)}</span>
              </>
            )}
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer text-sm hover:bg-[var(--bg-3)]" style={{ color: 'var(--text-secondary)', background: 'none', border: 'none' }}>✕</button>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {loading ? (
          <div className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>Loading transcript...</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>No messages in this session</div>
        ) : (
          messages.map((msg, i) => {
            if (msg.isToolCall && !expandedTools[i]) {
              return (
                <button
                  key={i}
                  onClick={() => toggleTool(i)}
                  className="text-left rounded-lg p-2 cursor-pointer hover:bg-[var(--bg-3)] transition-colors"
                  style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}
                >
                  <span className="text-[10px] font-mono" style={{ color: 'var(--accent-gold)' }}>
                    ⚙ {msg.toolName ?? 'Tool call'} <span style={{ color: 'var(--text-secondary)' }}>— click to expand</span>
                  </span>
                </button>
              )
            }

            const isUser = msg.role === 'user'
            const isSystem = msg.role === 'system'

            return (
              <div key={i} className={`rounded-lg p-3 ${isUser ? 'ml-8' : 'mr-4'}`} style={{
                background: isUser ? 'var(--bg-3)' : isSystem ? 'rgba(0,229,255,0.03)' : 'var(--bg-2)',
                borderLeft: `3px solid ${isUser ? 'var(--accent-green)' : isSystem ? 'var(--accent-gold)' : 'var(--accent-teal)'}`,
              }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{
                    color: isUser ? 'var(--accent-green)' : isSystem ? 'var(--accent-gold)' : 'var(--accent-teal)',
                  }}>
                    {isUser ? 'User' : isSystem ? 'System' : 'Assistant'}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
                  </span>
                  {msg.usage && (
                    <span className="text-[10px] ml-auto" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {formatTokens(msg.usage.totalTokens)} tok · {formatCost(msg.usage.cost.total)}
                    </span>
                  )}
                </div>
                <pre className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
                  {msg.content || (msg.isToolCall ? `[Tool: ${msg.toolName ?? 'unknown'}]` : '[empty]')}
                </pre>
                {msg.isToolCall && expandedTools[i] && (
                  <button onClick={() => toggleTool(i)} className="text-[10px] mt-1 cursor-pointer" style={{ color: 'var(--text-secondary)', background: 'none', border: 'none' }}>
                    ▲ collapse
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </motion.div>
  )
}

function MockTranscriptPanel({ session, onClose }: { session: Session; onClose: () => void }) {
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed top-0 right-0 h-full w-full md:w-[480px] z-40 overflow-y-auto border-l"
      style={{ background: 'var(--bg-1)', borderColor: 'var(--border-divider)', boxShadow: 'var(--shadow-lg)' }}
    >
      <div className="sticky top-0 p-4 border-b flex items-center justify-between" style={{ background: 'var(--bg-2)', borderColor: 'var(--border-divider)' }}>
        <div>
          <div className="text-sm font-semibold">{session.title}</div>
          <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            {session.agent} · <span style={{ color: session.modelColor }}>{session.model}</span> · {session.tokens} tokens · <span style={{ color: 'var(--accent-red)' }}>{session.cost}</span>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer text-sm hover:bg-[var(--bg-3)]" style={{ color: 'var(--text-secondary)', background: 'none', border: 'none' }}>✕</button>
      </div>
      <div className="p-4 flex flex-col gap-3">
        {session.transcript.map((msg: TranscriptMessage, i: number) => (
          <div key={i} className="rounded-lg p-3" style={{
            background: msg.role === 'assistant' ? 'var(--bg-2)' : msg.role === 'system' ? 'rgba(0,229,255,0.03)' : 'var(--bg-3)',
            borderLeft: `3px solid ${msg.role === 'assistant' ? 'var(--accent-teal)' : msg.role === 'system' ? 'var(--accent-gold)' : 'var(--accent-green)'}`,
          }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{
                color: msg.role === 'assistant' ? 'var(--accent-teal)' : msg.role === 'system' ? 'var(--accent-gold)' : 'var(--accent-green)',
              }}>
                {msg.role === 'assistant' ? session.agent : msg.role === 'system' ? 'System' : 'Operator'}
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

/* Session card component */
function SessionCard({ children, onClick, isActive }: { children: React.ReactNode; onClick: () => void; isActive?: boolean }) {
  return (
    <div
      onClick={onClick}
      className="rounded-xl p-5 cursor-pointer transition-all"
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border-divider)',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = isActive ? 'var(--accent-green)' : '#333')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-divider)')}
    >
      {children}
    </div>
  )
}

export default function TaskManager() {
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('sessions')
  const [selectedMockSession, setSelectedMockSession] = useState<Session | null>(null)
  const [selectedLiveSessionId, setSelectedLiveSessionId] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(true)
  const [dataSource, setDataSource] = useState<DataSource>('live')
  const [liveSessions, setLiveSessions] = useState<ApiSession[]>([])
  const [liveError, setLiveError] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)
  const [showCronModal, setShowCronModal] = useState(false)
  const [cronList, setCronList] = useState<Array<{ id: string; name: string; schedule: string; lastRun: string; nextRun: string; status: 'active' | 'paused' | 'error'; agent: string; agentEmoji: string; model: string; modelColor: string; tokens: string; cost: string }>>([])
  const [cronLoading, setCronLoading] = useState(true)

  const doRefresh = useCallback(() => setRefreshCount(c => c + 1), [])

  const killSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Kill this session?')) return
    try {
      await fetch(`/api/sessions/${sessionId}/kill`, { method: 'POST' })
      doRefresh()
    } catch { /* ignore */ }
  }

  const deleteCron = (id: string) => {
    if (!confirm('Delete this cron job?')) return
    setCronList(prev => prev.filter(c => c.id !== id))
  }

  const toggleCronPause = (id: string) => {
    setCronList(prev => prev.map(c => c.id === id ? { ...c, status: c.status === 'active' ? 'paused' as const : 'active' as const } : c))
  }

  const handleCreateCron = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const newCron = {
      id: `c${Date.now()}`,
      name: (fd.get('name') as string) || 'New Job',
      schedule: (fd.get('schedule') as string) || 'Daily',
      lastRun: 'Never',
      nextRun: 'Pending',
      status: 'active' as const,
      agent: 'Ray Dalio',
      agentEmoji: '🐕',
      model: 'Opus 4.6',
      modelColor: 'var(--model-opus)',
      tokens: '0',
      cost: '$0.00',
    }
    setCronList(prev => [...prev, newCron])
    setShowCronModal(false)
  }

  // Load cron jobs from bridge API
  useEffect(() => {
    const loadCron = async () => {
      setCronLoading(true)
      const { data } = await fetchLiveCronJobs()
      if (data && Array.isArray(data)) {
        const mapped = data.map((j: any) => ({
          id: j.id ?? j.name ?? String(Math.random()),
          name: j.name ?? 'Unknown',
          schedule: j.schedule ?? '',
          lastRun: j.lastRun ?? j.last_run ?? 'Never',
          nextRun: j.nextRun ?? j.next_run ?? 'Pending',
          status: (j.status === 'active' || j.status === 'paused' || j.status === 'error' ? j.status : 'active') as 'active' | 'paused' | 'error',
          agent: j.agent ?? '',
          agentEmoji: j.agentEmoji ?? '🤖',
          model: j.model ?? '',
          modelColor: j.modelColor ?? 'var(--text-secondary)',
          tokens: j.tokens ?? '0',
          cost: j.cost ?? '$0.00',
        }))
        setCronList(mapped)
      }
      setCronLoading(false)
    }
    loadCron()
  }, [refreshCount])

  useEffect(() => {
    const load = async () => {
      const { data, error } = await fetchSessions(100)
      if (data && data.sessions && data.sessions.length > 0) {
        setLiveSessions(data.sessions)
        setLiveError(false)
      } else if (data && Array.isArray(data)) {
        setLiveSessions(data as unknown as ApiSession[])
        setLiveError(false)
      } else {
        setLiveError(!!error)
      }
      setLoading(false)
    }
    load()
  }, [refreshCount])

  useEffect(() => {
    if (!isLive) return
    // Poll every 30s instead of SSE (SSE events can reset state with stale data)
    const interval = setInterval(doRefresh, 30000)
    return () => clearInterval(interval)
  }, [isLive, doRefresh])

  if (loading) return <PageSkeleton />

  const liveActive = liveSessions.filter(s => s.isActive).length
  const liveIdle = liveSessions.filter(s => !s.isActive).length
  const liveTotalTokens = liveSessions.reduce((sum, s) => sum + s.totalTokens, 0)
  const liveTotalCost = liveSessions.reduce((sum, s) => sum + s.totalCost, 0)
  const hasLiveData = liveSessions.length > 0
  const showLive = dataSource === 'live' && hasLiveData

  const statusColor = (s: Session['statusType']) =>
    s === 'active' ? 'var(--accent-green)' : s === 'idle' ? '#EAB308' : 'var(--accent-red)'

  const TABS: { key: Tab; label: string }[] = [
    { key: 'sessions', label: 'Active Sessions' },
    { key: 'cron', label: 'Cron Jobs' },
    { key: 'overnight', label: 'Overnight Log' },
    { key: 'costs', label: 'Cost Breakdown' },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="page-container">
      <PageHeader title="Task Manager" subtitle={`Last refreshed: ${new Date().toLocaleTimeString()}`}>
        {/* Data source toggle */}
        <div className="flex rounded-md overflow-hidden" style={{ border: '1px solid var(--border-divider)' }}>
          <button
            onClick={() => setDataSource('live')}
            className="px-3 py-1.5 text-xs font-medium cursor-pointer"
            style={{
              background: dataSource === 'live' ? 'rgba(0,229,255,0.1)' : 'var(--bg-3)',
              color: dataSource === 'live' ? 'var(--accent-teal)' : 'var(--text-secondary)',
              border: 'none',
            }}
          >
            Live {!hasLiveData && '(N/A)'}
          </button>
          <button
            onClick={() => setDataSource('mock')}
            className="px-3 py-1.5 text-xs font-medium cursor-pointer"
            style={{
              background: dataSource === 'mock' ? 'rgba(255,215,0,0.1)' : 'var(--bg-3)',
              color: dataSource === 'mock' ? 'var(--accent-gold)' : 'var(--text-secondary)',
              border: 'none',
            }}
          >
            Demo
          </button>
        </div>

        <button
          onClick={() => setIsLive(!isLive)}
          className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-md"
          style={{ background: 'none', border: 'none' }}
        >
          <span className={`w-2 h-2 rounded-full inline-block ${isLive ? 'pulse-dot' : ''}`} style={{ background: isLive ? 'var(--accent-green)' : 'var(--text-secondary)' }} />
          <span className="text-xs font-medium" style={{ color: isLive ? 'var(--accent-green)' : 'var(--text-secondary)' }}>{isLive ? 'Live' : 'Paused'}</span>
        </button>
        <button onClick={doRefresh} className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer hover:bg-[var(--bg-4)] transition-colors" style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)', border: '1px solid var(--border-divider)' }}>
          Refresh
        </button>
      </PageHeader>

      {/* Live data error banner */}
      {liveError && dataSource === 'live' && (
        <div className="rounded-lg p-3 mb-4 flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <span style={{ color: 'var(--accent-red)' }}>!</span>
          <span className="text-xs" style={{ color: 'var(--accent-red)' }}>Could not fetch live data. Switch to Demo mode or check the API.</span>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
        {showLive ? (
          <>
            <StatCard label="Active" value={liveActive} />
            <StatCard label="Idle" value={liveIdle} />
            <StatCard label="Total Sessions" value={liveSessions.length} />
            <StatCard label="Tokens Used" value={formatTokens(liveTotalTokens)} />
            <StatCard label="Total Cost" value={formatCost(liveTotalCost)} color="var(--accent-red)" />
          </>
        ) : (
          <>
            <StatCard label="Active" value={mockSessions.filter(s => s.statusType === 'active').length} />
            <StatCard label="Idle" value={mockSessions.filter(s => s.statusType === 'idle').length} />
            <StatCard label="Total Sessions" value={50} />
            <StatCard label="Tokens Used" value="7.6M" />
            <StatCard label="Total Cost" value="$62.96" color="var(--accent-red)" />
          </>
        )}
      </div>

      {/* Model Fleet */}
      <ModelFleetGrid liveSessions={liveSessions} />

      {/* Underline Tabs */}
      <div className="tab-bar">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`tab-item ${tab === t.key ? 'active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {tab === 'sessions' && showLive && (
          <motion.div key="live-sessions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
            {liveSessions.slice(0, 20).map(s => {
              const display = apiToDisplaySession(s)
              return (
                <SessionCard key={s.id} onClick={() => setSelectedLiveSessionId(s.id)} isActive={s.isActive}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.isActive ? 'pulse-dot' : ''}`} style={{ background: s.isActive ? 'var(--accent-green)' : '#EAB308' }} />
                      <div className="text-base font-semibold truncate">{display.title}</div>
                    </div>
                    <div className="flex items-center gap-5 shrink-0 ml-4">
                      <div className="text-right">
                        <div className="text-micro uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-secondary)' }}>TOKENS</div>
                        <div className="text-sm font-medium" style={{ color: 'var(--accent-teal)', fontFamily: 'var(--font-mono)' }}>{display.tokens}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-micro uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-secondary)' }}>COST</div>
                        <div className="text-sm font-medium" style={{ color: 'var(--accent-red)', fontFamily: 'var(--font-mono)' }}>{display.cost}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-[22px] mb-2">
                    <span className="badge" style={{ background: display.modelColor + '18', color: display.modelColor }}>{display.model}</span>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{display.status}</span>
                  </div>
                  <div className="flex items-center justify-between ml-[22px]">
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{display.time}</span>
                    {s.isActive && (
                      <button
                        onClick={(e) => killSession(s.id, e)}
                        className="text-xs px-3 py-1 rounded-full font-medium cursor-pointer hover:opacity-80 shrink-0"
                        style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', border: '1px solid rgba(239,68,68,0.2)' }}
                      >
                        Kill
                      </button>
                    )}
                  </div>
                </SessionCard>
              )
            })}
          </motion.div>
        )}

        {tab === 'sessions' && !showLive && (
          <motion.div key="mock-sessions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
            {mockSessions.map(s => (
              <SessionCard key={s.id} onClick={() => setSelectedMockSession(s)}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.statusType === 'active' ? 'pulse-dot' : ''}`} style={{ background: statusColor(s.statusType) }} />
                    <div className="text-base font-semibold truncate">{s.title}</div>
                  </div>
                  <div className="flex items-center gap-5 shrink-0 ml-4">
                    <div className="text-right">
                      <div className="text-micro uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-secondary)' }}>TOKENS</div>
                      <div className="text-sm font-medium" style={{ color: 'var(--accent-teal)', fontFamily: 'var(--font-mono)' }}>{s.tokens}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-micro uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-secondary)' }}>COST</div>
                      <div className="text-sm font-medium" style={{ color: 'var(--accent-red)', fontFamily: 'var(--font-mono)' }}>{s.cost}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-[22px] mb-2">
                  <span className="badge" style={{ background: s.modelColor + '18', color: s.modelColor }}>{s.model}</span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.status}</span>
                </div>
                <div className="ml-[22px]">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.time}</span>
                </div>
              </SessionCard>
            ))}
          </motion.div>
        )}

        {tab === 'cron' && (
          <motion.div key="cron" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="flex justify-end mb-4">
              <button onClick={() => setShowCronModal(true)} className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer hover:opacity-80" style={{ background: 'rgba(0,229,255,0.1)', color: 'var(--accent-teal)', border: '1px solid rgba(0,229,255,0.2)' }}>+ New Cron Job</button>
            </div>
            {cronLoading ? (
              <div className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>Loading cron jobs...</div>
            ) : cronList.length === 0 ? (
              <div className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>No cron jobs found. Connect to OpenClaw bridge to see live cron jobs.</div>
            ) : null}
            <div className="flex flex-col gap-2">
              {cronList.map(j => (
                <div key={j.id} className="flex items-center gap-3 p-4 rounded-lg" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${j.status === 'active' ? 'pulse-dot' : ''}`} style={{ background: j.status === 'active' ? 'var(--accent-green)' : j.status === 'paused' ? '#EAB308' : 'var(--accent-red)' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{j.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {j.schedule} · Last: {j.lastRun} · Next: {j.nextRun}
                    </div>
                  </div>
                  <span className="badge shrink-0" style={{ background: j.modelColor + '18', color: j.modelColor }}>{j.model}</span>
                  <span className="text-xs shrink-0" style={{ color: 'var(--accent-teal)', fontFamily: 'var(--font-mono)' }}>{j.tokens}</span>
                  <span className="text-xs shrink-0" style={{ color: 'var(--accent-red)', fontFamily: 'var(--font-mono)' }}>{j.cost}</span>
                  <button onClick={() => toggleCronPause(j.id)} className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 cursor-pointer hover:opacity-80" style={{
                    background: j.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(234,179,8,0.1)',
                    color: j.status === 'active' ? 'var(--accent-green)' : '#EAB308',
                    border: 'none',
                  }}>{j.status === 'active' ? 'Pause' : 'Resume'}</button>
                  <button onClick={() => deleteCron(j.id)} className="text-[10px] px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', border: 'none' }}>✕</button>
                </div>
              ))}
            </div>

            <AnimatePresence>
              {showCronModal && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
                  <motion.form initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onSubmit={handleCreateCron} className="rounded-xl p-6 w-[400px]" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
                    <h3 className="text-sm font-semibold mb-4">Create Cron Job</h3>
                    <div className="flex flex-col gap-3">
                      <input name="name" placeholder="Job name" required className="px-3 py-2 rounded-lg text-sm focus:outline-none" style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)' }} />
                      <input name="schedule" placeholder="Schedule (e.g. Every 30 min, Daily 08:00 UTC)" required className="px-3 py-2 rounded-lg text-sm focus:outline-none" style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)' }} />
                      <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => setShowCronModal(false)} className="px-3 py-1.5 rounded-md text-xs cursor-pointer" style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)', border: 'none' }}>Cancel</button>
                        <button type="submit" className="px-3 py-1.5 rounded-md text-xs cursor-pointer" style={{ background: 'rgba(0,229,255,0.1)', color: 'var(--accent-teal)', border: '1px solid rgba(0,229,255,0.2)' }}>Create</button>
                      </div>
                    </div>
                  </motion.form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {tab === 'overnight' && (
          <motion.div key="overnight" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative pl-6">
            <div className="absolute left-[18px] top-0 bottom-0 w-px" style={{ background: 'var(--border-divider)' }} />
            {overnightLog.map((entry, i) => {
              const catColor = entry.type === 'success' ? 'var(--accent-green)' : entry.type === 'warning' ? '#EAB308' : 'var(--accent-teal)'
              const catLabel = entry.type === 'success' ? 'completed' : entry.type === 'warning' ? 'error' : 'info'
              return (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg text-sm mb-1 relative">
                  <span className="absolute left-[-6px] top-4 w-3 h-3 rounded-full border-2 border-black z-10" style={{ background: catColor }} />
                  <span className="text-xs shrink-0 w-16 text-right" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{entry.time}</span>
                  <div className="flex-1 rounded-lg p-2" style={{ background: 'var(--bg-2)' }}>
                    <div className="flex items-center gap-2">
                      <span style={{ color: 'var(--text-primary)' }}>{entry.event}</span>
                      <span className="badge ml-auto shrink-0" style={{ background: catColor + '15', color: catColor }}>{catLabel}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}

        {tab === 'costs' && (
          <motion.div key="costs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <CostBreakdownView />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript slide-ins */}
      <AnimatePresence>
        {selectedMockSession && <MockTranscriptPanel session={selectedMockSession} onClose={() => setSelectedMockSession(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {selectedLiveSessionId && <LiveTranscriptPanel sessionId={selectedLiveSessionId} onClose={() => setSelectedLiveSessionId(null)} />}
      </AnimatePresence>
    </motion.div>
  )
}
