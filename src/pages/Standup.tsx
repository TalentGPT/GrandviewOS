import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '../components/Toast'
import { triggerStandup, fetchStandups, fetchStandup, getStandupAudioUrl } from '../api/client'
import { standups as mockStandups } from '../data/mockStandups'
import type { StandupResponse } from '../types/api'
import PageHeader from '../components/PageHeader'
import type { StandupMeeting } from '../data/mockStandups'

// Speaker color map
const SPEAKER_COLORS: Record<string, { color: string; emoji: string }> = {
  'Muddy': { color: 'var(--accent-teal)', emoji: '●' },
  'Elon': { color: '#E53935', emoji: '●' },
  'Gary': { color: '#FF9800', emoji: '●' },
  'Warren': { color: '#7B1FA2', emoji: '●' },
}

function LiveAudioPlayer({ standupId }: { standupId: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(() => {/* ignore */})
    }
    setPlaying(!playing)
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg mb-6" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
      <audio
        ref={audioRef}
        src={getStandupAudioUrl(standupId)}
        onTimeUpdate={() => { if (audioRef.current) setProgress(audioRef.current.currentTime) }}
        onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration) }}
        onEnded={() => setPlaying(false)}
      />
      <button
        onClick={toggle}
        className="px-3 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
        style={{ background: playing ? 'var(--accent-red)' : 'var(--accent-green)', color: '#000' }}
      >
        {playing ? '▮▮ Pause' : '▶ Play'}
      </button>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden cursor-pointer" style={{ background: 'var(--border-divider)' }}
        onClick={(e) => {
          if (!audioRef.current || !duration) return
          const rect = e.currentTarget.getBoundingClientRect()
          const ratio = (e.clientX - rect.left) / rect.width
          audioRef.current.currentTime = ratio * duration
        }}
      >
        <div className="h-full rounded-full" style={{ background: 'var(--accent-green)', width: duration > 0 ? `${(progress / duration) * 100}%` : '0%', transition: 'width 0.3s' }} />
      </div>
      <span className="text-xs shrink-0" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
        {Math.floor(progress)}s / {Math.floor(duration)}s
      </span>
    </div>
  )
}

