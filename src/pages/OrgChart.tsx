import { useState } from 'react'
import StatCard from '../components/StatCard'

interface Agent {
  name: string; emoji: string; role: string; status: 'active' | 'scaffolded' | 'deprecated'; model: string; modelColor: string;
}

const divisions: Record<string, { label: string; desc: string; agents: Agent[] }[]> = {
  engineering: [
    { label: 'Backend & Security — 2 agents', desc: 'Core infrastructure and security', agents: [
      { name: 'Nova', emoji: '🛡️', role: 'Security Specialist', status: 'active', model: 'Codex 5.3', modelColor: 'var(--model-codex)' },
      { name: 'Atlas', emoji: '🏗️', role: 'Backend Architect', status: 'active', model: 'Codex 5.3', modelColor: 'var(--model-codex)' },
    ]},
    { label: 'Frontend & UI — 2 agents', desc: 'User interfaces and design systems', agents: [
      { name: 'Pixel', emoji: '🎨', role: 'UI/UX Engineer', status: 'active', model: 'Opus 4.6', modelColor: 'var(--model-opus)' },
      { name: 'Frame', emoji: '🖼️', role: 'Frontend Developer', status: 'active', model: 'Sonnet 4.5', modelColor: 'var(--model-sonnet)' },
    ]},
    { label: 'DevOps & Infra — 2 agents', desc: 'Deployment and infrastructure', agents: [
      { name: 'Docker', emoji: '🐳', role: 'DevOps Engineer', status: 'active', model: 'Codex 5.3', modelColor: 'var(--model-codex)' },
      { name: 'Sentinel', emoji: '📡', role: 'Monitoring Specialist', status: 'scaffolded', model: 'Gemini Flash', modelColor: 'var(--model-gemini-flash)' },
    ]},
    { label: 'QA & Testing — 1 agent', desc: 'Quality assurance', agents: [
      { name: 'Tester', emoji: '🧪', role: 'QA Automation', status: 'active', model: 'Codex 5.3', modelColor: 'var(--model-codex)' },
    ]},
  ],
  marketing: [
    { label: 'Content & Social — 3 agents', desc: 'Content creation and social media', agents: [
      { name: 'Scribe', emoji: '✍️', role: 'Content Writer', status: 'active', model: 'Opus 4.6', modelColor: 'var(--model-opus)' },
      { name: 'Viral', emoji: '📱', role: 'Social Media Manager', status: 'active', model: 'Gemini Flash', modelColor: 'var(--model-gemini-flash)' },
      { name: 'Clay', emoji: '🦞', role: 'Community Bot', status: 'active', model: 'Gemini Flash', modelColor: 'var(--model-gemini-flash)' },
    ]},
    { label: 'Growth & Analytics — 2 agents', desc: 'User acquisition and analytics', agents: [
      { name: 'Funnel', emoji: '📈', role: 'Growth Hacker', status: 'active', model: 'Gemini Pro', modelColor: 'var(--model-gemini-pro)' },
      { name: 'Lens', emoji: '🔍', role: 'Analytics Specialist', status: 'active', model: 'Gemini Pro', modelColor: 'var(--model-gemini-pro)' },
    ]},
    { label: 'Design & Creative — 2 agents', desc: 'Visual design and branding', agents: [
      { name: 'Canvas', emoji: '🎭', role: 'Creative Director', status: 'active', model: 'Nano Banana Pro', modelColor: 'var(--model-nano)' },
      { name: 'Motion', emoji: '🎬', role: 'Motion Graphics', status: 'active', model: 'Nano Banana Pro', modelColor: 'var(--model-nano)' },
    ]},
  ],
  revenue: [
    { label: 'Partnerships — 2 agents', desc: 'Business development', agents: [
      { name: 'Deal', emoji: '🤝', role: 'Partnership Manager', status: 'active', model: 'Opus 4.6', modelColor: 'var(--model-opus)' },
      { name: 'Scout', emoji: '🔭', role: 'Opportunity Researcher', status: 'active', model: 'Opus 4.5', modelColor: 'var(--model-opus)' },
    ]},
    { label: 'Sales & Outreach — 2 agents', desc: 'Sales pipeline', agents: [
      { name: 'Closer', emoji: '💼', role: 'Sales Agent', status: 'active', model: 'Opus 4.6', modelColor: 'var(--model-opus)' },
      { name: 'Outreach', emoji: '📧', role: 'Email Specialist', status: 'active', model: 'Sonnet 4.5', modelColor: 'var(--model-sonnet)' },
    ]},
  ],
}

