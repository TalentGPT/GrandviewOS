import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import StatCard from '../../components/StatCard'
import { useToast } from '../../components/Toast'

interface Automation {
  id: string
  name: string
  type: 'cron' | 'heartbeat' | 'trigger'
  schedule: string
  agent: string
  agentEmoji: string
  status: 'active' | 'paused' | 'error'
  lastRun: string
  nextRun: string
  description: string
}

const MOCK_AUTOMATIONS: Automation[] = [
  { id: 'a1', name: 'Heartbeat Check', type: 'heartbeat', schedule: 'Every 30 min', agent: 'Muddy', agentEmoji: '🐕', status: 'active', lastRun: '07:30 UTC', nextRun: '08:00 UTC', description: 'Check all agent health and cost metrics' },
  { id: 'a2', name: 'Community Pulse', type: 'cron', schedule: 'Every 2 hours', agent: 'Clay', agentEmoji: '🦞', status: 'active', lastRun: '06:00 UTC', nextRun: '08:00 UTC', description: 'Analyze Discord community activity and sentiment' },
  { id: 'a3', name: 'Daily Standup', type: 'cron', schedule: 'Daily 08:00 UTC', agent: 'Muddy', agentEmoji: '🐕', status: 'active', lastRun: 'Yesterday', nextRun: '08:00 UTC', description: 'Run executive standup with all department heads' },
  { id: 'a4', name: 'Weekly Newsletter', type: 'cron', schedule: 'Mon 09:00 UTC', agent: 'Scribe', agentEmoji: '✍️', status: 'active', lastRun: '3 days ago', nextRun: 'Mon 09:00', description: 'Generate and send weekly newsletter' },
  { id: 'a5', name: 'Security Scan', type: 'cron', schedule: 'Daily 03:00 UTC', agent: 'Nova', agentEmoji: '🛡️', status: 'active', lastRun: '03:00 UTC', nextRun: 'Tomorrow 03:00', description: 'Full security audit and dependency check' },
  { id: 'a6', name: 'SEO Report', type: 'cron', schedule: 'Weekly Fri', agent: 'Funnel', agentEmoji: '📈', status: 'paused', lastRun: '5 days ago', nextRun: 'Fri 10:00', description: 'Generate SEO keyword report and analysis' },
  { id: 'a7', name: 'Dependency Audit', type: 'cron', schedule: 'Daily 04:00 UTC', agent: 'Nova', agentEmoji: '🛡️', status: 'active', lastRun: '04:00 UTC', nextRun: 'Tomorrow 04:00', description: 'Check npm dependencies for vulnerabilities' },
  { id: 'a8', name: 'Cost Alert', type: 'trigger', schedule: 'On spend > $50/day', agent: 'Muddy', agentEmoji: '🐕', status: 'active', lastRun: 'Never', nextRun: 'On trigger', description: 'Alert CEO when daily cost exceeds $50' },
]

// Generate timeline hours
function generateTimeline(): Array<{ hour: string; automations: string[] }> {
  const timeline: Array<{ hour: string; automations: string[] }> = []
  for (let h = 0; h < 24; h++) {
    const hourStr = `${h.toString().padStart(2, '0')}:00`
    const running: string[] = []
    if (h % 2 === 0) running.push('Community Pulse')
    if ([0, 6, 12, 18].includes(h)) running.push('Heartbeat Check')
    if (h === 3) running.push('Security Scan')
    if (h === 4) running.push('Dependency Audit')
    if (h === 8) running.push('Daily Standup')
    timeline.push({ hour: hourStr, automations: running })
  }
  return timeline
}

