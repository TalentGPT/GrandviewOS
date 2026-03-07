import { useState, useEffect } from 'react'
import { fetchSystemHealth } from '../api/client'
import type { SystemHealth } from '../types/api'

export default function StatusBar() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  useEffect(() => {
    const load = async () => {
      const { data } = await fetchSystemHealth()
      if (data) setHealth(data)
      setLastRefresh(new Date())
    }
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [])

  const timeStr = lastRefresh.toLocaleTimeString()

  return (
    <div
      className="flex items-center gap-4 px-4 py-1.5 text-[10px] border-t"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-divider)', color: 'var(--text-secondary)' }}
    >
      {/* Gateway status */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${health?.gatewayRunning ? 'pulse-dot' : ''}`}
          style={{ background: health?.gatewayRunning ? 'var(--accent-green)' : 'var(--accent-red)' }}
        />
        <span style={{ color: health?.gatewayRunning ? 'var(--accent-green)' : 'var(--accent-red)' }}>
          Gateway {health?.gatewayRunning ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Sessions */}
      {health && (
        <>
          <span>|</span>
          <span>
            <span style={{ color: 'var(--accent-teal)' }}>{health.activeSessions}</span> active · {health.totalSessions} total sessions
          </span>
        </>
      )}

      {/* Version */}
      {health?.version && (
        <>
          <span>|</span>
          <span>OpenClaw v{health.version}</span>
        </>
      )}

      <span className="ml-auto">Last refresh: {timeStr}</span>
    </div>
  )
}
