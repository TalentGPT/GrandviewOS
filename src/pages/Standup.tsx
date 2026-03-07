import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '../components/Toast'
import PersistentAudioBar from '../components/PersistentAudioBar'
import { standups } from '../data/mockStandups'
import type { StandupMeeting } from '../data/mockStandups'

const ARTIFACT_PREVIEWS: Record<number, { title: string; content: string }> = {
  0: { title: 'Partner Proposals', content: '{\n  "partners": [\n    {"name": "TechCorp", "type": "API Integration", "value": "$2,000/mo"},\n    {"name": "AIFlow", "type": "Co-marketing", "value": "$1,500/mo"},\n    {"name": "DataStream", "type": "Data Pipeline", "value": "$1,000/mo"}\n  ],\n  "status": "proposals_sent",\n  "expectedClose": "2026-03-15"\n}' },
  1: { title: 'SDK Documentation', content: '# Partner SDK v2.0\n\n## Authentication\n```typescript\nconst client = new MuddySDK({\n  apiKey: process.env.PARTNER_KEY,\n  endpoint: "https://api.muddy.os/v1"\n});\n```\n\n## Endpoints\n- POST /sessions - Create agent session\n- GET /sessions/:id - Get session status\n- GET /agents - List available agents' },
  4: { title: 'API Access Config', content: '{\n  "accessLevels": {\n    "partner_basic": {\n      "rateLimit": 100,\n      "models": ["sonnet-4.5"],\n      "maxTokens": 50000\n    },\n    "partner_premium": {\n      "rateLimit": 1000,\n      "models": ["opus-4.6", "codex-5.3"],\n      "maxTokens": 500000\n    }\n  }\n}' },
}