function LiveMeetingView({ standup }: { standup: StandupResponse }) {
  const { addToast } = useToast()
  const [items, setItems] = useState(standup.actionItems.map(i => ({ ...i })))
  const doneCount = items.filter(i => i.done).length
  const allDone = doneCount === items.length

  const toggleItem = (idx: number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, done: !item.done } : item))
    addToast(items[idx].done ? 'Task reopened' : 'Task completed ✓')
  }

  return (
    <>
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
            const info = SPEAKER_COLORS[p.name] ?? { color: 'var(--text-secondary)', emoji: '●' }
            return (
              <span key={p.name} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: info.color + '22', color: info.color }}>
                {info.emoji} {p.name}
              </span>
            )
          })}
        </div>
      </div>

      {standup.status === 'complete' && <LiveAudioPlayer standupId={standup.id} />}

      {standup.status === 'running' && (
        <div className="flex items-center justify-center p-8 rounded-lg mb-6" style={{ background: 'var(--bg-2)', border: '1px solid var(--accent-teal)33' }}>
          <div className="text-center">
            <div className="text-2xl mb-2 animate-pulse">●</div>
            <div className="text-sm font-medium" style={{ color: 'var(--accent-teal)' }}>Standup in progress...</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Generating conversation and TTS audio. This may take 30-60 seconds.</div>
          </div>
        </div>
      )}

      {/* Conversation */}
      <div className="flex flex-col gap-4 mb-6">
        {standup.conversation.map((msg, i) => {
          const info = SPEAKER_COLORS[msg.speaker] ?? { color: 'var(--text-secondary)', emoji: '●' }
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 rounded-lg"
              style={{ background: 'var(--bg-2)', borderLeft: `3px solid ${info.color}` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: info.color }} />
                <span className="font-semibold text-sm">{msg.speaker}</span>
                <span className="badge" style={{ background: info.color + '18', color: info.color }}>{msg.speaker === 'Muddy' ? 'COO' : 'Chief'}</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{msg.text}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Action Items */}
      {standup.actionItems.length > 0 && (
        <div className="rounded-lg p-5" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Action Items</h3>
            <span className="text-xs" style={{ color: allDone ? 'var(--accent-green)' : 'var(--accent-teal)' }}>
              {allDone ? '🎉 All Complete' : `${doneCount}/${items.length} complete`}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {items.map((item, i) => {
              const info = SPEAKER_COLORS[item.assignee] ?? { color: 'var(--text-secondary)', emoji: '●' }
              return (
                <label key={i} className="flex items-center gap-3 text-sm cursor-pointer p-1.5 rounded hover:bg-[var(--bg-3)] transition-colors">
                  <input type="checkbox" checked={item.done} onChange={() => toggleItem(i)} className="accent-[var(--accent-green)] cursor-pointer" />
                  <span className={item.done ? 'line-through opacity-50' : ''}>{item.text}</span>
                  <span className="ml-auto text-sm" title={item.assignee}>{info.emoji}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}

function MockMeetingView({ standup }: { standup: StandupMeeting }) {
  const { addToast } = useToast()
  const [items, setItems] = useState(standup.actionItems.map(i => ({ ...i })))
  const doneCount = items.filter(i => i.done).length
  const allDone = doneCount === items.length

  const toggleItem = (idx: number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, done: !item.done } : item))
    addToast(items[idx].done ? 'Task reopened' : 'Task completed ✓')
  }

  return (
    <>
      <div className="rounded-lg p-5 mb-6" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
        <div className="text-base font-semibold mb-1">{standup.title}</div>
        <div className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>{standup.date} — {standup.time}</div>
        <div className="flex gap-2">
          {standup.participants.map(p => (
            <span key={p.name} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: p.color + '22', color: p.color }}>
              {p.emoji} {p.name}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        {standup.conversation.map((msg, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="p-4 rounded-lg" style={{ background: 'var(--bg-2)', borderLeft: `3px solid ${msg.speaker.color}` }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: msg.speaker.color }} />
              <span className="font-semibold text-sm">{msg.speaker.name}</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{msg.text}</p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-lg p-5" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Deliverables Checklist</h3>
          <span className="text-xs" style={{ color: allDone ? 'var(--accent-green)' : 'var(--accent-teal)' }}>
            {allDone ? '🎉 All Complete' : `${doneCount}/${items.length} complete`}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <label key={i} className="flex items-center gap-3 text-sm cursor-pointer p-1.5 rounded hover:bg-[var(--bg-3)]">
              <input type="checkbox" checked={item.done} onChange={() => toggleItem(i)} className="accent-[var(--accent-green)] cursor-pointer" />
              <span className={item.done ? 'line-through opacity-50' : ''}>{item.text}</span>
              <span className="ml-auto text-sm" title={item.assignee.name}>{item.assignee.emoji}</span>
            </label>
          ))}
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
    if (!data) {
      setTriggering(false)
      return
    }

    // Poll for completion
    const standupId = data.id
    const poll = setInterval(async () => {
      const { data: standup } = await fetchStandup(standupId)
      if (standup && standup.status !== 'running') {
        clearInterval(poll)
        setTriggering(false)
        setLiveStandups(prev => [standup, ...prev])
        setSelectedLiveStandup(standup)
        setDataSource('live')
        if (standup.status === 'complete') {
          addToast('Standup complete! 🎉')
        } else {
          addToast('Standup finished with errors', 'error')
        }
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
          className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer hover:opacity-80"
          style={{ background: showArchive ? 'var(--accent-green)22' : 'var(--bg-3)', color: showArchive ? 'var(--accent-green)' : 'var(--text-secondary)', border: `1px solid ${showArchive ? 'var(--accent-green)44' : 'var(--border-divider)'}` }}>
          {showArchive ? '← Back' : 'Archive'}
        </button>
        <button onClick={handleTriggerStandup} disabled={triggering}
          className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer hover:opacity-80 disabled:opacity-50"
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
                    <div className="text-right">
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
                        background: s.status === 'complete' ? 'var(--accent-green)22' : 'var(--accent-teal)22',
                        color: s.status === 'complete' ? 'var(--accent-green)' : 'var(--accent-teal)',
                      }}>{s.status}</span>
                    </div>
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
                    <div className="flex gap-1 mt-1">
                      {s.participants.map(p => <span key={p.name} className="text-sm">{p.emoji}</span>)}
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
