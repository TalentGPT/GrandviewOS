import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { docsContent } from '../data/mockDocs'

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
  const contentRef = useRef<HTMLDivElement>(null)
  const content = docsContent[activeDoc] || docsContent['Overview']

  const handleNav = (item: string) => {
    setActiveDoc(item)
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-0 h-[calc(100vh-64px)] -m-6">
      {/* Sidebar */}
      <div className="w-56 shrink-0 overflow-y-auto border-r p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-divider)' }}>
        <div className="text-[10px] font-semibold tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>DOCUMENTATION</div>
        {navItems.map(item => (
          <button
            key={item}
            onClick={() => handleNav(item)}
            className="w-full text-left px-2 py-1.5 rounded-md text-sm mb-1 cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
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
      </div>

      {/* Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto p-6 scroll-smooth">
        <div className="max-w-3xl docs-markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </motion.div>
  )
}
