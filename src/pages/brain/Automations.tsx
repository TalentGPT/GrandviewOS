import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import StatCard from '../../components/StatCard'
import PageHeader from '../../components/PageHeader'
import { PageSkeleton } from '../../components/Skeleton'
import { fetchAutomations, type AutomationItem } from '../../api/client'

function formatRelativeTime(isoStr: string | null): string {
  if (!isoStr) return 'Never'
  const diff = Date.now() - new Date(isoStr).getTime()
  if (diff < 0) {
    // Future
    const absDiff = -diff
    if (absDiff < 3600000) return `in ${Math.round(absDiff / 60000)}m`
    if (absDiff < 86400000) return `in ${Math.round(absDiff / 3600000)}h`
    return `in ${Math.round(absDiff / 86400000)}d`
  }
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`
  return `${Math.round(diff / 86400000)}d ago`
}

export default function Automations() {
  const [automations, setAutomations] = useState<AutomationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await fetchAutomations()
      if (data?.automations) {
        setAutomations(data.automations)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <PageSkeleton />

  const enabled = automations.filter(a => a.enabled).length
  const errored = automations.filter(a => a.lastStatus === 'error').length

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto w-full">
      <PageHeader title="Automations" subtitle="OpenClaw cron jobs and scheduled tasks" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <StatCard label="Total" value={automations.length} />
        <StatCard label="Enabled" value={enabled} color="var(--accent-green)" />
        <StatCard label="Disabled" value={automations.length - enabled} color="var(--text-secondary)" />
        <StatCard label="Errored" value={errored} color="var(--accent-red)" />
      </div>

      {automations.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3 opacity-20">⚡</div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>No automations found. Connect OpenClaw to see cron jobs.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {automations.map(a => (
            <motion.div key={a.id} layout className="rounded-lg p-4 flex items-center gap-4"
              style={{ background: 'var(--bg-2)', border: `1px solid ${a.enabled ? (a.lastStatus === 'error' ? 'var(--accent-red)22' : 'var(--accent-green)22') : 'var(--border-divider)'}` }}>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{
                background: !a.enabled ? 'var(--text-secondary)' : a.lastStatus === 'error' ? 'var(--accent-red)' : 'var(--accent-green)'
              }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{a.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{ background: 'var(--accent-teal)22', color: 'var(--accent-teal)' }}>
                    {a.scheduleKind}
                  </span>
                  {!a.enabled && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)' }}>
                      disabled
                    </span>
                  )}
                  {a.lastStatus === 'error' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent-red)22', color: 'var(--accent-red)' }}>
                      error ×{a.consecutiveErrors}
                    </span>
                  )}
                </div>
                <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>{a.description}</div>
                {a.lastError && (
                  <div className="text-[10px] mt-1 truncate" style={{ color: 'var(--accent-red)' }}>{a.lastError}</div>
                )}
              </div>
              <div className="text-right text-xs shrink-0">
                <div style={{ color: 'var(--text-primary)' }}>
                  <code className="text-[11px]" style={{ fontFamily: 'var(--font-mono)' }}>{a.schedule}</code>
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{a.timezone}</div>
                <div className="mt-1">
                  <span style={{ color: 'var(--text-secondary)' }}>Last: </span>
                  <span>{formatRelativeTime(a.lastRun)}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Next: </span>
                  <span style={{ color: 'var(--accent-teal)' }}>{formatRelativeTime(a.nextRun)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
