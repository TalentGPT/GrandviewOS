# Muddy OS — Complete Platform Specification

> **Generated from:** "I have 25 AI Agents working 24/7 with Openclaw" by Clearmud (Marcelo)
> **Purpose:** Implementation-ready spec for OpenClaw + Opus 4.6 to build Muddy OS exactly as demonstrated
> **Date:** 2026-03-07

---

## Table of Contents

1. [Source Analysis](#1-source-analysis)
2. [Platform Overview](#2-platform-overview)
3. [User Journeys](#3-user-journeys)
4. [Functional Requirements](#4-functional-requirements)
5. [UX/UI Specification](#5-uxui-specification)
6. [Technical Architecture](#6-technical-architecture)
7. [Data Model](#7-data-model)
8. [API/Service Design](#8-apiservice-design)
9. [Security, Privacy, Compliance](#9-security-privacy-compliance)
10. [Testing and QA Strategy](#10-testing-and-qa-strategy)
11. [Delivery Roadmap](#11-delivery-roadmap)
12. [Risks and Unknowns](#12-risks-and-unknowns)
13. [Final Build Blueprint](#13-final-build-blueprint)

---

## 1. Source Analysis

### Video Metadata

| Field | Value |
|-------|-------|
| Title | "I have 25 AI Agents working 24/7 with Openclaw" |
| URL | https://youtu.be/zwV5qC1wS6M |
| Channel | Clearmud (Marcelo) |
| Subscribers | ~520 (building in public) |
| Infrastructure | OpenClaw |
| Primary AI Model | Opus 4.6 (primary), multi-model fleet |

### Transcript Summary

Marcelo demonstrates **Muddy OS**, a custom operations dashboard built on OpenClaw that manages ~25 AI agents organized in a corporate hierarchy. The system features a desktop-like UI (Windows/Mac hybrid), a task manager showing real-time agent sessions and costs, an interactive org chart, autonomous voice standups between agents, per-agent workspaces with identity/memory/tools, and auto-updating documentation. The COO agent "Muddy" serves as the central orchestrator, delegating work to three department heads (CTO "Elon", CMO "Gary", CRO "Warren") who each manage specialized sub-agents.

### Key Observations

1. **Desktop metaphor is central** — not a web-app dashboard, but a literal OS-like interface with icons, windows, taskbar
2. **Agent identity is first-class** — each agent has a "soul" (personality file), user context, memory, and assigned tools
3. **Hierarchy matters** — delegation flows CEO → COO → Department Heads → Specialists; this is enforced, not cosmetic
4. **Multi-model is strategic** — different agents use different models based on task fit (e.g., Gemini 3 Flash for community because of heavy context)
5. **Voice standups are a differentiator** — autonomous agent-to-agent meetings with TTS, producing action items
6. **OpenClaw is the runtime** — Muddy OS is a UI/orchestration layer on top of OpenClaw's gateway, sessions, cron, and workspace primitives

### Confidence / Evidence Map

| Feature | Source | Confidence | Evidence Type |
|---------|--------|------------|---------------|
| Desktop-like UI with icons/taskbar | Demo-derived | High | Shown on screen |
| Task Manager (sessions, tokens, cost) | Demo-derived | High | Shown on screen |
| Org chart with hierarchy | Demo-derived | High | Shown on screen, explained verbally |
| Agent personalities/souls | Demo-derived | High | Explained verbally, workspace files shown |
| Voice standups with TTS | Demo-derived | High | Audio played in demo |
| Microsoft open-source TTS | Demo-derived | High | Stated explicitly (not ElevenLabs) |
| Telegram notifications | Demo-derived | High | Stated explicitly |
| Cron jobs (scheduled + weekly) | Demo-derived | High | Shown in task manager |
| Overnight log | Demo-derived | Medium | Mentioned, limited detail |
| Per-agent workspace structure | Demo-derived | High | File structure shown |
| Auto-updating documentation | Demo-derived | Medium | Mentioned, limited visual detail |
| Gateway sharing model | Demo-derived | High | Explicitly explained (Clay own gateway, others share Muddy's) |
| Agent-to-agent chat room | Demo-derived | Medium | Mentioned as agents setting up their own |
| Model assignment per agent | Demo-derived | High | Listed per agent in org chart |
| ~25 agents total | Demo-derived | High | Title + enumeration |
| Cost tracking | Demo-derived | Medium | Shown in task manager, detail level unclear |
| Transcript viewing per session | Demo-derived | High | Shown on screen |
| Action items from standups | Demo-derived | High | Described output format |
| Dashboard updates propagate to workspaces | Demo-derived | High | Explicitly explained |

---

## 2. Platform Overview

### Product Name
**Muddy OS** — AI Agent Operations System

### Vision
A desktop-like operations dashboard that lets a single human operator manage a fleet of 25+ AI agents organized in a corporate hierarchy, with autonomous inter-agent communication, voice standups, real-time cost/session monitoring, and per-agent identity management — all running on OpenClaw infrastructure.

### Problem Statement
Managing many AI agents across different models, tasks, and contexts is chaotic without centralized orchestration. There's no visibility into what agents are doing, what they cost, or how they coordinate. Muddy OS solves this by providing:
- A visual command center for all agent operations
- Structured delegation through organizational hierarchy
- Autonomous agent coordination (standups, chat rooms)
- Real-time monitoring of sessions, tokens, and costs
- Per-agent identity, memory, and workspace management

### Target Users
1. **Primary:** Solo operators / indie hackers running AI agent fleets on OpenClaw
2. **Secondary:** Small teams (2-5 people) managing AI-augmented workflows
3. **Tertiary:** Builders studying multi-agent orchestration patterns

### Value Proposition
> "One human, 25 AI agents, 24/7 operations" — Muddy OS turns OpenClaw's raw agent infrastructure into a manageable, visual, hierarchical operations system where agents self-organize, communicate autonomously, and report up through a chain of command.

---

## 3. User Journeys

### 3.1 Onboarding Journey
**Confidence:** Build-required assumption / Low (not shown in demo)

1. User has OpenClaw installed and gateway running
2. User launches Muddy OS installer/setup
3. System scaffolds workspace structure: creates COO agent ("Muddy") with default SOUL.md
4. User configures their identity (CEO name, preferences)
5. System creates default org chart with 3 empty department head slots
6. User adds first department head → system creates agent workspace with identity, tools, memory
7. Dashboard populates with first agent's session data
8. Guided prompt: "Assign your first specialist agent to a department"

### 3.2 Main Workflow (Daily Operations)
**Confidence:** Demo-derived / High

1. User opens Muddy OS dashboard → sees desktop with app icons
2. Clicks Task Manager → views active sessions, idle agents, token usage, estimated cost
3. Reviews overnight log → sees what agents accomplished while sleeping
4. Opens Org Chart → sees full hierarchy, clicks agent to view workspace
5. Triggers or reviews voice standup → listens to agent meeting audio, reviews action items
6. Issues directive to COO (Muddy) via chat → Muddy delegates to appropriate department head → head delegates to specialist
7. Monitors execution in Task Manager → views transcripts of active sessions
8. Reviews cron jobs → adjusts schedules for recurring tasks

### 3.3 Power User Journey (Agent Configuration)
**Confidence:** Demo-derived / High

1. Opens agent workspace from org chart
2. Edits SOUL.md — changes agent personality, voice, behavioral rules
3. Configures model assignment (e.g., switch from Opus 4.6 to Gemini 3 Pro)
4. Assigns/removes tools available to agent
5. Sets up cron job for agent (e.g., weekly newsletter generation)
6. Links agent to communication channels (Telegram, Discord)
7. Changes propagate: dashboard updates Muddy's workspace → Muddy updates downstream agents

### 3.4 Admin Journey (System Management)
**Confidence:** Strong inference / Medium

1. Reviews total cost across all agents and models
2. Adds/removes agents from hierarchy
3. Configures gateway sharing (which agents share which gateway)
4. Manages model fleet — adds new models, sets failsafe chains
5. Reviews and manages documentation auto-generation
6. Monitors agent health (heartbeats, session failures)

### 3.5 Failure / Recovery Journey
**Confidence:** Build-required assumption / Low

1. Agent session fails → Task Manager shows error state
2. Failsafe model kicks in (e.g., Opus 4.6 failsafe for Codex 5.3 tasks)
3. Error logged to overnight log
4. Telegram notification sent to operator
5. Operator reviews transcript, restarts or reassigns task
6. If gateway down → agents on shared gateway all halt → operator restarts gateway → agents resume from last checkpoint

---

## 4. Functional Requirements

### 4.1 Ops Dashboard (Desktop Shell)

| ID | Requirement | Priority | Source | Confidence |
|----|-------------|----------|--------|------------|
| DASH-001 | Desktop-like shell with taskbar, icons, and windowed applications | MVP | Demo-derived | High |
| DASH-002 | App icons for: Task Manager, Org Chart, Documentation, Settings | MVP | Demo-derived | High |
| DASH-003 | Windows can be opened, closed, minimized, resized | MVP | Demo-derived | High |
| DASH-004 | Multiple windows open simultaneously | MVP | Demo-derived | High |
| DASH-005 | Desktop wallpaper / theme customization | V2 | Strong inference | Low |
| DASH-006 | System tray with notifications (Telegram pings, standup complete) | V1 | Demo-derived | Medium |
| DASH-007 | Clock / status bar in taskbar | MVP | Strong inference | Medium |

### 4.2 Task Manager

| ID | Requirement | Priority | Source | Confidence |
|----|-------------|----------|--------|------------|
| TM-001 | Display count of active sessions | MVP | Demo-derived | High |
| TM-002 | Display count of idle agents | MVP | Demo-derived | High |
| TM-003 | Display total token usage | MVP | Demo-derived | High |
| TM-004 | Display estimated cost (aggregate) | MVP | Demo-derived | High |
| TM-005 | Model fleet panel — list all models with agent assignments | MVP | Demo-derived | High |
| TM-006 | Active session list — agent name, model, status, duration | MVP | Demo-derived | High |
| TM-007 | Click session → view live transcript | MVP | Demo-derived | High |
| TM-008 | Cron jobs panel — list scheduled and weekly jobs | MVP | Demo-derived | High |
| TM-009 | Create / edit / delete cron jobs | V1 | Strong inference | Medium |
| TM-010 | Overnight log — summary of agent activity during off-hours | MVP | Demo-derived | Medium |
| TM-011 | Cost breakdown per agent / per model | V1 | Strong inference | Medium |
| TM-012 | Historical token/cost charts | V2 | Build-required assumption | Low |
| TM-013 | Kill / restart session from task manager | V1 | Strong inference | Medium |

### 4.3 Org Chart

| ID | Requirement | Priority | Source | Confidence |
|----|-------------|----------|--------|------------|
| ORG-001 | Visual hierarchy: CEO → COO → Department Heads → Specialists | MVP | Demo-derived | High |
| ORG-002 | Each node shows: agent name, persona name, role, model(s) | MVP | Demo-derived | High |
| ORG-003 | Click node → open agent workspace detail | MVP | Demo-derived | High |
| ORG-004 | Add / remove agents to hierarchy via UI | V1 | Strong inference | Medium |
| ORG-005 | Drag-and-drop reorganization | V2 | Build-required assumption | Low |
| ORG-006 | Department grouping with visual sections | MVP | Demo-derived | High |
| ORG-007 | Show agent status (active/idle/error) on node | V1 | Strong inference | Medium |
| ORG-008 | Division and subdivision nesting within departments | MVP | Demo-derived | High |

### 4.4 Voice Standups

| ID | Requirement | Priority | Source | Confidence |
|----|-------------|----------|--------|------------|
| VS-001 | Trigger autonomous multi-agent voice meeting | MVP | Demo-derived | High |
| VS-002 | Each agent speaks with distinct TTS voice | MVP | Demo-derived | High |
| VS-003 | Use Microsoft open-source TTS (not ElevenLabs) | MVP | Demo-derived | High |
| VS-004 | Meeting produces structured action items checklist | MVP | Demo-derived | High |
| VS-005 | Audio file generated and playable in dashboard | MVP | Demo-derived | High |
| VS-006 | Telegram notification with audio when standup complete | MVP | Demo-derived | High |
| VS-007 | Agent personalities reflected in speech patterns | V1 | Demo-derived | Medium |
| VS-008 | Schedule standups via cron | V1 | Strong inference | Medium |
| VS-009 | Agents set up own inter-agent chat room | V1 | Demo-derived | Medium |
| VS-010 | Standup history / archive | V1 | Strong inference | Medium |
| VS-011 | Configurable meeting participants | V1 | Strong inference | Medium |

### 4.5 Agent Workspaces

| ID | Requirement | Priority | Source | Confidence |
|----|-------------|----------|--------|------------|
| WS-001 | Each agent has SOUL.md (identity/personality) | MVP | Demo-derived | High |
| WS-002 | Each agent has USER.md (context about operator) | MVP | Demo-derived | High |
| WS-003 | Each agent has own tools configuration | MVP | Demo-derived | High |
| WS-004 | Each agent has assigned-agents list | MVP | Demo-derived | High |
| WS-005 | Each agent has memory system (daily + long-term) | MVP | Demo-derived | High |
| WS-006 | Workspace file editor in dashboard | MVP | Strong inference | Medium |
| WS-007 | Gateway configuration per agent (own vs shared) | MVP | Demo-derived | High |
| WS-008 | Heartbeat configuration | MVP | Demo-derived | High |
| WS-009 | Dashboard changes auto-propagate to workspace files | MVP | Demo-derived | High |
| WS-010 | COO (Muddy) workspace = "main brain" with full context | MVP | Demo-derived | High |
| WS-011 | Model assignment per agent with failsafe chain | MVP | Demo-derived | High |

### 4.6 Documentation System

| ID | Requirement | Priority | Source | Confidence |
|----|-------------|----------|--------|------------|
| DOC-001 | Auto-generated documentation for the ops platform | V1 | Demo-derived | Medium |
| DOC-002 | Real-time updates as system changes | V1 | Demo-derived | Medium |
| DOC-003 | Agents can reference documentation | V1 | Demo-derived | Medium |
| DOC-004 | Documentation viewer in dashboard | V1 | Demo-derived | Medium |
| DOC-005 | Markdown-based documentation format | V1 | Strong inference | Medium |

### 4.7 Communication & Notifications

| ID | Requirement | Priority | Source | Confidence |
|----|-------------|----------|--------|------------|
| COM-001 | Telegram integration for notifications | MVP | Demo-derived | High |
| COM-002 | Standup audio delivery via Telegram | MVP | Demo-derived | High |
| COM-003 | Agent-to-agent messaging | V1 | Demo-derived | Medium |
| COM-004 | Operator-to-COO chat interface | MVP | Strong inference | High |
| COM-005 | Discord integration (community bot Clay) | V1 | Demo-derived | Medium |

---

## 5. UX/UI Specification

### 5.1 Sitemap

```
Muddy OS Desktop
├── Taskbar
│   ├── Start Menu / App Launcher
│   ├── Active Window Indicators
│   ├── System Tray (notifications, clock)
│   └── Agent Status Summary
├── Desktop
│   ├── App Icons
│   │   ├── Task Manager
│   │   ├── Org Chart
│   │   ├── Documentation
│   │   ├── Voice Standups
│   │   ├── Settings
│   │   └── Chat (Operator → COO)
│   └── Desktop Widgets (optional V2)
├── Task Manager Window
│   ├── Overview Panel (active, idle, tokens, cost)
│   ├── Model Fleet Panel
│   ├── Active Sessions List
│   │   └── Session Detail / Transcript View
│   ├── Cron Jobs Panel
│   └── Overnight Log
├── Org Chart Window
│   ├── Hierarchy Visualization
│   ├── Agent Detail Panel (on click)
│   └── Add/Edit Agent Form
├── Agent Workspace Window
│   ├── SOUL.md Editor
│   ├── USER.md Editor
│   ├── Tools Configuration
│   ├── Memory Browser
│   ├── Model / Gateway Config
│   └── Assigned Agents List
├── Voice Standups Window
│   ├── Standup Player
│   ├── Action Items List
│   ├── Meeting History
│   └── Schedule / Trigger Controls
├── Documentation Window
│   └── Markdown Viewer/Editor
└── Settings Window
    ├── Operator Profile
    ├── Gateway Management
    ├── Model Fleet Config
    ├── Notification Preferences
    └── Theme / Appearance
```

### 5.2 Key Screens

#### Screen 1: Desktop Shell

```
[SCREENSHOT: Full desktop view showing Windows/Mac hybrid UI. Taskbar at bottom 
with app launcher button (left), active window indicators (center), system tray 
with notification bell + clock (right). Desktop surface shows 6 app icons arranged 
in a grid: Task Manager (gauge icon), Org Chart (hierarchy icon), Documentation 
(book icon), Voice Standups (microphone icon), Settings (gear icon), Chat (speech 
bubble icon). Background is dark/muted with subtle branding. Overall aesthetic: 
clean, modern, dark theme — halfway between Windows 11 and macOS Sonoma.]
```

**Components:**
- `<Taskbar>` — fixed bottom bar, 48px height, blur background
- `<AppIcon>` — 64x64 icon + label, double-click to open, drag to reposition
- `<SystemTray>` — notification bell (badge count), clock, agent status indicator (green = all healthy)
- `<WindowManager>` — handles window open/close/minimize/resize/focus/z-order

**Interactions:**
- Double-click icon → open app window (centered, default size)
- Click taskbar indicator → focus/minimize window
- Drag window title bar → reposition
- Drag window edge → resize
- Click X → close window
- Click — → minimize to taskbar

#### Screen 2: Task Manager

```
[SCREENSHOT: Task Manager window open on desktop. Top section has 4 stat cards 
in a row: "Active Sessions: 7" (green), "Idle Agents: 18" (gray), "Tokens Today: 
2.4M" (blue), "Est. Cost: $12.47" (yellow). Below that, left panel shows "Model 
Fleet" as a vertical list of 6 models (Opus 4.6, Opus 4.5, Gemini 3 Pro, GPT 5.3 
Codex, Gemini 3 Flash, Nano Banana Pro) each with a colored dot and agent count. 
Right panel shows "Active Sessions" as a table with columns: Agent, Model, Status, 
Duration, Tokens. Below the main area, a tabbed section with "Cron Jobs" and 
"Overnight Log" tabs. Cron Jobs shows a table of scheduled tasks with next-run 
times. Dark theme, monospace numbers.]
```

**Components:**
- `<StatCard>` — icon, label, value, color-coded background
- `<ModelFleetList>` — model name, color dot, agent count, expandable to show agent names
- `<SessionTable>` — sortable columns: Agent, Model, Status (active/idle/error), Duration, Tokens
- `<SessionTranscriptModal>` — click row → slide-in panel showing live transcript with auto-scroll
- `<CronJobTable>` — job name, schedule (cron expression + human-readable), next run, agent, status
- `<OvernightLog>` — reverse-chronological list of completed tasks with timestamps

**States:**
- **Empty:** "No active sessions. Your agents are idle." with illustration
- **Loading:** Skeleton cards + shimmer on table rows
- **Error:** "Unable to connect to OpenClaw gateway. Check status." with retry button

#### Screen 3: Org Chart

```
[SCREENSHOT: Org Chart window showing a top-down tree hierarchy. Top node: "Marcelo 
(CEO)" with a crown icon. Below it, connected by a line: "Muddy (COO)" — larger 
node with a brain icon and subtitle "Research · Delegation · Orchestration · Always 
Available". Three branches below Muddy connect to department heads in colored 
sections: Left (blue): "Elon (CTO)" with sub-branches for Backend & Security, 
Frontend & DevOps, QA divisions — each showing specialist agents. Center (orange): 
"Gary (CMO)" with Content division showing Rex, Sage, Newsletter, Hype, Creative, 
Video agents. Right (green): "Warren (CRO)" with Products and Growth/Community 
divisions. Each agent node shows: name, model badge, and a status dot (green/gray/red). 
Clicking an agent highlights it and shows a detail panel on the right.]
```

**Components:**
- `<OrgNode>` — avatar/icon, name, title, model badge(s), status dot
- `<OrgTree>` — SVG/Canvas-based tree layout with animated connections
- `<DepartmentGroup>` — colored background region grouping a department's agents
- `<AgentDetailPanel>` — slide-in right panel: identity, model, tools, recent sessions, quick-edit links

**Interactions:**
- Click node → show detail panel
- Double-click node → open full agent workspace window
- Hover node → tooltip with agent summary
- Zoom/pan on tree (scroll wheel + drag)
- Collapse/expand department groups

#### Screen 4: Agent Workspace

```
[SCREENSHOT: Agent Workspace window for "Elon (CTO)". Left sidebar shows file 
tree: SOUL.md, USER.md, TOOLS.md, AGENTS.md, MEMORY.md, memory/ folder. Main 
area shows SOUL.md open in a markdown editor with syntax highlighting. Content 
visible: "# Elon — CTO\n\nYou are the Chief Technology Officer. Your personality 
is inspired by Elon Musk: bold, first-principles thinking, move fast...". Right 
sidebar shows configuration panels: Model Assignment (dropdown: "Codex 5.3" with 
"Opus 4.6 failsafe" toggle), Gateway (radio: "Shared — Muddy's Gateway"), 
Assigned Agents list (Backend team, Frontend team, QA team with their names), 
Heartbeat toggle (ON). Bottom bar shows: "Last active: 3 min ago | Sessions today: 
12 | Tokens: 340K".]
```

**Components:**
- `<WorkspaceFileTree>` — collapsible file browser for agent workspace directory
- `<MarkdownEditor>` — CodeMirror/Monaco-based editor with live preview toggle
- `<ModelAssignment>` — dropdown for primary model + failsafe toggle/dropdown
- `<GatewayConfig>` — radio: own gateway | shared (select which)
- `<AssignedAgentsList>` — list of subordinate agents with add/remove
- `<AgentStatusBar>` — last active, session count, token count

#### Screen 5: Voice Standups

```
[SCREENSHOT: Voice Standups window. Top section shows "Latest Standup — March 7, 
2026, 02:00 UTC" with a large audio player (waveform visualization, play/pause, 
scrubber, speed control 1x/1.5x/2x). Below the player, a "Participants" row shows 
avatar bubbles for Muddy, Elon, Gary, Warren with their names. Below that, 
"Transcript" section shows the meeting conversation with speaker labels and 
timestamps: "[Muddy 00:00] Good morning team. Let's review overnight progress..." 
"[Elon 00:23] Backend migration completed successfully. QA found two edge cases..." 
At the bottom, "Action Items" section shows a checklist: ☑ Backend: Deploy hotfix 
for edge case #1 (Elon) ☐ Content: Publish newsletter draft (Gary) ☐ Growth: 
Review community feedback report (Warren). Right sidebar shows "Meeting History" 
as a scrollable list of past standups with dates.]
```

**Components:**
- `<AudioPlayer>` — waveform visualization, play/pause, scrub, speed control, download
- `<ParticipantRow>` — avatar bubbles with names, voice assignments
- `<MeetingTranscript>` — speaker-labeled, timestamped conversation log
- `<ActionItemsList>` — checklist with assignee, status (done/pending), due context
- `<MeetingHistory>` — date-sorted list, click to load past standup
- `<StandupTrigger>` — "Start New Standup" button + participant selector
- `<ScheduleConfig>` — cron-based scheduling for recurring standups

#### Screen 6: Chat Interface (Operator → COO)

```
[SCREENSHOT: Chat window with "Muddy (COO)" as the recipient. Standard chat 
UI: message list showing conversation. User message: "Muddy, I need a new 
landing page for the product launch next week." Muddy's reply: "On it. I'll 
assign this to Elon's Frontend team. Pixel will handle the design, Sentry 
will set up deployment. I'll have Gary's team prepare the copy. ETA: 48 hours. 
I'll keep you posted via Telegram." Below, a message input with send button. 
Status indicator shows "Muddy: Online — Processing 3 tasks".]
```

**Components:**
- `<ChatWindow>` — standard chat UI, markdown rendering in messages
- `<MessageInput>` — text area + send button + attachment support
- `<AgentStatusIndicator>` — online/busy/offline + current task summary

### 5.3 Responsive Design

**Confidence:** Build-required assumption / Low

| Breakpoint | Behavior |
|-----------|----------|
| ≥1280px (Desktop) | Full OS experience — multiple windows, drag/resize |
| 1024-1279px | Simplified — single window focus, taskbar persists |
| <1024px | Not supported for MVP — show "Muddy OS requires a desktop browser" |

### 5.4 Design System

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#0d1117` | Desktop background, window backgrounds |
| `--bg-secondary` | `#161b22` | Panels, cards |
| `--bg-tertiary` | `#21262d` | Hover states, active items |
| `--border` | `#30363d` | Window borders, dividers |
| `--text-primary` | `#e6edf3` | Main text |
| `--text-secondary` | `#8b949e` | Secondary labels |
| `--accent-blue` | `#58a6ff` | Links, active states, CTO department |
| `--accent-orange` | `#f0883e` | Warnings, CMO department |
| `--accent-green` | `#3fb950` | Success, active status, CRO department |
| `--accent-red` | `#f85149` | Errors, kill actions |
| `--accent-purple` | `#bc8cff` | COO/Muddy branding |
| `--font-mono` | `'JetBrains Mono', monospace` | Code, numbers, transcripts |
| `--font-sans` | `'Inter', sans-serif` | UI text |
| `--radius` | `8px` | Border radius for cards/windows |
| `--window-radius` | `12px` | Window corner radius |

---

## 6. Technical Architecture

### 6.1 High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│                  Muddy OS Frontend               │
│          (React SPA — Desktop Shell UI)          │
├─────────────────────────────────────────────────┤
│              Muddy OS Backend API                │
│     (Node.js / Express or Fastify server)        │
├──────────┬──────────┬──────────┬────────────────┤
│ OpenClaw │ OpenClaw │ OpenClaw │  External       │
│ Gateway  │ Sessions │ Cron     │  Services       │
│ API      │ API      │ API      │  (TTS, Telegram)│
├──────────┴──────────┴──────────┴────────────────┤
│              OpenClaw Runtime                     │
│   (Gateway daemon, workspace files, agents)      │
├─────────────────────────────────────────────────┤
│          AI Model Providers                      │
│  (Anthropic, OpenAI, Google, Nano Banana)        │
└─────────────────────────────────────────────────┘
```

### 6.2 Frontend

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| Framework | **React 19 + TypeScript** | Component model fits windowed UI; ecosystem |
| State | **Zustand** | Lightweight, good for cross-window state |
| Styling | **Tailwind CSS + CSS custom properties** | Rapid iteration, theming via tokens |
| Window Manager | **Custom** (or `react-rnd` for drag/resize) | Desktop metaphor requires custom window management |
| Org Chart | **React Flow** or **D3.js** | Tree visualization with interactivity |
| Markdown Editor | **CodeMirror 6** | Lightweight, extensible, good for workspace files |
| Audio Player | **WaveSurfer.js** | Waveform visualization for standup playback |
| Real-time | **WebSocket** (via backend) | Live session transcripts, status updates |
| Build | **Vite** | Fast dev, optimized production builds |

### 6.3 Backend

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| Runtime | **Node.js 22 + TypeScript** | Matches OpenClaw ecosystem |
| Framework | **Fastify** | Performance, schema validation |
| WebSocket | **`ws`** or **Socket.IO** | Real-time session transcript streaming |
| File ops | **Direct filesystem** | OpenClaw workspaces are file-based |
| TTS | **Microsoft SpeechT5 / Edge TTS** (open-source) | Demo-derived: explicitly not ElevenLabs |
| Telegram | **Telegraf** or direct Bot API | Notification delivery |
| Process | **Child processes** via OpenClaw CLI | Session management, gateway control |

### 6.4 Database

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| Primary | **SQLite** (via `better-sqlite3`) | Single-operator system, no need for Postgres complexity |
| Schema | See Data Model (§7) | Sessions, costs, standups, cron history |
| File storage | **Filesystem** | Workspace files, audio files, documentation — stays aligned with OpenClaw's file-based model |
| Caching | **In-memory** (Map/LRU) | Session state, org chart, model fleet |

**Confidence:** Build-required assumption / Medium — demo doesn't show database technology, but SQLite fits the single-operator model.

### 6.5 AI Layer

```
┌──────────────────────────────────┐
│        Muddy OS AI Layer         │
├──────────────────────────────────┤
│ Model Router                     │
│  ├─ Agent → Model mapping        │
│  ├─ Failsafe chain resolution    │
│  └─ Cost tracking per request    │
├──────────────────────────────────┤
│ Standup Orchestrator             │
│  ├─ Multi-agent conversation     │
│  │   loop (turn-based)           │
│  ├─ Action item extraction       │
│  └─ TTS pipeline per speaker     │
├──────────────────────────────────┤
│ Delegation Engine                │
│  ├─ COO receives all directives  │
│  ├─ Routes to department head    │
│  └─ Head routes to specialist    │
├──────────────────────────────────┤
│ Workspace Sync                   │
│  ├─ Dashboard edits → file write │
│  ├─ COO context propagation      │
│  └─ Documentation auto-update    │
└──────────────────────────────────┘
```

**Model Fleet (Demo-derived):**

| Model | Provider | Primary Use |
|-------|----------|-------------|
| Opus 4.6 | Anthropic | Primary — research, orchestration, complex tasks, failsafe |
| Opus 4.5 | Anthropic | Secondary — specific agent assignments |
| Sonnet 4.5 | Anthropic | Output generation (scripts, content posting) |
| GPT 5.3 Codex | OpenAI | Backend code, QA audit |
| Gemini 3 Pro | Google | Video/motion graphics, heavy context tasks |
| Gemini 3 Flash | Google | Community/growth — fast, cheap, heavy context |
| Nano Banana Pro | Nano Banana | Creative/graphics generation |

### 6.6 Infrastructure / DevOps

| Aspect | Approach |
|--------|----------|
| Deployment | Single machine (operator's server or VPS) — monolith |
| Process manager | PM2 or systemd for backend |
| OpenClaw | `openclaw gateway start` — managed by Muddy OS |
| Reverse proxy | Caddy or nginx (optional, for HTTPS) |
| Backups | Workspace files: git-based; SQLite: daily file copy |
| Monitoring | Built-in Task Manager; healthcheck endpoint |

---

## 7. Data Model

### Core Entities

#### Agent
```
Agent {
  id              TEXT PRIMARY KEY    -- slug: "muddy", "elon", "gary", etc.
  name            TEXT NOT NULL       -- Display name: "Muddy"
  persona         TEXT                -- Persona inspiration: "COO", "Elon Musk-inspired CTO"
  role            TEXT NOT NULL       -- "ceo" | "coo" | "department_head" | "specialist"
  department      TEXT                -- "engineering" | "marketing" | "revenue" | null
  division        TEXT                -- "backend_security" | "content" | etc.
  parent_id       TEXT REFERENCES Agent(id)  -- Reports to
  primary_model   TEXT NOT NULL       -- "opus-4.6", "codex-5.3", etc.
  failsafe_model  TEXT                -- Fallback model
  gateway_mode    TEXT NOT NULL       -- "own" | "shared"
  gateway_id      TEXT                -- If shared, which gateway
  heartbeat       BOOLEAN DEFAULT true
  workspace_path  TEXT NOT NULL       -- Filesystem path to agent workspace
  soul_md         TEXT                -- Content of SOUL.md (cached)
  status          TEXT DEFAULT 'idle' -- "active" | "idle" | "error"
  created_at      DATETIME
  updated_at      DATETIME
}
```

#### Session
```
Session {
  id              TEXT PRIMARY KEY    -- OpenClaw session ID
  agent_id        TEXT REFERENCES Agent(id)
  model           TEXT NOT NULL
  status          TEXT NOT NULL       -- "active" | "completed" | "failed"
  started_at      DATETIME
  ended_at        DATETIME
  tokens_in       INTEGER DEFAULT 0
  tokens_out      INTEGER DEFAULT 0
  estimated_cost  REAL DEFAULT 0.0
  transcript      TEXT                -- Full transcript (or path to file)
  error           TEXT                -- Error message if failed
}
```

#### CronJob
```
CronJob {
  id              TEXT PRIMARY KEY
  agent_id        TEXT REFERENCES Agent(id)
  name            TEXT NOT NULL
  schedule        TEXT NOT NULL       -- Cron expression
  schedule_type   TEXT NOT NULL       -- "scheduled" | "weekly"
  command         TEXT NOT NULL       -- What to execute
  last_run        DATETIME
  next_run        DATETIME
  status          TEXT DEFAULT 'active' -- "active" | "paused" | "error"
  created_at      DATETIME
}
```

#### Standup
```
Standup {
  id              TEXT PRIMARY KEY
  triggered_at    DATETIME
  completed_at    DATETIME
  participants    JSON                -- ["muddy", "elon", "gary", "warren"]
  audio_path      TEXT                -- Path to generated audio file
  transcript      JSON                -- [{speaker, timestamp, text}, ...]
  action_items    JSON                -- [{text, assignee, status}, ...]
  status          TEXT                -- "running" | "completed" | "failed"
}
```

#### OvernightLog
```
OvernightLogEntry {
  id              INTEGER PRIMARY KEY AUTOINCREMENT
  agent_id        TEXT REFERENCES Agent(id)
  timestamp       DATETIME
  summary         TEXT
  session_id      TEXT REFERENCES Session(id)
  category        TEXT                -- "completed" | "error" | "info"
}
```

#### ModelConfig
```
ModelConfig {
  id              TEXT PRIMARY KEY    -- "opus-4.6"
  provider        TEXT NOT NULL       -- "anthropic" | "openai" | "google" | "nanobanana"
  display_name    TEXT NOT NULL
  cost_per_1k_in  REAL               -- Input token cost
  cost_per_1k_out REAL               -- Output token cost
  max_context     INTEGER
  capabilities    JSON                -- ["code", "vision", "tts", ...]
}
```

### Relationships

```
Agent 1──N Session       (agent has many sessions)
Agent 1──N CronJob       (agent has many cron jobs)
Agent 1──N Agent         (parent has many children — org hierarchy)
Agent N──M Standup       (via participants JSON)
Session 1──? OvernightLog (session may produce overnight log entry)
Agent 1──1 ModelConfig   (primary model)
Agent 0..1──1 ModelConfig (failsafe model)
```

---

## 8. API / Service Design

### 8.1 REST API Endpoints

All endpoints prefixed with `/api/v1`. Auth via API key header (`X-Muddy-Key`).

#### Agents

| Method | Path | Purpose | Input | Output |
|--------|------|---------|-------|--------|
| GET | `/agents` | List all agents | `?status=active&department=engineering` | `Agent[]` |
| GET | `/agents/:id` | Get agent detail | — | `Agent` with workspace stats |
| POST | `/agents` | Create agent | `{name, persona, role, department, parent_id, primary_model, ...}` | `Agent` |
| PATCH | `/agents/:id` | Update agent | Partial `Agent` fields | `Agent` |
| DELETE | `/agents/:id` | Remove agent | — | `204` |
| GET | `/agents/:id/workspace/:file` | Read workspace file | — | `{content: string}` |
| PUT | `/agents/:id/workspace/:file` | Write workspace file | `{content: string}` | `200` |
| GET | `/agents/org-chart` | Get full hierarchy | — | `OrgTree` (nested structure) |

#### Sessions

| Method | Path | Purpose | Input | Output |
|--------|------|---------|-------|--------|
| GET | `/sessions` | List sessions | `?status=active&agent_id=elon` | `Session[]` |
| GET | `/sessions/:id` | Get session detail | — | `Session` with transcript |
| GET | `/sessions/:id/transcript` | Stream transcript | — | SSE stream of transcript lines |
| POST | `/sessions/:id/kill` | Kill session | — | `200` |
| GET | `/sessions/stats` | Aggregate stats | `?period=today` | `{active, idle, tokens, cost}` |

#### Cron Jobs

| Method | Path | Purpose | Input | Output |
|--------|------|---------|-------|--------|
| GET | `/cron-jobs` | List all cron jobs | — | `CronJob[]` |
| POST | `/cron-jobs` | Create cron job | `{agent_id, name, schedule, command}` | `CronJob` |
| PATCH | `/cron-jobs/:id` | Update cron job | Partial fields | `CronJob` |
| DELETE | `/cron-jobs/:id` | Delete cron job | — | `204` |

#### Standups

| Method | Path | Purpose | Input | Output |
|--------|------|---------|-------|--------|
| GET | `/standups` | List standups | `?limit=10` | `Standup[]` |
| POST | `/standups` | Trigger new standup | `{participants: string[]}` | `Standup` (status: running) |
| GET | `/standups/:id` | Get standup detail | — | `Standup` with transcript + action items |
| GET | `/standups/:id/audio` | Download audio | — | Audio file (WAV/MP3) |
| PATCH | `/standups/:id/action-items/:idx` | Toggle action item | `{status: "done"|"pending"}` | `200` |

#### Overnight Log

| Method | Path | Purpose | Input | Output |
|--------|------|---------|-------|--------|
| GET | `/overnight-log` | Get overnight log | `?date=2026-03-07` | `OvernightLogEntry[]` |

#### Models

| Method | Path | Purpose | Input | Output |
|--------|------|---------|-------|--------|
| GET | `/models` | List model fleet | — | `ModelConfig[]` |
| GET | `/models/usage` | Model usage stats | `?period=today` | `{model, tokens, cost, sessions}[]` |

#### System

| Method | Path | Purpose | Input | Output |
|--------|------|---------|-------|--------|
| GET | `/system/health` | Health check | — | `{gateway: "up", agents: 25, sessions: 7}` |
| GET | `/system/gateway` | Gateway status | — | `{status, uptime, version}` |
| POST | `/system/gateway/restart` | Restart gateway | — | `200` |

### 8.2 WebSocket Events

Connection: `ws://localhost:PORT/ws`

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `session:update` | Server → Client | `{session_id, status, tokens, cost}` | Real-time session stats |
| `session:transcript` | Server → Client | `{session_id, line}` | Live transcript streaming |
| `agent:status` | Server → Client | `{agent_id, status}` | Agent status changes |
| `standup:progress` | Server → Client | `{standup_id, speaker, text}` | Live standup progress |
| `standup:complete` | Server → Client | `{standup_id}` | Standup finished |
| `notification` | Server → Client | `{type, message, agent_id}` | General notifications |
| `chat:message` | Bidirectional | `{from, to, text}` | Operator ↔ Agent chat |

### 8.3 Auth

| Mechanism | Scope | Implementation |
|-----------|-------|----------------|
| API Key | All REST endpoints | `X-Muddy-Key` header; single operator key stored in config |
| WebSocket auth | WS connection | API key sent in initial handshake query param |
| OpenClaw auth | Backend → OpenClaw | Uses OpenClaw's existing gateway auth |

**Confidence:** Build-required assumption / Medium — demo doesn't cover auth, but single-operator key is simplest.

---

## 9. Security, Privacy, Compliance

### 9.1 Security

| Area | Approach | Confidence |
|------|----------|------------|
| Network | Bind to localhost by default; reverse proxy for remote access | Build-required assumption |
| API auth | Single operator API key; rotate-able | Build-required assumption |
| Workspace isolation | Each agent workspace is a directory with controlled file access | Demo-derived |
| Model API keys | Stored in OpenClaw config, not in Muddy OS DB | Strong inference |
| Gateway access | Agents access only their assigned gateway | Demo-derived |
| Session transcripts | Stored locally, not transmitted externally | Strong inference |
| Input sanitization | All API inputs validated via JSON schema | Build-required assumption |
| CORS | Restrict to localhost / configured origin | Build-required assumption |

### 9.2 Privacy

| Area | Approach |
|------|----------|
| Data residency | All data local to operator's machine |
| Transcript retention | Configurable retention period (default: 30 days) |
| Agent memory | Per-agent, isolated in workspace directory |
| Telemetry | None — no data sent to Muddy OS team (doesn't exist) |
| Model provider data | Subject to each provider's data policy (Anthropic, OpenAI, Google) |

### 9.3 Compliance

Not applicable for MVP (single-operator tool). If productized:
- GDPR considerations for agent-processed personal data
- SOC 2 if handling customer data through agents
- Model provider ToS compliance for automated agent usage

---

## 10. Testing and QA Strategy

### 10.1 Testing Layers

| Layer | Tool | Coverage Target | Priority |
|-------|------|-----------------|----------|
| Unit tests (backend) | Vitest | API handlers, model router, cost calculator | MVP |
| Unit tests (frontend) | Vitest + React Testing Library | Components, state management | MVP |
| Integration tests | Vitest + Supertest | API endpoints with SQLite test DB | MVP |
| E2E tests | Playwright | Critical flows: open task manager, view sessions, trigger standup | V1 |
| Window manager tests | Playwright | Open/close/resize/drag windows | V1 |
| WebSocket tests | Custom harness | Transcript streaming, status updates | V1 |
| Performance | Lighthouse + custom | Dashboard load <2s, 25 agents rendering smoothly | V1 |

### 10.2 QA Scenarios

| Scenario | Test |
|----------|------|
| 25 agents, 10 active sessions | Load test: Task Manager renders without lag |
| Org chart with full hierarchy | All nodes visible, clickable, detail panel opens |
| Voice standup with 4 participants | Audio generated, transcript correct, action items extracted |
| Cron job fires overnight | Overnight log populated, session recorded |
| Gateway crash mid-session | Error states shown, recovery on restart |
| Workspace file edit via UI | File written correctly, COO context updated |
| Concurrent window operations | Multiple windows open without z-order bugs |

### 10.3 QA Agent (Meta)

Per the demo, the org chart includes a QA division under CTO "Elon" with an Audit agent (Codex 5.3 + Opus 4.6 hybrid). In the built system, this agent can:
- Run automated test suites via cron
- Review code changes for security issues
- Audit agent workspace configurations for consistency
- Report findings in overnight log

---

## 11. Delivery Roadmap

### MVP (Weeks 1-4)

**Goal:** Working desktop shell with Task Manager and Org Chart, backed by real OpenClaw data.

| Week | Deliverables |
|------|-------------|
| 1 | Project scaffold (React + Vite + Fastify + SQLite). Desktop shell: taskbar, window manager, app icons. Basic theming. |
| 2 | Task Manager: stat cards (active sessions, idle, tokens, cost), active session list, transcript viewer. Backend: OpenClaw session polling + WebSocket streaming. |
| 3 | Org Chart: tree visualization, agent nodes, department grouping, agent detail panel. Agent CRUD API. |
| 4 | Agent Workspace: file browser, SOUL.md/USER.md editor, model/gateway config. Workspace sync (dashboard → files). Integration testing. |

### V1 (Weeks 5-8)

| Week | Deliverables |
|------|-------------|
| 5 | Voice Standups: multi-agent conversation orchestrator, Microsoft TTS integration, audio generation pipeline. |
| 6 | Voice Standups cont.: audio player UI, transcript display, action items extraction, Telegram notification. |
| 7 | Cron job management UI. Overnight log. Cost breakdown per agent/model. Session kill/restart. |
| 8 | Documentation system (auto-generated, viewer in dashboard). Chat interface (Operator → COO). Polish + bug fixes. |

### V2 (Weeks 9-12)

| Week | Deliverables |
|------|-------------|
| 9 | Agent-to-agent chat rooms. Standup scheduling via cron. Meeting history archive. |
| 10 | Historical analytics (token/cost charts over time). Desktop customization (wallpaper, themes). |
| 11 | Drag-and-drop org chart editing. Agent creation wizard. Notification center (system tray). |
| 12 | Performance optimization, E2E test suite, deployment documentation, backup system. |

### Team Composition (Recommended)

| Role | Count | Responsibility |
|------|-------|----------------|
| Full-stack AI engineer (Opus 4.6 agent) | 1 | Primary builder — all features |
| Human operator (Joe) | 1 | Direction, review, testing |

**Note:** This is designed to be built by a single AI agent (Opus 4.6) directed by Joe through OpenClaw — matching the meta-nature of the project.

---

## 12. Risks and Unknowns

### High Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| **OpenClaw API stability** — Muddy OS depends on OpenClaw internals (session listing, workspace structure) that may not have stable public APIs | Core functionality breaks on OpenClaw update | Abstract OpenClaw interactions behind adapter layer; pin OpenClaw version |
| **TTS quality/latency** — Microsoft open-source TTS for multi-voice standups may have quality/speed issues | Poor standup experience | Pre-generate voices; cache voice models; allow fallback to text-only standups |
| **25-agent coordination complexity** — Orchestrating 25 agents with hierarchy, failsafes, and auto-delegation | Cascading failures, confused delegation | Start with 5 agents in MVP; add incrementally; extensive logging |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Cost runaway** — 25 agents on expensive models (Opus 4.6) running 24/7 | Unexpected bills | Cost alerts, daily budgets, model tier optimization |
| **Window manager complexity** — Custom desktop metaphor has edge cases (z-order, resize, multi-monitor) | UX bugs, frustrated users | Use proven library (react-rnd); limit to single-window focus for MVP if needed |
| **Transcript streaming performance** — Live streaming of multiple session transcripts via WebSocket | UI lag, dropped messages | Throttle updates; paginate transcripts; virtualized lists |

### Low Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Model fleet changes** — Models listed in demo may be deprecated/renamed | Config needs updating | Model fleet is configurable, not hardcoded |
| **Single operator limitation** — No multi-user support | Can't share dashboard | Out of scope for MVP; add auth layer later if needed |

### Unknowns

| Unknown | Impact | Resolution Path |
|---------|--------|-----------------|
| How does OpenClaw expose session listing/streaming programmatically? | Determines backend implementation | Investigate `openclaw` CLI output format; check for REST/WS APIs |
| How does the COO-to-department-head delegation actually work mechanically? | Core orchestration logic | Likely: COO agent's SOUL.md contains instructions to spawn subagent sessions; test with OpenClaw's session/subagent primitives |
| What is the exact TTS model/library Marcelo uses? | TTS pipeline implementation | "Microsoft open-source TTS" → likely Edge-TTS (azure-cognitiveservices-speech-sdk) or SpeechT5; test both |
| How are agent workspaces structured on disk? | File operations | Follow OpenClaw's standard: `~/.openclaw/workspace/` per agent, with SOUL.md, USER.md, TOOLS.md, AGENTS.md, MEMORY.md, memory/ |
| How does "Muddy updates agent workspaces automatically" work? | Workspace sync feature | COO agent likely has file write access to other agent workspaces; Muddy OS UI writes files directly, then notifies COO |

---

## 13. Final Build Blueprint

### Summary

Muddy OS is a **desktop-metaphor web application** that provides a visual operations dashboard for managing 25+ AI agents running on OpenClaw. It wraps OpenClaw's file-based workspace system, session management, and cron infrastructure with a rich UI featuring a window manager, task manager, org chart, agent workspace editor, and voice standup system.

### Recommended Stack

```
Frontend:  React 19 + TypeScript + Vite + Tailwind CSS + Zustand
           react-rnd (window management), React Flow (org chart),
           CodeMirror 6 (editors), WaveSurfer.js (audio)

Backend:   Node.js 22 + Fastify + TypeScript
           better-sqlite3, ws (WebSocket), edge-tts (Microsoft TTS)
           Telegraf (Telegram bot)

Database:  SQLite (sessions, costs, standups, cron history)
Filesystem: OpenClaw workspace directories (agent identity, memory, tools)

Infra:     Single machine, PM2 process manager
           OpenClaw gateway as runtime dependency
```

### Core Architecture (One Diagram)

```
[Browser] ←→ [React Desktop Shell]
                    ↕ REST + WS
            [Fastify Backend API]
            ↙       ↓         ↘
    [SQLite DB] [OpenClaw CLI] [TTS Engine]
                     ↓              ↓
              [Agent Sessions]  [Audio Files]
              [Workspace Files] [Telegram Bot]
              [Cron Jobs]
```

### Fastest MVP Path

1. **Day 1-2:** Scaffold project. Desktop shell with window manager (taskbar, icons, open/close/minimize). Static mock data.
2. **Day 3-5:** Backend API + SQLite. OpenClaw integration: poll `openclaw gateway status`, parse session data, expose via REST.
3. **Day 6-8:** Task Manager — wire to real data. Stat cards, session list, basic transcript viewing.
4. **Day 9-11:** Org Chart — hardcode initial hierarchy from demo data, render with React Flow, agent detail panel.
5. **Day 12-14:** Agent Workspace — file tree, markdown editor for SOUL.md/USER.md, save to filesystem.

**14-day MVP** delivers: working desktop shell + task manager + org chart + workspace editor, all wired to real OpenClaw data.

### Top Blockers

1. **Understanding OpenClaw's programmatic API** — need to know how to list sessions, read transcripts, manage cron jobs programmatically (not just via CLI)
2. **Window manager UX** — custom desktop metaphor is the highest-risk UI component; consider starting with tabbed interface as fallback
3. **TTS pipeline** — multi-voice standup generation requires testing model download, voice assignment, audio concatenation
4. **Real-time session streaming** — need to tail/stream OpenClaw session transcripts into WebSocket; method unclear
5. **Agent hierarchy enforcement** — how delegation actually routes through OpenClaw (session spawning, context passing)

### Top 10 Decisions

| # | Decision | Recommendation | Rationale |
|---|----------|---------------|-----------|
| 1 | Desktop metaphor vs. standard dashboard | **Desktop metaphor** | Core to Muddy OS identity; demonstrated in video; differentiator |
| 2 | SQLite vs. PostgreSQL | **SQLite** | Single operator, single machine, simplicity |
| 3 | Custom window manager vs. library | **react-rnd + custom shell** | Library handles drag/resize; custom shell for taskbar/icons/z-order |
| 4 | TTS provider | **edge-tts** (Microsoft Edge TTS, open source) | Demo says Microsoft open-source; edge-tts npm package is free, no API key |
| 5 | Org chart library | **React Flow** | Handles tree layout, zoom/pan, custom nodes; well-maintained |
| 6 | OpenClaw integration method | **CLI parsing + file system** | Most reliable; OpenClaw may not have REST API; workspace is file-based |
| 7 | Real-time approach | **WebSocket + polling hybrid** | WS for transcripts/status; poll for session list every 5s |
| 8 | Agent workspace editing | **Direct file write** | OpenClaw workspaces are files; no abstraction needed |
| 9 | Standup orchestration | **Backend turn-based loop** | Backend sends each agent's message as prompt to next; concatenates TTS outputs |
| 10 | Deployment model | **Single binary / `npm start`** | Operator runs on their own machine alongside OpenClaw |

---

*End of specification. This document is designed to be fed directly to an AI agent (Opus 4.6) running on OpenClaw for implementation. Each section provides enough detail for autonomous building with minimal human clarification.*
