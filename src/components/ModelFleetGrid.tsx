import type { ApiSession } from '../types/api'

interface ModelInfo {
  name: string
  desc: string
  icon: string
  color: string
  agents: string[]
}

const MODEL_FLEET: ModelInfo[] = [
  { name: 'Claude Opus 4.6', desc: 'Primary research & orchestration', icon: '🔴', color: 'var(--model-opus)', agents: ['Muddy', 'Elon', 'Gary', 'Warren', 'Scribe', 'Pixel', 'Deal', 'Closer'] },
  { name: 'Claude Opus 4.5', desc: 'Secondary complex tasks', icon: '🔴', color: 'var(--model-opus)', agents: ['Scout'] },
  { name: 'GPT-5.3-Codex', desc: 'Backend code & QA audit', icon: '🟤', color: 'var(--model-codex)', agents: ['Nova', 'Atlas', 'Docker', 'Tester'] },
  { name: 'Claude Sonnet 4.5', desc: 'Balanced tasks & frontend', icon: '🟢', color: 'var(--model-sonnet)', agents: ['Frame', 'Outreach'] },
  { name: 'Gemini 3 Flash', desc: 'Community & growth — fast context', icon: '⚡', color: 'var(--model-gemini-flash)', agents: ['Clay', 'Viral', 'Sentinel'] },
  { name: 'Nano Banana Pro', desc: 'Creative & graphics generation', icon: '🍌', color: 'var(--model-nano)', agents: ['Canvas', 'Motion'] },
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
    <>
      <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Model Fleet</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {MODEL_FLEET.map(m => {
          const stats = MODEL_STATS[m.name] ?? { cost: '$0', tokens: '0', sessions: 0, status: 'Standby' as const }
          return (
            <div key={m.name} className="rounded-lg p-4 md:p-5 hover:border-[var(--accent-teal)] transition-colors cursor-default" style={{ background: 'var(--bg-card)', border: `1px solid ${m.color}33` }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{m.icon}</span>
                  <div>
                    <div className="text-sm font-semibold">{m.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{m.desc}</div>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full font-medium shrink-0" style={{
                  background: stats.status === 'Active' ? 'var(--accent-green)22' : 'var(--bg-hover)',
                  color: stats.status === 'Active' ? 'var(--accent-green)' : 'var(--text-secondary)',
                }}>{stats.status}</span>
              </div>
              {/* Agent names */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {m.agents.map(a => (
                  <span key={a} className="text-xs px-2 py-0.5 rounded" style={{ background: m.color + '15', color: m.color }}>{a}</span>
                ))}
              </div>
              <div className="flex gap-4 text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: 'var(--accent-red)' }}>{stats.cost}</span>
                <span style={{ color: 'var(--accent-teal)' }}>{stats.tokens}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{stats.sessions} sessions</span>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
