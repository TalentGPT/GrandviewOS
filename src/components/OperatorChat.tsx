import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { sendAgentMessage, fetchAgentHistory, clearAgentHistory } from '../api/client'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const AGENTS = [
  { slug: 'ray-dalio',    name: 'Ray Dalio',    emoji: '📊', role: 'COO' },
  { slug: 'elon',         name: 'Elon',         emoji: '🚀', role: 'CTO' },
  { slug: 'steve-jobs',   name: 'Steve Jobs',   emoji: '🍎', role: 'CMO' },
  { slug: 'marc-benioff', name: 'Marc Benioff', emoji: '☁️', role: 'CRO' },
  { slug: 'nova',         name: 'Nova',         emoji: '🛡️', role: 'Security' },
  { slug: 'atlas',        name: 'Atlas',        emoji: '🏗️', role: 'Backend' },
  { slug: 'pixel',        name: 'Pixel',        emoji: '🎨', role: 'UI/UX' },
  { slug: 'frame',        name: 'Frame',        emoji: '🖼️', role: 'Frontend' },
  { slug: 'docker',       name: 'Docker',       emoji: '🐳', role: 'DevOps' },
  { slug: 'sentinel',     name: 'Sentinel',     emoji: '📡', role: 'Monitoring' },
  { slug: 'tester',       name: 'Tester',       emoji: '🧪', role: 'QA' },
  { slug: 'scribe',       name: 'Scribe',       emoji: '✍️', role: 'Content' },
  { slug: 'viral',        name: 'Viral',        emoji: '📱', role: 'Social' },
  { slug: 'clay',         name: 'Clay',         emoji: '🦞', role: 'Community' },
  { slug: 'funnel',       name: 'Funnel',       emoji: '📈', role: 'Growth' },
  { slug: 'lens',         name: 'Lens',         emoji: '🔍', role: 'Analytics' },
  { slug: 'canvas',       name: 'Canvas',       emoji: '🎭', role: 'Design' },
  { slug: 'motion',       name: 'Motion',       emoji: '🎬', role: 'Video' },
  { slug: 'deal',         name: 'Deal',         emoji: '🤝', role: 'Partnerships' },
  { slug: 'scout',        name: 'Scout',        emoji: '🔭', role: 'Research' },
  { slug: 'closer',       name: 'Closer',       emoji: '💼', role: 'Sales' },
  { slug: 'outreach',     name: 'Outreach',     emoji: '📧', role: 'Outreach' },
]

