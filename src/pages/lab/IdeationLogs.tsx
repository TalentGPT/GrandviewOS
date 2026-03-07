import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import PageHeader from '../../components/PageHeader'
import { PageSkeleton } from '../../components/Skeleton'
import { useToast } from '../../components/Toast'
import { fetchIdeationLogs, createIdeationLog } from '../../api/client'

interface LogEntry {
  id: string
  content: string
  source: string | null
  ideaId: string | null
  createdAt: string
}

export default function IdeationLogs() {
  const { addToast } = useToast()
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSource, setFilterSource] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newSource, setNewSource] = useState('')

  const load = useCallback(async () => {
    const params: any = {}
    if (filterSource) params.source = filterSource
    const { data } = await fetchIdeationLogs(params)
    if (data) setEntries(data)
    setLoading(false)
  }, [filterSource])

  useEffect(() => { load() }, [load])

  const allSources = [...new Set(entries.map(e => e.source).filter(Boolean) as string[])]

  const addEntry = async () => {
    if (!newContent.trim()) return
    const { data } = await createIdeationLog({ content: newContent, source: newSource || undefined })
    if (data) {
      setEntries(prev => [data, ...prev])
      setNewContent(''); setNewSource(''); setShowAdd(false)
      addToast('Log entry added')
    }
  }

  if (loading) return <PageSkeleton />

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto w-full">
      <PageHeader title="Ideation Logs" subtitle="Chronological log of brainstorming and ideation">
        <button onClick={() => setShowAdd(!showAdd)}
          className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer"
          style={{ background: 'var(--accent-teal)22', color: 'var(--accent-teal)', border: '1px solid var(--accent-teal)44' }}>
          + Add Entry
        </button>
      </PageHeader>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div>
          <label className="text-[10px] block mb-1" style={{ color: 'var(--text-secondary)' }}>Source</label>
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
            className="px-3 py-1.5 rounded text-xs cursor-pointer"
            style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)' }}>
            <option value="">All Sources</option>
            {allSources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-lg p-4 mb-4 flex flex-col gap-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--accent-green)33' }}>
          <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Log content..." rows={3}
            className="px-3 py-2 rounded text-sm focus:outline-none resize-none" style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)' }} />
          <input value={newSource} onChange={e => setNewSource(e.target.value)} placeholder="Source (e.g. agent name, manual)..."
            className="px-3 py-2 rounded text-sm focus:outline-none" style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)' }} />
          <button onClick={addEntry} className="self-end px-4 py-1.5 rounded text-xs font-medium cursor-pointer"
            style={{ background: 'var(--accent-green)22', color: 'var(--accent-green)', border: '1px solid var(--accent-green)44' }}>Add</button>
        </div>
      )}

      {/* Timeline */}
      <div className="border-l-2 ml-4 pl-6 space-y-4" style={{ borderColor: 'var(--accent-green)33' }}>
        {entries.map(entry => (
          <div key={entry.id} className="rounded-lg p-4 relative"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
            <div className="absolute -left-[31px] top-5 w-3 h-3 rounded-full" style={{ background: 'var(--accent-green)', border: '2px solid var(--bg-primary)' }} />
            <div className="flex items-center justify-between mb-2">
              {entry.source && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-3)' }}>{entry.source}</span>
              )}
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {new Date(entry.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="text-sm leading-relaxed">{entry.content}</p>
          </div>
        ))}
      </div>

      {entries.length === 0 && (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>No log entries yet.</div>
      )}
    </motion.div>
  )
}
