interface StatCardProps {
  label: string
  value: string | number
  color?: string
  icon?: string
}

export default function StatCard({ label, value, color = 'var(--accent-teal)', icon }: StatCardProps) {
  return (
    <div className="rounded-lg p-4 md:p-5 flex-1 min-w-[120px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}>
      <div className="text-xs md:text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
        {icon && <span className="mr-1">{icon}</span>}{label}
      </div>
      <div className="text-xl md:text-2xl lg:text-[28px] font-bold" style={{ color, fontFamily: 'var(--font-mono)' }}>
        {value}
      </div>
    </div>
  )
}
