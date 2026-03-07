import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import StatCard from '../../components/StatCard'
import PageHeader from '../../components/PageHeader'
import { PageSkeleton } from '../../components/Skeleton'
import { useToast } from '../../components/Toast'
import { fetchAgents } from '../../api/client'

type ProtoStatus = 'active' | 'testing' | 'archived'

interface Prototype {
  id: string
  name: string
  slug: string
  primaryModel: string
  description: string | null
  status: string
  emoji: string | null
  role: string
  department: string | null
  createdAt: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  'active': { label: 'Active', color: 'var(--accent-green)' },
  'testing': { label: 'Testing', color: 'var(--accent-teal)' },
  'archived': { label: 'Archived', color: 'var(--text-secondary)' },
}

export default function PrototypeFleet() {
  const { addToast } = useToast()
  const [prototypes, setPrototypes] = useState<Prototype[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  const load = useCallback(async () => {
    const { data } = await fetchAgents()
    if (data) {
      setPrototypes(data as any[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = filter ? prototypes.filter(p => p.status === filter) : prototypes
  const active = prototypes.filter(p => p.status === 'active').length
  const testing = prototypes.filter(p => p.status === 'testing').length
  const archived = prototypes.filter(p => p.status === 'archived').length

  if (loading) return <PageSkeleton />

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto w-full">
      <PageHeader title="Prototype Fleet" subtitle="Agent configurations and prototypes" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <StatCard label="Total Agents" value={prototypes.length} />
        <StatCard label="Active" value={active} color="var(--accent-green)" />
        <StatCard label="Testing" value={testing} color="var(--accent-teal)" />
        <StatCard label="Archived" value={archived} />
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {['', 'active', 'testing', 'archived'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className="px-3 py-1 rounded-full text-xs font-medium cursor-pointer"
            style={{ background: filter === s ? 'var(--accent-green)22' : 'var(--bg-3)', color: filter === s ? 'var(--accent-green)' : 'var(--text-secondary)', border: 'none' }}>
            {s ? (STATUS_CONFIG[s]?.label || s) : 'All'}
          </button>
        ))}
      </div>

      {/* Agent list */}
      <div className="flex flex-col gap-3">
        {filtered.map(p => {
          const sc = STATUS_CONFIG[p.status] || { label: p.status, color: 'var(--text-secondary)' }
          return (
            <motion.div key={p.id} layout className="rounded-lg p-5"
              style={{ background: 'var(--bg-2)', border: `1px solid ${sc.color}22` }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    {p.emoji && <span>{p.emoji}</span>}
                    <span className="text-base font-semibold">{p.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: sc.color + '22', color: sc.color }}>{sc.label}</span>
                  </div>
                  {p.description && <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{p.description}</div>}
                </div>
              </div>
              <div className="flex gap-6 mt-3 text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
                <span><span style={{ color: 'var(--text-secondary)' }}>Slug:</span> {p.slug}</span>
                <span><span style={{ color: 'var(--text-secondary)' }}>Model:</span> {p.primaryModel}</span>
                <span><span style={{ color: 'var(--text-secondary)' }}>Role:</span> {p.role}</span>
                {p.department && <span><span style={{ color: 'var(--text-secondary)' }}>Dept:</span> {p.department}</span>}
                <span><span style={{ color: 'var(--text-secondary)' }}>Created:</span> {new Date(p.createdAt).toLocaleDateString()}</span>
              </div>
            </motion.div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>No agents found.</div>
      )}
    </motion.div>
  )
}
