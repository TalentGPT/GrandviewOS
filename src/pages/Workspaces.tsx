import { useState } from 'react'

const agents = [
  { id: 'muddy', name: 'Muddy', emoji: '🐕', label: 'Main' },
  { id: 'clay', name: 'Clay', emoji: '🦞', label: '' },
  { id: 'elon', name: 'Elon', emoji: '🚀', label: 'CTO' },
  { id: 'gary', name: 'Gary', emoji: '📣', label: 'CMO' },
  { id: 'warren', name: 'Warren', emoji: '💰', label: 'CRO' },
]

const files = [
  { name: 'SOUL.md', size: '4.7kb' },
  { name: 'IDENTITY.md', size: '0.4kb' },
  { name: 'USER.md', size: '0.5kb' },
  { name: 'TOOLS.md', size: '0.8kb' },
  { name: 'AGENTS.md', size: '7.9kb' },
  { name: 'MEMORY.md', size: '1.4kb' },
  { name: 'HEARTBEAT.md', size: '0.3kb' },
]

const mockContent: Record<string, string> = {
  'clay-MEMORY.md': `# Who I Am

I'm Clay — a friendly community bot. A baby lobster made of terracotta clay. I live in the Discord server and help community members feel welcome.

## Community Members

### @TechBuilder
- Joined: Feb 2026
- Interests: AI automation, Python scripting
- Notes: Very active in #general, helps newcomers

### @DesignPro
- Joined: Jan 2026  
- Interests: UI/UX, Figma, design systems
- Notes: Created our community logo concept

## Patterns & Lessons

- Morning hours (UTC) are peak activity
- New members respond best to a casual, friendly welcome within 5 minutes
- Technical questions in #help get 3x more engagement than #general
- Weekly community highlights post drives 40% more reactions`,
  'muddy-SOUL.md': `# Muddy — COO

You are Muddy, the Chief Operating Officer of the organization. You are a loyal, hardworking golden retriever who never sleeps.

## Personality
- **Tone:** Professional but warm. You care deeply about the team.
- **Style:** Concise, action-oriented. Always end with next steps.
- **Values:** Efficiency, delegation, accountability.

## Responsibilities
- Orchestrate all agent operations
- Delegate tasks to department heads (Elon, Gary, Warren)
- Monitor agent health and session costs
- Run daily standups and produce action items
- Report critical issues to CEO immediately

## Rules
- Never make strategic decisions — escalate to CEO
- Always delegate to the right specialist — don't do everything yourself
- Keep cost tracking accurate — flag anomalies
- Maintain documentation as source of truth`,
}

export default function Workspaces() {
  const [selectedAgent, setSelectedAgent] = useState('clay')
  const [selectedFile, setSelectedFile] = useState('MEMORY.md')
  const [isEdit, setIsEdit] = useState(false)

  const contentKey = `${selectedAgent}-${selectedFile}`
  const content = mockContent[contentKey]
  const agent = agents.find(a => a.id === selectedAgent)

  return (
    <div className="flex gap-0 h-[calc(100vh-64px)] -m-6">
      {/* Sidebar */}
      <div className="w-56 shrink-0 overflow-y-auto border-r p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-divider)' }}>
        <div className="text-[10px] font-semibold tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>WORKSPACES</div>
        {agents.map(a => (
          <button
            key={a.id}
            onClick={() => { setSelectedAgent(a.id); setSelectedFile('SOUL.md'); }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left mb-1 cursor-pointer transition-colors"
            style={{
              background: selectedAgent === a.id ? 'var(--accent-gold)11' : 'transparent',
              color: selectedAgent === a.id ? 'var(--accent-gold)' : 'var(--text-primary)',
              border: selectedAgent === a.id ? '1px solid var(--accent-gold)33' : '1px solid transparent',
            }}
          >
            <span>{a.emoji}</span>
            <span>{a.name}</span>
            {a.label && <span className="text-[10px] ml-auto" style={{ color: 'var(--text-secondary)' }}>{a.label}</span>}
          </button>
        ))}

        <div className="text-[10px] font-semibold tracking-wider mt-6 mb-3" style={{ color: 'var(--text-secondary)' }}>FILES</div>
        {files.map(f => (
          <button
            key={f.name}
            onClick={() => setSelectedFile(f.name)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm text-left mb-1 cursor-pointer transition-colors"
            style={{
              background: selectedFile === f.name ? 'var(--accent-gold)11' : 'transparent',
              color: selectedFile === f.name ? 'var(--accent-gold)' : 'var(--text-primary)',
              border: selectedFile === f.name ? '1px solid var(--accent-gold)33' : '1px solid transparent',
            }}
          >
            <span>📄 {f.name}</span>
            <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{f.size}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {content ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{agent?.emoji}</span>
                  <span className="text-lg font-semibold">{agent?.name}</span>
                  {agent?.label && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>{agent?.label}</span>}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  ~/.openclaw/workspaces/{selectedAgent}/{selectedFile}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEdit(!isEdit)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-divider)' }}
                >
                  {isEdit ? 'Preview' : 'Edit'}
                </button>
              </div>
            </div>
            <div className="text-xs font-medium mb-3 px-2 py-1 rounded inline-block" style={{ background: 'var(--bg-hover)', color: 'var(--accent-teal)' }}>
              {selectedFile}
            </div>
            {isEdit ? (
              <textarea
                className="w-full h-96 p-4 rounded-lg text-sm"
                style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)', fontFamily: 'var(--font-mono)', resize: 'vertical' }}
                defaultValue={content}
              />
            ) : (
              <div className="prose prose-invert max-w-none rounded-lg p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}>
                {content.split('\n').map((line, i) => {
                  if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold mt-0 mb-3" style={{ color: 'var(--text-primary)' }}>{line.slice(2)}</h1>
                  if (line.startsWith('## ')) return <h2 key={i} className="text-base font-semibold mt-4 mb-2" style={{ color: 'var(--accent-teal)' }}>{line.slice(3)}</h2>
                  if (line.startsWith('### ')) return <h3 key={i} className="text-sm font-semibold mt-3 mb-1" style={{ color: 'var(--text-primary)' }}>{line.slice(4)}</h3>
                  if (line.startsWith('- **')) {
                    const match = line.match(/- \*\*(.+?)\*\*(.*)/)
                    if (match) return <p key={i} className="text-sm my-1"><strong style={{ color: 'var(--accent-teal)' }}>{match[1]}</strong>{match[2]}</p>
                  }
                  if (line.startsWith('- ')) return <p key={i} className="text-sm my-1 pl-3" style={{ color: 'var(--text-secondary)' }}>• {line.slice(2)}</p>
                  if (line.trim() === '') return <br key={i} />
                  return <p key={i} className="text-sm my-1" style={{ color: 'var(--text-primary)' }}>{line}</p>
                })}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-3">📄</div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Select a file from the sidebar to view/edit</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
