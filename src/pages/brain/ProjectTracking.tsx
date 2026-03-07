import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PageHeader from '../../components/PageHeader'
import { PageSkeleton } from '../../components/Skeleton'
import {
  fetchProjects, fetchTrelloBoards, fetchTrelloConfig, connectTrelloBoard, syncTrelloBoard,
  createTrelloCard, updateTrelloCard, moveTrelloCard, archiveTrelloCard, deleteTrelloCard,
  createTrelloList, addTrelloComment, getTrelloCardDetails, getTrelloBoardLists,
  type TrelloBoard, type TrelloList, type TrelloCard, type TrelloBoardInfo, type TrelloConfig,
} from '../../api/client'

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

function formatSyncTime(iso: string | null): string {
  if (!iso) return 'Never'
  try {
    const d = new Date(iso)
    return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC')
  } catch { return iso }
}

// --- Card Detail Modal ---
function CardDetailModal({ cardId, boardId, boardLists, onClose, onRefresh }: {
  cardId: string
  boardId: string
  boardLists: Array<{ id: string; name: string }>
  onClose: () => void
  onRefresh: () => void
}) {
  const [card, setCard] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [commentText, setCommentText] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    getTrelloCardDetails(cardId).then(res => {
      if (res.data) {
        setCard(res.data)
        setEditName(res.data.name || '')
        setEditDesc(res.data.desc || '')
      }
      setLoading(false)
    })
  }, [cardId])

  const handleSave = async () => {
    setSaving(true)
    await updateTrelloCard(cardId, { name: editName, desc: editDesc })
    setSaving(false)
    onRefresh()
  }

  const handleMove = async (listId: string) => {
    await moveTrelloCard(cardId, listId)
    onRefresh()
    onClose()
  }

  const handleArchive = async () => {
    await archiveTrelloCard(cardId)
    onRefresh()
    onClose()
  }

  const handleDelete = async () => {
    await deleteTrelloCard(cardId)
    onRefresh()
    onClose()
  }

  const handleComment = async () => {
    if (!commentText.trim()) return
    await addTrelloComment(cardId, commentText)
    setCommentText('')
    // Refresh card details to show new comment
    const res = await getTrelloCardDetails(cardId)
    if (res.data) setCard(res.data)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl p-6"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}
        onClick={e => e.stopPropagation()}
      >
        {loading ? (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
        ) : !card ? (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>Card not found</div>
        ) : (
          <>
            {/* Name */}
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full text-lg font-semibold mb-3 px-2 py-1 rounded"
              style={{ background: 'var(--bg-1)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)', outline: 'none' }}
            />

            {/* Description */}
            <textarea
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              placeholder="Add a description..."
              rows={3}
              className="w-full text-sm mb-3 px-2 py-1.5 rounded resize-y"
              style={{ background: 'var(--bg-1)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)', outline: 'none' }}
            />

            {/* Save button */}
            {(editName !== card.name || editDesc !== (card.desc || '')) && (
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-1.5 rounded text-xs font-semibold mb-4 cursor-pointer"
                style={{ background: 'var(--accent-teal)', color: 'var(--bg-1)', border: 'none' }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            )}

            {/* Due date */}
            {card.due && (
              <div className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                📅 Due: {new Date(card.due).toLocaleDateString()}
              </div>
            )}

            {/* Labels */}
            {card.labels?.length > 0 && (
              <div className="flex gap-1 flex-wrap mb-3">
                {card.labels.map((l: any, i: number) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: l.color ? `var(--accent-${l.color === 'green' ? 'green' : l.color === 'red' ? 'red' : 'teal'})` : 'var(--bg-3)', color: '#fff' }}>
                    {l.name || l.color}
                  </span>
                ))}
              </div>
            )}

            {/* Move to list */}
            <div className="mb-4">
              <label className="text-[10px] font-semibold tracking-wider mb-1 block" style={{ color: 'var(--text-secondary)' }}>MOVE TO LIST</label>
              <select
                value={card.idList}
                onChange={e => handleMove(e.target.value)}
                className="w-full px-2 py-1.5 rounded text-sm"
                style={{ background: 'var(--bg-1)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)', outline: 'none' }}
              >
                {boardLists.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            {/* Comments */}
            <div className="mb-4">
              <label className="text-[10px] font-semibold tracking-wider mb-2 block" style={{ color: 'var(--text-secondary)' }}>COMMENTS</label>
              {card.actions?.map((a: any, i: number) => (
                <div key={i} className="text-xs mb-2 p-2 rounded" style={{ background: 'var(--bg-1)' }}>
                  <span style={{ color: 'var(--accent-teal)' }}>{a.memberCreator?.fullName || 'Unknown'}</span>
                  <span style={{ color: 'var(--text-secondary)' }}> · {new Date(a.date).toLocaleDateString()}</span>
                  <div className="mt-1" style={{ color: 'var(--text-primary)' }}>{a.data?.text}</div>
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-2 py-1.5 rounded text-sm"
                  style={{ background: 'var(--bg-1)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)', outline: 'none' }}
                  onKeyDown={e => e.key === 'Enter' && handleComment()}
                />
                <button onClick={handleComment} className="px-3 py-1.5 rounded text-xs font-semibold cursor-pointer"
                  style={{ background: 'var(--accent-teal)', color: 'var(--bg-1)', border: 'none' }}>
                  Send
                </button>
              </div>
            </div>

            {/* Destructive actions */}
            <div className="flex gap-2 pt-3" style={{ borderTop: '1px solid var(--border-divider)' }}>
              <button onClick={handleArchive} className="px-3 py-1.5 rounded text-xs font-semibold cursor-pointer"
                style={{ background: 'transparent', color: 'var(--accent-red, #ef4444)', border: '1px solid var(--accent-red, #ef4444)' }}>
                Archive
              </button>
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)} className="px-3 py-1.5 rounded text-xs font-semibold cursor-pointer"
                  style={{ background: 'var(--accent-red, #ef4444)', color: '#fff', border: 'none' }}>
                  Delete
                </button>
              ) : (
                <button onClick={handleDelete} className="px-3 py-1.5 rounded text-xs font-semibold cursor-pointer animate-pulse"
                  style={{ background: 'var(--accent-red, #ef4444)', color: '#fff', border: 'none' }}>
                  Confirm Delete
                </button>
              )}
              <button onClick={onClose} className="ml-auto px-3 py-1.5 rounded text-xs cursor-pointer"
                style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)', border: 'none' }}>
                Close
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