const deprecated: Agent[] = [
  { name: 'Legacy-Bot', emoji: '💀', role: 'Deprecated v1 bot', status: 'deprecated', model: 'GPT-4', modelColor: '#666' },
  { name: 'OldScribe', emoji: '💀', role: 'Replaced by Scribe', status: 'deprecated', model: 'GPT-4', modelColor: '#666' },
  { name: 'Proto-1', emoji: '💀', role: 'Early prototype', status: 'deprecated', model: 'Claude 3', modelColor: '#666' },
  { name: 'Proto-2', emoji: '💀', role: 'Early prototype', status: 'deprecated', model: 'Claude 3', modelColor: '#666' },
  { name: 'TestAgent', emoji: '💀', role: 'Testing only', status: 'deprecated', model: 'Haiku', modelColor: 'var(--model-haiku)' },
  { name: 'DraftBot', emoji: '💀', role: 'Draft generation', status: 'deprecated', model: 'Sonnet 3.5', modelColor: '#666' },
  { name: 'OldGrowth', emoji: '💀', role: 'Replaced by Funnel', status: 'deprecated', model: 'GPT-4', modelColor: '#666' },
]

const modelLegend = [
  { label: 'Opus', color: 'var(--model-opus)' },
  { label: 'Codex', color: 'var(--model-codex)' },
  { label: 'Sonnet', color: 'var(--model-sonnet)' },
  { label: 'Haiku', color: 'var(--model-haiku)' },
  { label: 'Gemini Flash', color: 'var(--model-gemini-flash)' },
  { label: 'Gemini Pro', color: 'var(--model-gemini-pro)' },
  { label: 'Nano Banana', color: 'var(--model-nano)' },
]

