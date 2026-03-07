import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import PageHeader from '../../components/PageHeader'
import { fetchLlmProviders, updateLlmProvider, fetchSecrets } from '../../api/integrations-client'
import type { LlmProvider, LlmProviderStatus, SecretEntry } from '../../types/integrations'

function ProviderStatusBadge({ status }: { status: LlmProviderStatus }) {
  const config: Record<LlmProviderStatus, { color: string; label: string }> = {
    active: { color: 'var(--accent-green)', label: 'Active' },
    inactive: { color: 'var(--accent-gold)', label: 'Inactive' },
    error: { color: 'var(--accent-red)', label: 'Error' },
  }
  const c = config[status] ?? config.inactive
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-medium">
      <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
      <span style={{ color: c.color }}>{c.label}</span>
    </span>
  )
}

const PROVIDER_ICONS: Record<string, string> = {
  anthropic: '🧠', openai: '🤖', google: '🔮', custom: '⚙️',
}

export default function LlmProviders() {
  const [providers, setProviders] = useState<LlmProvider[]>([])
  const [secrets, setSecrets] = useState<SecretEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = async () => {
    try {
      const [provs, secs] = await Promise.all([fetchLlmProviders(), fetchSecrets()])
      setProviders(provs)
      setSecrets(secs)
    } catch { /* empty */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const selected = providers.find(p => p.id === selectedId)

  const handleLinkKey = async (providerId: string, secretId: string) => {
    await updateLlmProvider(providerId, {
      api_key_secret_id: secretId || null,
      status: secretId ? 'active' : 'inactive',
    } as Partial<LlmProvider>)
    load()
  }

  const handleToggleModel = async (providerId: string, modelId: string) => {
    const provider = providers.find(p => p.id === providerId)
    if (!provider) return
    const models = provider.models.map(m =>
      m.id === modelId ? { ...m, enabled: !m.enabled } : m
    )
    await updateLlmProvider(providerId, { models } as Partial<LlmProvider>)
    load()
  }

  const handleSetDefault = async (providerId: string, modelId: string) => {
    const provider = providers.find(p => p.id === providerId)
    if (!provider) return
    const models = provider.models.map(m => ({ ...m, is_default: m.id === modelId }))
    await updateLlmProvider(providerId, { models } as Partial<LlmProvider>)
    load()
  }

  const totalModels = providers.reduce((sum, p) => sum + p.models.filter(m => m.enabled).length, 0)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="page-container">
      <PageHeader title="LLM Providers" subtitle={`${providers.filter(p => p.status === 'active').length} active providers · ${totalModels} models enabled`} />

      {loading ? (
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      ) : (
        <div className="flex gap-6">
          {/* Provider cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            {providers.map(provider => (
              <div
                key={provider.id}
                onClick={() => setSelectedId(provider.id === selectedId ? null : provider.id)}
                className="rounded-lg p-5 cursor-pointer transition-all"
                style={{
                  background: provider.id === selectedId ? 'var(--bg-3)' : 'var(--bg-2)',
                  border: `1px solid ${provider.id === selectedId ? 'var(--accent-teal)' : 'var(--border-divider)'}`,
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{PROVIDER_ICONS[provider.provider] ?? '⚙️'}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{provider.name}</div>
                    <ProviderStatusBadge status={provider.status} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {provider.models.filter(m => m.enabled).length} / {provider.models.length} models
                  </span>
                  {provider.models.find(m => m.is_default) && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-teal)22', color: 'var(--accent-teal)' }}>
                      Default: {provider.models.find(m => m.is_default)?.name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Config panel */}
          {selected && (
            <div className="w-80 shrink-0 rounded-lg p-5" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{PROVIDER_ICONS[selected.provider] ?? '⚙️'}</span>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{selected.name}</div>
              </div>

              <div className="text-xs font-medium mb-2" style={{ color: 'var(--accent-teal)' }}>API Key</div>
              <select
                value={selected.api_key_secret_id ?? ''}
                onChange={e => handleLinkKey(selected.id, e.target.value)}
                className="w-full px-2 py-1.5 rounded text-xs mb-4"
                style={{ background: 'var(--bg-3)', border: '1px solid var(--border-divider)', color: 'var(--text-primary)', outline: 'none' }}
              >
                <option value="">No API key linked</option>
                {secrets.map(s => <option key={s.id} value={s.id}>{s.name} ({s.hint})</option>)}
              </select>

              {selected.base_url && (
                <div className="mb-4">
                  <div className="text-xs font-medium mb-1" style={{ color: 'var(--accent-teal)' }}>Base URL</div>
                  <div className="text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-3)', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {selected.base_url}
                  </div>
                </div>
              )}

              <div className="text-xs font-medium mb-2" style={{ color: 'var(--accent-teal)' }}>Models</div>
              <div className="flex flex-col gap-1.5">
                {selected.models.map(model => (
                  <div key={model.id} className="flex items-center justify-between p-2 rounded" style={{ background: 'var(--bg-3)' }}>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={model.enabled}
                        onChange={() => handleToggleModel(selected.id, model.id)}
                        style={{ accentColor: 'var(--accent-teal)' }}
                      />
                      <span className="text-xs" style={{ color: model.enabled ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{model.name}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSetDefault(selected.id, model.id) }}
                      className="text-[10px] px-1.5 py-0.5 rounded cursor-pointer"
                      style={{
                        background: model.is_default ? 'var(--accent-teal)' : 'transparent',
                        color: model.is_default ? 'var(--bg-primary)' : 'var(--text-secondary)',
                        border: model.is_default ? 'none' : '1px solid var(--border-divider)',
                      }}
                    >
                      {model.is_default ? 'Default' : 'Set Default'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
