import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '../components/Toast'
import { triggerStandup, fetchStandups, fetchStandup, getStandupAudioUrl } from '../api/client'
import { standups as mockStandups } from '../data/mockStandups'
import type { StandupResponse } from '../types/api'
import PageHeader from '../components/PageHeader'
import type { StandupMeeting } from '../data/mockStandups'

const SPEAKER_COLORS: Record<string, { color: string; role: string }> = {
  'Ray Dalio': { color: 'var(--accent-teal)', role: 'COO' },
  'Elon': { color: '#E53935', role: 'CTO' },
  'Gary': { color: '#FF9800', role: 'CMO' },
  'Ray Lane': { color: '#7B1FA2', role: 'CRO' },
}

function LiveAudioPlayer({ standupId }: { standupId: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) audioRef.current.pause()
    else audioRef.current.play().catch(() => {})
    setPlaying(!playing)
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-4 px-6 py-3"
      style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--border-divider)', backdropFilter: 'blur(12px)' }}>
      <audio
        ref={audioRef}
        src={getStandupAudioUrl(standupId)}
        onTimeUpdate={() => { if (audioRef.current) setProgress(audioRef.current.currentTime) }}
        onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration) }}
        onEnded={() => setPlaying(false)}
      />
      <button onClick={toggle}
        className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer shrink-0 hover:opacity-80 transition-opacity"
        style={{ background: playing ? 'var(--accent-red)' : 'var(--accent-green)', color: '#000', border: 'none' }}>
        <span className="text-xs font-bold">{playing ? '||' : '\u25B6'}</span>
      </button>
      <div className="flex-1 h-1 rounded-full overflow-hidden cursor-pointer" style={{ background: 'var(--border-divider)' }}
        onClick={(e) => {
          if (!audioRef.current || !duration) return
          const rect = e.currentTarget.getBoundingClientRect()
          audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration
        }}>
        <div className="h-full rounded-full" style={{ background: 'var(--accent-green)', width: duration > 0 ? `${(progress / duration) * 100}%` : '0%', transition: 'width 0.3s' }} />
      </div>
      <span className="text-xs shrink-0" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
        {formatTime(progress)} / {formatTime(duration)}
      </span>
    </div>
  )
}

function ConversationBlock({ messages, speakerColors }: {
  messages: Array<{ speaker: string; text: string; color: string; role: string }>
  speakerColors: Record<string, { color: string; role: string }>
}) {
  return (
    <div className="flex flex-col gap-3">
      {messages.map((msg, i) => {
        const info = speakerColors[msg.speaker] ?? { color: 'var(--text-secondary)', role: 'Agent' }
        return (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="p-4 rounded-lg" style={{ background: 'var(--bg-2)', borderLeft: `3px solid ${info.color}` }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: info.color }} />
              <span className="font-semibold text-sm">{msg.speaker}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: info.color + '18', color: info.color }}>{info.role}</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{msg.text}</p>
          </motion.div>
        )
      })}
    </div>
  )
}

function ActionItemsList({ items: initialItems, onToggle }: {
  items: Array<{ text: string; assignee: string; assigneeColor: string; done: boolean }>
  onToggle: (idx: number) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {initialItems.map((item, i) => (
        <label key={i} className="flex items-center gap-3 text-sm cursor-pointer p-2 rounded-md hover:bg-[var(--bg-3)] transition-colors">
          <input type="checkbox" checked={item.done} onChange={() => onToggle(i)}
            className="accent-[var(--accent-green)] cursor-pointer w-4 h-4 shrink-0" />
          <span className={item.done ? 'line-through opacity-50 flex-1' : 'flex-1'}>{item.text}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
            style={{ background: item.assigneeColor + '18', color: item.assigneeColor }}>
            {item.assignee}
          </span>
        </label>
      ))}
    </div>
  )
}

