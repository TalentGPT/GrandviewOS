import StatCard from '../components/StatCard'

const models = [
  { name: 'Claude Opus 4.6', desc: 'Primary research & orchestration', icon: '🔴', status: 'Active', cost: '$28.40', tokens: '3.2M', sessions: 22, color: 'var(--model-opus)' },
  { name: 'Claude Opus 4.5 Antigravity', desc: 'Secondary complex tasks', icon: '🔴', status: 'Active', cost: '$12.10', tokens: '1.8M', sessions: 8, color: 'var(--model-opus)' },
  { name: 'Gemini 3 Pro Preview', desc: 'Video & heavy context', icon: '🔵', status: 'Active', cost: '$8.20', tokens: '1.1M', sessions: 7, color: 'var(--model-gemini-pro)' },
  { name: 'GPT-5.3-Codex', desc: 'Backend code & QA audit', icon: '🟤', status: 'Active', cost: '$6.80', tokens: '0.8M', sessions: 5, color: 'var(--model-codex)' },
  { name: 'Gemini 3 Flash', desc: 'Community & growth — fast context', icon: '⚡', status: 'Active', cost: '$4.50', tokens: '0.5M', sessions: 4, color: 'var(--model-gemini-flash)' },
  { name: 'Nano Banana Pro', desc: 'Creative & graphics generation', icon: '🍌', status: 'Standby', cost: '$2.96', tokens: '0.2M', sessions: 4, color: 'var(--model-nano)' },
]

const sessions = [
  { title: 'Weekly Newsletter Draft', model: 'Opus 4.6', modelColor: 'var(--model-opus)', tokens: '45.2K', cost: '$1.84', status: 'Generating content...', time: '2m ago' },
  { title: 'Discord Community Pulse', model: 'Gemini 3 Flash', modelColor: 'var(--model-gemini-flash)', tokens: '128.5K', cost: '$0.42', status: 'Analyzing member activity...', time: '5m ago' },
  { title: 'Backend Security Audit', model: 'GPT-5.3-Codex', modelColor: 'var(--model-codex)', tokens: '89.1K', cost: '$2.10', status: 'Scanning dependencies...', time: '8m ago' },
  { title: 'Partnership Outreach Emails', model: 'Opus 4.6', modelColor: 'var(--model-opus)', tokens: '32.0K', cost: '$1.20', status: 'Drafting personalized emails...', time: '12m ago' },
  { title: 'Daily Standup Prep', model: 'Opus 4.5', modelColor: 'var(--model-opus)', tokens: '18.7K', cost: '$0.85', status: 'Compiling agent reports...', time: '15m ago' },
  { title: 'SEO Keyword Research', model: 'Gemini 3 Pro', modelColor: 'var(--model-gemini-pro)', tokens: '62.3K', cost: '$0.95', status: 'Analyzing search trends...', time: '20m ago' },
  { title: 'Cron: Heartbeat Check', model: 'Opus 4.6', modelColor: 'var(--model-opus)', tokens: '5.1K', cost: '$0.12', status: 'All agents healthy ✓', time: '25m ago' },
  { title: 'Motion Graphics Brief', model: 'Nano Banana Pro', modelColor: 'var(--model-nano)', tokens: '22.4K', cost: '$0.38', status: 'Rendering concepts...', time: '30m ago' },
]

export default function TaskManager() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Task Manager</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-green)] pulse-dot inline-block"></span>
            <span className="text-sm font-medium" style={{ color: 'var(--accent-green)' }}>Live</span>
          </div>
          <button className="px-3 py-1.5 rounded-md text-xs font-medium" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-divider)' }}>
            Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="flex gap-3 mb-8">
        <StatCard label="Active" value={1} icon="🟢" />
        <StatCard label="Idle" value={3} icon="💤" />
        <StatCard label="Total Sessions" value={50} icon="📊" />
        <StatCard label="Tokens Used" value="7.6M" icon="🔤" />
        <StatCard label="Total Cost" value="$62.96" color="var(--accent-red)" icon="💰" />
      </div>

      {/* Model Fleet */}
      <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Model Fleet</h2>
      <div className="grid grid-cols-3 gap-3 mb-8">
        {models.map(m => (
          <div key={m.name} className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{m.icon}</span>
                <div>
                  <div className="text-sm font-semibold">{m.name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{m.desc}</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{
                background: m.status === 'Active' ? 'var(--accent-green)' + '22' : 'var(--bg-hover)',
                color: m.status === 'Active' ? 'var(--accent-green)' : 'var(--text-secondary)',
              }}>
                {m.status}
              </span>
            </div>
            <div className="flex gap-4 mt-3 text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: 'var(--accent-red)' }}>{m.cost}</span>
              <span style={{ color: 'var(--accent-teal)' }}>{m.tokens}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{m.sessions} sessions</span>
            </div>
          </div>
        ))}
      </div>

      {/* Active Sessions */}
      <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Active Sessions</h2>
      <div className="flex flex-col gap-2">
        {sessions.map((s, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-[var(--bg-hover)] transition-colors" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}>
            <span className="w-2 h-2 rounded-full bg-[var(--accent-green)] pulse-dot shrink-0"></span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{s.title}</div>
              <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{s.status}</div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: s.modelColor + '22', color: s.modelColor }}>
              {s.model}
            </span>
            <span className="text-xs shrink-0" style={{ color: 'var(--accent-teal)', fontFamily: 'var(--font-mono)' }}>{s.tokens}</span>
            <span className="text-xs shrink-0" style={{ color: 'var(--accent-red)', fontFamily: 'var(--font-mono)' }}>{s.cost}</span>
            <span className="text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>{s.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
