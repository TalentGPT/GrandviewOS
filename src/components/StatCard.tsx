interface StatCardProps {
  label: string
  value: string | number
  color?: string
  icon?: string
}

export default function StatCard({ label, value, color = 'var(--accent-teal)' }: StatCardProps) {
  return (
    <div className="rounded-xl p-6 md:p-8 flex-1 min-w-[140px] text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}>
      <div className="text-3xl md:text-4xl lg:text-[48px] font-bold leading-none mb-3" style={{ color, fontFamily: 'var(--font-mono)' }}>
        {value}
      </div>
      <div className="text-xs md:text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </div>
    </div>
  )
}
