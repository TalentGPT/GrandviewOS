import { useState } from 'react'
import { motion } from 'framer-motion'

interface Props {
  visible: boolean
  speakerName?: string
  speakerEmoji?: string
  totalSegments?: number
  totalDuration?: string
}

export default function PersistentAudioBar({ visible, speakerName = 'Muddy', speakerEmoji = '🐕', totalSegments = 23, totalDuration = '24s' }: Props) {
  const [playing, setPlaying] = useState(false)
  const [segment, setSegment] = useState(1)
  const elapsed = segment

  if (!visible) return null

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 z-30 flex items-center gap-4 px-6 py-3 border-t"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-divider)', borderTop: '2px solid var(--border-page)' }}
    >
      {/* Skip back */}
      <button onClick={() => setSegment(Math.max(1, segment - 1))} className="text-sm cursor-pointer hover:opacity-70" style={{ color: 'var(--text-secondary)', background: 'none', border: 'none' }}>⏪</button>

      {/* Play/Pause */}
      <button
        onClick={() => setPlaying(!playing)}
        className="px-4 py-1.5 rounded-full text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity"
        style={{ background: playing ? 'var(--accent-red)' : 'var(--accent-green)', color: '#000' }}
      >
        {playing ? '⏸ Pause' : '🔊 Play'}
      </button>

      {/* Skip forward */}
      <button onClick={() => setSegment(Math.min(totalSegments, segment + 1))} className="text-sm cursor-pointer hover:opacity-70" style={{ color: 'var(--text-secondary)', background: 'none', border: 'none' }}>⏩</button>

      {/* Speaker indicator */}
      <div className="flex items-center gap-1.5">
        <span>{speakerEmoji}</span>
        <span className="text-xs font-medium" style={{ color: 'var(--accent-teal)' }}>{speakerName}</span>
      </div>

      {/* Progress bar */}
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-divider)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--accent-green)' }}
          animate={{ width: `${(segment / totalSegments) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Time info */}
      <span className="text-xs shrink-0" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
        {segment}/{totalSegments} — {elapsed}s/{totalDuration}
      </span>
    </motion.div>
  )
}