function AudioPlayer({ standup }: { standup: StandupMeeting }) {
  const [segment, setSegment] = useState(1)
  const [playing, setPlaying] = useState(false)
  const speaker = standup.conversation[Math.min(segment - 1, standup.conversation.length - 1)]?.speaker

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg mb-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}>
      <button
        onClick={() => setPlaying(!playing)}
        className="px-3 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
        style={{ background: playing ? 'var(--accent-red)' : 'var(--accent-green)', color: '#000' }}
      >
        {playing ? '⏸ Pause' : '🔊 Play'}
      </button>
      <button onClick={() => setSegment(Math.max(1, segment - 1))} className="text-xs cursor-pointer hover:opacity-70" style={{ color: 'var(--text-secondary)', background: 'none', border: 'none' }}>⏪</button>
      <button onClick={() => setSegment(Math.min(standup.audioSegments, segment + 1))} className="text-xs cursor-pointer hover:opacity-70" style={{ color: 'var(--text-secondary)', background: 'none', border: 'none' }}>⏩</button>
      <span className="text-xs" style={{ color: speaker?.color }}>{speaker?.emoji} {speaker?.name}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-divider)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--accent-green)' }}
          animate={{ width: `${(segment / standup.audioSegments) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{segment}/{standup.audioSegments} — {segment}s/{standup.audioDuration}</span>
    </div>
  )
}

function MeetingView({ standup }: { standup: StandupMeeting }) {
  const { addToast } = useToast()
  const [items, setItems] = useState(standup.actionItems.map(i => ({ ...i })))
  const [selectedDeliverable, setSelectedDeliverable] = useState<number | null>(null)
  const doneCount = items.filter(i => i.done).length
  const allDone = doneCount === items.length

  const toggleItem = (idx: number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, done: !item.done } : item))
    addToast(items[idx].done ? 'Task reopened' : 'Task completed ✓')
  }

  const artifact = selectedDeliverable !== null ? ARTIFACT_PREVIEWS[selectedDeliverable] : null

  return (
    <>
      {/* Meeting card */}
      <div className="rounded-lg p-5 mb-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}>
        <div className="text-base font-semibold mb-1">{standup.title}</div>
        <div className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>📅 {standup.date} — {standup.time}</div>
        <div className="flex gap-2">
          {standup.participants.map(p => (
            <span key={p.name} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: p.color + '22', color: p.color }}>
              {p.emoji} {p.name}
            </span>
          ))}
        </div>
      </div>

      <AudioPlayer standup={standup} />

      {/* Conversation + Deliverables side-by-side */}
      <div className="flex gap-4 mb-6">
        {/* Conversation */}
        <div className="flex-1 flex flex-col gap-4">
          {standup.conversation.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors"
              style={{ background: 'var(--bg-card)', borderLeft: `3px solid ${msg.speaker.color}` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span>{msg.speaker.emoji}</span>
                <span className="font-semibold text-sm">{msg.speaker.name}</span>
                <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{msg.speaker.role}</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{msg.text}</p>
            </motion.div>
          ))}
        </div>

        {/* Artifact Preview Panel */}
        <div className="w-80 shrink-0">
          <div className="rounded-lg p-4 sticky top-0" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}>
            <h4 className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>ARTIFACT PREVIEW</h4>
            {artifact ? (
              <>
                <div className="text-sm font-medium mb-2" style={{ color: 'var(--accent-teal)' }}>{artifact.title}</div>
                <pre className="text-xs p-3 rounded-lg overflow-x-auto" style={{ background: 'var(--bg-primary)', color: 'var(--accent-teal)', fontFamily: 'var(--font-mono)', border: '1px solid var(--border-divider)' }}>
                  {artifact.content}
                </pre>
              </>
            ) : (
              <div className="text-xs text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                Click a deliverable item to preview its artifact
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Items */}
      <div className="rounded-lg p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Deliverables Checklist</h3>
          <span className="text-xs" style={{ color: allDone ? 'var(--accent-green)' : 'var(--accent-teal)' }}>
            {allDone ? '🎉 All Tasks Complete' : `${doneCount}/${items.length} complete`}
          </span>
        </div>

        {allDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-4 rounded-lg text-center"
            style={{ background: 'var(--accent-green)11', border: '1px solid var(--accent-green)33' }}
          >
            <div className="text-2xl mb-1">🎉</div>
            <div className="text-sm font-semibold" style={{ color: 'var(--accent-green)' }}>All Tasks Complete!</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Great work, team. All {items.length} deliverables shipped.</div>
          </motion.div>
        )}

        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <label key={i} className="flex items-center gap-3 text-sm cursor-pointer p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors" onClick={() => setSelectedDeliverable(i)}>
              <span className="text-xs font-medium w-5 text-right" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{i + 1}.</span>
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleItem(i)}
                className="accent-[var(--accent-green)] cursor-pointer"
              />
              <span className={`${item.done ? 'line-through opacity-50' : ''} ${selectedDeliverable === i ? 'font-medium' : ''}`} style={{ color: selectedDeliverable === i ? 'var(--accent-teal)' : 'var(--text-primary)' }}>{item.text}</span>
              <span className="ml-auto text-sm" title={item.assignee.name}>{item.assignee.emoji}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Persistent Audio Bar */}
      <PersistentAudioBar
        visible={true}
        speakerName={standup.conversation[0]?.speaker.name}
        speakerEmoji={standup.conversation[0]?.speaker.emoji}
        totalSegments={standup.audioSegments}
        totalDuration={standup.audioDuration}
      />
    </>
  )
}

export default function Standup() {
  const { addToast } = useToast()
  const [showArchive, setShowArchive] = useState(false)
  const [selectedStandup, setSelectedStandup] = useState(standups[0])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-semibold">Executive Standup</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Kick off meetings with the chiefs and review past transcripts</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowArchive(!showArchive)}
            className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
            style={{ background: showArchive ? 'var(--accent-green)22' : 'var(--bg-hover)', color: showArchive ? 'var(--accent-green)' : 'var(--text-secondary)', border: `1px solid ${showArchive ? 'var(--accent-green)44' : 'var(--border-divider)'}` }}
          >
            {showArchive ? '← Back' : '📂 Meeting Archive'}
          </button>
          <button
            onClick={() => addToast('Standup triggered — agents joining...', 'info')}
            className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
            style={{ background: 'var(--accent-teal)22', color: 'var(--accent-teal)', border: '1px solid var(--accent-teal)44' }}
          >
            + New Standup
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {showArchive ? (
          <motion.div key="archive" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6">
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Meeting Archive</h2>
            <div className="flex flex-col gap-3">
              {standups.map(s => {
                const doneCount = s.actionItems.filter(i => i.done).length
                return (
                  <div
                    key={s.id}
                    onClick={() => { setSelectedStandup(s); setShowArchive(false) }}
                    className="rounded-lg p-4 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold">{s.title}</div>
                        <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>📅 {s.date} — {s.time}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs" style={{ color: doneCount === s.actionItems.length ? 'var(--accent-green)' : 'var(--accent-teal)' }}>
                          {doneCount}/{s.actionItems.length} items
                        </div>
                        <div className="flex gap-1 mt-1">
                          {s.participants.map(p => <span key={p.name} className="text-sm">{p.emoji}</span>)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div key="meeting" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6">
            <MeetingView standup={selectedStandup} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
