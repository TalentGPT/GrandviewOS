import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { fetchCostBreakdown, fetchCostHistory, formatCost, formatTokens, getModelColor, getModelShortName } from '../api/client'
import type { CostBreakdown as CostBreakdownType, DailyCostEntry } from '../types/api'

function CostBar({ label, value, maxValue, color }: { label: string; value: number; maxValue: number; color: string }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="text-xs w-32 truncate" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: 'var(--bg-3)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
          className="h-full rounded-full"
          style={{ background: color, minWidth: pct > 0 ? '4px' : '0' }}
        />
      </div>
      <span className="text-xs w-16 text-right" style={{ color, fontFamily: 'var(--font-mono)' }}>{formatCost(value)}</span>
    </div>
  )
}

function Sparkline({ data, color, width = 120, height = 24 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 0.01)
  const min = Math.min(...data, 0)
  const range = max - min || 1

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 2) - 1
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function CostBreakdownView() {
  const [breakdown, setBreakdown] = useState<CostBreakdownType | null>(null)
  const [history, setHistory] = useState<DailyCostEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'model' | 'agent'>('model')

  useEffect(() => {
    const load = async () => {
      const [b, h] = await Promise.all([fetchCostBreakdown(), fetchCostHistory(7)])
      if (b.data) setBreakdown(b.data)
      if (h.data) setHistory(h.data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>Loading cost data...</div>
  }

  if (!breakdown) {
    return <div className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>No cost data available</div>
  }

  const modelEntries = Object.entries(breakdown.byModel).sort((a, b) => b[1].cost - a[1].cost)
  const agentEntries = Object.entries(breakdown.byAgent).sort((a, b) => b[1].cost - a[1].cost)
  const maxCost = view === 'model'
    ? Math.max(...modelEntries.map(e => e[1].cost), 0.01)
    : Math.max(...agentEntries.map(e => e[1].cost), 0.01)

  const costTrend = history.map(h => h.totalCost)
  const tokenTrend = history.map(h => h.totalTokens)

  return (
    <div>
      {/* Trend sparklines */}
      {history.length > 1 && (
        <div className="flex gap-4 mb-6">
          <div className="flex-1 rounded-lg p-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
            <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>💰 Cost Trend (7 days)</div>
            <div className="flex items-center gap-3">
              <Sparkline data={costTrend} color="var(--accent-red)" width={180} height={32} />
              <span className="text-lg font-bold" style={{ color: 'var(--accent-red)', fontFamily: 'var(--font-mono)' }}>
                {formatCost(breakdown.total.cost)}
              </span>
            </div>
          </div>
          <div className="flex-1 rounded-lg p-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
            <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>🔤 Token Trend (7 days)</div>
            <div className="flex items-center gap-3">
              <Sparkline data={tokenTrend} color="var(--accent-teal)" width={180} height={32} />
              <span className="text-lg font-bold" style={{ color: 'var(--accent-teal)', fontFamily: 'var(--font-mono)' }}>
                {formatTokens(breakdown.total.tokens)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Toggle */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setView('model')}
          className="px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer"
          style={{
            background: view === 'model' ? 'var(--accent-teal)22' : 'transparent',
            color: view === 'model' ? 'var(--accent-teal)' : 'var(--text-secondary)',
            border: view === 'model' ? '1px solid var(--accent-teal)44' : '1px solid transparent',
          }}>
          By Model
        </button>
        <button onClick={() => setView('agent')}
          className="px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer"
          style={{
            background: view === 'agent' ? 'var(--accent-teal)22' : 'transparent',
            color: view === 'agent' ? 'var(--accent-teal)' : 'var(--text-secondary)',
            border: view === 'agent' ? '1px solid var(--accent-teal)44' : '1px solid transparent',
          }}>
          By Agent
        </button>
      </div>

      {/* Bars */}
      <div className="rounded-lg p-5" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
        {view === 'model' ? (
          <>
            <div className="text-xs font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>COST BY MODEL</div>
            {modelEntries.map(([model, stats]) => (
              <CostBar key={model} label={getModelShortName(model)} value={stats.cost} maxValue={maxCost} color={getModelColor(model)} />
            ))}
            {/* Table below */}
            <table className="w-full mt-4 text-xs" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-divider)' }}>
                  <th className="text-left py-2" style={{ color: 'var(--text-secondary)' }}>Model</th>
                  <th className="text-right py-2" style={{ color: 'var(--text-secondary)' }}>Sessions</th>
                  <th className="text-right py-2" style={{ color: 'var(--text-secondary)' }}>Tokens</th>
                  <th className="text-right py-2" style={{ color: 'var(--text-secondary)' }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {modelEntries.map(([model, stats]) => (
                  <tr key={model} style={{ borderBottom: '1px solid var(--border-divider)' }}>
                    <td className="py-2" style={{ color: getModelColor(model) }}>{getModelShortName(model)}</td>
                    <td className="text-right py-2" style={{ fontFamily: 'var(--font-mono)' }}>{stats.sessions}</td>
                    <td className="text-right py-2" style={{ color: 'var(--accent-teal)', fontFamily: 'var(--font-mono)' }}>{formatTokens(stats.tokens)}</td>
                    <td className="text-right py-2" style={{ color: 'var(--accent-red)', fontFamily: 'var(--font-mono)' }}>{formatCost(stats.cost)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2 font-semibold">Total</td>
                  <td className="text-right py-2 font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>{breakdown.total.sessions}</td>
                  <td className="text-right py-2 font-semibold" style={{ color: 'var(--accent-teal)', fontFamily: 'var(--font-mono)' }}>{formatTokens(breakdown.total.tokens)}</td>
                  <td className="text-right py-2 font-semibold" style={{ color: 'var(--accent-red)', fontFamily: 'var(--font-mono)' }}>{formatCost(breakdown.total.cost)}</td>
                </tr>
              </tbody>
            </table>
          </>
        ) : (
          <>
            <div className="text-xs font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>COST BY AGENT</div>
            {agentEntries.map(([agent, stats]) => (
              <CostBar key={agent} label={agent} value={stats.cost} maxValue={maxCost} color="var(--accent-teal)" />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
