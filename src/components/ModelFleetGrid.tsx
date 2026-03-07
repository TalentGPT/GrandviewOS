import type { ApiSession } from '../types/api'

interface ModelInfo {
  name: string
  desc: string
  color: string
  agents: string[]
  primary?: boolean
}

const MODEL_FLEET: ModelInfo[] = [
  { name: 'Claude Opus 4.6', desc: 'Primary research & orchestration', color: 'var(--model-opus)', agents: ['Ray Dalio', 'Elon', 'Gary', 'Marc Benioff', 'Scribe', 'Pixel', 'Deal', 'Closer'], primary: true },
  { name: 'Claude Opus 4.5', desc: 'Secondary complex tasks', color: 'var(--model-opus)', agents: ['Scout'] },
  { name: 'GPT-5.3-Codex', desc: 'Backend code & QA audit', color: 'var(--model-codex)', agents: ['Nova', 'Atlas', 'Docker', 'Tester'] },
  { name: 'Claude Sonnet 4.5', desc: 'Balanced tasks & frontend', color: 'var(--model-sonnet)', agents: ['Frame', 'Outreach'] },
  { name: 'Gemini 3 Flash', desc: 'Community & growth — fast context', color: 'var(--model-gemini-flash)', agents: ['Clay', 'Viral', 'Sentinel'] },
  { name: 'Nano Banana Pro', desc: 'Creative & graphics generation', color: 'var(--model-nano)', agents: ['Canvas', 'Motion'] },
]

const MODEL_STATS: Record<string, { cost: string; tokens: string; sessions: number; status: 'Active' | 'Standby' }> = {
  'Claude Opus 4.6': { cost: '$28.40', tokens: '3.2M', sessions: 22, status: 'Active' },
  'Claude Opus 4.5': { cost: '$12.10', tokens: '1.8M', sessions: 8, status: 'Active' },
  'GPT-5.3-Codex': { cost: '$6.80', tokens: '0.8M', sessions: 5, status: 'Active' },
  'Claude Sonnet 4.5': { cost: '$4.20', tokens: '0.6M', sessions: 4, status: 'Active' },
  'Gemini 3 Flash': { cost: '$4.50', tokens: '0.5M', sessions: 4, status: 'Active' },
  'Nano Banana Pro': { cost: '$2.96', tokens: '0.2M', sessions: 4, status: 'Standby' },
}

interface Props {
  liveSessions?: ApiSession[]
}

export default function ModelFleetGrid({ liveSessions: _liveSessions }: Props) {
  return (
    <div className="mb-12">
      <div className="section-header">
        <h2>Model Fleet</h2>
        <span className="count-badge">{MODEL_FLEET.length}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {MODEL_FLEET.map(m => {
          const stats = MODEL_STATS[m.name] ?? { cost: '$0', tokens: '0', sessions: 0, status: 'Standby' as const }
          return (
            <div
              key={m.name}
              className="rounded-xl overflow-hidden transition-colors"
              style={{
                background: 'var(--bg-2)',
                border: `1px solid var(--border-divider)`,
                borderLeft: m.primary ? `3px solid var(--accent-gold)` : `1px solid var(--border-divider)`,
              }}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: m.color }}
                    />
                    <div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{m.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{m.desc}</div>
                    </div>
                  </div>
                  <span
                    className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                    style={{
                      background: stats.status === 'Active' ? 'rgba(16,185,129,0.1)' : 'var(--bg-3)',
                      color: stats.status === 'Active' ? 'var(--accent-green)' : 'var(--text-secondary)',
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: stats.status === 'Active' ? 'var(--accent-green)' : 'var(--text-secondary)' }}
                    />
                    {stats.status}
                  </span>
                </div>
                {/* Agent tags */}
                <div className="flex flex-wrap gap-1.5">
                  {m.agents.map(a => (
                    <span
                      key={a}
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)' }}
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
              {/* Stats row with border-top */}
              <div
                className="flex items-center gap-5 px-5 py-3 text-xs"
                style={{ borderTop: '1px solid var(--border-divider)', fontFamily: 'var(--font-mono)' }}
              >
                <span style={{ color: 'var(--accent-red)' }}>{stats.cost}</span>
                <span style={{ color: 'var(--accent-teal)' }}>{stats.tokens}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{stats.sessions} sessions</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
