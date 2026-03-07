import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { fetchConfig, fetchSystemHealth, fetchAgents } from '../api/client'
import type { SystemHealth, ApiConfig, ApiAgent } from '../types/api'

export default function Settings() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [config, setConfig] = useState<ApiConfig | null>(null)
  const [agents, setAgents] = useState<ApiAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const [h, c, a] = await Promise.all([
        fetchSystemHealth(),
        fetchConfig(),
        fetchAgents(),
      ])
      if (h.data) setHealth(h.data)
      if (c.data) setConfig(c.data)
      if (a.data) setAgents(a.data)
      if (h.error && c.error) setError('Could not connect to OpenClaw API')
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading settings...</div></div>
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="page-container">
      <div className="flex items-center gap-3 mb-8">
        <span className="w-2.5 h-2.5 rounded-full pulse-dot shrink-0" style={{ background: 'var(--accent-green)' }} />
        <h1 className="text-h1">Settings & Configuration</h1>
      </div>

      {error && (
        <div className="rounded-lg p-4 mb-6" style={{ background: 'var(--accent-red)11', border: '1px solid var(--accent-red)33' }}>
          <div className="text-sm" style={{ color: 'var(--accent-red)' }}>⚠ {error}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Showing available data. Some features may use mock data.</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* System Health */}
        <div className="rounded-lg p-5" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--accent-teal)' }}>System Health</h2>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Gateway</span>
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${health?.gatewayRunning ? 'pulse-dot' : ''}`}
                  style={{ background: health?.gatewayRunning ? 'var(--accent-green)' : 'var(--accent-red)' }} />
                <span style={{ color: health?.gatewayRunning ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {health?.gatewayRunning ? 'Running' : 'Stopped'}
                </span>
              </span>
            </div>
            {health?.gatewayPid && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>PID</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{health.gatewayPid}</span>
              </div>
            )}
            {health?.gatewayPort && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Port</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{health.gatewayPort}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Version</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{health?.version ?? 'unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Total Sessions</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{health?.totalSessions ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Active Sessions</span>
              <span style={{ color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>{health?.activeSessions ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Model Config */}
        <div className="rounded-lg p-5" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--accent-teal)' }}>Model Configuration</h2>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Primary Model</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--model-opus)22', color: 'var(--model-opus)' }}>
                {config?.model.primary ?? 'unknown'}
              </span>
            </div>
            {config?.model.fallbacks.map((f, i) => (
              <div key={i} className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Fallback {i + 1}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)' }}>{f}</span>
              </div>
            ))}
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Max Concurrent</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{config?.maxConcurrent ?? 4}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Workspace</span>
              <span className="text-xs truncate max-w-[200px]" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{config?.workspace ?? '~'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Channels */}
        <div className="rounded-lg p-5" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--accent-teal)' }}>Connected Channels</h2>
          {config?.channels && Object.keys(config.channels).length > 0 ? (
            <div className="flex flex-col gap-2">
              {Object.entries(config.channels).map(([name, ch]) => (
                <div key={name} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--bg-3)' }}>
                  <div className="flex items-center gap-2">
                    <span>{name === 'telegram' ? '📱' : name === 'discord' ? '💬' : '🔗'}</span>
                    <span className="text-sm capitalize">{name}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      background: ch.enabled ? 'var(--accent-green)22' : 'var(--accent-red)22',
                      color: ch.enabled ? 'var(--accent-green)' : 'var(--accent-red)',
                    }}>
                    {ch.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>No channels configured</div>
          )}
        </div>

        {/* Agents summary */}
        <div className="rounded-lg p-5" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--accent-teal)' }}>Agents</h2>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>Total Agents</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{agents.length || config?.agentCount || 0}</span>
            </div>
            {agents.map(a => (
              <div key={a.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--bg-3)' }}>
                <span className="text-sm">{a.name}</span>
                <div className="flex gap-1">
                  {a.hasSoul && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-teal)22', color: 'var(--accent-teal)' }}>SOUL</span>}
                  {a.hasMemory && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-green)22', color: 'var(--accent-green)' }}>MEM</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
