import { useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import TopNavBar from './components/TopNavBar'
import LeftSidebar from './components/LeftSidebar'
import MobileNav from './components/MobileNav'
// StatusBar imported via PersistentAudioBar
import OperatorChat from './components/OperatorChat'
import PersistentAudioBar from './components/PersistentAudioBar'
import ErrorBoundary from './components/ErrorBoundary'
import PageTitle from './components/PageTitle'
import { ToastProvider } from './components/Toast'
import { PageSkeleton } from './components/Skeleton'

// Eagerly loaded (Ops core)
import TaskManager from './pages/TaskManager'
import OrgChart from './pages/OrgChart'
import Standup from './pages/Standup'
import Workspaces from './pages/Workspaces'
import Docs from './pages/Docs'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'

// Code-split: Brain module
const MemoryViewer = lazy(() => import('./pages/brain/MemoryViewer'))
const DailyBriefs = lazy(() => import('./pages/brain/DailyBriefs'))
const Automations = lazy(() => import('./pages/brain/Automations'))
const ProjectTracking = lazy(() => import('./pages/brain/ProjectTracking'))

// Code-split: Lab module
const IdeaGallery = lazy(() => import('./pages/lab/IdeaGallery'))
const PrototypeFleet = lazy(() => import('./pages/lab/PrototypeFleet'))
const WeeklyReviews = lazy(() => import('./pages/lab/WeeklyReviews'))
const IdeationLogs = lazy(() => import('./pages/lab/IdeationLogs'))

function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ErrorBoundary>{children}</ErrorBoundary>
    </Suspense>
  )
}

// Get breadcrumb label from path
function getBreadcrumb(pathname: string): string {
  const segments: Record<string, string> = {
    '/ops/task-manager': 'Task Manager',
    '/ops/org-chart': 'Org Chart',
    '/ops/standup': 'Standup',
    '/ops/workspaces': 'Workspaces',
    '/ops/docs': 'Docs',
    '/ops/settings': 'Settings',
    '/brain/memory': 'Memory Viewer',
    '/brain/briefs': 'Daily Briefs',
    '/brain/automations': 'Automations',
    '/brain/projects': 'Project Tracking',
    '/lab/ideas': 'Idea Gallery',
    '/lab/prototypes': 'Prototype Fleet',
    '/lab/reviews': 'Weekly Reviews',
    '/lab/ideation': 'Ideation Logs',
  }
  return segments[pathname] || 'GrandviewOS'
}

function AudioBarWithBreadcrumb() {
  const location = useLocation()
  const label = getBreadcrumb(location.pathname)
  return <PersistentAudioBar visible speakerName={label} speakerEmoji="📍" />
}

function App() {
  const [chatOpen, setChatOpen] = useState(false)
  return (
    <BrowserRouter>
      <ToastProvider>
        <PageTitle />

        <div className="flex flex-col min-h-screen">
          {/* Desktop nav */}
          <div className="hidden md:block">
            <TopNavBar />
          </div>

          {/* Mobile nav */}
          <MobileNav onChatToggle={() => setChatOpen(o => !o)} />

          <div className="flex flex-1 overflow-hidden relative">
            {/* Desktop sidebar — floating, does not push content */}
            <LeftSidebar onChatToggle={() => setChatOpen(o => !o)} />

            <main className="flex-1 overflow-y-auto px-4 py-6 md:px-10 md:py-8 lg:px-16 lg:py-10 pb-20" style={{ background: 'var(--bg-primary)' }}>
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Navigate to="/ops/task-manager" replace />} />
                  {/* Legacy routes redirect */}
                  <Route path="/task-manager" element={<Navigate to="/ops/task-manager" replace />} />
                  <Route path="/org-chart" element={<Navigate to="/ops/org-chart" replace />} />
                  <Route path="/standup" element={<Navigate to="/ops/standup" replace />} />
                  <Route path="/workspaces" element={<Navigate to="/ops/workspaces" replace />} />
                  <Route path="/docs" element={<Navigate to="/ops/docs" replace />} />
                  <Route path="/settings" element={<Navigate to="/ops/settings" replace />} />
                  {/* Ops module */}
                  <Route path="/ops" element={<Navigate to="/ops/task-manager" replace />} />
                  <Route path="/ops/task-manager" element={<TaskManager />} />
                  <Route path="/ops/org-chart" element={<OrgChart />} />
                  <Route path="/ops/standup" element={<Standup />} />
                  <Route path="/ops/workspaces" element={<Workspaces />} />
                  <Route path="/ops/docs" element={<Docs />} />
                  <Route path="/ops/settings" element={<Settings />} />
                  {/* Brain module (lazy) */}
                  <Route path="/brain" element={<Navigate to="/brain/memory" replace />} />
                  <Route path="/brain/memory" element={<LazyPage><MemoryViewer /></LazyPage>} />
                  <Route path="/brain/briefs" element={<LazyPage><DailyBriefs /></LazyPage>} />
                  <Route path="/brain/automations" element={<LazyPage><Automations /></LazyPage>} />
                  <Route path="/brain/projects" element={<LazyPage><ProjectTracking /></LazyPage>} />
                  {/* Lab module (lazy) */}
                  <Route path="/lab" element={<Navigate to="/lab/ideas" replace />} />
                  <Route path="/lab/ideas" element={<LazyPage><IdeaGallery /></LazyPage>} />
                  <Route path="/lab/prototypes" element={<LazyPage><PrototypeFleet /></LazyPage>} />
                  <Route path="/lab/reviews" element={<LazyPage><WeeklyReviews /></LazyPage>} />
                  <Route path="/lab/ideation" element={<LazyPage><IdeationLogs /></LazyPage>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ErrorBoundary>
            </main>
          </div>

          {/* Audio bar at bottom */}
          <AudioBarWithBreadcrumb />
        </div>

        <OperatorChat isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
