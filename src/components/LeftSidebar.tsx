const icons = [
  { emoji: '📊', label: 'Dashboard' },
  { emoji: '💬', label: 'Chat' },
  { emoji: '⚙️', label: 'Settings' },
  { emoji: '🔔', label: 'Notifications' },
]

export default function LeftSidebar() {
  return (
    <div className="flex flex-col items-center gap-3 py-4 px-2 border-r" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-divider)', width: 52 }}>
      {icons.map(icon => (
        <button
          key={icon.label}
          title={icon.label}
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm hover:scale-110 transition-transform cursor-pointer"
          style={{ background: 'var(--bg-hover)' }}
        >
          {icon.emoji}
        </button>
      ))}
    </div>
  )
}
