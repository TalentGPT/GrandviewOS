import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import PageHeader from '../../components/PageHeader'
import { fetchMcpServers, createMcpServer, deleteMcpServer, fetchMcpTools, fetchSecrets } from '../../api/integrations-client'
import type { McpServer, McpTool, McpAuthType, SecretEntry } from '../../types/integrations'

function McpStatusBadge({ status }: { status: string }) {
  const color = status === 'online' ? 'var(--accent-green)' : status === 'offline' ? 'var(--accent-red)' : 'var(--accent-gold)'
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-medium">
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span style={{ color }}>{status}</span>
    </span>
  )
}

export default function McpServers() {
  const [servers, setServers] = useState<McpServer[]>([])
  const [secrets, setSecrets] = useState<SecretEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', url: '', auth_type: 'none' as McpAuthType, credential_secret_id: '' })
  const [toolsMap, setToolsMap] = useState<Record<string, McpTool[]>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = async () => {
    try {
      const [srvs, secs] = await Promise.all([fetchMcpServers(), fetchSecrets()])
      setServers(srvs)
      setSecrets(secs)
    } catch { /* empty */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!form.name || !form.url) return
    await createMcpServer({
      name: form.name, url: form.url, auth_type: form.auth_type,
      credential_secret_id: form.credential_secret_id || null,
    })
    setShowModal(false)
    setForm({ name: '', url: '', auth_type: 'none', credential_secret_id: '' })
    load()
  }

  const handleDelete = async (id: string) => {
    await deleteMcpServer(id)
    load()
  }

  const handleDiscoverTools = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return }
    try {
      const tools = await fetchMcpTools(id)
      setToolsMap(prev => ({ ...prev, [id]: tools }))
      setExpandedId(id)
    } catch { /* empty */ }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="page-container">
      <PageHeader title="MCP Servers" subtitle="Model Context Protocol servers — external tool providers">
        <button onClick={() => setShowModal(true)} className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
          style={{ background: 'var(--accent-teal)', color: 'var(--bg-primary)', border: 'none' }}>
          + Add MCP Server
        </button>
      </PageHeader>

      {loading ? (
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      ) : servers.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">🔗</div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>No MCP servers configured. Add one to enable external tools.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {servers.map(server => (
            <div key={server.id} className="rounded-lg" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
              <div className="p-4 flex items-center gap-4">
                <div className="text-2xl">🔗</div>
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{server.name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{server.url}</div>
                </div>
                <div className="flex items-center gap-3">
                  <McpStatusBadge status={server.status} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{server.tool_count} tools</span>
                  <button onClick={() => handleDiscoverTools(server.id)} className="text-xs px-2 py-1 rounded cursor-pointer"
                    style={{ background: 'var(--accent-teal)22', color: 'var(--accent-teal)', border: 'none' }}>
                    {expandedId === server.id ? 'Hide Tools' : 'Discover Tools'}
                  </button>
                  <button onClick={() => handleDelete(server.id)} className="text-xs px-2 py-1 rounded cursor-pointer"
                    style={{ background: 'var(--accent-red)22', color: 'var(--accent-red)', border: 'none' }}>
                    Remove
                  </button>
                </div>
              </div>
              {expandedId === server.id && toolsMap[server.id] && (
                <div className="px-4 pb-4 pt-0">
                  <div className="rounded-lg p-3" style={{ background: 'var(--bg-3)' }}>
                    <div className="text-xs font-medium mb-2" style={{ color: 'var(--accent-teal)' }}>Available Tools</div>
                    {toolsMap[server.id].map(tool => (
                      <div key={tool.name} className="flex items-start gap-2 py-1.5" style={{ borderBottom: '1px solid var(--border-divider)' }}>
                        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{tool.name}</span>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{tool.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-xl p-6 w-full max-w-md" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
            <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Add MCP Server</h3>
            <div className="flex flex-col gap-3">
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Server name" className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-3)', border: '1px solid var(--border-divider)', color: 'var(--text-primary)', outline: 'none' }} />
              <input type="text" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="http://localhost:3001" className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-3)', border: '1px solid var(--border-divider)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'var(--font-mono)' }} />
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Auth Type</label>
                <select value={form.auth_type} onChange={e => setForm(f => ({ ...f, auth_type: e.target.value as McpAuthType }))}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg-3)', border: '1px solid var(--border-divider)', color: 'var(--text-primary)', outline: 'none' }}>
                  <option value="none">None</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="api_key">API Key</option>
                </select>
              </div>
              {form.auth_type !== 'none' && (
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Credential (from vault)</label>
                  <select value={form.credential_secret_id} onChange={e => setForm(f => ({ ...f, credential_secret_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--bg-3)', border: '1px solid var(--border-divider)', color: 'var(--text-primary)', outline: 'none' }}>
                    <option value="">Select secret...</option>
                    {secrets.map(s => <option key={s.id} value={s.id}>{s.name} ({s.hint})</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-sm cursor-pointer" style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)', border: 'none' }}>Cancel</button>
              <button onClick={handleAdd} className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer" style={{ background: 'var(--accent-teal)', color: 'var(--bg-primary)', border: 'none' }}>Add Server</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