export default function OperatorChat({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [selectedSlug, setSelectedSlug] = useState('ray-dalio')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showAgentPicker, setShowAgentPicker] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selectedAgent = AGENTS.find(a => a.slug === selectedSlug) || AGENTS[0]

  const loadHistory = useCallback(async (slug: string) => {
    setLoadingHistory(true)
    const res = await fetchAgentHistory(slug)
    setMessages(res.data || [])
    setLoadingHistory(false)
  }, [])

  useEffect(() => {
    if (isOpen) loadHistory(selectedSlug)
  }, [isOpen, selectedSlug, loadHistory])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const sendMessage = async () => {
    if (!input.trim() || thinking) return
    const text = input.trim()
    setInput('')

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setThinking(true)

    try {
      const res = await sendAgentMessage(selectedSlug, text)
      if (res.data?.response) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: res.data!.response,
          timestamp: new Date().toISOString(),
        }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: res.error || 'No response received.',
          timestamp: new Date().toISOString(),
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connection error. Check that the bridge is connected in Settings.',
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setThinking(false)
    }
  }

  const handleClearHistory = async () => {
    await clearAgentHistory(selectedSlug)
    setMessages([])
  }

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso)
      return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
    } catch { return '' }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed top-0 right-0 h-full w-full md:w-[420px] z-50 flex flex-col border-l shadow-2xl"
          style={{ background: 'var(--bg-1)', borderColor: 'var(--border-divider)' }}
        >
          {/* Header */}
          <div className="p-4 border-b shrink-0" style={{ background: 'var(--bg-2)', borderColor: 'var(--border-divider)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold tracking-wider" style={{ color: 'var(--text-secondary)' }}>AGENT CHAT</span>
              <div className="flex gap-1">
                <button onClick={handleClearHistory} className="px-2 py-1 rounded text-[10px] cursor-pointer"
                  style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)', border: '1px solid var(--border-divider)' }}
                  title="Clear history">
                  Clear
                </button>
                <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer text-sm"
                  style={{ color: 'var(--text-secondary)', background: 'var(--bg-3)', border: 'none' }}>✕</button>
              </div>
            </div>

            {/* Agent selector */}
            <button
              onClick={() => setShowAgentPicker(!showAgentPicker)}
              className="w-full flex items-center gap-3 p-2 rounded-lg cursor-pointer"
              style={{ background: 'var(--bg-1)', border: '1px solid var(--border-divider)' }}
            >
              <span className="text-2xl">{selectedAgent.emoji}</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedAgent.name}</div>
                <div className="text-[10px]" style={{ color: 'var(--accent-teal)' }}>{selectedAgent.role}</div>
              </div>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{showAgentPicker ? '▲' : '▼'}</span>
            </button>

            {/* Agent picker dropdown */}
            <AnimatePresence>
              {showAgentPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="absolute left-0 right-0 mx-4 mt-1 rounded-lg overflow-y-auto z-10 border shadow-xl"
                  style={{ background: 'var(--bg-2)', borderColor: 'var(--border-divider)', maxHeight: '300px', top: '120px' }}
                >
                  {AGENTS.map(agent => (
                    <button
                      key={agent.slug}
                      onClick={() => { setSelectedSlug(agent.slug); setShowAgentPicker(false) }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left cursor-pointer hover:bg-[var(--bg-3)] transition-colors"
                      style={{ border: 'none', background: agent.slug === selectedSlug ? 'var(--bg-3)' : 'transparent' }}
                    >
                      <span>{agent.emoji}</span>
                      <div className="flex-1">
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{agent.name}</span>
                        <span className="text-[10px] ml-2" style={{ color: 'var(--text-secondary)' }}>{agent.role}</span>
                      </div>
                      {agent.slug === selectedSlug && <span style={{ color: 'var(--accent-teal)' }}>✓</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3" onClick={() => setShowAgentPicker(false)}>
            {loadingHistory && (
              <div className="text-center text-xs py-4" style={{ color: 'var(--text-secondary)' }}>Loading history...</div>
            )}
            {!loadingHistory && messages.length === 0 && (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">{selectedAgent.emoji}</div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{selectedAgent.name}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Start a conversation</div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%] rounded-lg p-3" style={{
                  background: msg.role === 'user' ? 'var(--bg-3)' : 'var(--bg-2)',
                  border: `1px solid ${msg.role === 'user' ? 'var(--accent-teal)33' : 'var(--border-divider)'}`,
                }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold" style={{ color: msg.role === 'user' ? 'var(--accent-gold)' : 'var(--accent-teal)' }}>
                      {msg.role === 'user' ? '👤 You' : `${selectedAgent.emoji} ${selectedAgent.name}`}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{msg.content}</p>
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="rounded-lg p-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold" style={{ color: 'var(--accent-teal)' }}>
                      {selectedAgent.emoji} {selectedAgent.name}
                    </span>
                  </div>
                  <div className="flex gap-1 items-center py-1">
                    {[0,1,2].map(i => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full"
                        style={{ background: 'var(--accent-teal)' }}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t shrink-0" style={{ borderColor: 'var(--border-divider)', background: 'var(--bg-2)' }}>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) sendMessage() }}
                placeholder={`Message ${selectedAgent.name}...`}
                disabled={thinking}
                className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent-teal)]"
                style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)', opacity: thinking ? 0.7 : 1 }}
              />
              <button
                onClick={sendMessage}
                disabled={thinking || !input.trim()}
                className="px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-opacity"
                style={{ background: 'var(--accent-teal)22', color: 'var(--accent-teal)', border: '1px solid var(--accent-teal)44', opacity: thinking || !input.trim() ? 0.5 : 1 }}
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
