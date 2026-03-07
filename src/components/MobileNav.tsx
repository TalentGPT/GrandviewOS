import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

const modules = [
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

interface Props {
  onChatToggle?: () => void
}

export default function MobileNav({ onChatToggle }: Props) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const _activeModule = modules.find(m => location.pathname.startsWith(m.prefix)) ?? modules[0]
  void _activeModule

  return (
    <>
      {/* Top bar with hamburger */}
      <nav className="flex items-center justify-between px-4 py-3 border-b md:hidden"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-divider)' }}>
        <NavLink to="/" className="flex items-center gap-2 no-underline">
          <span className="text-lg font-bold" style={{ color: 'var(--accent-teal)' }}>⬡</span>
          <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>GrandviewOS</span>
        </NavLink>
        <div className="flex items-center gap-3">
          <button
            onClick={onChatToggle}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
            style={{ background: 'var(--accent-green)22', border: '1px solid var(--accent-green)44' }}
          >💬</button>
          <button
            onClick={() => setOpen(!open)}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
            style={{ background: 'var(--bg-hover)', border: 'none', color: 'var(--text-primary)' }}
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* Slide-out menu */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="sidebar-overlay md:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-72 z-50 overflow-y-auto border-l md:hidden"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-divider)' }}
            >
              <div className="p-4">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Navigation</span>
                  <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-md flex items-center justify-center"
                    style={{ background: 'var(--bg-hover)', border: 'none', color: 'var(--text-secondary)' }}>✕</button>
                </div>

                {modules.map(mod => (
                  <div key={mod.prefix} className="mb-6">
                    <div className="text-xs font-semibold tracking-wider mb-2 px-2" style={{ color: mod.color }}>
                      {mod.label.toUpperCase()}
                    </div>
                    {mod.tabs.map(tab => {
                      const isActive = location.pathname === tab.path
                      return (
                        <NavLink
                          key={tab.path}
                          to={tab.path}
                          onClick={() => setOpen(false)}
                          className="block no-underline"
                        >
                          <div
                            className="px-3 py-3 rounded-lg mb-1 text-sm font-medium"
                            style={{
                              background: isActive ? mod.color + '18' : 'transparent',
                              color: isActive ? mod.color : 'var(--text-secondary)',
                              borderLeft: isActive ? `3px solid ${mod.color}` : '3px solid transparent',
                            }}
                          >
                            {tab.label}
                          </div>
                        </NavLink>
                      )
                    })}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
