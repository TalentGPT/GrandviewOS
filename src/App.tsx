import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import TopNavBar from './components/TopNavBar'
import LeftSidebar from './components/LeftSidebar'
import StatusBar from './components/StatusBar'
import OperatorChat from './components/OperatorChat'
import ErrorBoundary from './components/ErrorBoundary'
import PageTitle from './components/PageTitle'
import { ToastProvider } from './components/Toast'
import TaskManager from './pages/TaskManager'
import OrgChart from './pages/OrgChart'
import Standup from './pages/Standup'
import Workspaces from './pages/Workspaces'
import Docs from './pages/Docs'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'
// Brain module
import MemoryViewer from './pages/brain/MemoryViewer'
import DailyBriefs from './pages/brain/DailyBriefs'
import Automations from './pages/brain/Automations'
import ProjectTracking from './pages/brain/ProjectTracking'
// Lab module
import IdeaGallery from './pages/lab/IdeaGallery'
import PrototypeFleet from './pages/lab/PrototypeFleet'
import WeeklyReviews from './pages/lab/WeeklyReviews'
import IdeationLogs from './pages/lab/IdeationLogs'

function App() {
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <BrowserRouter>
      <ToastProvider>
        <PageTitle />

        {/* Mobile warning */}
        <div className="mobile-warning fixed inset-0 bg-black flex items-center justify-center z-50 p-8">
          <div className="text-center">
            <div className="text-4xl mb-4">🖥️</div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Desktop Required</h1>
            <p className="text-[var(--text-secondary)]">GrandviewOS requires a desktop browser (≥1024px width)</p>
          </div>
        </div>

        {/* Main app */}
        <div className="desktop-only flex flex-col min-h-screen">
          <TopNavBar />
          <div className="flex flex-1 overflow-hidden">
            <LeftSidebar onChatToggle={() => setChatOpen(o => !o)} />
            <main className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--bg-primary)' }}>
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
                  {/* Brain module */}
                  <Route path="/brain" element={<Navigate to="/brain/memory" replace />} />
                  <Route path="/brain/memory" element={<ErrorBoundary><MemoryViewer /></ErrorBoundary>} />
                  <Route path="/brain/briefs" element={<ErrorBoundary><DailyBriefs /></ErrorBoundary>} />
                  <Route path="/brain/automations" element={<ErrorBoundary><Automations /></ErrorBoundary>} />
                  <Route path="/brain/projects" element={<ErrorBoundary><ProjectTracking /></ErrorBoundary>} />
                  {/* Lab module */}
                  <Route path="/lab" element={<Navigate to="/lab/ideas" replace />} />
                  <Route path="/lab/ideas" element={<ErrorBoundary><IdeaGallery /></ErrorBoundary>} />
                  <Route path="/lab/prototypes" element={<ErrorBoundary><PrototypeFleet /></ErrorBoundary>} />
                  <Route path="/lab/reviews" element={<ErrorBoundary><WeeklyReviews /></ErrorBoundary>} />
                  <Route path="/lab/ideation" element={<ErrorBoundary><IdeationLogs /></ErrorBoundary>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ErrorBoundary>
            </main>
          </div>
          <StatusBar />
          <OperatorChat isOpen={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