function LiveMeetingView({ standup }: { standup: StandupResponse }) {
  const { addToast } = useToast()
  const [items, setItems] = useState(standup.actionItems.map(i => ({ ...i })))
  const doneCount = items.filter(i => i.done).length

  const toggleItem = (idx: number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, done: !item.done } : item))
    addToast(items[idx].done ? 'Task reopened' : 'Task completed')
  }

  const messages = standup.conversation.map(msg => ({
    speaker: msg.speaker,
    text: msg.text,
    color: (SPEAKER_COLORS[msg.speaker] ?? { color: 'var(--text-secondary)' }).color,
    role: (SPEAKER_COLORS[msg.speaker] ?? { role: 'Agent' }).role,
  }))

  const actionItems = items.map(item => ({
    text: item.text,
    assignee: item.assignee,
    assigneeColor: (SPEAKER_COLORS[item.assignee] ?? { color: 'var(--text-secondary)' }).color,
    done: item.done,
  }))

  return (
    <>
      {/* Meeting header */}
      <div className="rounded-lg p-5 mb-6" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold">{standup.title}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{standup.date} — {standup.time}</div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
            background: standup.status === 'complete' ? 'var(--accent-green)22' : standup.status === 'running' ? 'var(--accent-teal)22' : 'var(--accent-red)22',
            color: standup.status === 'complete' ? 'var(--accent-green)' : standup.status === 'running' ? 'var(--accent-teal)' : 'var(--accent-red)',
          }}>
            {standup.status === 'complete' ? 'Complete' : standup.status === 'running' ? 'Running...' : 'Error'}
          </span>
        </div>
        <div className="flex gap-2 mt-3">
          {standup.participants.map(p => {
            const info = SPEAKER_COLORS[p.name] ?? { color: 'var(--text-secondary)', role: 'Agent' }
            return (
              <span key={p.name} className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: info.color + '22', color: info.color }}>
                {p.name} · {info.role}
              </span>
            )
          })}
        </div>
      </div>

      {standup.status === 'running' && (
        <div className="flex items-center justify-center p-8 rounded-lg mb-6" style={{ background: 'var(--bg-2)', border: '1px solid var(--accent-teal)33' }}>
          <div className="text-center">
            <div className="w-3 h-3 rounded-full mx-auto mb-3 animate-pulse" style={{ background: 'var(--accent-teal)' }} />
            <div className="text-sm font-medium" style={{ color: 'var(--accent-teal)' }}>Standup in progress...</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Generating conversation and TTS audio. This may take 30-60 seconds.</div>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT: Conversation */}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>CONVERSATION</div>
          <ConversationBlock messages={messages} speakerColors={SPEAKER_COLORS} />
        </div>

        {/* RIGHT: Deliverables + Action Items */}
        {standup.actionItems.length > 0 && (
          <div className="w-full lg:w-80 shrink-0">
            <div className="text-xs font-semibold tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>ACTION ITEMS</div>
            <div className="rounded-lg p-4 sticky top-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium" style={{ color: 'var(--accent-teal)' }}>
                  {doneCount}/{items.length} complete
                </span>
                <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-divider)' }}>
                  <div className="h-full rounded-full transition-all" style={{ background: 'var(--accent-green)', width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }} />
                </div>
              </div>
              <ActionItemsList items={actionItems} onToggle={toggleItem} />
            </div>
          </div>
        )}
      </div>

      {standup.status === 'complete' && <LiveAudioPlayer standupId={standup.id} />}
    </>
  )
}

function MockMeetingView({ standup }: { standup: StandupMeeting }) {
  const { addToast } = useToast()
  const [items, setItems] = useState(standup.actionItems.map(i => ({ ...i })))
  const doneCount = items.filter(i => i.done).length

  const toggleItem = (idx: number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, done: !item.done } : item))
    addToast(items[idx].done ? 'Task reopened' : 'Task completed')
  }

  const messages = standup.conversation.map(msg => ({
    speaker: msg.speaker.name,
    text: msg.text,
    color: msg.speaker.color,
    role: msg.speaker.role,
  }))

  const actionItems = items.map(item => ({
    text: item.text,
    assignee: item.assignee.name,
    assigneeColor: item.assignee.color,
    done: item.done,
  }))

  return (
    <>
      {/* Meeting header */}
      <div className="rounded-lg p-5 mb-6" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
        <div className="text-base font-semibold mb-1">{standup.title}</div>
        <div className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>{standup.date} — {standup.time}</div>
        <div className="flex gap-2">
          {standup.participants.map(p => (
            <span key={p.name} className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: p.color + '22', color: p.color }}>
              {p.name} · {p.role}
            </span>
          ))}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT: Conversation */}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>CONVERSATION</div>
          <ConversationBlock messages={messages} speakerColors={
            Object.fromEntries(standup.participants.map(p => [p.name, { color: p.color, role: p.role }]))
          } />
        </div>

        {/* RIGHT: Deliverables + Action Items */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="text-xs font-semibold tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>DELIVERABLES</div>
          <div className="rounded-lg p-4 sticky top-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: 'var(--accent-teal)' }}>
                {doneCount}/{items.length} complete
              </span>
              <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-divider)' }}>
                <div className="h-full rounded-full transition-all" style={{ background: 'var(--accent-green)', width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }} />
              </div>
            </div>
            <ActionItemsList items={actionItems} onToggle={toggleItem} />
          </div>
        </div>
      </div>
    </>
  )
}

