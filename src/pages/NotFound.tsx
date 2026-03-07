import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function NotFound() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-[calc(100vh-200px)]">
      <div className="text-center">
        <div className="text-6xl mb-4">🐕</div>
        <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--accent-teal)', fontFamily: 'var(--font-mono)' }}>404</h1>
        <p className="text-lg mb-1" style={{ color: 'var(--text-primary)' }}>Page not found</p>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Muddy sniffed around but couldn&apos;t find this page.</p>
        <Link
          to="/ops/task-manager"
          className="inline-block px-4 py-2 rounded-md text-sm font-medium no-underline"
          style={{ background: 'var(--accent-teal)22', color: 'var(--accent-teal)', border: '1px solid var(--accent-teal)44' }}
        >
          ← Back to Dashboard
        </Link>
      </div>
    </motion.div>
  )
}
