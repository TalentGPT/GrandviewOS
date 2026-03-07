import { NavLink, Outlet, useLocation } from 'react-router-dom'

const subTabs = [
  { label: 'Overview', path: '/ops/integrations' },
  { label: 'Secrets', path: '/ops/integrations/secrets' },
  { label: 'MCP Servers', path: '/ops/integrations/mcp' },
  { label: 'LLM Providers', path: '/ops/integrations/llm' },
  { label: 'Permissions', path: '/ops/integrations/permissions' },
]

export default function IntegrationsLayout() {
  const location = useLocation()

  return (
    <div>
      {/* Sub-tab bar */}
      <div className="flex gap-0 mb-6 overflow-x-auto" style={{ borderBottom: '1px solid var(--border-divider)' }}>
        {subTabs.map(tab => {
          const isActive = location.pathname === tab.path
          return (
            <NavLink key={tab.path} to={tab.path} className="no-underline shrink-0">
              <span
                className="inline-block"
                style={{
                  color: isActive ? 'var(--accent-teal)' : 'var(--text-secondary)',
                  padding: '8px 14px',
                  fontSize: '12px',
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
      <Outlet />
    </div>
  )
}
