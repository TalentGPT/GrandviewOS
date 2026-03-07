export const docsContent: Record<string, string> = {
  'Overview': `# What is Muddy OS?

Muddy OS is an AI Agent Operations System that lets a single human operator manage a fleet of 25+ AI agents organized in a corporate hierarchy. Built on OpenClaw infrastructure.

## Architecture

\`\`\`
┌─────────────────────────────────────────────┐
│              Muddy OS Frontend               │
│       React + TypeScript SPA (Tab-Based)     │
├──────────┬──────────┬───────────────────────┤
│   OPS    │  BRAIN   │         LAB            │
│(Current) │  (V2)    │        (V2)            │
├──────────┤──────────┤───────────────────────┤
│Task Mgr  │Memory    │Idea Gallery            │
│Org Chart │Viewer    │Prototype Fleet         │
│Standup   │Daily     │Weekly Reviews          │
│Workspace │Briefs    │Ideation Logs           │
│Docs      │Projects  │                        │
└──────────┴──────────┴───────────────────────┘
         │
    ┌────┴────┐
    │  Vite   │
    │  API    │
    │ Proxy   │
    └────┬────┘
         │
┌────────┴────────────────────────────────────┐
│          OpenClaw Runtime                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Gateway  │ │ Sessions │ │   Cron   │    │
│  └──────────┘ └──────────┘ └──────────┘    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │Workspaces│ │  Memory  │ │  Tools   │    │
│  └──────────┘ └──────────┘ └──────────┘    │
└─────────────────────────────────────────────┘
\`\`\`

## Tech Stack

- **Frontend:** React 19 + TypeScript + Tailwind CSS
- **Build:** Vite 7 with HMR
- **Hosting:** systemd --user service on port 7100
- **Database:** None — reads from filesystem and config files
- **Design:** Dark-mode-first "Phosphor Emerald" aesthetics
- **AI Runtime:** OpenClaw (gateway, sessions, cron, workspaces)

## Three Modules

1. **Ops** (Current) — Task Manager, Org Chart, Standups, Workspaces, Docs
2. **Brain** (V2) — Memory Viewer, Daily Briefs, Automations, Project Tracking
3. **Lab** (V2) — Idea Gallery, Prototype Fleet, Weekly Reviews, Ideation Logs`,

  'Task Manager': `# Task Manager

The Task Manager provides real-time visibility into all agent sessions, token usage, and costs.

## Features

- **5 Stat Cards:** Active, Idle, Total Sessions, Tokens Used, Total Cost
- **Model Fleet:** 2x3 grid showing all AI models with usage stats
- **Active Sessions:** Live list of running agent sessions with model tags
- **Cron Jobs:** Scheduled and weekly automated tasks
- **Overnight Log:** Summary of agent activity during off-hours
- **Live Indicator:** Green pulsing dot showing real-time data feed

## Session Viewer

Click any session to open the transcript viewer. Shows the full conversation between the operator/system and the agent, with timestamps and role indicators.

## Cost Tracking

Total Cost is displayed in RED to maintain cost awareness. Each model card and session shows individual cost breakdowns.

## Tabs

| Tab | Description |
|-----|-------------|
| Active Sessions | Currently running agent tasks |
| Cron Jobs | Scheduled recurring automations |
| Overnight Log | What happened while you slept |`,

  'Organization Chart': `# Organization Chart

The org chart visualizes the entire agent hierarchy with interactive expand/collapse.

## Hierarchy

\`\`\`
        👤 CEO (Marcelo)
             │
        🐕 COO (Muddy)
        ┌────┼────┐
   🚀 CTO  📣 CMO  💰 CRO
   (Elon)  (Gary)  (Warren)
     │       │       │
   7 agents 7 agents 4 agents
\`\`\`

## Agent Statuses

- 🟢 **Active** — Currently operational and responding
- 🟡 **Scaffolded** — Structure created, not yet deployed
- 🔴 **Deprecated** — No longer in use

## Model Assignments

Each agent is assigned a primary AI model based on task requirements:

- **Opus 4.6** — Complex reasoning, orchestration (COO, department heads, key specialists)
- **Codex 5.3** — Code generation, security audits (backend engineers)
- **Sonnet 4.5** — Balanced tasks, frontend work
- **Gemini Flash** — Fast context, community management
- **Gemini Pro** — Heavy context, analytics
- **Nano Banana Pro** — Creative and graphics generation

## Navigation

Click any agent card to navigate directly to their workspace, where you can view and edit their identity files.`,

  'Team Workspaces': `# Team Workspaces

Each agent has a dedicated workspace with identity, memory, and tools.

## Standard Files

| File | Purpose |
|------|---------|
| \`SOUL.md\` | Agent personality, behavioral rules, tone |
| \`IDENTITY.md\` | Core identity attributes and metadata |
| \`USER.md\` | Context about the human operator |
| \`TOOLS.md\` | Available tools and configurations |
| \`AGENTS.md\` | Workspace conventions and protocols |
| \`MEMORY.md\` | Long-term curated memory |
| \`HEARTBEAT.md\` | Periodic check configuration |

## Workspace Structure

\`\`\`
~/.openclaw/workspaces/
├── muddy/           # COO
│   ├── SOUL.md
│   ├── IDENTITY.md
│   ├── USER.md
│   ├── TOOLS.md
│   ├── AGENTS.md
│   ├── MEMORY.md
│   ├── HEARTBEAT.md
│   └── memory/
│       ├── 2026-03-07.md
│       └── 2026-03-06.md
├── elon/            # CTO
├── gary/            # CMO
├── warren/          # CRO
└── ...              # Specialists
\`\`\`

## Edit Mode

Click "Edit" on any file to switch to a monospace text editor. Changes are saved directly to the agent's workspace on the filesystem.`,

  'Sub-Agents & Spawning': `# Sub-Agents & Spawning

Agents can spawn sub-agents for specialized tasks, creating a dynamic hierarchy.

## How Spawning Works

1. A department head receives a complex task
2. They assess if existing specialists can handle it
3. If not, they request a new specialist spawn
4. COO (Muddy) approves and creates the workspace
5. New agent inherits department context and tools

## Spawn Configuration

\`\`\`yaml
agent:
  name: "NewSpecialist"
  department: "engineering"
  reports_to: "elon"
  model: "codex-5.3"
  tools:
    - github
    - terminal
    - web_search
  soul: |
    You are a specialist focused on...
\`\`\`

## Lifecycle

- **Created** → Workspace scaffolded with identity files
- **Active** → Running sessions, consuming tokens
- **Idle** → No active sessions, available for tasks
- **Deprecated** → Replaced or no longer needed

## Best Practices

- Keep specialist count under 10 per department
- Assign the right model for the task (don't over-provision)
- Regular cleanup of deprecated agents saves costs`,

  'Gateway vs Sub-Agents': `# Gateway vs Sub-Agents

Understanding the difference between OpenClaw gateways and the agent hierarchy.

## Gateway Architecture

\`\`\`
┌─────────────┐     ┌─────────────┐
│   Clay's    │     │   Muddy's   │
│   Gateway   │     │   Gateway   │
│  (Own)      │     │  (Shared)   │
└──────┬──────┘     └──────┬──────┘
       │                   │
   ┌───┘               ┌──┴──────────┐
   │                   │              │
 🦞 Clay          🐕 Muddy    All other
 (Community)      (COO)       agents
\`\`\`

## Key Concepts

- **Gateway** = The OpenClaw daemon that manages sessions and model access
- **Agent** = A configured identity with workspace, tools, and assigned model
- **Session** = A single conversation/task between an agent and an AI model

## Why Separate Gateways?

- **Clay** has its own gateway because it handles heavy Discord traffic
- **All other agents** share Muddy's gateway for efficiency
- Separate gateways prevent one agent's traffic from blocking others

## Sharing Model

| Agent | Gateway | Reason |
|-------|---------|--------|
| Clay | Own | Heavy community traffic, needs isolation |
| Muddy | Shared (primary) | Orchestrator, moderate traffic |
| Others | Shared (Muddy's) | Lower traffic, cost efficiency |`,

  'Voice Standup': `# Voice Standup

Autonomous agent-to-agent voice meetings with TTS audio generation.

## How It Works

1. **Trigger:** Cron job fires at scheduled time (default: daily 08:00 UTC)
2. **Participants:** COO + all department heads join automatically
3. **Discussion:** Agents share updates from their departments
4. **Action Items:** COO compiles action items from the discussion
5. **Audio:** Microsoft open-source TTS generates audio for each speaker
6. **Archive:** Meeting transcript and audio stored for review

## Meeting Format

\`\`\`
1. Roll call & agenda (COO)
2. Department updates (each head: 60-90s)
3. Cross-department syncs
4. Action items & assignments
5. Wrap-up & next meeting
\`\`\`

## Audio Player

The built-in audio player shows:
- Current speaker with emoji indicator
- Segment counter (e.g., "1/23")
- Duration tracker (e.g., "4s/24s")
- Play/pause, skip forward/back controls

## Meeting Archive

All past standups are archived with:
- Full transcript
- Audio recording
- Action items with completion tracking
- Participant list and roles`,

  'Partnership Pipeline': `# Partnership Pipeline

How the revenue team manages partnerships and sponsorships.

## Pipeline Stages

\`\`\`
Identified → Contacted → Responded → Proposal → Negotiation → Closed
    12          8           3           2           1            1
\`\`\`

## Current Pipeline

| Partner | Stage | Value | Owner |
|---------|-------|-------|-------|
| TechCorp | Proposal | $2,000/mo | Deal 🤝 |
| AIFlow | Responded | $1,500/mo | Scout 🔭 |
| DataStream | Responded | $1,000/mo | Deal 🤝 |
| CodeBase | Contacted | TBD | Outreach 📧 |
| MLOps Inc | Contacted | TBD | Outreach 📧 |

## Agent Roles

- **Deal** 🤝 — Manages active proposals and negotiations
- **Scout** 🔭 — Researches and identifies opportunities
- **Closer** 💼 — Handles final negotiations and contracts
- **Outreach** 📧 — Cold outreach and email sequences

## Revenue Targets

- **Month 1:** $500/mo (✅ Achieved — first micro-sponsorship)
- **Month 2:** $2,000/mo (In progress)
- **Month 3:** $5,000/mo (Target)
- **Month 6:** $10,000/mo (Stretch goal)`,

  'Memory Architecture': `# Memory Architecture

How agents maintain context across sessions.

## Memory Types

### Daily Notes (\`memory/YYYY-MM-DD.md\`)
Raw session logs — what happened each day. Created automatically.

### Long-term Memory (\`MEMORY.md\`)
Curated insights, lessons learned, important decisions. Maintained by each agent.

### Heartbeat State (\`memory/heartbeat-state.json\`)
Tracks periodic check timestamps to avoid redundant work.

## Memory Flow

\`\`\`
Session starts
    │
    ├─ Read SOUL.md (identity)
    ├─ Read USER.md (human context)
    ├─ Read memory/today.md (recent context)
    ├─ Read memory/yesterday.md (continuity)
    └─ If main session: Read MEMORY.md
         │
    Session work happens
         │
    ├─ Write to memory/today.md (raw logs)
    └─ Periodically update MEMORY.md (curated)
\`\`\`

## Memory Maintenance

During heartbeat checks, agents periodically:
1. Review recent daily files
2. Identify significant events worth keeping
3. Update MEMORY.md with distilled learnings
4. Remove outdated info

## Security

- MEMORY.md only loaded in main sessions (direct human chat)
- Never loaded in shared contexts (Discord, group chats)
- Prevents private context from leaking to other users`,
}
