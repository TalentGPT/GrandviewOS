import { useState } from 'react'
import { verifyApiKey, setStoredApiKey } from '../api/client'

interface LoginScreenProps {
  onAuthenticated: () => void
}

export default function LoginScreen({ onAuthenticated }: LoginScreenProps) {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!key.trim()) return

    setLoading(true)
    setError('')

    const valid = await verifyApiKey(key.trim())
    if (valid) {
      setStoredApiKey(key.trim())
      onAuthenticated()
    } else {
      setError('Invalid API key')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md p-8 rounded-xl" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🐕</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>GrandviewOS</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Enter your API key to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              API Key
            </label>
            <input
              type="password"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="Enter X-Muddy-Key..."
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-divider)',
                color: 'var(--text-primary)',
              }}
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity"
            style={{
              background: 'var(--accent-primary)',
              color: '#000',
              opacity: loading || !key.trim() ? 0.5 : 1,
            }}
          >
            {loading ? 'Verifying...' : 'Authenticate'}
          </button>
        </form>

        <p className="text-xs mt-6 text-center" style={{ color: 'var(--text-muted)' }}>
          Check your terminal for the API key on first run.
        </p>
      </div>
    </div>
  )
}
