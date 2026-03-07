import { NavLink } from 'react-router-dom'

const tabs = [
  { label: 'Task Manager', path: '/task-manager', color: '#00BCD4' },
  { label: 'Org Chart', path: '/org-chart', color: '#FFD700' },
  { label: 'Standup', path: '/standup', color: '#FF9800' },
  { label: 'Workspaces', path: '/workspaces', color: '#FF9800' },
  { label: 'Docs', path: '/docs', color: '#00BCD4' },
]

export default function TopNavBar() {
  return (
    <nav className="flex items-center px-5 py-3 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-divider)' }}>
      <NavLink to="/" className="flex items-center gap-2 mr-8 no-underline">
        <span className="text-lg font-bold" style={{ color: 'var(--accent-teal)' }}>⬡</span>
        <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Muddy-OS</span>
      </NavLink>
      <div className="flex gap-1">
        {tabs.map(tab => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className="no-underline"
          >
            {({ isActive }) => (
              <span
                className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                style={{
                  background: isActive ? tab.color + '22' : 'transparent',
                  color: isActive ? tab.color : 'var(--text-secondary)',
                  border: isActive ? `1px solid ${tab.color}44` : '1px solid transparent',
                }}
              >
                {tab.label}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
