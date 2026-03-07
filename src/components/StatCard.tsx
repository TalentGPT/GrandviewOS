interface StatCardProps {
  label: string
  value: string | number
  color?: string
  icon?: string
}

export default function StatCard({ label, value, color = 'var(--accent-teal)', icon }: StatCardProps) {
  return (
    <div className="rounded-lg p-4 flex-1 min-w-[140px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}>
      <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
        {icon && <span className="mr-1">{icon}</span>}{label}
      </div>
      <div className="text-2xl font-bold" style={{ color, fontFamily: 'var(--font-mono)' }}>
        {value}
      </div>
    </div>
  )
}