export default function Standup() {
  const { addToast } = useToast()
  const [showArchive, setShowArchive] = useState(false)
  const [dataSource, setDataSource] = useState<'live' | 'mock'>('live')
  const [liveStandups, setLiveStandups] = useState<StandupResponse[]>([])
  const [selectedLiveStandup, setSelectedLiveStandup] = useState<StandupResponse | null>(null)
  const [selectedMockStandup, setSelectedMockStandup] = useState(mockStandups[0])
  const [triggering, setTriggering] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await fetchStandups()
      if (data && data.length > 0) {
        setLiveStandups(data)
        setSelectedLiveStandup(data[0])
      } else {
        setDataSource('mock')
      }
    }
    load()
  }, [])

  const handleTriggerStandup = async () => {
    setTriggering(true)
    addToast('Standup triggered — agents joining...', 'info')
    const { data, error } = await triggerStandup()
    if (error) {
      addToast('Failed to trigger standup', 'error')
      setTriggering(false)
      return
    }
    if (!data) { setTriggering(false); return }

    const standupId = data.id
    const poll = setInterval(async () => {
      const { data: standup } = await fetchStandup(standupId)
      if (standup && standup.status !== 'running') {
        clearInterval(poll)
        setTriggering(false)
        setLiveStandups(prev => [standup, ...prev])
        setSelectedLiveStandup(standup)
        setDataSource('live')
        addToast(standup.status === 'complete' ? 'Standup complete' : 'Standup finished with errors', standup.status === 'complete' ? 'success' : 'error')
      }
    }, 3000)
  }

  const showLive = dataSource === 'live' && liveStandups.length > 0

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="max-w-7xl mx-auto w-full">
      <PageHeader title="Voice Standups" subtitle="Kick off meetings with the chiefs and review past transcripts">
        <div className="flex rounded-md overflow-hidden" style={{ border: '1px solid var(--border-divider)' }}>
          <button onClick={() => setDataSource('live')} className="px-3 py-1 text-xs font-medium cursor-pointer transition-colors"
            style={{ background: dataSource === 'live' ? 'var(--accent-teal)22' : 'var(--bg-3)', color: dataSource === 'live' ? 'var(--accent-teal)' : 'var(--text-secondary)', border: 'none' }}>
            Live {liveStandups.length === 0 && '(N/A)'}
          </button>
          <button onClick={() => setDataSource('mock')} className="px-3 py-1 text-xs font-medium cursor-pointer transition-colors"
            style={{ background: dataSource === 'mock' ? 'var(--accent-gold)22' : 'var(--bg-3)', color: dataSource === 'mock' ? 'var(--accent-gold)' : 'var(--text-secondary)', border: 'none' }}>
            Demo
          </button>
        </div>
        <button onClick={() => setShowArchive(!showArchive)}
          className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
          style={{ background: showArchive ? 'var(--accent-green)22' : 'var(--bg-3)', color: showArchive ? 'var(--accent-green)' : 'var(--text-secondary)', border: `1px solid ${showArchive ? 'var(--accent-green)44' : 'var(--border-divider)'}` }}>
          {showArchive ? 'Back' : 'Archive'}
        </button>
        <button onClick={handleTriggerStandup} disabled={triggering}
          className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50"
          style={{ background: 'var(--accent-teal)22', color: 'var(--accent-teal)', border: '1px solid var(--accent-teal)44' }}>
          {triggering ? 'Running...' : '+ New Standup'}
        </button>
      </PageHeader>

      <AnimatePresence mode="wait">
        {showArchive ? (
          <motion.div key="archive" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6">
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Meeting Archive</h2>
            <div className="flex flex-col gap-3">
              {showLive && liveStandups.map(s => (
                <div key={s.id} onClick={() => { setSelectedLiveStandup(s); setShowArchive(false); setDataSource('live') }}
                  className="rounded-lg p-4 cursor-pointer hover:bg-[var(--bg-3)] transition-colors"
                  style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{s.title}</div>
                      <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{s.date} — {s.time}</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
                      background: s.status === 'complete' ? 'var(--accent-green)22' : 'var(--accent-teal)22',
                      color: s.status === 'complete' ? 'var(--accent-green)' : 'var(--accent-teal)',
                    }}>{s.status}</span>
                  </div>
                </div>
              ))}
              {mockStandups.map(s => (
                <div key={s.id} onClick={() => { setSelectedMockStandup(s); setShowArchive(false); setDataSource('mock') }}
                  className="rounded-lg p-4 cursor-pointer hover:bg-[var(--bg-3)] transition-colors"
                  style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{s.title} <span className="text-[10px]" style={{ color: 'var(--accent-gold)' }}>(demo)</span></div>
                      <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{s.date} — {s.time}</div>
                    </div>
                    <div className="flex gap-1">
                      {s.participants.map(p => (
                        <span key={p.name} className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="meeting" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6">
            {showLive && selectedLiveStandup ? (
              <LiveMeetingView standup={selectedLiveStandup} />
            ) : (
              <MockMeetingView standup={selectedMockStandup} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
