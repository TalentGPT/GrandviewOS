import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import StatCard from '../components/StatCard'
import PageHeader from '../components/PageHeader'
import { PageSkeleton } from '../components/Skeleton'
import { fetchAgents, getModelColor, getModelShortName } from '../api/client'
import type { ApiAgent } from '../types/api'

// Derive model color from primaryModel string
function agentModelColor(model?: string): string {
  if (!model) return 'var(--text-secondary)'
  return getModelColor(model)
}

function agentModelLabel(model?: string): string {
  if (!model) return 'Unknown'
  return getModelShortName(model)
}

interface DisplayAgent {
  id: string
  name: string
  emoji: string
  role: string
  status: string
  model: string
  modelColor: string
  department?: string | null
  division?: string | null
  description?: string | null
  title?: string
  parentId?: string | null
}

function toDisplayAgent(a: ApiAgent): DisplayAgent {
  return {
    id: a.id,
    name: a.name,
    emoji: a.emoji ?? '🤖',
    role: a.role ?? 'Agent',
    status: a.status ?? 'active',
    model: agentModelLabel(a.primaryModel),
    modelColor: agentModelColor(a.primaryModel),
    department: a.department,
    division: a.division,
    description: a.description,
    parentId: a.parentId,
  }
}

interface DivisionGroup {
  label: string
  agents: DisplayAgent[]
}

function AgentCard({ agent, onClick }: { agent: DisplayAgent; onClick?: () => void }) {
  const statusColor = agent.status === 'active' ? 'var(--accent-green)' : agent.status === 'scaffolded' ? '#EAB308' : 'var(--accent-red)'
  const statusLabel = agent.status.charAt(0).toUpperCase() + agent.status.slice(1)
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-4)] transition-colors cursor-pointer"
      style={{ background: 'var(--bg-3)', borderLeft: `3px solid ${agent.modelColor}` }}
    >
      <div className="relative shrink-0">
        <span className="w-3 h-3 rounded-full inline-block" style={{ background: agent.modelColor }} />
        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-black" style={{ background: statusColor }}></span>
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">{agent.emoji} {agent.name}</div>
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{agent.role}</div>
      </div>
      <span className="badge" style={{ background: statusColor + '15', color: statusColor }}>{statusLabel}</span>
      <span className="badge" style={{ background: agent.modelColor + '15', color: agent.modelColor }}>{agent.model}</span>
    </div>
  )
}

