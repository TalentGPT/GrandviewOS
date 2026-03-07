import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import PageHeader from '../../components/PageHeader'
import { useToast } from '../../components/Toast'
import { fetchAgentPermissions, updateAgentPermissions, fetchIntegrations, syncAgentTools, syncAllAgents, fetchSyncState } from '../../api/integrations-client'
import type { AgentPermissions as AgentPermsType, IntegrationEntry } from '../../types/integrations'
import type { ApiAgent } from '../../types/api'

export default function AgentPermissions() {
  const [permissions, setPermissions] = useState<AgentPermsType[]>([])
  const [integrations, setIntegrations] = useState<IntegrationEntry[]>([])
  const [agents, setAgents] = useState<ApiAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [editAgent, setEditAgent] = useState<AgentPermsType | null>(null)
  const [editForm, setEditForm] = useState({ integrations: '', tools: '', models: '' })
  const [syncState, setSyncState] = useState<Record<string, { lastSync: string; status: string }>>({})
  const [syncing, setSyncing] = useState<Record<string, boolean>>({})
  const [syncingAll, setSyncingAll] = useState(false)
  const { addToast } = useToast()

  const load = async () => {
    try {
      const [perms, ints, agts, state] = await Promise.all([
        fetchAgentPermissions(), fetchIntegrations(),
        (await import('../../api/client')).fetchAgents().then(r => r.data ?? []),
        fetchSyncState().catch(() => ({ agents: {} })),
      ])
      setPermissions(perms)
      setIntegrations(ints)
      setAgents(agts)
      setSyncState(state.agents)
    } catch { /* empty */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openEdit = (perm: AgentPermsType) => {
    setEditAgent(perm)
    setEditForm({
      integrations: perm.allowed_integrations.join(', '),
      tools: perm.allowed_tools.join(', '),
      models: perm.allowed_models.join(', '),
    })
  }

  const handleSave = async () => {
    if (!editAgent) return
    await updateAgentPermissions(editAgent.agent_id, {
      allowed_integrations: editForm.integrations.split(',').map(s => s.trim()).filter(Boolean),
      allowed_tools: editForm.tools.split(',').map(s => s.trim()).filter(Boolean),
      allowed_models: editForm.models.split(',').map(s => s.trim()).filter(Boolean),
    })
    addToast('Agent tools synced')
    setEditAgent(null)
    load()
  }

  const handleInitAgent = async (agent: ApiAgent) => {
    await updateAgentPermissions(agent.id, {
      agent_name: agent.name,
      allowed_integrations: ['*'],
      allowed_tools: ['*'],
      allowed_models: ['*'],
    })
    addToast('Agent tools synced')
    load()
  }

  const handleSync = async (agentId: string) => {
    setSyncing(s => ({ ...s, [agentId]: true }))
    try {
      const result = await syncAgentTools(agentId)
      if (result.ok) {
        addToast(`${agentId} synced ✓`)
      } else {
        addToast(`Sync failed: ${result.error}`, 'error')
      }
      const state = await fetchSyncState().catch(() => ({ agents: {} }))
      setSyncState(state.agents)
    } catch {
      addToast('Sync failed', 'error')
    }
    setSyncing(s => ({ ...s, [agentId]: false }))
  }

  const handleSyncAll = async () => {
    setSyncingAll(true)
    try {
      const result = await syncAllAgents()
      addToast(`Synced ${result.synced} agents${result.errors ? `, ${result.errors} errors` : ''}`)
      const state = await fetchSyncState().catch(() => ({ agents: {} }))
      setSyncState(state.agents)
    } catch {
      addToast('Sync all failed', 'error')
    }
    setSyncingAll(false)
  }

  const intIds = integrations.map(i => i.id)

  const hasPermission = (agentId: string, intId: string): boolean => {
    const perm = permissions.find(p => p.agent_id === agentId)
    if (!perm) return false
    return perm.allowed_integrations.includes('*') || perm.allowed_integrations.includes(intId) ||
      perm.allowed_integrations.includes(integrations.find(i => i.id === intId)?.type ?? '')
  }

  const formatSyncTime = (iso: string): string => {
    try {
      const d = new Date(iso)
      const now = Date.now()
      const diff = now - d.getTime()
      if (diff < 60000) return 'just now'
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
      return d.toLocaleDateString()
    } catch { return 'unknown' }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="page-container">
      <PageHeader title="Agent Permissions" subtitle="Control which agents can access integrations, tools, and models" />

      {/* Sync All button */}
      {permissions.length > 0 && (
        <div className="flex justify-end mb-4">
          <button onClick={handleSyncAll} disabled={syncingAll}
            className="px-4 py-2 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-50"
            style={{ background: 'var(--accent-teal)', color: 'var(--bg-primary)', border: 'none' }}>
            {syncingAll ? 'Syncing...' : '⟳ Sync All Agents'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      ) : (
        <>
          {/* Permission Matrix */}
          {intIds.length > 0 && permissions.length > 0 && (
            <div className="mb-8 overflow-x-auto">
              <div className="text-xs font-medium mb-3" style={{ color: 'var(--accent-teal)' }}>Permission Matrix</div>
              <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th className="text-left p-2" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-divider)' }}>Agent</th>
                    {integrations.slice(0, 8).map(int => (
                      <th key={int.id} className="text-center p-2" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-divider)' }}>
                        <span title={int.name}>{int.icon}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissions.map(perm => (
                    <tr key={perm.agent_id}>
                      <td className="p-2" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-divider)' }}>
                        {perm.agent_name || perm.agent_id}
                      </td>
                      {integrations.slice(0, 8).map(int => (
                        <td key={int.id} className="text-center p-2" style={{ borderBottom: '1px solid var(--border-divider)' }}>
                          <span style={{ color: hasPermission(perm.agent_id, int.id) ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                            {hasPermission(perm.agent_id, int.id) ? '✓' : '✗'}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Agent list */}
          <div className="text-xs font-medium mb-3" style={{ color: 'var(--accent-teal)' }}>Agent Permissions</div>
          {permissions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>No agent permissions configured yet.</div>
              <div className="flex flex-wrap gap-2 justify-center">
                {agents.map(agent => (
                  <button key={agent.id} onClick={() => handleInitAgent(agent)}
                    className="px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                    style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)' }}>
                    Initialize {agent.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {permissions.map(perm => {
                const agentSync = syncState[perm.agent_id]
                return (
                  <div key={perm.agent_id} className="flex items-center justify-between p-4 rounded-lg"
                    style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{perm.agent_name || perm.agent_id}</span>
                        {agentSync && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                            background: agentSync.status === 'ok' ? 'var(--accent-green)22' : 'var(--accent-red)22',
                            color: agentSync.status === 'ok' ? 'var(--accent-green)' : 'var(--accent-red)',
                          }}>
                            {agentSync.status === 'ok' ? '✓' : '✗'} synced {formatSyncTime(agentSync.lastSync)}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {perm.allowed_integrations.slice(0, 5).map(i => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-teal)22', color: 'var(--accent-teal)' }}>{i}</span>
                        ))}
                        {perm.allowed_tools.includes('*') && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-green)22', color: 'var(--accent-green)' }}>All tools</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSync(perm.agent_id)} disabled={syncing[perm.agent_id]}
                        className="text-xs px-3 py-1.5 rounded cursor-pointer disabled:opacity-50"
                        style={{ background: 'var(--accent-teal)22', color: 'var(--accent-teal)', border: '1px solid var(--accent-teal)44' }}>
                        {syncing[perm.agent_id] ? '...' : '⟳ Sync'}
                      </button>
                      <button onClick={() => openEdit(perm)} className="text-xs px-3 py-1.5 rounded cursor-pointer"
                        style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)' }}>
                        Edit
                      </button>
                    </div>
                  </div>
                )
              })}
              {agents.filter(a => !permissions.find(p => p.agent_id === a.id)).map(agent => (
                <button key={agent.id} onClick={() => handleInitAgent(agent)}
                  className="flex items-center justify-center p-3 rounded-lg text-xs cursor-pointer"
                  style={{ background: 'var(--bg-2)', border: '1px dashed var(--border-divider)', color: 'var(--text-secondary)' }}>
                  + Initialize permissions for {agent.name}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {editAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-xl p-6 w-full max-w-lg" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
            <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Edit Permissions — {editAgent.agent_name || editAgent.agent_id}
            </h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                  Allowed Integrations <span style={{ color: 'var(--text-secondary)' }}>(comma-separated, * for all)</span>
                </label>
                <input type="text" value={editForm.integrations} onChange={e => setEditForm(f => ({ ...f, integrations: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm" placeholder="*, github, slack"
                  style={{ background: 'var(--bg-3)', border: '1px solid var(--border-divider)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'var(--font-mono)' }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                  Allowed Tools <span style={{ color: 'var(--text-secondary)' }}>(wildcard: github.*)</span>
                </label>
                <input type="text" value={editForm.tools} onChange={e => setEditForm(f => ({ ...f, tools: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm" placeholder="*, github.*, slack.send"
                  style={{ background: 'var(--bg-3)', border: '1px solid var(--border-divider)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'var(--font-mono)' }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                  Allowed Models <span style={{ color: 'var(--text-secondary)' }}>(comma-separated)</span>
                </label>
                <input type="text" value={editForm.models} onChange={e => setEditForm(f => ({ ...f, models: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm" placeholder="*, claude-opus-4-6, gpt-4o"
                  style={{ background: 'var(--bg-3)', border: '1px solid var(--border-divider)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'var(--font-mono)' }} />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setEditAgent(null)} className="px-4 py-2 rounded-lg text-sm cursor-pointer" style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)', border: 'none' }}>Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer" style={{ background: 'var(--accent-teal)', color: 'var(--bg-primary)', border: 'none' }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
