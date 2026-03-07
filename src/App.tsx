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
                  <Route path="/" element={<Navigate to="/task-manager" replace />} />
                  <Route path="/task-manager" element={<TaskManager />} />
                  <Route path="/org-chart" element={<OrgChart />} />
                  <Route path="/standup" element={<Standup />} />
                  <Route path="/workspaces" element={<Workspaces />} />
                  <Route path="/docs" element={<Docs />} />
                  <Route path="/settings" element={<Settings />} />
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
