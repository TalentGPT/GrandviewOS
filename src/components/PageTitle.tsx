import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const TITLES: Record<string, string> = {
  '/task-manager': 'Task Manager',
  '/org-chart': 'Org Chart',
  '/standup': 'Standup',
  '/workspaces': 'Workspaces',
  '/docs': 'Documentation',
  '/settings': 'Settings',
}

export default function PageTitle() {
  const location = useLocation()

  useEffect(() => {
    const title = TITLES[location.pathname]
    document.title = title ? `GrandviewOS — ${title}` : 'GrandviewOS'
  }, [location.pathname])

  return null
}