export default function OrgChart() {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [showDeprecated, setShowDeprecated] = useState(false)
  const [agents, setAgents] = useState<DisplayAgent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await fetchAgents()
      if (data) {
        setAgents(data.map(toDisplayAgent))
      }
      setLoading(false)
    }
    load()
  }, [])

  const toggleDiv = (key: string) => setExpanded(p => ({ ...p, [key]: !p[key] }))

  const goToWorkspace = (agentId: string) => navigate(`/ops/workspaces?agent=${agentId}`)

  // Build org structure from flat agent list
  const activeAgents = agents.filter(a => a.status !== 'deprecated')
  const deprecatedAgents = agents.filter(a => a.status === 'deprecated')

  // Find special agents
  const ceo = agents.find(a => a.id === 'joe-hawn') || agents.find(a => a.role?.toLowerCase().includes('ceo'))
  const coo = agents.find(a => a.id === 'ray-dalio') || agents.find(a => a.role?.toLowerCase().includes('coo'))

  // Department heads
  const departments = ['engineering', 'marketing', 'revenue']
  const deptLabels: Record<string, string> = { engineering: 'Engineering', marketing: 'Marketing', revenue: 'Revenue' }
  const deptTitles: Record<string, string> = { engineering: 'CTO', marketing: 'CMO', revenue: 'CRO' }

  const deptHeads = departments.map(dept => {
    const head = activeAgents.find(a => a.department === dept && (
      a.role?.toLowerCase().includes('lead') || a.role?.toLowerCase().includes('chief') ||
      a.role?.toLowerCase().includes('head') || a.id === 'elon' || a.id === 'steve-jobs' || a.id === 'marc-benioff'
    ))
    return { dept, head: head || null }
  }).filter(d => d.head)

  // Group agents by department and division
  const buildDivisions = (dept: string): DivisionGroup[] => {
    const deptAgents = activeAgents.filter(a =>
      a.department === dept &&
      a.id !== ceo?.id && a.id !== coo?.id &&
      !deptHeads.some(dh => dh.head?.id === a.id)
    )

    const divMap: Record<string, DisplayAgent[]> = {}
    for (const a of deptAgents) {
      const div = a.division || 'General'
      if (!divMap[div]) divMap[div] = []
      divMap[div].push(a)
    }

    return Object.entries(divMap).map(([label, agents]) => ({ label, agents }))
  }

  // Agents without a department (excluding CEO, COO, dept heads, deprecated)
  const unassigned = activeAgents.filter(a =>
    !a.department &&
    a.id !== ceo?.id && a.id !== coo?.id &&
    !deptHeads.some(dh => dh.head?.id === a.id)
  )

  // Stats
  const totalActive = activeAgents.length
  const totalScaffolded = agents.filter(a => a.status === 'scaffolded').length
  const totalDeprecated = deprecatedAgents.length

  // Model legend from actual agents
  const modelSet = new Map<string, string>()
  agents.forEach(a => { if (a.model && a.model !== 'Unknown') modelSet.set(a.model, a.modelColor) })

  const expandAll = () => {
    const all: Record<string, boolean> = {}
    deptHeads.forEach(({ dept }) => {
      const divs = buildDivisions(dept)
      divs.forEach((_, i) => { all[`${dept}-${i}`] = true })
    })
    setExpanded(all)
  }
  const collapseAll = () => setExpanded({})

  if (loading) return <PageSkeleton />

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="page-container">
      <PageHeader title="Organization Chart" subtitle="Agent hierarchy and department structure">
        <button onClick={expandAll} className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer hover:bg-[var(--bg-4)] transition-colors" style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)', border: '1px solid var(--border-divider)' }}>Expand All</button>
        <button onClick={collapseAll} className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer hover:bg-[var(--bg-4)] transition-colors" style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)', border: '1px solid var(--border-divider)' }}>Collapse All</button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
        <StatCard label="Chiefs" value={deptHeads.length} />
        <StatCard label="Total Agents" value={agents.length} />
        <StatCard label="Active" value={totalActive} color="var(--accent-green)" />
        <StatCard label="Scaffolded" value={totalScaffolded} color="#EAB308" />
        <StatCard label="Deprecated" value={totalDeprecated} color="var(--accent-red)" />
      </div>

      {/* CEO */}
      {ceo && (
        <div className="flex flex-col items-center mb-6">
          <div className="rounded-xl p-5 text-center glow-gold cursor-pointer hover:scale-[1.02] transition-transform" style={{ background: 'var(--bg-2)', border: '2px solid var(--accent-gold)' }}>
            <div className="w-8 h-8 rounded-full mx-auto mb-2" style={{ background: 'var(--accent-gold)', opacity: 0.8 }} />
            <div className="font-semibold">{ceo.name}</div>
            <div className="text-xs" style={{ color: 'var(--accent-gold)' }}>CEO</div>
            <div className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>{ceo.role}</div>
          </div>
          <div className="w-px h-6" style={{ background: 'var(--border-divider)' }}></div>

          {/* COO */}
          {coo && (
            <>
              <div onClick={() => goToWorkspace(coo.id)} className="rounded-xl p-5 text-center glow-teal cursor-pointer hover:scale-[1.02] transition-transform" style={{ background: 'var(--bg-2)', border: '2px solid var(--accent-teal)' }}>
                <div className="relative inline-block">
                  <div className="w-8 h-8 rounded-full mx-auto" style={{ background: 'var(--accent-teal)', opacity: 0.8 }} />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--accent-green)] border-2 border-black pulse-dot"></span>
                </div>
                <div className="font-semibold mt-2">{coo.name}</div>
                <div className="text-xs" style={{ color: 'var(--accent-teal)' }}>COO</div>
                <div className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>{coo.role}</div>
              </div>
              <div className="w-px h-6" style={{ background: 'var(--border-divider)' }}></div>
            </>
          )}

          <div className="relative w-full max-w-3xl">
            <div className="absolute top-0 left-1/6 right-1/6 h-px" style={{ background: 'var(--border-divider)' }}></div>
          </div>
        </div>
      )}

      {/* Department heads + divisions */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {deptHeads.map(({ dept, head }) => {
          if (!head) return null
          const divs = buildDivisions(dept)
          const agentCount = divs.reduce((sum, d) => sum + d.agents.length, 0)
          return (
            <div key={dept}>
              <div
                onClick={() => goToWorkspace(head.id)}
                className="rounded-lg p-4 text-center mb-3 cursor-pointer hover:border-[var(--accent-teal)] transition-colors"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}
              >
                <div className="relative inline-block">
                  <div className="w-6 h-6 rounded-full mx-auto" style={{ background: head.modelColor, opacity: 0.7 }} />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--accent-green)] border-2 border-black"></span>
                </div>
                <div className="font-semibold mt-1">{head.emoji} {head.name}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{deptTitles[dept] ?? ''} — {deptLabels[dept] ?? dept}</div>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: head.modelColor + '22', color: head.modelColor }}>{head.model}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)' }}>{agentCount} agents</span>
                </div>
              </div>

              <div className="flex justify-center mb-2">
                <div className="w-px h-3" style={{ background: 'var(--border-divider)' }}></div>
              </div>

              {divs.map((div, i) => {
                const key = `${dept}-${i}`
                const isOpen = expanded[key]
                return (
                  <div key={key} className="mb-2">
                    <button onClick={() => toggleDiv(key)} className="w-full flex items-center gap-2 p-2.5 rounded-lg text-left cursor-pointer hover:bg-[var(--bg-3)] transition-colors" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
                      <span className="text-xs transition-transform" style={{ color: 'var(--text-secondary)', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▶</span>
                      <div className="flex-1">
                        <div className="text-xs font-medium">{div.label}</div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)' }}>{div.agents.length}</span>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-col gap-2 mt-2 ml-3 border-l pl-3" style={{ borderColor: 'var(--border-divider)' }}>
                            {div.agents.map(a => <AgentCard key={a.id} agent={a} onClick={() => goToWorkspace(a.id)} />)}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Unassigned agents */}
      {unassigned.length > 0 && (
        <div className="mb-8">
          <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>UNASSIGNED AGENTS</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {unassigned.map(a => <AgentCard key={a.id} agent={a} onClick={() => goToWorkspace(a.id)} />)}
          </div>
        </div>
      )}

      {/* Deprecated */}
      {deprecatedAgents.length > 0 && (
        <div className="mb-8">
          <button onClick={() => setShowDeprecated(!showDeprecated)} className="flex items-center gap-2 p-3 rounded-lg w-full text-left cursor-pointer hover:bg-[var(--bg-3)] transition-colors" style={{ background: 'var(--bg-2)', border: '1px solid var(--accent-red)33' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-red)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--accent-red)' }}>Deprecated Agents ({deprecatedAgents.length})</span>
            <span className="ml-auto text-xs" style={{ color: 'var(--text-secondary)' }}>{showDeprecated ? '▼' : '▶'}</span>
          </button>
          <AnimatePresence>
            {showDeprecated && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 mt-2">
                  {deprecatedAgents.map(a => <AgentCard key={a.id} agent={a} />)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Legend */}
      <div className="rounded-lg p-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
        <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>LEGEND</div>
        <div className="flex gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-xs"><span className="w-2 h-2 rounded-full bg-[var(--accent-green)]"></span> Active</span>
            <span className="flex items-center gap-1 text-xs"><span className="w-2 h-2 rounded-full bg-[#EAB308]"></span> Scaffolded</span>
            <span className="flex items-center gap-1 text-xs"><span className="w-2 h-2 rounded-full bg-[var(--accent-red)]"></span> Deprecated</span>
          </div>
          <div className="flex items-center gap-3">
            {Array.from(modelSet.entries()).map(([label, color]) => (
              <span key={label} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: color + '22', color }}>{label}</span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
