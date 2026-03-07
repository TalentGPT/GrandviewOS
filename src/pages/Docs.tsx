import { useState } from 'react'

const navItems = [
  'Overview',
  'Task Manager',
  'Organization Chart',
  'Team Workspaces',
  'Sub-Agents & Spawning',
  'Gateway vs Sub-Agents',
  'Voice Standup',
  'Partnership Pipeline',
  'Memory Architecture',
]

const docsContent: Record<string, string[]> = {
  'Overview': [
    '# What is Muddy OS?',
    '',
    'Muddy OS is an AI Agent Operations System that lets a single human operator manage a fleet of 25+ AI agents organized in a corporate hierarchy. Built on OpenClaw infrastructure.',
    '',
    '## Architecture',
    '',
    '```',
    '┌─────────────────────────────────────────┐',
    '│            Muddy OS Frontend             │',
    '│     React + TypeScript SPA (Tab-Based)   │',
    '├──────────┬──────────┬───────────────────┤',
    '│   OPS    │  BRAIN   │       LAB          │',
    '│(Current) │  (V2)    │      (V2)          │',
    '├──────────┤──────────┤───────────────────┤',
    '│Task Mgr  │Memory    │Idea Gallery        │',
    '│Org Chart │Viewer    │Prototype Fleet     │',
    '│Standup   │Daily     │Weekly Reviews      │',
    '│Workspace │Briefs    │Ideation Logs       │',
    '│Docs      │Projects  │                    │',
    '└──────────┴──────────┴───────────────────┘',
    '```',
    '',
    '## Tech Stack',
    '',
    '- **Frontend:** React 19 + TypeScript',
    '- **Build:** Vite',
    '- **Hosting:** systemd --user service on port 7100',
    '- **Database:** None — reads from filesystem and config files',
    '- **Design:** Dark-mode-first "Phosphor Emerald" aesthetics',
    '- **AI Runtime:** OpenClaw (gateway, sessions, cron, workspaces)',
    '',
    '## Three Modules',
    '',
    '1. **Ops** (Current) — Task Manager, Org Chart, Standups, Workspaces, Docs',
    '2. **Brain** (V2) — Memory Viewer, Daily Briefs, Automations, Project Tracking',
    '3. **Lab** (V2) — Idea Gallery, Prototype Fleet, Weekly Reviews, Ideation Logs',
  ],
  'Task Manager': [
    '# Task Manager',
    '',
    'The Task Manager provides real-time visibility into all agent sessions, token usage, and costs.',
    '',
    '## Features',
    '',
    '- **5 Stat Cards:** Active, Idle, Total Sessions, Tokens Used, Total Cost',
    '- **Model Fleet:** 2x3 grid showing all AI models with usage stats',
    '- **Active Sessions:** Live list of running agent sessions with model tags',
    '- **Cron Jobs:** Scheduled and weekly automated tasks',
    '- **Live Indicator:** Green pulsing dot showing real-time data feed',
    '',
    '## Cost Tracking',
    '',
    'Total Cost is displayed in RED to maintain cost awareness. Each model card and session shows individual cost breakdowns.',
  ],
  'Organization Chart': [
    '# Organization Chart',
    '',
    'The org chart visualizes the entire agent hierarchy.',
    '',
    '## Hierarchy',
    '',
    '- **CEO** (Marcelo) — Vision, Strategy, Final Decisions',
    '- **COO** (Muddy) — Research, Delegation, Execution, Orchestration',
    '- **CTO** (Elon) — Engineering: Backend, Frontend, DevOps, QA',
    '- **CMO** (Gary) — Marketing: Content, Growth, Design',
    '- **CRO** (Warren) — Revenue: Partnerships, Sales',
    '',
    '## Agent Statuses',
    '',
    '- 🟢 **Active** — Currently operational',
    '- 🟡 **Scaffolded** — Structure created, not yet deployed',
    '- 🔴 **Deprecated** — No longer in use',
  ],
  'Team Workspaces': [
    '# Team Workspaces',
    '',
    'Each agent has a dedicated workspace with identity, memory, and tools.',
    '',
    '## Standard Files',
    '',
    '- **SOUL.md** — Agent personality and behavioral rules',
    '- **IDENTITY.md** — Core identity attributes',
    '- **USER.md** — Context about the human operator',
    '- **TOOLS.md** — Available tools and configurations',
    '- **AGENTS.md** — Workspace conventions',
    '- **MEMORY.md** — Long-term curated memory',
    '- **HEARTBEAT.md** — Periodic check configuration',
  ],
}

export default function Docs() {
  const [activeDoc, setActiveDoc] = useState('Overview')
  const lines = docsContent[activeDoc] || docsContent['Overview']

  return (
    <div className="flex gap-0 h-[calc(100vh-64px)] -m-6">
      {/* Sidebar */}
      <div className="w-56 shrink-0 overflow-y-auto border-r p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-divider)' }}>
        <div className="text-[10px] font-semibold tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>DOCUMENTATION</div>
        {navItems.map(item => (
          <button
            key={item}
            onClick={() => setActiveDoc(item)}
            className="w-full text-left px-2 py-1.5 rounded-md text-sm mb-1 cursor-pointer transition-colors"
            style={{
              background: activeDoc === item ? 'var(--accent-teal)11' : 'transparent',
              color: activeDoc === item ? 'var(--accent-teal)' : 'var(--text-secondary)',
              border: activeDoc === item ? '1px solid var(--accent-teal)33' : '1px solid transparent',
            }}
          >
            {item}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl">
          {lines.map((line, i) => {
            if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold mb-4">{line.slice(2)}</h1>
            if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-semibold mt-6 mb-3" style={{ color: 'var(--accent-teal)' }}>{line.slice(3)}</h2>
            if (line === '```') return null
            if (line.startsWith('│') || line.startsWith('├') || line.startsWith('└') || line.startsWith('┌')) {
              return <pre key={i} className="text-xs leading-tight" style={{ color: 'var(--accent-teal)', fontFamily: 'var(--font-mono)' }}>{line}</pre>
            }
            if (line.startsWith('- **')) {
              const match = line.match(/- \*\*(.+?)\*\*(.*)/)
              if (match) return <p key={i} className="text-sm my-1.5 pl-3">• <strong style={{ color: 'var(--text-primary)' }}>{match[1]}</strong><span style={{ color: 'var(--text-secondary)' }}>{match[2]}</span></p>
            }
            if (line.startsWith('- ')) return <p key={i} className="text-sm my-1.5 pl-3" style={{ color: 'var(--text-secondary)' }}>• {line.slice(2)}</p>
            if (line.match(/^\d+\./)) return <p key={i} className="text-sm my-1.5 pl-3" style={{ color: 'var(--text-secondary)' }}>{line}</p>
            if (line === '') return <br key={i} />
            return <p key={i} className="text-sm my-1.5" style={{ color: 'var(--text-primary)' }}>{line}</p>
          })}
        </div>
      </div>
    </div>
  )
}
