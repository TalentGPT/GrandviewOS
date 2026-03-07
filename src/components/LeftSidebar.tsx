import { useNavigate, useLocation } from 'react-router-dom'

const icons = [
  { emoji: '📊', label: 'Dashboard', path: '/ops/task-manager' },
  { emoji: '💬', label: 'Chat with COO', action: 'chat' },
  { emoji: '⚙️', label: 'Settings', path: '/ops/settings' },
  { emoji: '🔔', label: 'Notifications', action: 'notify' },
]

interface Props {
  onChatToggle?: () => void
}

export default function LeftSidebar({ onChatToggle }: Props) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div
      className="flex flex-col items-center gap-3 py-4 px-2 border-r shrink-0"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-divider)', width: 56 }}
    >
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
            className="w-11 h-11 rounded-full flex items-center justify-center text-base hover:scale-110 transition-transform cursor-pointer"
            style={{
              background: isActive ? 'var(--accent-teal)22' : icon.action === 'chat' ? 'var(--accent-green)22' : 'var(--bg-hover)',
              border: icon.action === 'chat' ? '1px solid var(--accent-green)44' : 'none',
            }}
          >
            {icon.emoji}
          </button>
        )
      })}
    </div>
  )
}