export default function Automations() {
  const { addToast } = useToast()
  const [automations, setAutomations] = useState(MOCK_AUTOMATIONS)
  const [showTimeline, setShowTimeline] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSchedule, setNewSchedule] = useState('')
  const timeline = generateTimeline()

  const active = automations.filter(a => a.status === 'active').length
  const paused = automations.filter(a => a.status === 'paused').length

  const toggleStatus = (id: string) => {
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, status: a.status === 'active' ? 'paused' as const : 'active' as const } : a))
    addToast('Automation status updated')
  }

  const deleteAutomation = (id: string) => {
    setAutomations(prev => prev.filter(a => a.id !== id))
    addToast('Automation deleted')
  }

  const addAutomation = () => {
    if (!newName.trim() || !newSchedule.trim()) return
    const newAuto: Automation = {
      id: `a${Date.now()}`, name: newName, type: 'cron', schedule: newSchedule,
      agent: 'Muddy', agentEmoji: '🐕', status: 'active', lastRun: 'Never', nextRun: 'Pending',
      description: 'Custom automation rule',
    }
    setAutomations(prev => [...prev, newAuto])
    setNewName('')
    setNewSchedule('')
    setShowAdd(false)
    addToast('Automation added')
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Automations</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>View and manage automated workflows and triggers</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTimeline(!showTimeline)}
            className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer"
            style={{ background: showTimeline ? 'var(--accent-purple)22' : 'var(--bg-hover)', color: showTimeline ? 'var(--accent-purple)' : 'var(--text-secondary)', border: `1px solid ${showTimeline ? 'var(--accent-purple)44' : 'var(--border-divider)'}` }}>
            📅 Timeline
          </button>
          <button onClick={() => setShowAdd(!showAdd)}
            className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer"
            style={{ background: 'var(--accent-purple)22', color: 'var(--accent-purple)', border: '1px solid var(--accent-purple)44' }}>
            + Add Rule
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total" value={automations.length} icon="⚡" />
        <StatCard label="Active" value={active} color="var(--accent-green)" icon="🟢" />
        <StatCard label="Paused" value={paused} color="#FFC107" icon="⏸️" />
        <StatCard label="Cron Jobs" value={automations.filter(a => a.type === 'cron').length} icon="🔄" />
        <StatCard label="Triggers" value={automations.filter(a => a.type === 'trigger').length} icon="🎯" />
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4">
            <div className="rounded-lg p-4 flex gap-3 items-end" style={{ background: 'var(--bg-card)', border: '1px solid var(--accent-purple)33' }}>
              <div className="flex-1">
                <label className="text-[10px] block mb-1" style={{ color: 'var(--text-secondary)' }}>Name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Automation name..."
                  className="w-full px-3 py-1.5 rounded text-sm focus:outline-none" style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)' }} />
              </div>
              <div className="flex-1">
                <label className="text-[10px] block mb-1" style={{ color: 'var(--text-secondary)' }}>Schedule</label>
                <input value={newSchedule} onChange={e => setNewSchedule(e.target.value)} placeholder="Every 30 min, Daily 08:00..."
                  className="w-full px-3 py-1.5 rounded text-sm focus:outline-none" style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)' }} />
              </div>
              <button onClick={addAutomation} className="px-4 py-1.5 rounded text-xs font-medium cursor-pointer"
                style={{ background: 'var(--accent-green)22', color: 'var(--accent-green)', border: '1px solid var(--accent-green)44' }}>Save</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline view */}
      <AnimatePresence>
        {showTimeline && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6">
            <div className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}>
              <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>24-HOUR TIMELINE</div>
              <div className="flex gap-0.5 items-end h-20">
                {timeline.map(t => {
                  const hasAuto = t.automations.length > 0
                  return (
                    <div key={t.hour} className="flex-1 flex flex-col items-center gap-1" title={hasAuto ? t.automations.join(', ') : 'No automations'}>
                      <div className="w-full rounded-sm transition-colors"
                        style={{ height: hasAuto ? `${Math.min(t.automations.length * 20 + 10, 60)}px` : '4px', background: hasAuto ? 'var(--accent-purple)' : 'var(--bg-hover)' }} />
                      <span className="text-[8px]" style={{ color: 'var(--text-secondary)' }}>{t.hour.slice(0, 2)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Automation list */}
      <div className="flex flex-col gap-3">
        {automations.map(a => (
          <motion.div key={a.id} layout className="rounded-lg p-4 flex items-center gap-4"
            style={{ background: 'var(--bg-card)', border: `1px solid ${a.status === 'active' ? 'var(--accent-green)22' : a.status === 'paused' ? '#FFC10722' : 'var(--accent-red)22'}` }}>
            <span className="text-xl">{a.agentEmoji}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{a.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ background: a.type === 'cron' ? 'var(--accent-teal)22' : a.type === 'heartbeat' ? 'var(--accent-purple)22' : 'var(--accent-orange)22',
                    color: a.type === 'cron' ? 'var(--accent-teal)' : a.type === 'heartbeat' ? 'var(--accent-purple)' : 'var(--accent-orange)' }}>
                  {a.type}
                </span>
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{a.description}</div>
            </div>
            <div className="text-right text-xs shrink-0">
              <div style={{ color: 'var(--text-secondary)' }}>📅 {a.schedule}</div>
              <div className="mt-0.5"><span style={{ color: 'var(--text-secondary)' }}>Last:</span> {a.lastRun}</div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Next:</span> <span style={{ color: 'var(--accent-teal)' }}>{a.nextRun}</span></div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => toggleStatus(a.id)} className="px-2 py-1 rounded text-[10px] font-medium cursor-pointer"
                style={{ background: a.status === 'active' ? 'var(--accent-green)22' : '#FFC10722', color: a.status === 'active' ? 'var(--accent-green)' : '#FFC107', border: 'none' }}>
                {a.status === 'active' ? '⏸ Pause' : '▶ Resume'}
              </button>
              <button onClick={() => deleteAutomation(a.id)} className="px-2 py-1 rounded text-[10px] font-medium cursor-pointer"
                style={{ background: 'var(--accent-red)22', color: 'var(--accent-red)', border: 'none' }}>
                ✕
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
