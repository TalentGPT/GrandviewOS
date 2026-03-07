import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import PageHeader from '../../components/PageHeader'
import { fetchIntegrations, fetchSecrets, updateIntegration, testIntegration, createIntegration, deleteIntegration } from '../../api/integrations-client'
import type { IntegrationEntry, IntegrationStatus, SecretEntry } from '../../types/integrations'

function StatusBadge({ status }: { status: IntegrationStatus }) {
  const config: Record<IntegrationStatus, { color: string; label: string }> = {
    connected: { color: 'var(--accent-green)', label: 'Connected' },
    disconnected: { color: 'var(--accent-red)', label: 'Disconnected' },
    needs_config: { color: 'var(--accent-gold)', label: 'Needs Config' },
  }
  const c = config[status] ?? config.disconnected
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-medium">
      <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
      <span style={{ color: c.color }}>{c.label}</span>
    </span>
  )
}

export default function IntegrationsOverview() {
  const [integrations, setIntegrations] = useState<IntegrationEntry[]>([])
  const [secrets, setSecrets] = useState<SecretEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [customForm, setCustomForm] = useState({ name: '', type: '', auth_method: 'api_key' })
  const [testing, setTesting] = useState<string | null>(null)

  const load = async () => {
    try {
      const [ints, secs] = await Promise.all([fetchIntegrations(), fetchSecrets()])
      setIntegrations(ints)
      setSecrets(secs)
    } catch { /* empty */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const selected = integrations.find(i => i.id === selectedId)

  const handleSecretMap = async (integrationId: string, field: string, secretId: string) => {
    const int = integrations.find(i => i.id === integrationId)
    if (!int) return
    const configured = { ...int.configured_secrets, [field]: secretId }
    await updateIntegration(integrationId, { configured_secrets: configured })
    load()
  }

  const handleTest = async (id: string) => {
    setTesting(id)
    try { await testIntegration(id) } catch { /* empty */ }
    await load()
    setTesting(null)
  }

  const handleAddCustom = async () => {
    if (!customForm.name) return
    await createIntegration({ name: customForm.name, type: customForm.type || 'custom', auth_method: customForm.auth_method, icon: '🔌' })
    setShowAddCustom(false)
    setCustomForm({ name: '', type: '', auth_method: 'api_key' })
    load()
  }

  const handleDelete = async (id: string) => {
    await deleteIntegration(id)
    setSelectedId(null)
    load()
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="page-container">
      <PageHeader title="Integrations" subtitle="Connect external services, APIs, and tools">
        <button
          onClick={() => setShowAddCustom(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all"
          style={{ background: 'var(--accent-teal)', color: 'var(--bg-primary)', border: 'none' }}
        >
          + Custom Integration
        </button>
      </PageHeader>

      {loading ? (
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      ) : (
        <div className="flex gap-6">
          {/* Grid */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${selected ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-3 flex-1`}>
            {integrations.map(int => (
              <div
                key={int.id}
                onClick={() => setSelectedId(int.id === selectedId ? null : int.id)}
                className="rounded-lg p-4 cursor-pointer transition-all"
                style={{
                  background: int.id === selectedId ? 'var(--bg-3)' : 'var(--bg-2)',
                  border: `1px solid ${int.id === selectedId ? 'var(--accent-teal)' : 'var(--border-divider)'}`,
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{int.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{int.name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{int.type}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <StatusBadge status={int.status} />
                  {int.last_used && (
                    <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                      Used {new Date(int.last_used).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Config Panel */}
          {selected && (
            <div className="w-80 shrink-0 rounded-lg p-5" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{selected.icon}</span>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{selected.name}</div>
                  <StatusBadge status={selected.status} />
                </div>
              </div>

              <div className="text-xs font-medium mb-2" style={{ color: 'var(--accent-teal)' }}>Required Secrets</div>
              {selected.required_secrets.length === 0 ? (
                <div className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>No secrets required</div>
              ) : (
                <div className="flex flex-col gap-2 mb-4">
                  {selected.required_secrets.map(field => (
                    <div key={field}>
                      <label className="text-[10px] block mb-1" style={{ color: 'var(--text-secondary)' }}>{field}</label>
                      <select
                        value={selected.configured_secrets[field] ?? ''}
                        onChange={e => handleSecretMap(selected.id, field, e.target.value)}
                        className="w-full px-2 py-1.5 rounded text-xs"
                        style={{ background: 'var(--bg-3)', border: '1px solid var(--border-divider)', color: 'var(--text-primary)', outline: 'none' }}
                      >
                        <option value="">Select secret...</option>
                        {secrets.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.hint})</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleTest(selected.id)}
                  disabled={testing === selected.id}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer"
                  style={{ background: 'var(--accent-teal)22', color: 'var(--accent-teal)', border: 'none' }}
                >
                  {testing === selected.id ? 'Testing...' : 'Test Connection'}
                </button>
                {selected.is_custom && (
                  <button
                    onClick={() => handleDelete(selected.id)}
                    className="px-3 py-2 rounded-lg text-xs cursor-pointer"
                    style={{ background: 'var(--accent-red)22', color: 'var(--accent-red)', border: 'none' }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Custom Modal */}
      {showAddCustom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-xl p-6 w-full max-w-md" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
            <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Add Custom Integration</h3>
            <div className="flex flex-col gap-3">
              <input type="text" value={customForm.name} onChange={e => setCustomForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Integration name" className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-3)', border: '1px solid var(--border-divider)', color: 'var(--text-primary)', outline: 'none' }} />
              <input type="text" value={customForm.type} onChange={e => setCustomForm(f => ({ ...f, type: e.target.value }))}
                placeholder="Type (e.g. webhook, api)" className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-3)', border: '1px solid var(--border-divider)', color: 'var(--text-primary)', outline: 'none' }} />
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setShowAddCustom(false)} className="px-4 py-2 rounded-lg text-sm cursor-pointer" style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)', border: 'none' }}>Cancel</button>
              <button onClick={handleAddCustom} className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer" style={{ background: 'var(--accent-teal)', color: 'var(--bg-primary)', border: 'none' }}>Add</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
