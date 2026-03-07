import { useState, useEffect } from 'react'
import { fetchSystemHealth, createEventSource } from '../api/client'
import type { SystemHealth } from '../types/api'

export default function StatusBar() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [wsConnected, setWsConnected] = useState(false)

  useEffect(() => {
    // Initial load
    const load = async () => {
      const { data } = await fetchSystemHealth()
      if (data) setHealth(data)
      setLastRefresh(new Date())
    }
    load()

    // SSE connection
    const es = createEventSource(
      (data) => {
        if (data.type === 'connected') {
          setWsConnected(true)
        }
        if (data.type === 'session:update' && data.health) {
          setHealth(data.health as SystemHealth)
          setLastRefresh(new Date())
        }
      },
      () => {
        setWsConnected(false)
      }
    )

    // Fallback polling if SSE fails
    const interval = setInterval(async () => {
      if (!wsConnected) {
        const { data } = await fetchSystemHealth()
        if (data) setHealth(data)
        setLastRefresh(new Date())
      }
    }, 15000)

    return () => {
      es.close()
      clearInterval(interval)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const timeStr = lastRefresh.toLocaleTimeString()

  return (
    <div
      className="flex items-center gap-4 px-4 py-1.5 text-[10px] border-t"
      style={{ background: 'var(--bg-2)', borderColor: 'var(--border-divider)', color: 'var(--text-secondary)' }}
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

      {/* SSE status */}
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${wsConnected ? 'pulse-dot' : ''}`}
          style={{ background: wsConnected ? 'var(--accent-teal)' : 'var(--text-secondary)' }} />
        <span style={{ color: wsConnected ? 'var(--accent-teal)' : 'var(--text-secondary)' }}>
          {wsConnected ? 'Live' : 'Polling'}
        </span>
      </div>

      {/* Sessions */}
      {health && (
        <>
          <span>|</span>
          <span>
            <span style={{ color: 'var(--accent-teal)' }}>{health.activeSessions}</span> active · {health.totalSessions} total
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
