interface StatCardProps {
  label: string
  value: string | number
  color?: string
  icon?: string
}

export default function StatCard({ label, value, color = 'var(--accent-teal)', icon }: StatCardProps) {
  return (
    <div className="rounded-xl p-5 md:p-6 flex-1 min-w-[120px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}>
      <div className="text-2xl md:text-[36px] lg:text-[42px] font-bold leading-tight mb-2" style={{ color, fontFamily: 'var(--font-mono)' }}>
        {value}
      </div>
      <div className="text-xs md:text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        {icon && <span className="mr-1.5">{icon}</span>}{label}
      </div>
    </div>
  )
}