// --- Add Card Inline Form ---
function AddCardForm({ listId, onCreated, onCancel }: { listId: string; onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    await createTrelloCard(listId, name.trim())
    setSubmitting(false)
    setName('')
    onCreated()
  }

  return (
    <div className="rounded-lg p-2 mt-2" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Card title..."
        autoFocus
        className="w-full text-sm px-2 py-1.5 rounded mb-2"
        style={{ background: 'var(--bg-1)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)', outline: 'none' }}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onCancel() }}
      />
      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={submitting || !name.trim()}
          className="px-3 py-1 rounded text-xs font-semibold cursor-pointer"
          style={{ background: 'var(--accent-teal)', color: 'var(--bg-1)', border: 'none', opacity: submitting || !name.trim() ? 0.5 : 1 }}>
          {submitting ? '...' : 'Add'}
        </button>
        <button onClick={onCancel} className="px-3 py-1 rounded text-xs cursor-pointer"
          style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)', border: 'none' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function ProjectTracking() {
  const [board, setBoard] = useState<TrelloBoard | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')

  // Trello board selector state
  const [availableBoards, setAvailableBoards] = useState<TrelloBoardInfo[]>([])
  const [trelloConfig, setTrelloConfig] = useState<TrelloConfig | null>(null)
  const [selectedBoardId, setSelectedBoardId] = useState<string>('')
  const [syncing, setSyncing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [loadingBoards, setLoadingBoards] = useState(false)

  // CRUD state
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [addingCardToList, setAddingCardToList] = useState<string | null>(null)
  const [boardLists, setBoardLists] = useState<Array<{ id: string; name: string }>>([])
  const [showAddList, setShowAddList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [creatingList, setCreatingList] = useState(false)

  const autoExpandLists = useCallback((data: TrelloBoard) => {
    const expanded = new Set<string>()
    for (const l of data.lists) {
      if (l.cards.length <= 15) expanded.add(l.list)
    }
    setExpandedLists(expanded)
  }, [])

  useEffect(() => {
    const load = async () => {
      // Load config and boards in parallel
      const [configRes, boardsRes, projectsRes] = await Promise.all([
        fetchTrelloConfig(),
        fetchTrelloBoards(),
        fetchProjects(),
      ])

      if (configRes.data) {
        setTrelloConfig(configRes.data)
        if (configRes.data.boardId) {
          setSelectedBoardId(configRes.data.boardId)
          loadBoardLists(configRes.data.boardId)
        }
      }

      if (boardsRes.data?.boards) {
        setAvailableBoards(boardsRes.data.boards)
      }

      if (projectsRes.data && projectsRes.data.lists?.length > 0) {
        setBoard(projectsRes.data)
        autoExpandLists(projectsRes.data)
      }

      setLoading(false)
    }
    load()
  }, [autoExpandLists, loadBoardLists])

  const loadBoardLists = useCallback(async (boardId: string) => {
    const res = await getTrelloBoardLists(boardId)
    if (res.data) setBoardLists(res.data)
  }, [])

  const refreshBoard = useCallback(async () => {
    const res = await syncTrelloBoard()
    if (res.data?.ok && res.data.board) {
      setBoard(res.data.board)
      setTrelloConfig(prev => prev ? { ...prev, lastSynced: res.data!.board.lastSynced } : prev)
      autoExpandLists(res.data.board)
    }
  }, [autoExpandLists])

  const handleAddList = async () => {
    if (!newListName.trim() || !trelloConfig?.boardId) return
    setCreatingList(true)
    await createTrelloList(trelloConfig.boardId, newListName.trim())
    setNewListName('')
    setShowAddList(false)
    setCreatingList(false)
    await refreshBoard()
    if (trelloConfig.boardId) await loadBoardLists(trelloConfig.boardId)
  }

  const handleConnect = async () => {
    if (!selectedBoardId) return
    setConnecting(true)
    try {
      const res = await connectTrelloBoard(undefined, selectedBoardId)
      if (res.data?.ok && res.data.board) {
        setBoard(res.data.board)
        setTrelloConfig(res.data.config)
        autoExpandLists(res.data.board)
        if (res.data.config.boardId) loadBoardLists(res.data.config.boardId)
      }
    } finally {
      setConnecting(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await syncTrelloBoard()
      if (res.data?.ok && res.data.board) {
        setBoard(res.data.board)
        setTrelloConfig(prev => prev ? { ...prev, lastSynced: res.data!.board.lastSynced } : prev)
        autoExpandLists(res.data.board)
      }
    } finally {
      setSyncing(false)
    }
  }

  const handleRefreshBoards = async () => {
    setLoadingBoards(true)
    try {
      const res = await fetchTrelloBoards()
      if (res.data?.boards) setAvailableBoards(res.data.boards)
    } finally {
      setLoadingBoards(false)
    }
  }

  const toggleList = (name: string) => {
    setExpandedLists(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  if (loading) return <PageSkeleton />

  // Filter lists
  const activeLists = board ? board.lists.filter(l => !l.list.toLowerCase().includes('complete') && !l.list.toLowerCase().includes('10x360')) : []
  const archiveLists = board ? board.lists.filter(l => l.list.toLowerCase().includes('complete') || l.list.toLowerCase().includes('10x360')) : []
  const totalCards = board ? board.lists.reduce((s, l) => s + l.cards.length, 0) : 0

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto w-full">
      <PageHeader title={board?.boardName || 'Project Tracking'} subtitle={board?.lastSynced ? `Last synced: ${board.lastSynced}` : 'Synced from Trello'}>
        <button
          onClick={() => setViewMode(viewMode === 'board' ? 'list' : 'board')}
          className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer"
          style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)', border: '1px solid var(--border-divider)' }}
        >
          {viewMode === 'board' ? '☰ List' : '◫ Board'}
        </button>
      </PageHeader>

      {/* Board Selector Bar */}
      <div className="rounded-lg p-4 mb-6" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedBoardId}
            onChange={e => setSelectedBoardId(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 rounded-md text-sm"
            style={{
              background: 'var(--bg-1)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-divider)',
              outline: 'none',
            }}
          >
            <option value="">Select a Trello board...</option>
            {availableBoards.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <button
            onClick={handleRefreshBoards}
            disabled={loadingBoards}
            className="px-2 py-2 rounded-md text-xs cursor-pointer"
            style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)', border: '1px solid var(--border-divider)' }}
            title="Refresh board list"
          >
            {loadingBoards ? '⏳' : '🔄'}
          </button>

          <button
            onClick={handleConnect}
            disabled={!selectedBoardId || connecting}
            className="px-4 py-2 rounded-md text-xs font-semibold cursor-pointer transition-opacity"
            style={{
              background: 'var(--accent-teal)',
              color: 'var(--bg-1)',
              border: 'none',
              opacity: !selectedBoardId || connecting ? 0.5 : 1,
            }}
          >
            {connecting ? 'Connecting...' : 'Connect'}
          </button>

          {trelloConfig?.boardId && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 rounded-md text-xs font-semibold cursor-pointer transition-opacity"
              style={{
                background: 'var(--bg-3)',
                color: 'var(--accent-teal)',
                border: '1px solid var(--accent-teal)',
                opacity: syncing ? 0.5 : 1,
              }}
            >
              {syncing ? 'Syncing...' : '⟳ Sync Now'}
            </button>
          )}
        </div>

        {trelloConfig?.boardName && (
          <div className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            Connected: <span style={{ color: 'var(--accent-teal)' }}>{trelloConfig.boardName}</span>
            {trelloConfig.lastSynced && (
              <span> · Last synced: {formatSyncTime(trelloConfig.lastSynced)}</span>
            )}
          </div>
        )}
      </div>

      {!board ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3 opacity-20">📋</div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Select a Trello board above and click Connect to get started.
          </div>
        </div>
      ) : (
        <>
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
                          <div key={card.id || i}
                            className="rounded-lg p-3 cursor-pointer transition-all hover:brightness-110"
                            style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}
                            onClick={() => card.id && setSelectedCardId(card.id)}
                          >
                            <div className="text-sm">{card.title}</div>
                            {card.due && <div className="text-[9px] mt-1" style={{ color: 'var(--text-secondary)' }}>📅 {new Date(card.due).toLocaleDateString()}</div>}
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
                        {/* Add Card */}
                        {addingCardToList === col.listId ? (
                          <AddCardForm listId={col.listId!} onCreated={() => { setAddingCardToList(null); refreshBoard() }} onCancel={() => setAddingCardToList(null)} />
                        ) : col.listId && (
                          <button onClick={() => setAddingCardToList(col.listId!)}
                            className="text-xs py-1.5 w-full rounded cursor-pointer mt-1"
                            style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px dashed var(--border-divider)' }}>
                            + Add Card
                          </button>
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
                      <div key={card.id || i}
                        className="flex items-center gap-2 py-1.5 border-b last:border-b-0 cursor-pointer hover:brightness-110"
                        style={{ borderColor: 'var(--border-divider)' }}
                        onClick={() => card.id && setSelectedCardId(card.id)}
                      >
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

          {/* Add List button */}
          {trelloConfig?.boardId && viewMode === 'board' && (
            <div className="mt-6">
              {showAddList ? (
                <div className="inline-flex gap-2 items-center">
                  <input
                    value={newListName}
                    onChange={e => setNewListName(e.target.value)}
                    placeholder="List name..."
                    autoFocus
                    className="px-3 py-1.5 rounded text-sm"
                    style={{ background: 'var(--bg-1)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)', outline: 'none' }}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddList(); if (e.key === 'Escape') setShowAddList(false) }}
                  />
                  <button onClick={handleAddList} disabled={creatingList || !newListName.trim()}
                    className="px-3 py-1.5 rounded text-xs font-semibold cursor-pointer"
                    style={{ background: 'var(--accent-teal)', color: 'var(--bg-1)', border: 'none', opacity: creatingList || !newListName.trim() ? 0.5 : 1 }}>
                    {creatingList ? '...' : 'Add'}
                  </button>
                  <button onClick={() => setShowAddList(false)} className="px-2 py-1.5 rounded text-xs cursor-pointer"
                    style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)', border: 'none' }}>✕</button>
                </div>
              ) : (
                <button onClick={() => setShowAddList(true)}
                  className="px-4 py-2 rounded-lg text-xs cursor-pointer"
                  style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px dashed var(--border-divider)' }}>
                  + Add List
                </button>
              )}
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
        </>
      )}

      {/* Card Detail Modal */}
      <AnimatePresence>
        {selectedCardId && trelloConfig?.boardId && (
          <CardDetailModal
            cardId={selectedCardId}
            boardId={trelloConfig.boardId}
            boardLists={boardLists}
            onClose={() => setSelectedCardId(null)}
            onRefresh={refreshBoard}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
