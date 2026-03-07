import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { useToast } from '../components/Toast'
import { fetchGeneratedDocs, regenerateDocs } from '../api/client'
import { docsContent as mockDocs } from '../data/mockDocs'

const navItems = [
  'Overview',
  'Task Manager',
  'Organization Chart',
  'Team Workspaces',
  'Sub-Agents & Spawning',
  'Gateway vs Sub-Agents',
  'Voice Standup',
  'Partnership Pipeline',
  'Memory Architecture',
]

export default function Docs() {
  const [activeDoc, setActiveDoc] = useState('Overview')
  const [docs, setDocs] = useState<Record<string, string>>(mockDocs)
  const [isGenerated, setIsGenerated] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const { addToast } = useToast()

  useEffect(() => {
    const load = async () => {
      const { data } = await fetchGeneratedDocs()
      if (data && Object.keys(data).length > 0) {
        setDocs(prev => ({ ...prev, ...data }))
        setIsGenerated(true)
      }
    }
    load()
  }, [])

  const handleRegenerate = async () => {
    setRegenerating(true)
    addToast('Regenerating documentation...', 'info')
    const { data, error } = await regenerateDocs()
    if (data && Object.keys(data).length > 0) {
      setDocs(prev => ({ ...prev, ...data }))
      setIsGenerated(true)
      addToast('Documentation regenerated ✓')
    } else {
      addToast(error ?? 'Failed to regenerate docs', 'error')
    }
    setRegenerating(false)
  }

  const content = docs[activeDoc] || mockDocs[activeDoc] || mockDocs['Overview']

  const handleNav = (item: string) => {
    setActiveDoc(item)
    setSidebarOpen(false)
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="-m-4 md:-m-6">
      {/* Mobile doc picker */}
      <div className="md:hidden p-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--border-divider)', background: 'var(--bg-2)' }}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="px-3 py-2 rounded-md text-xs font-medium cursor-pointer"
          style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)', border: '1px solid var(--border-divider)' }}>
          {sidebarOpen ? '✕ Close' : '📚 Topics'}
        </button>
        <span className="text-sm truncate" style={{ color: 'var(--accent-teal)' }}>{activeDoc}</span>
      </div>

      <div className="flex" style={{ minHeight: 'calc(100vh - 120px)' }}>
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block w-full md:w-56 shrink-0 overflow-y-auto border-r p-4`}
          style={{ background: 'var(--bg-2)', borderColor: 'var(--border-divider)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-semibold tracking-wider" style={{ color: 'var(--text-secondary)' }}>DOCUMENTATION</div>
            {isGenerated && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-green)22', color: 'var(--accent-green)' }}>Live</span>}
          </div>
          {navItems.map(item => (
            <button
              key={item}
              onClick={() => handleNav(item)}
              className="w-full text-left px-2 py-2 rounded-md text-sm mb-1 cursor-pointer transition-colors hover:bg-[var(--bg-3)]"
              style={{
                background: activeDoc === item ? 'var(--accent-teal)11' : 'transparent',
                color: activeDoc === item ? 'var(--accent-teal)' : 'var(--text-secondary)',
                border: activeDoc === item ? '1px solid var(--accent-teal)33' : '1px solid transparent',
                fontWeight: activeDoc === item ? 600 : 400,
              }}
            >
              {item}
            </button>
          ))}

          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="w-full mt-4 px-3 py-2 rounded-md text-xs font-medium cursor-pointer hover:opacity-80 disabled:opacity-50 transition-opacity"
            style={{ background: 'var(--accent-teal)22', color: 'var(--accent-teal)', border: '1px solid var(--accent-teal)44' }}
          >
            {regenerating ? '⏳ Generating...' : '🔄 Regenerate Docs'}
          </button>
        </div>

        {/* Content */}
        <div ref={contentRef} className={`${sidebarOpen ? 'hidden' : 'block'} md:block flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth`}>
          <div className="max-w-3xl docs-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
