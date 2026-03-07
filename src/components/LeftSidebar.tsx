import { useNavigate, useLocation } from 'react-router-dom'

const icons = [
  { emoji: '📊', label: 'Dashboard', path: '/ops/task-manager', bg: 'var(--bg-hover)' },
  { emoji: '💬', label: 'Chat with COO', action: 'chat', bg: 'var(--accent-green)22' },
  { emoji: '⚙️', label: 'Settings', path: '/ops/settings', bg: 'var(--bg-hover)' },
  { emoji: '🔔', label: 'Notifications', action: 'notify', bg: 'var(--bg-hover)' },
]

interface Props {
  onChatToggle?: () => void
}

export default function LeftSidebar({ onChatToggle }: Props) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="flex flex-col items-center gap-3">
      {icons.map(icon => {
        const isActive = icon.path && location.pathname === icon.path
        return (
          <button
            key={icon.label}
            title={icon.label}
            onClick={() => {
              if (icon.action === 'chat' && onChatToggle) onChatToggle()
              else if (icon.path) navigate(icon.path)
            }}
            className="w-11 h-11 rounded-full flex items-center justify-center text-base hover:scale-110 transition-transform cursor-pointer shadow-lg"
            style={{
              background: isActive ? 'var(--accent-teal)22' : icon.bg,
              border: icon.action === 'chat' ? '1px solid var(--accent-green)44' : '1px solid var(--border-divider)',
            }}
          >
            {icon.emoji}
          </button>
        )
      })}
    </div>
  )
}
