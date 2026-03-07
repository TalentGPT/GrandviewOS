import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  count?: number
  children?: ReactNode
}

export default function SectionHeader({ title, count, children }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      {count !== undefined && <span className="count-badge">{count}</span>}
      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </div>
  )
}
