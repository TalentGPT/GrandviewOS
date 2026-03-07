import { useState } from 'react'
import { register, setStoredToken } from '../api/client'

interface RegisterProps {
  onAuthenticated: () => void
  onSwitchToLogin: () => void
}

export default function Register({ onAuthenticated, onSwitchToLogin }: RegisterProps) {
  const [tenantName, setTenantName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantName.trim() || !email.trim() || !password.trim()) return
    setLoading(true)
    setError('')

    const result = await register(tenantName.trim(), email.trim(), password, name.trim() || undefined)
    if (result) {
      setStoredToken(result.token)
      onAuthenticated()
    } else {
      setError('Registration failed. Tenant may already exist.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md p-8 rounded-xl" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🐕</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>GrandviewOS</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Create your workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Organization Name</label>
            <input type="text" value={tenantName} onChange={e => setTenantName(e.target.value)} placeholder="Grandview Tek"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-divider)', color: 'var(--text-primary)' }} autoFocus />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Your Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Admin"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-divider)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-divider)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-divider)', color: 'var(--text-primary)' }} />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button type="submit" disabled={loading || !tenantName.trim() || !email.trim() || !password.trim()}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity"
            style={{ background: 'var(--accent-primary)', color: '#000', opacity: loading ? 0.5 : 1 }}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        <p className="text-xs mt-6 text-center" style={{ color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <button onClick={onSwitchToLogin} className="underline" style={{ color: 'var(--accent-primary)' }}>Sign In</button>
        </p>
      </div>
    </div>
  )
}
