export function SkeletonLine({ width = '100%', height = '14px' }: { width?: string; height?: string }) {
  return (
    <div
      className="rounded animate-pulse"
      style={{ width, height, background: 'var(--bg-3)' }}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
      <SkeletonLine width="60%" height="16px" />
      <div className="mt-2"><SkeletonLine width="40%" /></div>
      <div className="mt-3"><SkeletonLine width="80%" /></div>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonLine width="200px" height="24px" />
      <div className="flex gap-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex-1 rounded-lg p-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-divider)' }}>
            <SkeletonLine width="50%" />
            <div className="mt-2"><SkeletonLine width="70%" height="28px" /></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
      </div>
    </div>
  )
}
