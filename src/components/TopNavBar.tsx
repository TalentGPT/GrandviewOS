import { NavLink, useLocation } from 'react-router-dom'

interface TabDef {
  label: string
  path: string
}

const modules: { label: string; prefix: string; color: string; tabs: TabDef[] }[] = [
  {
    label: 'Ops', prefix: '/ops', color: 'var(--accent-teal)',
    tabs: [
      { label: 'Task Manager', path: '/ops/task-manager' },
      { label: 'Org Chart', path: '/ops/org-chart' },
      { label: 'Standup', path: '/ops/standup' },
      { label: 'Workspaces', path: '/ops/workspaces' },
      { label: 'Docs', path: '/ops/docs' },
      { label: 'Settings', path: '/ops/settings' },
    ],
  },
  {
    label: 'Brain', prefix: '/brain', color: 'var(--accent-purple)',
    tabs: [
      { label: 'Memory Viewer', path: '/brain/memory' },
      { label: 'Daily Briefs', path: '/brain/briefs' },
      { label: 'Automations', path: '/brain/automations' },
      { label: 'Project Tracking', path: '/brain/projects' },
    ],
  },
  {
    label: 'Lab', prefix: '/lab', color: 'var(--accent-green)',
    tabs: [
      { label: 'Idea Gallery', path: '/lab/ideas' },
      { label: 'Prototype Fleet', path: '/lab/prototypes' },
      { label: 'Weekly Reviews', path: '/lab/reviews' },
      { label: 'Ideation Logs', path: '/lab/ideation' },
    ],
  },
]

export default function TopNavBar() {
  const location = useLocation()
  const activeModule = modules.find(m => location.pathname.startsWith(m.prefix)) ?? modules[0]

  return (
    <nav style={{ background: 'var(--bg-1)', borderBottom: '1px solid var(--border-divider)' }}>
      {/* Top row: logo + module switcher */}
      <div className="flex items-center px-6 h-14 gap-6">
        <NavLink to="/" className="flex items-center gap-2.5 no-underline shrink-0">
          <span className="text-lg font-bold" style={{ color: 'var(--accent-gold)' }}>⬡</span>
          <span className="text-base font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>GrandviewOS</span>
        </NavLink>

        {/* Module switcher — segmented control */}
        <div className="flex rounded-lg p-0.5" style={{ background: 'var(--bg-3)' }}>
          {modules.map(m => {
            const isActive = location.pathname.startsWith(m.prefix)
            return (
              <NavLink key={m.prefix} to={m.tabs[0].path} className="no-underline">
                <span
                  className="px-4 py-1.5 rounded-md text-xs font-medium transition-all inline-block"
                  style={{
                    background: isActive ? 'var(--bg-4)' : 'transparent',
                    color: isActive ? m.color : 'var(--text-secondary)',
                  }}
                >
                  {m.label}
                </span>
              </NavLink>
            )
          })}
        </div>

        <div className="flex-1" />
      </div>

      {/* Bottom row: underline tabs for active module */}
      <div className="flex gap-0 px-6 overflow-x-auto">
        {activeModule.tabs.map(tab => {
          const isActive = location.pathname === tab.path
          return (
            <NavLink key={tab.path} to={tab.path} className="no-underline shrink-0">
              <span
                className="tab-item inline-block"
                style={{
                  color: isActive ? 'var(--accent-teal)' : 'var(--text-secondary)',
                  position: 'relative',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: isActive ? 500 : 400,
                  borderBottom: isActive ? '2px solid var(--accent-teal)' : '2px solid transparent',
                }}
              >
                {tab.label}
              </span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
