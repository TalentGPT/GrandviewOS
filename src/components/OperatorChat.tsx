import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ChatMessage {
  id: string
  from: 'operator' | 'coo'
  text: string
  time: string
}

const MOCK_MESSAGES: ChatMessage[] = [
  { id: '1', from: 'coo', text: "Good morning! All 21 agents are healthy. Overnight: Nova completed security scan (0 critical), Clay handled 3 community questions. Cost since midnight: $4.82.", time: '07:00' },
  { id: '2', from: 'operator', text: "What's the status on the partnership proposals?", time: '08:15' },
  { id: '3', from: 'coo', text: "Warren sent proposals to TechCorp and AIFlow yesterday. DataStream proposal is 80% drafted — expected by end of day. TechCorp responded positively, requesting a follow-up call this week.", time: '08:15' },
  { id: '4', from: 'operator', text: 'Great. Have Gary prepare a co-marketing plan for TechCorp.', time: '08:16' },
  { id: '5', from: 'coo', text: "On it. I'll delegate to Gary immediately. He already has co-marketing templates ready from last week — should have the TechCorp-specific plan by tomorrow morning. I'll update you at next standup.", time: '08:16' },
]

export default function OperatorChat({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES)
  const [input, setInput] = useState('')

  const sendMessage = () => {
    if (!input.trim()) return
    const now = new Date()
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    const newMsg: ChatMessage = { id: Date.now().toString(), from: 'operator', text: input.trim(), time: timeStr }
    setMessages(prev => [...prev, newMsg])
    setInput('')
    // Simulate COO response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        from: 'coo',
        text: "Understood. I'll coordinate with the team and report back shortly.",
        time: timeStr,
      }])
    }, 1500)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed top-0 right-0 h-full w-[400px] z-50 flex flex-col border-l shadow-2xl"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-divider)' }}
        >
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between shrink-0" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-divider)' }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">🐕</span>
              <div>
                <div className="text-sm font-semibold">Muddy — COO</div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--accent-green)] pulse-dot"></span>
                  <span className="text-[10px]" style={{ color: 'var(--accent-green)' }}>Online</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer text-sm hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-secondary)', background: 'none', border: 'none' }}>✕</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.from === 'operator' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%] rounded-lg p-3" style={{
                  background: msg.from === 'operator' ? 'var(--accent-teal)18' : 'var(--bg-card)',
                  border: `1px solid ${msg.from === 'operator' ? 'var(--accent-teal)33' : 'var(--border-divider)'}`,
                }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold" style={{ color: msg.from === 'operator' ? 'var(--accent-gold)' : 'var(--accent-teal)' }}>
                      {msg.from === 'operator' ? '👤 You' : '🐕 Muddy'}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{msg.time}</span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{msg.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t shrink-0" style={{ borderColor: 'var(--border-divider)', background: 'var(--bg-card)' }}>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendMessage() }}
                placeholder="Message Muddy..."
                className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent-teal)]"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)' }}
              />
              <button
                onClick={sendMessage}
                className="px-3 py-2 rounded-lg text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity"
                style={{ background: 'var(--accent-teal)22', color: 'var(--accent-teal)', border: '1px solid var(--accent-teal)44' }}
              >
                Send
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
