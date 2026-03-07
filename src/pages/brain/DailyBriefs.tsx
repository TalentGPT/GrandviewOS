import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import StatCard from '../../components/StatCard'
import PageHeader from '../../components/PageHeader'
import { PageSkeleton } from '../../components/Skeleton'
import { formatCost, formatTokens } from '../../api/client'

interface Brief {
  date: string
  agentsActive: number
  sessionsRun: number
  tokensUsed: number
  cost: number
  events: string[]
}

function generateMockBriefs(): Brief[] {
  const briefs: Brief[] = []
  const now = new Date()
  for (let i = 0; i < 14; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    briefs.push({
      date: dateStr,
      agentsActive: 15 + Math.floor(Math.random() * 8),
      sessionsRun: 20 + Math.floor(Math.random() * 30),
      tokensUsed: 500000 + Math.floor(Math.random() * 2000000),
      cost: 5 + Math.random() * 25,
      events: [
        ['Security scan completed — 0 critical issues', 'Newsletter draft generated', 'Partnership proposal sent to TechCorp'],
        ['Sprint review completed', 'Auth middleware patch deployed', 'XSS vulnerability patched'],
        ['SDK documentation 80% complete', 'Community grew by 18 members', 'First micro-sponsorship closed'],
        ['Cost optimization review', 'New agent Sentinel scaffolded', 'Overnight log analysis'],
      ][i % 4],
    })
  }
  return briefs
}

export default function DailyBriefs() {
  const [briefs, setBriefs] = useState<Brief[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      // Try live API
      try {
        const today = new Date().toISOString().split('T')[0]
        const res = await fetch(`/api/briefs?date=${today}`)
        if (res.ok) {
          const data = await res.json() as Brief[]
          if (data.length > 0) {
            setBriefs(data)
            setSelectedDate(data[0].date)
            setLoading(false)
            return
          }
        }
      } catch { /* ignore */ }
      // Fallback to mock
      const mock = generateMockBriefs()
      setBriefs(mock)
      setSelectedDate(mock[0].date)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <PageSkeleton />

  const selected = briefs.find(b => b.date === selectedDate)
  const totals = briefs.reduce((acc, b) => ({
    sessions: acc.sessions + b.sessionsRun,
    tokens: acc.tokens + b.tokensUsed,
    cost: acc.cost + b.cost,
  }), { sessions: 0, tokens: 0, cost: 0 })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto w-full">
      <PageHeader title="Daily Briefs" subtitle="Auto-generated daily summaries of agent activity" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        <StatCard label="Total Sessions (14d)" value={totals.sessions} />
        <StatCard label="Total Tokens (14d)" value={formatTokens(totals.tokens)} color="var(--accent-teal)" />
        <StatCard label="Total Cost (14d)" value={formatCost(totals.cost)} color="var(--accent-red)" />
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Date list */}
        <div className="w-48 shrink-0">
          <div className="text-[10px] font-semibold tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>DATES</div>
          <div className="flex flex-col gap-1">
            {briefs.map(b => (
              <button
                key={b.date}
                onClick={() => setSelectedDate(b.date)}
                className="w-full text-left px-3 py-2 rounded-md text-sm cursor-pointer transition-colors hover:bg-[var(--bg-3)]"
                style={{
                  background: selectedDate === b.date ? 'var(--accent-purple)11' : 'transparent',
                  color: selectedDate === b.date ? 'var(--accent-purple)' : 'var(--text-secondary)',
                  border: selectedDate === b.date ? '1px solid var(--accent-purple)33' : '1px solid transparent',
                }}
              >
                <div className="font-medium">{b.date}</div>
                <div className="text-[10px] mt-0.5">{b.sessionsRun} sessions · {formatCost(b.cost)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Brief detail */}
        {selected && (
          <div className="flex-1">
            <div className="rounded-lg p-6" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
              <h2 className="text-lg font-semibold mb-1">Brief — {selected.date}</h2>
              <div className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>Auto-generated from session data</div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-3)' }}>
                  <div className="text-2xl font-bold" style={{ color: 'var(--accent-purple)', fontFamily: 'var(--font-mono)' }}>{selected.agentsActive}</div>
                  <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Agents Active</div>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-3)' }}>
                  <div className="text-2xl font-bold" style={{ color: 'var(--accent-teal)', fontFamily: 'var(--font-mono)' }}>{selected.sessionsRun}</div>
                  <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Sessions Run</div>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-3)' }}>
                  <div className="text-2xl font-bold" style={{ color: 'var(--accent-teal)', fontFamily: 'var(--font-mono)' }}>{formatTokens(selected.tokensUsed)}</div>
                  <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Tokens Used</div>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-3)' }}>
                  <div className="text-2xl font-bold" style={{ color: 'var(--accent-red)', fontFamily: 'var(--font-mono)' }}>{formatCost(selected.cost)}</div>
                  <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Cost</div>
                </div>
              </div>

              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--accent-purple)' }}>Key Events</h3>
              <div className="flex flex-col gap-2">
                {selected.events.map((evt, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'var(--bg-3)' }}>
                    <span className="text-xs mt-0.5" style={{ color: 'var(--accent-green)' }}>●</span>
                    <span className="text-sm">{evt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
