import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { useToast } from '../components/Toast'
import { fetchAgents, fetchWorkspaceFile, saveWorkspaceFile } from '../api/client'
import { fetchAgentPermissions, fetchIntegrations, syncAgentTools, fetchSyncState } from '../api/integrations-client'
import type { AgentPermissions, IntegrationEntry } from '../types/integrations'
import { workspaceAgents as mockWorkspaceAgents, workspaceFiles as mockWorkspaceFiles, workspaceContents } from '../data/mockWorkspaces'

interface WorkspaceAgent {
  id: string
  name: string
  emoji: string
  label: string
}

interface WorkspaceFile {
  name: string
  size: string
}

const WORKSPACE_FILES: WorkspaceFile[] = [
  { name: 'SOUL.md', size: '' },
  { name: 'IDENTITY.md', size: '' },
  { name: 'USER.md', size: '' },
  { name: 'TOOLS.md', size: '' },
  { name: 'AGENTS.md', size: '' },
  { name: 'MEMORY.md', size: '' },
  { name: 'HEARTBEAT.md', size: '' },
]

export default function Workspaces() {
  const [searchParams] = useSearchParams()
  const { addToast } = useToast()
  const [selectedAgent, setSelectedAgent] = useState(searchParams.get('agent') || 'muddy')
  const [selectedFile, setSelectedFile] = useState('SOUL.md')
  const [isEdit, setIsEdit] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [agentPerms, setAgentPerms] = useState<AgentPermissions[]>([])
  const [allIntegrations, setAllIntegrations] = useState<IntegrationEntry[]>([])
  const [agentSyncState, setAgentSyncState] = useState<Record<string, { lastSync: string; status: string }>>({})
  const [syncingAgent, setSyncingAgent] = useState(false)
  const [liveAgents, setLiveAgents] = useState<WorkspaceAgent[]>([])
  const [content, setContent] = useState<string | null>(null)
  const [loadingContent, setLoadingContent] = useState(false)

  // Load agents from API
  useEffect(() => {
    const load = async () => {
      const { data } = await fetchAgents()
      if (data && data.length > 0) {
        setLiveAgents(data.map(a => ({
          id: a.slug || a.id,
          name: a.name,
          emoji: a.emoji || '🤖',
          label: a.role || '',
        })))
      }
    }
    load()
  }, [])

  useEffect(() => {
    Promise.all([
      fetchAgentPermissions().catch(() => [] as AgentPermissions[]),
      fetchIntegrations().catch(() => [] as IntegrationEntry[]),
      fetchSyncState().catch(() => ({ agents: {} as Record<string, { lastSync: string; status: string }> })),
    ]).then(([perms, ints, state]) => {
      setAgentPerms(perms)
      setAllIntegrations(ints)
      setAgentSyncState(state.agents)
    })
  }, [])

  // Load file content when agent or file changes
  useEffect(() => {
    const load = async () => {
      setLoadingContent(true)
      const { data, error } = await fetchWorkspaceFile(selectedAgent, selectedFile)
      if (data && data.content) {
        setContent(data.content)
      } else {
        // Fall back to mock data
        const mockKey = `${selectedAgent}-${selectedFile}`
        setContent(workspaceContents[mockKey] || null)
      }
      setLoadingContent(false)
    }
    load()
  }, [selectedAgent, selectedFile])

  useEffect(() => {
    const agentParam = searchParams.get('agent')
    const allAgents = liveAgents.length > 0 ? liveAgents : mockWorkspaceAgents
    if (agentParam && allAgents.some(a => a.id === agentParam)) {
      setSelectedAgent(agentParam)
      setSelectedFile('SOUL.md')
    }
  }, [searchParams, liveAgents])

  const workspaceAgents = liveAgents.length > 0 ? liveAgents : mockWorkspaceAgents
  const workspaceFiles = WORKSPACE_FILES
  const agent = workspaceAgents.find(a => a.id === selectedAgent)

  const handleEdit = async () => {
    if (isEdit) {
      setSaving(true)
      const { error } = await saveWorkspaceFile(selectedAgent, selectedFile, editContent)
      if (error) {
        addToast(`Failed to save: ${error}`, 'error')
      } else {
        addToast(`${selectedFile} saved successfully ✓`)
        setContent(editContent)
      }
      setSaving(false)
    } else {
      setEditContent(content || '')
    }
    setIsEdit(!isEdit)
  }

  const selectAgent = (id: string) => {
    setSelectedAgent(id)
    setSelectedFile('SOUL.md')
    setIsEdit(false)
    setSidebarOpen(false)
  }

  const selectFile = (name: string) => {
    setSelectedFile(name)
    setIsEdit(false)
    setSidebarOpen(false)
  }

  const sidebar = (
    <>
      <div className="text-[10px] font-semibold tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>WORKSPACES</div>
      {workspaceAgents.map(a => (
        <button
          key={a.id}
          onClick={() => selectAgent(a.id)}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm text-left mb-1 cursor-pointer transition-colors hover:bg-[var(--bg-3)]"
          style={{
            background: selectedAgent === a.id ? 'var(--accent-teal)11' : 'transparent',
            color: selectedAgent === a.id ? 'var(--accent-teal)' : 'var(--text-primary)',
            borderLeft: selectedAgent === a.id ? '3px solid var(--accent-teal)' : '3px solid transparent',
          }}
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--accent-green)' }} />
          <span>{a.name}</span>
          {a.label && <span className="text-[10px] ml-auto" style={{ color: 'var(--text-secondary)' }}>{a.label}</span>}
        </button>
      ))}

      <div className="text-[10px] font-semibold tracking-wider mt-6 mb-3" style={{ color: 'var(--text-secondary)' }}>FILES</div>
      {workspaceFiles.map(f => (
        <button
          key={f.name}
          onClick={() => selectFile(f.name)}
          className="w-full flex items-center justify-between px-2 py-2 rounded-md text-sm text-left mb-1 cursor-pointer transition-colors hover:bg-[var(--bg-3)]"
          style={{
            background: selectedFile === f.name ? 'var(--accent-teal)11' : 'transparent',
            color: selectedFile === f.name ? 'var(--accent-teal)' : 'var(--text-primary)',
            borderLeft: selectedFile === f.name ? '3px solid var(--accent-teal)' : '3px solid transparent',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
          }}
        >
          <span>{f.name}</span>
          <span className="text-[10px]" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{f.size}</span>
        </button>
      ))}
    </>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="-m-4 md:-m-6">
      {/* Mobile sidebar toggle */}
      <div className="md:hidden p-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--border-divider)', background: 'var(--bg-2)' }}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="px-3 py-2 rounded-md text-xs font-medium cursor-pointer"
          style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)', border: '1px solid var(--border-divider)' }}>
          {sidebarOpen ? 'Close' : 'Browse'}
        </button>
        <span className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
          {agent?.name} › {selectedFile}
        </span>
      </div>

      <div className="flex" style={{ minHeight: 'calc(100vh - 120px)' }}>
        {/* Sidebar — always visible on desktop, toggleable on mobile */}
        <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block w-full md:w-56 shrink-0 overflow-y-auto border-r p-4`}
          style={{ background: 'var(--bg-2)', borderColor: 'var(--border-divider)' }}>
          {sidebar}
        </div>

        {/* Content — hidden on mobile when sidebar is open */}
        <div className={`${sidebarOpen ? 'hidden' : 'block'} md:block flex-1 overflow-y-auto p-4 md:p-6`}>
          {loadingContent ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
            </div>
          ) : content ? (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--accent-green)' }} />
                    <span className="text-lg font-semibold">{agent?.name}</span>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>›</span>
                    <span className="text-sm" style={{ color: 'var(--accent-teal)' }}>{selectedFile}</span>
                    {agent?.label && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)' }}>{agent?.label}</span>}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    ~/.openclaw/workspaces/{selectedAgent}/{selectedFile}
                  </div>
                </div>
                <button
                  onClick={handleEdit}
                  disabled={saving}
                  className="px-3 py-2 rounded-md text-xs font-medium cursor-pointer hover:bg-[var(--bg-4)] transition-colors disabled:opacity-50 self-start"
                  style={{ background: isEdit ? 'var(--accent-green)22' : 'var(--bg-3)', color: isEdit ? 'var(--accent-green)' : 'var(--text-secondary)', border: `1px solid ${isEdit ? 'var(--accent-green)44' : 'var(--border-divider)'}` }}
                >
                  {saving ? 'Saving...' : isEdit ? 'Save' : 'Edit'}
                </button>
              </div>

              {/* Agent Integrations Section */}
              {(() => {
                const perm = agentPerms.find(p => p.agent_id === selectedAgent)
                if (!perm) return null
                const agentInts = allIntegrations.filter(i =>
                  perm.allowed_integrations.includes('*') ||
                  perm.allowed_integrations.includes(i.id) ||
                  perm.allowed_integrations.includes(i.type)
                )
                if (agentInts.length === 0) return null
                const sync = agentSyncState[selectedAgent]
                return (
                  <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium" style={{ color: 'var(--accent-teal)' }}>Integrations</span>
                      <div className="flex items-center gap-2">
                        {sync && (
                          <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                            Last sync: {new Date(sync.lastSync).toLocaleString()}
                          </span>
                        )}
                        <button onClick={async () => {
                          setSyncingAgent(true)
                          try {
                            await syncAgentTools(selectedAgent)
                            addToast('Tools synced ✓')
                            const state = await fetchSyncState().catch(() => ({ agents: {} as Record<string, { lastSync: string; status: string }> }))
                            setAgentSyncState(state.agents)
                          } catch { addToast('Sync failed', 'error') }
                          setSyncingAgent(false)
                        }} disabled={syncingAgent}
                          className="text-[10px] px-2 py-1 rounded cursor-pointer disabled:opacity-50"
                          style={{ background: 'var(--accent-teal)22', color: 'var(--accent-teal)', border: '1px solid var(--accent-teal)44' }}>
                          {syncingAgent ? '...' : '⟳ Sync Tools'}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {agentInts.map(i => (
                        <span key={i.id} className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{
                          background: i.status === 'connected' ? 'var(--accent-green)15' : 'var(--bg-3)',
                          color: i.status === 'connected' ? 'var(--accent-green)' : 'var(--text-secondary)',
                          border: `1px solid ${i.status === 'connected' ? 'var(--accent-green)33' : 'var(--border-divider)'}`,
                        }}>
                          {i.icon} {i.name} {i.status === 'connected' ? '✓' : '✗'}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {isEdit ? (
                <textarea
                  className="w-full p-4 rounded-lg text-sm focus:outline-none focus:ring-1"
                  style={{ background: 'var(--bg-2)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)', fontFamily: 'var(--font-mono)', resize: 'none', minHeight: '60vh' }}
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                />
              ) : (
                <div className="prose prose-invert max-w-none rounded-lg p-5 workspace-markdown" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {content}
                  </ReactMarkdown>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-4xl mb-3 opacity-20">—</div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>No content available for {agent?.name} / {selectedFile}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
