import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { PageSkeleton } from '../../components/Skeleton'
import { fetchMemoryMain, fetchMemoryFiles, fetchMemoryFile } from '../../api/client'

interface MemoryFile {
  name: string
  content: string
  date?: string
}

function extractDate(filename: string): string | undefined {
  const m = filename.match(/(\d{4}-\d{2}-\d{2})/)
  return m?.[1]
}

export default function MemoryViewer() {
  const [memoryFiles, setMemoryFiles] = useState<MemoryFile[]>([])
  const [selectedFile, setSelectedFile] = useState<MemoryFile | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'files' | 'timeline'>('files')

  useEffect(() => {
    const load = async () => {
      const files: MemoryFile[] = []

      // Load MEMORY.md
      const { data: mainData } = await fetchMemoryMain()
      if (mainData) {
        files.push({ name: 'MEMORY.md', content: mainData.content })
      }

      // Load file list
      const { data: listData } = await fetchMemoryFiles()
      if (listData?.files) {
        for (const f of listData.files) {
          if (!f.name.endsWith('.md')) continue
          const { data: fileData } = await fetchMemoryFile(f.name)
          if (fileData) {
            files.push({ name: f.name, content: fileData.content, date: extractDate(f.name) })
          }
        }
      }

      // Fallback mock if nothing loaded
      if (files.length === 0) {
        files.push({
          name: 'MEMORY.md',
          content: '# Long-Term Memory\n\n*No memory files found. Connect OpenClaw to load real data.*',
        })
      }

      setMemoryFiles(files)
      setSelectedFile(files[0] ?? null)
      setLoading(false)
    }
    load()
  }, [])

  const filteredFiles = search
    ? memoryFiles.filter(f => f.name.toLowerCase().includes(search.toLowerCase()) || f.content.toLowerCase().includes(search.toLowerCase()))
    : memoryFiles

  const timelineFiles = [...filteredFiles].filter(f => f.date).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  if (loading) return <PageSkeleton />

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col md:flex-row gap-0 md:h-[calc(100vh-96px)] -m-4 md:-m-6">
      {/* Left sidebar */}
      <div className="w-full md:w-60 shrink-0 overflow-y-auto border-b md:border-b-0 md:border-r p-4" style={{ background: 'var(--bg-2)', borderColor: 'var(--border-divider)' }}>
        <div className="text-[10px] font-semibold tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>MEMORY FILES</div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search memory..."
          className="w-full px-2 py-1.5 rounded-md text-xs mb-3 focus:outline-none focus:ring-1 focus:ring-[var(--accent-teal)]"
          style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border-divider)' }}
        />

        <div className="flex gap-1 mb-3">
          <button onClick={() => setView('files')} className="flex-1 px-2 py-1 rounded text-[10px] font-medium cursor-pointer"
            style={{ background: view === 'files' ? 'var(--accent-teal)22' : 'var(--bg-3)', color: view === 'files' ? 'var(--accent-teal)' : 'var(--text-secondary)', border: 'none' }}>
            Files
          </button>
          <button onClick={() => setView('timeline')} className="flex-1 px-2 py-1 rounded text-[10px] font-medium cursor-pointer"
            style={{ background: view === 'timeline' ? 'var(--accent-teal)22' : 'var(--bg-3)', color: view === 'timeline' ? 'var(--accent-teal)' : 'var(--text-secondary)', border: 'none' }}>
            Timeline
          </button>
        </div>

        {view === 'files' ? (
          filteredFiles.map(f => (
            <button
              key={f.name}
              onClick={() => setSelectedFile(f)}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs text-left mb-1 cursor-pointer transition-colors hover:bg-[var(--bg-3)]"
              style={{
                background: selectedFile?.name === f.name ? 'var(--accent-teal)11' : 'transparent',
                color: selectedFile?.name === f.name ? 'var(--accent-teal)' : 'var(--text-primary)',
                border: selectedFile?.name === f.name ? '1px solid var(--accent-teal)33' : '1px solid transparent',
              }}
            >
              <span>{f.name}</span>
              {f.date && <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{f.date}</span>}
            </button>
          ))
        ) : (
          <div className="border-l-2 ml-2 pl-3" style={{ borderColor: 'var(--accent-teal)33' }}>
            {timelineFiles.map(f => (
              <button
                key={f.name}
                onClick={() => setSelectedFile(f)}
                className="w-full text-left mb-3 cursor-pointer hover:opacity-80"
                style={{ background: 'none', border: 'none', padding: 0 }}
              >
                <div className="text-[10px] font-semibold" style={{ color: 'var(--accent-teal)' }}>{f.date}</div>
                <div className="text-xs" style={{ color: selectedFile?.name === f.name ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{f.name}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        {selectedFile ? (
          <>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🧠</span>
              <span className="text-lg font-semibold">Memory</span>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>›</span>
              <span className="text-sm" style={{ color: 'var(--accent-teal)' }}>{selectedFile.name}</span>
            </div>
            {search && (
              <div className="text-xs mb-3 px-2 py-1 rounded" style={{ background: 'var(--accent-teal)11', color: 'var(--accent-teal)' }}>
                Showing results for &quot;{search}&quot;
              </div>
            )}
            <div className="prose prose-invert max-w-none rounded-lg p-5 workspace-markdown" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedFile.content}</ReactMarkdown>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-3 opacity-20">—</div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Select a memory file to view</div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
