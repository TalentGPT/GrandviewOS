import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { useToast } from '../components/Toast'
import { saveWorkspaceFile } from '../api/client'
import { workspaceAgents, workspaceFiles, workspaceContents } from '../data/mockWorkspaces'

export default function Workspaces() {
  const [searchParams] = useSearchParams()
  const { addToast } = useToast()
  const [selectedAgent, setSelectedAgent] = useState(searchParams.get('agent') || 'muddy')
  const [selectedFile, setSelectedFile] = useState('SOUL.md')
  const [isEdit, setIsEdit] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const agentParam = searchParams.get('agent')
    if (agentParam && workspaceAgents.some(a => a.id === agentParam)) {
      setSelectedAgent(agentParam)
      setSelectedFile('SOUL.md')
    }
  }, [searchParams])

  const contentKey = `${selectedAgent}-${selectedFile}`
  const content = workspaceContents[contentKey]
  const agent = workspaceAgents.find(a => a.id === selectedAgent)

  const handleEdit = async () => {
    if (isEdit) {
      // Save to disk
      setSaving(true)
      const { error } = await saveWorkspaceFile(selectedAgent, selectedFile, editContent)
      if (error) {
        addToast(`Failed to save: ${error}`, 'error')
      } else {
        addToast(`${selectedFile} saved successfully ✓`)
        // Update local cache
        workspaceContents[contentKey] = editContent
      }
      setSaving(false)
    } else {
      setEditContent(content || '')
    }
    setIsEdit(!isEdit)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-0 h-[calc(100vh-64px)] -m-6">
      {/* Sidebar */}
      <div className="w-56 shrink-0 overflow-y-auto border-r p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-divider)' }}>
        <div className="text-[10px] font-semibold tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>WORKSPACES</div>
        {workspaceAgents.map(a => (
          <button
            key={a.id}
            onClick={() => { setSelectedAgent(a.id); setSelectedFile('SOUL.md'); setIsEdit(false) }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left mb-1 cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
            style={{
              background: selectedAgent === a.id ? 'var(--accent-gold)11' : 'transparent',
              color: selectedAgent === a.id ? 'var(--accent-gold)' : 'var(--text-primary)',
              border: selectedAgent === a.id ? '1px solid var(--accent-gold)33' : '1px solid transparent',
            }}
          >
            <span>{a.emoji}</span>
            <span>{a.name}</span>
            {a.label && <span className="text-[10px] ml-auto" style={{ color: 'var(--text-secondary)' }}>{a.label}</span>}
          </button>
        ))}

        <div className="text-[10px] font-semibold tracking-wider mt-6 mb-3" style={{ color: 'var(--text-secondary)' }}>FILES</div>
        {workspaceFiles.map(f => (
          <button
            key={f.name}
            onClick={() => { setSelectedFile(f.name); setIsEdit(false) }}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm text-left mb-1 cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
            style={{
              background: selectedFile === f.name ? 'var(--accent-gold)11' : 'transparent',
              color: selectedFile === f.name ? 'var(--accent-gold)' : 'var(--text-primary)',
              border: selectedFile === f.name ? '1px solid var(--accent-gold)33' : '1px solid transparent',
            }}
          >
            <span>📄 {f.name}</span>
            <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{f.size}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {content ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{agent?.emoji}</span>
                  <span className="text-lg font-semibold">{agent?.name}</span>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>›</span>
                  <span className="text-sm" style={{ color: 'var(--accent-teal)' }}>{selectedFile}</span>
                  {agent?.label && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>{agent?.label}</span>}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  ~/.openclaw/workspaces/{selectedAgent}/{selectedFile}
                </div>
              </div>
              <button
                onClick={handleEdit}
                disabled={saving}
                className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer hover:bg-[var(--bg-active)] transition-colors disabled:opacity-50"
                style={{ background: isEdit ? 'var(--accent-green)22' : 'var(--bg-hover)', color: isEdit ? 'var(--accent-green)' : 'var(--text-secondary)', border: `1px solid ${isEdit ? 'var(--accent-green)44' : 'var(--border-divider)'}` }}
              >
                {saving ? '⏳ Saving...' : isEdit ? '💾 Save' : '✏️ Edit'}
              </button>
            </div>

            {isEdit ? (
              <textarea
                className="w-full h-[calc(100vh-200px)] p-4 rounded-lg text-sm focus:outline-none focus:ring-1"
                style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)', fontFamily: 'var(--font-mono)', resize: 'none' }}
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
              />
            ) : (
              <div className="prose prose-invert max-w-none rounded-lg p-5 workspace-markdown" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-divider)' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                  {content}
                </ReactMarkdown>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-3">📄</div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>No content available for {agent?.name} / {selectedFile}</div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
