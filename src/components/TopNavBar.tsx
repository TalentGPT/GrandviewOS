import { NavLink, useLocation } from 'react-router-dom'

interface TabDef {
  label: string
  path: string
  color: string
}

const modules: { label: string; prefix: string; color: string; tabs: TabDef[] }[] = [
  {
    label: 'Ops', prefix: '/ops', color: 'var(--accent-teal)',
    tabs: [
      { label: 'Task Manager', path: '/ops/task-manager', color: '#00BCD4' },
      { label: 'Org Chart', path: '/ops/org-chart', color: '#FFD700' },
      { label: 'Standup', path: '/ops/standup', color: '#FF9800' },
      { label: 'Workspaces', path: '/ops/workspaces', color: '#FF9800' },
      { label: 'Docs', path: '/ops/docs', color: '#00BCD4' },
      { label: 'Settings', path: '/ops/settings', color: '#8b949e' },
    ],
  },
  {
    label: 'Brain', prefix: '/brain', color: 'var(--accent-purple)',
    tabs: [
      { label: 'Memory Viewer', path: '/brain/memory', color: 'var(--accent-purple)' },
      { label: 'Daily Briefs', path: '/brain/briefs', color: 'var(--accent-purple)' },
      { label: 'Automations', path: '/brain/automations', color: 'var(--accent-purple)' },
      { label: 'Project Tracking', path: '/brain/projects', color: 'var(--accent-purple)' },
    ],
  },
  {
    label: 'Lab', prefix: '/lab', color: 'var(--accent-green)',
    tabs: [
      { label: 'Idea Gallery', path: '/lab/ideas', color: 'var(--accent-green)' },
      { label: 'Prototype Fleet', path: '/lab/prototypes', color: 'var(--accent-green)' },
      { label: 'Weekly Reviews', path: '/lab/reviews', color: 'var(--accent-green)' },
      { label: 'Ideation Logs', path: '/lab/ideation', color: 'var(--accent-green)' },
    ],
  },
]

export default function TopNavBar() {
  const location = useLocation()
  const activeModule = modules.find(m => location.pathname.startsWith(m.prefix)) ?? modules[0]

  return (
    <nav className="border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-divider)' }}>
      {/* Top row: logo + module switcher */}
      <div className="flex items-center px-5 py-2 gap-4">
        <NavLink to="/" className="flex items-center gap-2 mr-4 no-underline">
          <span className="text-lg font-bold" style={{ color: 'var(--accent-teal)' }}>⬡</span>
          <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>GrandviewOS</span>
        </NavLink>

        {/* Module switcher */}
        <div className="flex gap-1 rounded-lg p-0.5" style={{ background: 'var(--bg-hover)' }}>
          {modules.map(m => {
            const isActive = location.pathname.startsWith(m.prefix)
            return (
              <NavLink key={m.prefix} to={m.tabs[0].path} className="no-underline">
                <span
                  className="px-4 py-1.5 rounded-md text-xs font-semibold transition-all inline-block"
                  style={{
                    background: isActive ? m.color + '22' : 'transparent',
                    color: isActive ? m.color : 'var(--text-secondary)',
                    border: isActive ? `1px solid ${m.color}44` : '1px solid transparent',
                  }}
                >
                  {m.label}
                </span>
              </NavLink>
            )
          })}
        </div>
      </div>

      {/* Bottom row: tabs for active module */}
      <div className="flex gap-1 px-5 pb-2">
        {activeModule.tabs.map(tab => (
          <NavLink key={tab.path} to={tab.path} className="no-underline">
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
