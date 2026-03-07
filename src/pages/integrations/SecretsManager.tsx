import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import PageHeader from '../../components/PageHeader'
import { fetchSecrets, createSecret, updateSecret, deleteSecret } from '../../api/integrations-client'
import type { SecretEntry, SecretType } from '../../types/integrations'

const SECRET_TYPES: { value: SecretType; label: string }[] = [
  { value: 'api_key', label: 'API Key' },
  { value: 'ssh_key', label: 'SSH Key' },
  { value: 'oauth_token', label: 'OAuth Token' },
  { value: 'env_var', label: 'Environment Variable' },
  { value: 'certificate', label: 'Certificate' },
]

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    api_key: 'var(--accent-teal)',
    ssh_key: 'var(--accent-purple)',
    oauth_token: 'var(--accent-gold)',
    env_var: 'var(--accent-green)',
    certificate: 'var(--accent-red)',
  }
  const color = colors[type] ?? 'var(--text-secondary)'
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${color}22`, color }}>
      {type.replace('_', ' ')}
    </span>
  )
}

function daysSince(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
}

export default function SecretsManager() {
  const [secrets, setSecrets] = useState<SecretEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', type: 'api_key' as SecretType, value: '' })

  const load = async () => {
    try {
      const data = await fetchSecrets()
      setSecrets(data)
    } catch { /* empty */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!form.name || !form.value) return
    if (editId) {
      await updateSecret(editId, { name: form.name, type: form.type, value: form.value })
    } else {
      await createSecret({ name: form.name, type: form.type, value: form.value })
    }
    setShowModal(false)
    setEditId(null)
    setForm({ name: '', type: 'api_key', value: '' })
    load()
  }

  const handleDelete = async (id: string) => {
    await deleteSecret(id)
    load()
  }

  const handleRotate = (secret: SecretEntry) => {
    setEditId(secret.id)
    setForm({ name: secret.name, type: secret.type as SecretType, value: '' })
    setShowModal(true)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="page-container">
      <PageHeader title="Secrets Manager" subtitle="Encrypted credential vault — values are AES-256-GCM encrypted at rest">
        <button
          onClick={() => { setEditId(null); setForm({ name: '', type: 'api_key', value: '' }); setShowModal(true) }}
          className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all"
          style={{ background: 'var(--accent-teal)', color: 'var(--bg-primary)', border: 'none' }}
        >
          + Add Secret
        </button>
      </PageHeader>

      {loading ? (
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      ) : secrets.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">🔐</div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>No secrets stored yet. Add your first credential.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            <div className="col-span-3">Name</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Value</div>
            <div className="col-span-2">Last Rotated</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>
          {secrets.map(secret => {
            const age = daysSince(secret.last_rotated)
            const ageColor = age > 180 ? 'var(--accent-red)' : age > 90 ? 'var(--accent-gold)' : 'var(--text-secondary)'
            return (
              <div key={secret.id} className="grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-lg" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
                <div className="col-span-3">
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{secret.name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{secret.id}</div>
                </div>
                <div className="col-span-2"><TypeBadge type={secret.type} /></div>
                <div className="col-span-2">
                  <span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-3)', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {secret.hint}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs" style={{ color: ageColor }}>
                    {age === 0 ? 'Today' : `${age}d ago`}
                  </span>
                </div>
                <div className="col-span-3 flex gap-2 justify-end">
                  <button onClick={() => handleRotate(secret)} className="text-xs px-2 py-1 rounded cursor-pointer" style={{ background: 'var(--accent-gold)22', color: 'var(--accent-gold)', border: 'none' }}>
                    Rotate
                  </button>
                  <button onClick={() => handleDelete(secret.id)} className="text-xs px-2 py-1 rounded cursor-pointer" style={{ background: 'var(--accent-red)22', color: 'var(--accent-red)', border: 'none' }}>
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-xl p-6 w-full max-w-md" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
            <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              {editId ? 'Update Secret' : 'Add Secret'}
            </h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Name</label>
                <input
                  type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. GitHub Token"
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg-3)', border: '1px solid var(--border-divider)', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Type</label>
                <select
                  value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as SecretType }))}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg-3)', border: '1px solid var(--border-divider)', color: 'var(--text-primary)', outline: 'none' }}
                >
                  {SECRET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Value</label>
                <input
                  type="password" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  placeholder="Enter secret value"
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg-3)', border: '1px solid var(--border-divider)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'var(--font-mono)' }}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-sm cursor-pointer" style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)', border: 'none' }}>Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer" style={{ background: 'var(--accent-teal)', color: 'var(--bg-primary)', border: 'none' }}>
                {editId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
