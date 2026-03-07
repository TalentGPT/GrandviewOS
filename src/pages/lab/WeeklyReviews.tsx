import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import StatCard from '../../components/StatCard'
import { PageSkeleton } from '../../components/Skeleton'
import { formatCost, formatTokens } from '../../api/client'

interface WeeklyReview {
  id: string
  week: string
  startDate: string
  endDate: string
  highlights: string[]
  lowlights: string[]
  metrics: { cost: number; tokens: number; sessions: number }
  agentPerformance: Array<{ name: string; emoji: string; sessions: number; cost: number; rating: 'excellent' | 'good' | 'fair' }>
}

function generateMockReviews(): WeeklyReview[] {
  const reviews: WeeklyReview[] = []
  const now = new Date()
  for (let w = 0; w < 6; w++) {
    const end = new Date(now)
    end.setDate(end.getDate() - w * 7)
    const start = new Date(end)
    start.setDate(start.getDate() - 6)
    const weekNum = `2026-W${String(10 - w).padStart(2, '0')}`
    reviews.push({
      id: `r${w}`, week: weekNum,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      highlights: [
        ['Brain & Lab modules shipped', 'TechCorp partnership proposal sent', 'Community hit 900 members'][w % 3],
        ['Voice standup system launched', 'Cost optimization saved 15%', 'Zero security incidents'][w % 3],
      ],
      lowlights: [
        ['Atlas hit rate-limiting issues', 'SEO report generation paused'][w % 2],
      ],
      metrics: {
        cost: 80 + Math.random() * 60,
        tokens: 8000000 + Math.floor(Math.random() * 5000000),
        sessions: 150 + Math.floor(Math.random() * 100),
      },
      agentPerformance: [
        { name: 'Muddy', emoji: '🐕', sessions: 35 + Math.floor(Math.random() * 15), cost: 15 + Math.random() * 10, rating: 'excellent' },
        { name: 'Clay', emoji: '🦞', sessions: 50 + Math.floor(Math.random() * 30), cost: 3 + Math.random() * 2, rating: 'excellent' },
        { name: 'Nova', emoji: '🛡️', sessions: 14 + Math.floor(Math.random() * 5), cost: 4 + Math.random() * 3, rating: 'good' },
        { name: 'Elon', emoji: '🚀', sessions: 10 + Math.floor(Math.random() * 8), cost: 8 + Math.random() * 5, rating: 'good' },
        { name: 'Gary', emoji: '📣', sessions: 8 + Math.floor(Math.random() * 5), cost: 5 + Math.random() * 3, rating: 'good' },
        { name: 'Warren', emoji: '💰', sessions: 5 + Math.floor(Math.random() * 4), cost: 4 + Math.random() * 2, rating: 'fair' },
      ],
    })
  }
  return reviews
}

const RATING_COLOR: Record<string, string> = {
  excellent: 'var(--accent-green)',
  good: 'var(--accent-teal)',
  fair: 'var(--accent-orange)',
}

export default function WeeklyReviews() {
  const [reviews, setReviews] = useState<WeeklyReview[]>([])
  const [selected, setSelected] = useState<WeeklyReview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const w = `2026-W${String(new Date().getDate()).padStart(2, '0')}`
        const res = await fetch(`/api/reviews?week=${w}`)
        if (res.ok) {
          const data = await res.json() as WeeklyReview[]
          if (data.length > 0) { setReviews(data); setSelected(data[0]); setLoading(false); return }
        }
      } catch { /* ignore */ }
      const mock = generateMockReviews()
      setReviews(mock)
      setSelected(mock[0])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <PageSkeleton />

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Weekly Reviews</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Structured weekly review summaries</p>
        </div>
      </div>

      {selected && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <StatCard label="Sessions" value={selected.metrics.sessions} icon="📊" />
          <StatCard label="Tokens" value={formatTokens(selected.metrics.tokens)} color="var(--accent-teal)" icon="🔤" />
          <StatCard label="Cost" value={formatCost(selected.metrics.cost)} color="var(--accent-red)" icon="💰" />
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
              <div className="font-medium">{r.week}</div>
              <div className="text-[10px] mt-0.5">{r.startDate} → {r.endDate}</div>
            </button>
          ))}
        </div>

        {/* Review detail */}
        {selected && (
          <div className="flex-1 space-y-4">
            <div className="rounded-lg p-5" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
              <h2 className="text-base font-semibold mb-1">Week {selected.week}</h2>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{selected.startDate} — {selected.endDate}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Highlights */}
              <div className="rounded-lg p-5" style={{ background: 'var(--bg-2)', border: '1px solid var(--accent-green)22' }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--accent-green)' }}>✅ Highlights</h3>
                {selected.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 mb-2">
                    <span className="text-xs mt-0.5" style={{ color: 'var(--accent-green)' }}>●</span>
                    <span className="text-sm">{h}</span>
                  </div>
                ))}
              </div>
              {/* Lowlights */}
              <div className="rounded-lg p-5" style={{ background: 'var(--bg-2)', border: '1px solid var(--accent-red)22' }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--accent-red)' }}>⚠️ Lowlights</h3>
                {selected.lowlights.map((l, i) => (
                  <div key={i} className="flex items-start gap-2 mb-2">
                    <span className="text-xs mt-0.5" style={{ color: 'var(--accent-red)' }}>●</span>
                    <span className="text-sm">{l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent performance */}
            <div className="rounded-lg p-5" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--accent-green)' }}>Agent Performance</h3>
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-divider)' }}>
                    <th className="text-left py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>Agent</th>
                    <th className="text-right py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>Sessions</th>
                    <th className="text-right py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>Cost</th>
                    <th className="text-right py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.agentPerformance.map(a => (
                    <tr key={a.name} style={{ borderBottom: '1px solid var(--border-divider)' }}>
                      <td className="py-2">{a.emoji} {a.name}</td>
                      <td className="text-right py-2" style={{ fontFamily: 'var(--font-mono)' }}>{a.sessions}</td>
                      <td className="text-right py-2" style={{ color: 'var(--accent-red)', fontFamily: 'var(--font-mono)' }}>{formatCost(a.cost)}</td>
                      <td className="text-right py-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: RATING_COLOR[a.rating] + '22', color: RATING_COLOR[a.rating] }}>{a.rating}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
