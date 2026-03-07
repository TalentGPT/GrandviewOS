import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import StatCard from '../components/StatCard'
import { divisions, deprecatedAgents, modelLegend, departmentHeads } from '../data/mockAgents'
import type { Agent } from '../data/mockAgents'

function AgentCard({ agent, onClick }: { agent: Agent; onClick?: () => void }) {
  const statusColor = agent.status === 'active' ? 'var(--accent-green)' : agent.status === 'scaffolded' ? '#FFC107' : 'var(--accent-red)'
  const statusLabel = agent.status.charAt(0).toUpperCase() + agent.status.slice(1)
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-active)] transition-colors cursor-pointer"
      style={{ background: 'var(--bg-card-hover)', borderLeft: `3px solid ${agent.modelColor}` }}
    >
      <div className="relative">
        <span className="text-lg">{agent.emoji}</span>
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black" style={{ background: statusColor }}></span>
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">{agent.name}</div>
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{agent.role}</div>
      </div>
      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: statusColor + '22', color: statusColor }}>{statusLabel}</span>
      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: agent.modelColor + '22', color: agent.modelColor }}>{agent.model}</span>
    </div>
  )
}

export default function OrgChart() {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [showDeprecated, setShowDeprecated] = useState(false)

  const toggleDiv = (key: string) => setExpanded(p => ({ ...p, [key]: !p[key] }))
  const expandAll = () => {
    const all: Record<string, boolean> = {}
    Object.entries(divisions).forEach(([dept, divs]) => divs.forEach((_, i) => { all[`${dept}-${i}`] = true }))
    setExpanded(all)
  }
  const collapseAll = () => setExpanded({})

  const goToWorkspace = (agentId: string) => navigate(`/ops/workspaces?agent=${agentId}`)

  const deptConfig = [
    { head: departmentHeads[0], dept: 'engineering', label: 'Engineering' },
    { head: departmentHeads[1], dept: 'marketing', label: 'Marketing' },
    { head: departmentHeads[2], dept: 'revenue', label: 'Revenue' },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-semibold">Organization Chart</h1>
        <div className="flex gap-2">
          <button onClick={expandAll} className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer hover:bg-[var(--bg-active)] transition-colors" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-divider)' }}>Expand All</button>
          <button onClick={collapseAll} className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer hover:bg-[var(--bg-active)] transition-colors" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-divider)' }}>Collapse All</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        <StatCard label="Chiefs" value={3} icon="👑" />
        <StatCard label="Total Agents" value={25} />
        <StatCard label="Active" value={21} color="var(--accent-green)" icon="🟢" />
        <StatCard label="Scaffolded" value={1} color="#FFC107" icon="🟡" />
        <StatCard label="Deprecated" value={7} color="var(--accent-red)" icon="🔴" />
      </div>

      {/* CEO */}
      <div className="flex flex-col items-center mb-6">
        <div className="rounded-xl p-5 text-center glow-gold cursor-pointer hover:scale-[1.02] transition-transform" style={{ background: 'var(--bg-card)', border: '2px solid var(--accent-gold)' }}>
          <div className="text-3xl mb-2">👤</div>
          <div className="font-semibold">Marcelo Oliveira</div>
          <div className="text-xs" style={{ color: 'var(--accent-gold)' }}>CEO</div>
          <div className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>Vision · Strategy · Final Decisions</div>
        </div>
        {/* Connecting line */}
        <div className="w-px h-6" style={{ background: 'var(--border-divider)' }}></div>

        {/* COO */}
        <div onClick={() => goToWorkspace('muddy')} className="rounded-xl p-5 text-center glow-teal cursor-pointer hover:scale-[1.02] transition-transform" style={{ background: 'var(--bg-card)', border: '2px solid var(--accent-teal)' }}>
          <div className="relative inline-block">
            <span className="text-3xl">🐕</span>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--accent-green)] border-2 border-black pulse-dot"></span>
          </div>
          <div className="font-semibold mt-2">Muddy</div>
          <div className="text-xs" style={{ color: 'var(--accent-teal)' }}>COO</div>
          <div className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>Research · Delegation · Execution · Orchestration</div>
        </div>
        <div className="w-px h-6" style={{ background: 'var(--border-divider)' }}></div>

        {/* Horizontal connector */}
        <div className="relative w-full max-w-3xl">
          <div className="absolute top-0 left-1/6 right-1/6 h-px" style={{ background: 'var(--border-divider)' }}></div>
        </div>
      </div>

      {/* Department heads + divisions */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {deptConfig.map(({ head, dept, label }) => {
          const divs = divisions[dept]
          const agentCount = divs.reduce((sum, d) => sum + d.agents.length, 0)
          return (
            <div key={dept}>
              <div
                onClick={() => goToWorkspace(head.id)}
                className="rounded-lg p-4 text-center mb-3 cursor-pointer hover:border-[var(--accent-teal)] transition-colors"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}
              >
                <div className="relative inline-block">
                  <span className="text-2xl">{head.emoji}</span>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--accent-green)] border-2 border-black"></span>
                </div>
                <div className="font-semibold mt-1">{head.name}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{head.title} — {label}</div>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--model-opus)22', color: 'var(--model-opus)' }}>Opus 4.6</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>{agentCount} agents</span>
                </div>
              </div>

              {/* Connecting line from head to divisions */}
              <div className="flex justify-center mb-2">
                <div className="w-px h-3" style={{ background: 'var(--border-divider)' }}></div>
              </div>

              {divs.map((div, i) => {
                const key = `${dept}-${i}`
                const isOpen = expanded[key]
                return (
                  <div key={key} className="mb-2">
                    <button onClick={() => toggleDiv(key)} className="w-full flex items-center gap-2 p-2.5 rounded-lg text-left cursor-pointer hover:bg-[var(--bg-hover)] transition-colors" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}>
                      <span className="text-xs transition-transform" style={{ color: 'var(--text-secondary)', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▶</span>
                      <div className="flex-1">
                        <div className="text-xs font-medium">{div.label}</div>
                        <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{div.desc}</div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>{div.agents.length}</span>
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
                            {div.agents.map(a => <AgentCard key={a.name} agent={a} onClick={() => goToWorkspace(a.id)} />)}
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

      {/* Deprecated */}
      <div className="mb-8">
        <button onClick={() => setShowDeprecated(!showDeprecated)} className="flex items-center gap-2 p-3 rounded-lg w-full text-left cursor-pointer hover:bg-[var(--bg-hover)] transition-colors" style={{ background: 'var(--bg-card)', border: '1px solid var(--accent-red)33' }}>
          <span style={{ color: 'var(--accent-red)' }}>❌</span>
          <span className="text-sm font-medium" style={{ color: 'var(--accent-red)' }}>Deprecated Agents ({deprecatedAgents.length})</span>
          <span className="ml-auto text-xs" style={{ color: 'var(--text-secondary)' }}>{showDeprecated ? '▼' : '▶'}</span>
        </button>
        <AnimatePresence>
          {showDeprecated && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 mt-2">
                {deprecatedAgents.map(a => <AgentCard key={a.name} agent={a} />)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}>
        <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>LEGEND</div>
        <div className="flex gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-xs"><span className="w-2 h-2 rounded-full bg-[var(--accent-green)]"></span> Active</span>
            <span className="flex items-center gap-1 text-xs"><span className="w-2 h-2 rounded-full bg-[#FFC107]"></span> Scaffolded</span>
            <span className="flex items-center gap-1 text-xs"><span style={{ color: 'var(--accent-red)' }}>✕</span> Deprecated</span>
          </div>
          <div className="flex items-center gap-3">
            {modelLegend.map(m => (
              <span key={m.label} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: m.color + '22', color: m.color }}>{m.label}</span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
