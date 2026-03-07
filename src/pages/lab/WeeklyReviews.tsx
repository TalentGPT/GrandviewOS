import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import StatCard from '../../components/StatCard'
import PageHeader from '../../components/PageHeader'
import { PageSkeleton } from '../../components/Skeleton'
import { useToast } from '../../components/Toast'
import { fetchWeeklyReviews, generateWeeklyReview, formatCost, formatTokens } from '../../api/client'

interface Review {
  id: string
  weekStart: string
  weekEnd: string
  summary: string
  metrics: { sessionsRun?: number; totalCost?: number; tokensUsed?: number; topAgents?: Array<{ name: string; count: number; cost: number }> } | null
  highlights: string[]
  createdAt: string
}

export default function WeeklyReviews() {
  const { addToast } = useToast()
  const [reviews, setReviews] = useState<Review[]>([])
  const [selected, setSelected] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const load = useCallback(async () => {
    const { data } = await fetchWeeklyReviews()
    if (data) {
      setReviews(data)
      if (data.length > 0) setSelected(data[0])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const generate = async () => {
    setGenerating(true)
    const now = new Date()
    const end = new Date(now)
    const start = new Date(now)
    start.setDate(start.getDate() - 7)
    const { data } = await generateWeeklyReview(start.toISOString(), end.toISOString())
    if (data) {
      setReviews(prev => [data, ...prev])
      setSelected(data)
      addToast('Review generated')
    }
    setGenerating(false)
  }

  if (loading) return <PageSkeleton />

  const m = selected?.metrics

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto w-full">
      <PageHeader title="Weekly Reviews" subtitle="Structured weekly review summaries">
        <button onClick={generate} disabled={generating}
          className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer"
          style={{ background: 'var(--accent-teal)22', color: 'var(--accent-teal)', border: '1px solid var(--accent-teal)44', opacity: generating ? 0.5 : 1 }}>
          {generating ? 'Generating...' : 'Generate This Week'}
        </button>
      </PageHeader>

      {selected && m && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <StatCard label="Sessions" value={m.sessionsRun ?? 0} />
          <StatCard label="Tokens" value={formatTokens(m.tokensUsed ?? 0)} color="var(--accent-teal)" />
          <StatCard label="Cost" value={formatCost(m.totalCost ?? 0)} color="var(--accent-red)" />
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        {/* Week list */}
        <div className="w-full md:w-52 shrink-0">
          <div className="text-[10px] font-semibold tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>WEEKS</div>
          {reviews.map(r => (
            <button key={r.id} onClick={() => setSelected(r)}
              className="w-full text-left px-3 py-2 rounded-md text-sm mb-1 cursor-pointer transition-colors hover:bg-[var(--bg-3)]"
              style={{
                background: selected?.id === r.id ? 'var(--accent-green)11' : 'transparent',
                color: selected?.id === r.id ? 'var(--accent-green)' : 'var(--text-secondary)',
                border: selected?.id === r.id ? '1px solid var(--accent-green)33' : '1px solid transparent',
              }}>
              <div className="font-medium">{new Date(r.weekStart).toLocaleDateString()}</div>
              <div className="text-[10px] mt-0.5">{new Date(r.weekStart).toLocaleDateString()} → {new Date(r.weekEnd).toLocaleDateString()}</div>
            </button>
          ))}
          {reviews.length === 0 && (
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>No reviews yet. Generate one!</div>
          )}
        </div>

        {/* Review detail */}
        {selected && (
          <div className="flex-1 space-y-4">
            <div className="rounded-lg p-5" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
              <h2 className="text-base font-semibold mb-1">Week Review</h2>
              <div className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                {new Date(selected.weekStart).toLocaleDateString()} — {new Date(selected.weekEnd).toLocaleDateString()}
              </div>
              <p className="text-sm leading-relaxed">{selected.summary}</p>
            </div>

            {/* Highlights */}
            {selected.highlights.length > 0 && (
              <div className="rounded-lg p-5" style={{ background: 'var(--bg-2)', border: '1px solid var(--accent-green)22' }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--accent-green)' }}>Highlights</h3>
                {selected.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 mb-2">
                    <span className="text-xs mt-0.5" style={{ color: 'var(--accent-green)' }}>●</span>
                    <span className="text-sm">{h}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Top Agents */}
            {m?.topAgents && m.topAgents.length > 0 && (
              <div className="rounded-lg p-5" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--accent-green)' }}>Top Agents</h3>
                <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-divider)' }}>
                      <th className="text-left py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>Agent</th>
                      <th className="text-right py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>Sessions</th>
                      <th className="text-right py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.topAgents.map((a, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-divider)' }}>
                        <td className="py-2">{a.name}</td>
                        <td className="text-right py-2" style={{ fontFamily: 'var(--font-mono)' }}>{a.count}</td>
                        <td className="text-right py-2" style={{ color: 'var(--accent-red)', fontFamily: 'var(--font-mono)' }}>{formatCost(a.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
