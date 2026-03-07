import { useState, lazy, Suspense, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import TopNavBar from './components/TopNavBar'
import LeftSidebar from './components/LeftSidebar'
import MobileNav from './components/MobileNav'
import OperatorChat from './components/OperatorChat'
import PersistentAudioBar from './components/PersistentAudioBar'
import ErrorBoundary from './components/ErrorBoundary'
import PageTitle from './components/PageTitle'
import { ToastProvider } from './components/Toast'
import { PageSkeleton } from './components/Skeleton'
import { getStoredToken } from './api/client'

// Auth pages
import Login from './pages/Login'
import Register from './pages/Register'

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

// Code-split: Integrations module
const IntegrationsLayout = lazy(() => import('./pages/integrations/IntegrationsLayout'))
const IntegrationsOverview = lazy(() => import('./pages/integrations/IntegrationsOverview'))
const SecretsManager = lazy(() => import('./pages/integrations/SecretsManager'))
const McpServers = lazy(() => import('./pages/integrations/McpServers'))
const LlmProviders = lazy(() => import('./pages/integrations/LlmProviders'))
const AgentPermissions = lazy(() => import('./pages/integrations/AgentPermissions'))

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

function getBreadcrumb(pathname: string): string {
  const segments: Record<string, string> = {
    '/ops/task-manager': 'Task Manager',
    '/ops/org-chart': 'Org Chart',
    '/ops/standup': 'Standup',
    '/ops/workspaces': 'Workspaces',
    '/ops/docs': 'Docs',
    '/ops/integrations': 'Integrations',
    '/ops/integrations/secrets': 'Secrets Manager',
    '/ops/integrations/mcp': 'MCP Servers',
    '/ops/integrations/llm': 'LLM Providers',
    '/ops/integrations/permissions': 'Agent Permissions',
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
  const [authenticated, setAuthenticated] = useState(() => !!getStoredToken())
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')

  const handleAuthenticated = useCallback(() => {
    setAuthenticated(true)
  }, [])

  if (!authenticated) {
    if (authMode === 'register') {
      return <Register onAuthenticated={handleAuthenticated} onSwitchToLogin={() => setAuthMode('login')} />
    }
    return <Login onAuthenticated={handleAuthenticated} onSwitchToRegister={() => setAuthMode('register')} />
  }

  return (
    <BrowserRouter>
      <ToastProvider>
        <PageTitle />

        <div className="flex flex-col min-h-screen">
          <div className="hidden md:block">
            <TopNavBar />
          </div>
          <MobileNav onChatToggle={() => setChatOpen(o => !o)} />

          <div className="flex flex-1 overflow-hidden relative">
            <LeftSidebar onChatToggle={() => setChatOpen(o => !o)} />

            <main className="flex-1 overflow-y-auto px-4 py-6 md:px-10 md:py-8 lg:px-16 lg:py-10 pb-20" style={{ background: 'var(--bg-primary)' }}>
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Navigate to="/ops/task-manager" replace />} />
                  <Route path="/task-manager" element={<Navigate to="/ops/task-manager" replace />} />
                  <Route path="/org-chart" element={<Navigate to="/ops/org-chart" replace />} />
                  <Route path="/standup" element={<Navigate to="/ops/standup" replace />} />
                  <Route path="/workspaces" element={<Navigate to="/ops/workspaces" replace />} />
                  <Route path="/docs" element={<Navigate to="/ops/docs" replace />} />
                  <Route path="/settings" element={<Navigate to="/ops/settings" replace />} />
                  <Route path="/ops" element={<Navigate to="/ops/task-manager" replace />} />
                  <Route path="/ops/task-manager" element={<TaskManager />} />
                  <Route path="/ops/org-chart" element={<OrgChart />} />
                  <Route path="/ops/standup" element={<Standup />} />
                  <Route path="/ops/workspaces" element={<Workspaces />} />
                  <Route path="/ops/docs" element={<Docs />} />
                  <Route path="/ops/integrations" element={<LazyPage><IntegrationsLayout /></LazyPage>}>
                    <Route index element={<IntegrationsOverview />} />
                    <Route path="secrets" element={<SecretsManager />} />
                    <Route path="mcp" element={<McpServers />} />
                    <Route path="llm" element={<LlmProviders />} />
                    <Route path="permissions" element={<AgentPermissions />} />
                  </Route>
                  <Route path="/ops/settings" element={<Settings />} />
                  <Route path="/brain" element={<Navigate to="/brain/memory" replace />} />
                  <Route path="/brain/memory" element={<LazyPage><MemoryViewer /></LazyPage>} />
                  <Route path="/brain/briefs" element={<LazyPage><DailyBriefs /></LazyPage>} />
                  <Route path="/brain/automations" element={<LazyPage><Automations /></LazyPage>} />
                  <Route path="/brain/projects" element={<LazyPage><ProjectTracking /></LazyPage>} />
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

          <AudioBarWithBreadcrumb />
        </div>

        <OperatorChat isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
