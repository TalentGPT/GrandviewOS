interface StatCardProps {
  label: string
  value: string | number
  color?: string
  icon?: string
}

export default function StatCard({ label, value, color = 'var(--accent-teal)' }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={{ color }}>
        {value}
      </div>
      <div className="stat-label">
        {label}
      </div>
    </div>
  )
}
