import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import PageHeader from '../../components/PageHeader'
import { PageSkeleton } from '../../components/Skeleton'
import { fetchProjects, type TrelloBoard, type TrelloList } from '../../api/client'

// Map Trello list names to kanban-style colors
function getListColor(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('done') || lower.includes('complete')) return 'var(--accent-green)'
  if (lower.includes('progress') || lower.includes('today')) return 'var(--accent-teal)'
  if (lower.includes('review') || lower.includes('waiting')) return 'var(--accent-orange)'
  if (lower.includes('blocker')) return 'var(--accent-red)'
  if (lower.includes('backlog') || lower.includes('capture')) return 'var(--text-secondary)'
  if (lower.includes('plan') || lower.includes('tmrw')) return 'var(--accent-purple)'
  if (lower.includes('roadmap') || lower.includes('10x')) return 'var(--accent-purple)'
  if (lower.includes('immediate')) return 'var(--accent-orange)'
  return 'var(--text-secondary)'
}

export default function ProjectTracking() {
  const [board, setBoard] = useState<TrelloBoard | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')

  useEffect(() => {
    const load = async () => {
      const { data } = await fetchProjects()
      if (data && data.lists?.length > 0) {
        setBoard(data)
        // Auto-expand lists with fewer than 20 cards
        const expanded = new Set<string>()
        for (const l of data.lists) {
          if (l.cards.length <= 15) expanded.add(l.list)
        }
        setExpandedLists(expanded)
      }
      setLoading(false)
    }
    load()
  }, [])

  const toggleList = (name: string) => {
    setExpandedLists(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  if (loading) return <PageSkeleton />

  if (!board) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto w-full">
        <PageHeader title="Project Tracking" subtitle="Synced from Trello board" />
        <div className="text-center py-12">
          <div className="text-4xl mb-3 opacity-20">📋</div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>No project data found. Ensure trello-state.md exists.</div>
        </div>
      </motion.div>
    )
  }

  // Filter out very large lists (like COMPLETE with 400+ items) from board view
  const activeLists = board.lists.filter(l => !l.list.toLowerCase().includes('complete') && !l.list.toLowerCase().includes('10x360'))
  const archiveLists = board.lists.filter(l => l.list.toLowerCase().includes('complete') || l.list.toLowerCase().includes('10x360'))
  const totalCards = board.lists.reduce((s, l) => s + l.cards.length, 0)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto w-full">
      <PageHeader title={board.boardName} subtitle={board.lastSynced ? `Last synced: ${board.lastSynced}` : 'Synced from Trello'}>
        <button
          onClick={() => setViewMode(viewMode === 'board' ? 'list' : 'board')}
          className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer"
          style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)', border: '1px solid var(--border-divider)' }}
        >
          {viewMode === 'board' ? '☰ List' : '◫ Board'}
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
          <div className="text-2xl font-bold" style={{ fontFamily: 'var(--font-mono)' }}>{board.lists.length}</div>
          <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Lists</div>
        </div>
        <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--accent-teal)', fontFamily: 'var(--font-mono)' }}>{totalCards}</div>
          <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Total Cards</div>
        </div>
        <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>
            {board.lists.find(l => l.list.toLowerCase().includes('complete'))?.cards.length ?? 0}
          </div>
          <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Completed</div>
        </div>
        <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--accent-orange)', fontFamily: 'var(--font-mono)' }}>
            {activeLists.reduce((s, l) => s + l.cards.length, 0)}
          </div>
          <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Active</div>
        </div>
      </div>

      {viewMode === 'board' ? (
        /* Kanban-style board view */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeLists.map(col => {
            const color = getListColor(col.list)
            return (
              <div key={col.list}>
                <button
                  onClick={() => toggleList(col.list)}
                  className="flex items-center gap-2 mb-3 cursor-pointer w-full text-left"
                  style={{ background: 'none', border: 'none', padding: 0 }}
                >
                  <span className="text-sm font-semibold" style={{ color }}>{col.list}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: color + '22', color }}>{col.cards.length}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{expandedLists.has(col.list) ? '▼' : '▶'}</span>
                </button>
                {expandedLists.has(col.list) && (
                  <div className="flex flex-col gap-2 min-h-[60px] rounded-lg p-2" style={{ background: 'var(--bg-1)', border: `1px solid ${color}22` }}>
                    {col.cards.map((card, i) => (
                      <div key={i} className="rounded-lg p-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
                        <div className="text-sm">{card.title}</div>
                        {card.labels.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {card.labels.map((label, j) => (
                              <span key={j} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)' }}>
                                {label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {col.cards.length === 0 && (
                      <div className="text-xs py-4 text-center" style={{ color: 'var(--text-secondary)' }}>Empty</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* List view */
        <div className="flex flex-col gap-3">
          {activeLists.map(col => {
            const color = getListColor(col.list)
            return (
              <div key={col.list} className="rounded-lg p-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
                <button
                  onClick={() => toggleList(col.list)}
                  className="flex items-center gap-2 mb-2 cursor-pointer w-full text-left"
                  style={{ background: 'none', border: 'none', padding: 0 }}
                >
                  <span className="text-sm font-semibold" style={{ color }}>{col.list}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: color + '22', color }}>{col.cards.length}</span>
                </button>
                {expandedLists.has(col.list) && col.cards.map((card, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 border-b last:border-b-0" style={{ borderColor: 'var(--border-divider)' }}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-sm flex-1">{card.title}</span>
                    {card.labels.length > 0 && (
                      <div className="flex gap-1 shrink-0">
                        {card.labels.slice(0, 3).map((label, j) => (
                          <span key={j} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)' }}>
                            {label}
                          </span>
                        ))}
                        {card.labels.length > 3 && <span className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>+{card.labels.length - 3}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Archive section */}
      {archiveLists.length > 0 && (
        <div className="mt-8">
          <div className="text-[10px] font-semibold tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>ARCHIVE / REFERENCE</div>
          {archiveLists.map(col => {
            const color = getListColor(col.list)
            return (
              <div key={col.list} className="rounded-lg p-4 mb-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
                <button
                  onClick={() => toggleList(col.list)}
                  className="flex items-center gap-2 cursor-pointer w-full text-left"
                  style={{ background: 'none', border: 'none', padding: 0 }}
                >
                  <span className="text-sm font-semibold" style={{ color }}>{col.list}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: color + '22', color }}>{col.cards.length}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{expandedLists.has(col.list) ? '▼' : '▶'}</span>
                </button>
                {expandedLists.has(col.list) && (
                  <div className="mt-2 max-h-96 overflow-y-auto">
                    {col.cards.map((card, i) => (
                      <div key={i} className="flex items-center gap-2 py-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span className="w-1 h-1 rounded-full shrink-0" style={{ background: color }} />
                        <span className="truncate">{card.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
