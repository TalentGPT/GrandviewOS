import { useState } from 'react'

const participants = [
  { name: 'Muddy', emoji: '🐕', role: 'COO', color: 'var(--accent-teal)' },
  { name: 'Gary', emoji: '📣', role: 'CMO', color: '#FF9800' },
  { name: 'Elon', emoji: '🚀', role: 'CTO', color: '#E53935' },
  { name: 'Warren', emoji: '💰', role: 'CRO', color: '#7B1FA2' },
]

const conversation = [
  { speaker: participants[0], text: "Good morning team. Let's review our progress on the partnership pipeline and align on priorities for this week. Warren, you've been leading the outreach — what's the status?" },
  { speaker: participants[3], text: "We've identified 12 potential partners in the AI tooling space. Three have responded positively to initial outreach. I'm drafting personalized proposals for TechCorp, AIFlow, and DataStream. Expected to have all three proposals sent by end of day." },
  { speaker: participants[2], text: "On the technical side, I've completed the API integration framework that partners will need. The SDK documentation is 80% complete. I also patched two security vulnerabilities that Atlas flagged yesterday in the auth middleware." },
  { speaker: participants[1], text: "Content is aligned with the partnership push. I've prepared co-marketing templates and a press release draft. The community engagement metrics are up 23% this week — Clay's been doing excellent work in Discord. I'm also finalizing the newsletter featuring our partnership vision." },
  { speaker: participants[0], text: "Excellent progress across the board. Let me summarize the action items and we'll reconvene tomorrow for a quick sync. Gary, make sure the newsletter goes out before the partner proposals — we want them to see our momentum." },
]

const actionItems = [
  { text: 'Send personalized proposals to TechCorp, AIFlow, DataStream', assignee: participants[3], done: true },
  { text: 'Complete SDK documentation (remaining 20%)', assignee: participants[2], done: true },
  { text: 'Publish co-marketing templates to shared workspace', assignee: participants[1], done: true },
  { text: 'Send weekly newsletter with partnership vision', assignee: participants[1], done: true },
  { text: 'Review and approve partner API access levels', assignee: participants[0], done: true },
  { text: 'Schedule follow-up calls with responsive partners', assignee: participants[3], done: true },
  { text: 'Update MEMORY.md with partnership pipeline status', assignee: participants[0], done: true },
  { text: 'Run security scan on partner integration endpoints', assignee: participants[2], done: true },
  { text: 'Prepare Discord announcement for partnership program', assignee: participants[1], done: true },
  { text: 'Brief CEO on partnership progress and timeline', assignee: participants[0], done: true },
]

export default function Standup() {
  const [showArchive] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-semibold">Executive Standup</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Kick off meetings with the chiefs and review past transcripts</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer" style={{ background: 'var(--accent-green)22', color: 'var(--accent-green)', border: '1px solid var(--accent-green)44' }}>
            Meeting Archive
          </button>
          <button className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer" style={{ background: 'var(--accent-teal)22', color: 'var(--accent-teal)', border: '1px solid var(--accent-teal)44' }}>
            + New Standup
          </button>
        </div>
      </div>

      {!showArchive && (
        <>
          {/* Meeting card */}
          <div className="rounded-lg p-5 mb-6 mt-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}>
            <div className="text-base font-semibold mb-1">Partnership & Sponsorship Strategy</div>
            <div className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>📅 March 7, 2026 — 08:00 UTC</div>
            <div className="flex gap-2">
              {participants.map(p => (
                <span key={p.name} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: p.color + '22', color: p.color }}>
                  {p.emoji} {p.name}
                </span>
              ))}
            </div>
          </div>

          {/* Audio player mock */}
          <div className="flex items-center gap-3 p-3 rounded-lg mb-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}>
            <button className="px-3 py-1 rounded-full text-xs font-medium cursor-pointer" style={{ background: 'var(--accent-green)', color: '#000' }}>
              🔊 Play
            </button>
            <button className="text-xs cursor-pointer" style={{ color: 'var(--text-secondary)', background: 'none', border: 'none' }}>⏪</button>
            <button className="text-xs cursor-pointer" style={{ color: 'var(--text-secondary)', background: 'none', border: 'none' }}>⏩</button>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>🐕 Muddy</span>
            <div className="flex-1 h-1 rounded-full" style={{ background: 'var(--border-divider)' }}>
              <div className="h-full rounded-full w-[20%]" style={{ background: 'var(--accent-green)' }}></div>
            </div>
            <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>1/5 — 4s/24s</span>
          </div>

          {/* Conversation */}
          <div className="flex flex-col gap-4 mb-6">
            {conversation.map((msg, i) => (
              <div key={i} className="p-4 rounded-lg" style={{ background: 'var(--bg-card)', borderLeft: `3px solid ${msg.speaker.color}` }}>
                <div className="flex items-center gap-2 mb-2">
                  <span>{msg.speaker.emoji}</span>
                  <span className="font-semibold text-sm">{msg.speaker.name}</span>
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{msg.speaker.role}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{msg.text}</p>
              </div>
            ))}
          </div>

          {/* Action Items */}
          <div className="rounded-lg p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Action Items</h3>
              <span className="text-xs" style={{ color: 'var(--accent-green)' }}>🎉 All Tasks Complete 10/10</span>
            </div>
            <div className="flex flex-col gap-2">
              {actionItems.map((item, i) => (
                <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={item.done} readOnly className="accent-[var(--accent-green)]" />
                  <span className={item.done ? 'line-through opacity-60' : ''}>{item.text}</span>
                  <span className="ml-auto text-xs">{item.assignee.emoji}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
