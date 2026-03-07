import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  live?: boolean
  children?: ReactNode
}

export default function PageHeader({ title, subtitle, live = true, children }: PageHeaderProps) {
  return (
    <div className="mb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-3">
            {live && (
              <span
                className="w-2.5 h-2.5 rounded-full pulse-dot shrink-0"
                style={{ background: 'var(--accent-green)' }}
              />
            )}
            <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h1>
          </div>
          {subtitle && (
            <p className="text-small mt-1" style={{ color: 'var(--text-secondary)', marginLeft: live ? '22px' : 0 }}>
              {subtitle}
            </p>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-3 flex-wrap">
            {children}
          </div>
        )}
      </div>
      <div style={{ borderBottom: '1px solid var(--border-divider)' }} />
    </div>
  )
}