function AgentCard({ agent }: { agent: Agent }) {
  const statusColor = agent.status === 'active' ? 'var(--accent-green)' : agent.status === 'scaffolded' ? '#FFC107' : 'var(--accent-red)'
  const statusLabel = agent.status.charAt(0).toUpperCase() + agent.status.slice(1)
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--bg-card-hover)', borderLeft: `3px solid ${agent.modelColor}` }}>
      <span className="text-lg">{agent.emoji}</span>
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [showDeprecated, setShowDeprecated] = useState(false)

  const toggleDiv = (key: string) => setExpanded(p => ({ ...p, [key]: !p[key] }))
  const expandAll = () => {
    const all: Record<string, boolean> = {}
    Object.entries(divisions).forEach(([dept, divs]) => divs.forEach((_, i) => { all[`${dept}-${i}`] = true }))
    setExpanded(all)
  }
  const collapseAll = () => setExpanded({})

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Organization Chart</h1>
        <div className="flex gap-2">
          <button onClick={expandAll} className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-divider)' }}>Expand All</button>
          <button onClick={collapseAll} className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-divider)' }}>Collapse All</button>
        </div>
      </div>

      <div className="flex gap-3 mb-8">
        <StatCard label="Chiefs" value={3} icon="👑" />
        <StatCard label="Total Agents" value={25} />
        <StatCard label="Active" value={21} color="var(--accent-green)" icon="🟢" />
        <StatCard label="Scaffolded" value={1} color="#FFC107" icon="🟡" />
        <StatCard label="Deprecated" value={7} color="var(--accent-red)" icon="🔴" />
      </div>

      {/* CEO */}
      <div className="flex flex-col items-center mb-6">
        <div className="rounded-xl p-5 text-center glow-gold" style={{ background: 'var(--bg-card)', border: '2px solid var(--accent-gold)' }}>
          <div className="text-3xl mb-2">👤</div>
          <div className="font-semibold">Marcelo Oliveira</div>
          <div className="text-xs" style={{ color: 'var(--accent-gold)' }}>CEO</div>
          <div className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>Vision · Strategy · Final Decisions</div>
        </div>
        <div className="w-px h-6" style={{ background: 'var(--border-divider)' }}></div>

        {/* COO */}
        <div className="rounded-xl p-5 text-center glow-teal" style={{ background: 'var(--bg-card)', border: '2px solid var(--accent-teal)' }}>
          <div className="relative inline-block">
            <span className="text-3xl">🐕</span>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--accent-green)] border-2 border-black"></span>
          </div>
          <div className="font-semibold mt-2">Muddy</div>
          <div className="text-xs" style={{ color: 'var(--accent-teal)' }}>COO</div>
          <div className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>Research · Delegation · Execution · Orchestration</div>
        </div>
        <div className="w-px h-6" style={{ background: 'var(--border-divider)' }}></div>
      </div>

      {/* Department heads + divisions */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {([
          { name: 'Elon', emoji: '🚀', title: 'CTO', dept: 'engineering', label: 'Engineering' },
          { name: 'Gary', emoji: '📣', title: 'CMO', dept: 'marketing', label: 'Marketing' },
          { name: 'Warren', emoji: '💰', title: 'CRO', dept: 'revenue', label: 'Revenue' },
        ]).map(head => (
          <div key={head.dept}>
            <div className="rounded-lg p-4 text-center mb-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}>
              <span className="text-2xl">{head.emoji}</span>
              <div className="font-semibold mt-1">{head.name}</div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{head.title} — {head.label}</div>
              <span className="text-[10px] px-2 py-0.5 rounded-full mt-2 inline-block" style={{ background: 'var(--model-opus)22', color: 'var(--model-opus)' }}>Opus 4.6</span>
            </div>
            {divisions[head.dept].map((div, i) => {
              const key = `${head.dept}-${i}`
              const isOpen = expanded[key]
              return (
                <div key={key} className="mb-2">
                  <button onClick={() => toggleDiv(key)} className="w-full flex items-center gap-2 p-2.5 rounded-lg text-left cursor-pointer" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{isOpen ? '▼' : '▶'}</span>
                    <div className="flex-1">
                      <div className="text-xs font-medium">{div.label}</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{div.desc}</div>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="flex flex-col gap-2 mt-2 ml-3">
                      {div.agents.map(a => <AgentCard key={a.name} agent={a} />)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Deprecated */}
      <div className="mb-8">
        <button onClick={() => setShowDeprecated(!showDeprecated)} className="flex items-center gap-2 p-3 rounded-lg w-full text-left cursor-pointer" style={{ background: 'var(--bg-card)', border: '1px solid var(--accent-red)33' }}>
          <span style={{ color: 'var(--accent-red)' }}>❌</span>
          <span className="text-sm font-medium" style={{ color: 'var(--accent-red)' }}>Deprecated Agents ({deprecated.length})</span>
          <span className="ml-auto text-xs" style={{ color: 'var(--text-secondary)' }}>{showDeprecated ? '▼' : '▶'}</span>
        </button>
        {showDeprecated && (
          <div className="grid grid-cols-3 gap-2 mt-2">
            {deprecated.map(a => <AgentCard key={a.name} agent={a} />)}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}>
        <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>LEGEND</div>
        <div className="flex gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-xs"><span className="w-2 h-2 rounded-full bg-[var(--accent-green)]"></span> Active</span>
            <span className="flex items-center gap-1 text-xs"><span className="w-2 h-2 rounded-full bg-[#FFC107]"></span> Scaffolded</span>
            <span className="flex items-center gap-1 text-xs"><span className="w-2 h-2 rounded-full bg-[var(--accent-green)]" style={{ opacity: 0.5 }}></span> Future</span>
            <span className="flex items-center gap-1 text-xs"><span style={{ color: 'var(--accent-red)' }}>✕</span> Deprecated</span>
          </div>
          <div className="flex items-center gap-3">
            {modelLegend.map(m => (
              <span key={m.label} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: m.color + '22', color: m.color }}>{m.label}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
