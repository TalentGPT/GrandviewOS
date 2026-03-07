import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const TITLES: Record<string, string> = {
  '/ops/task-manager': 'Task Manager',
  '/ops/org-chart': 'Org Chart',
  '/ops/standup': 'Standup',
  '/ops/workspaces': 'Workspaces',
  '/ops/docs': 'Documentation',
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

export default function PageTitle() {
  const location = useLocation()

  useEffect(() => {
    const title = TITLES[location.pathname]
    document.title = title ? `GrandviewOS — ${title}` : 'GrandviewOS'
  }, [location.pathname])

  return null
}
