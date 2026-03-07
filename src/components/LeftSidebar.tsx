import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const icons = [
  { icon: '⬡', label: 'Dashboard', path: '/ops/task-manager' },
  { icon: '◆', label: 'Chat with COO', action: 'chat' },
  { icon: '⚙', label: 'Settings', path: '/ops/settings' },
  { icon: '●', label: 'Notifications', action: 'notify' },
]

interface Props {
  onChatToggle?: () => void
}

export default function LeftSidebar({ onChatToggle }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  return (
    <div
      className="hidden lg:flex flex-col items-center gap-2 py-4 shrink-0"
      style={{ width: 'var(--sidebar-width)', background: 'var(--bg-1)', borderRight: '1px solid var(--border-divider)' }}
    >
      {icons.map((icon, idx) => {
        const isActive = icon.path && location.pathname === icon.path
        return (
          <div key={icon.label} className="relative">
            <button
              title={icon.label}
              onClick={() => {
                if (icon.action === 'chat' && onChatToggle) onChatToggle()
                else if (icon.path) navigate(icon.path)
              }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-sm cursor-pointer transition-all"
              style={{
                background: isActive ? 'rgba(0,229,255,0.12)' : 'transparent',
                border: 'none',
                color: isActive ? 'var(--accent-teal)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '16px',
              }}
            >
              {icon.icon}
            </button>
            {hoveredIdx === idx && (
              <div
                className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap z-50"
                style={{
                  background: 'var(--bg-4)',
                  color: 'var(--text-primary)',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                {icon.label}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
