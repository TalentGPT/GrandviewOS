export interface TranscriptMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

export interface Session {
  id: string
  title: string
  model: string
  modelColor: string
  tokens: string
  cost: string
  status: string
  statusType: 'active' | 'idle' | 'error'
  time: string
  agent?: string
  agentEmoji?: string
  transcript: TranscriptMessage[]
}

export interface CronJob {
  id: string
  name: string
  schedule: string
  lastRun: string
  nextRun: string
  status: 'active' | 'paused' | 'error'
  agent: string
  agentEmoji: string
  model: string
  modelColor: string
  tokens: string
  cost: string
}

export const sessions: Session[] = [
  {
    id: 's1', title: 'Weekly Newsletter Draft', model: 'Opus 4.6', modelColor: 'var(--model-opus)',
    tokens: '45.2K', cost: '$1.84', status: 'Generating content...', statusType: 'active', time: '2m ago',
    agent: 'Scribe', agentEmoji: '✍️',
    transcript: [
      { role: 'user', content: 'Draft this week\'s newsletter. Focus on the new partnership announcements and community growth metrics.', timestamp: '08:12:04' },
      { role: 'assistant', content: 'I\'ll draft the newsletter with three sections:\n\n1. **Partnership Spotlight** — TechCorp integration announcement\n2. **Community Pulse** — 23% engagement increase, 45 new members\n3. **What\'s Next** — Upcoming features and roadmap preview\n\nLet me start writing...', timestamp: '08:12:08' },
      { role: 'assistant', content: '## 🗞️ GrandviewOS Weekly — Issue #12\n\n### Partnership Spotlight\nWe\'re thrilled to announce our integration with TechCorp! This means seamless API access for all GrandviewOS users...\n\n### Community Pulse\nThis week saw incredible growth:\n- 45 new community members (+18% WoW)\n- 23% increase in Discord engagement\n- 12 community-contributed plugins\n\n### What\'s Next\nOur engineering team is working on Brain Module (V2) with memory viewer and daily briefs...', timestamp: '08:12:45' },
      { role: 'user', content: 'Add a section about the voice standup feature launch.', timestamp: '08:13:02' },
      { role: 'assistant', content: 'Adding voice standup section...\n\n### 🎙️ Voice Standups Are Live!\nYour AI agents can now hold autonomous voice meetings. Using Microsoft open-source TTS, agents discuss priorities, report progress, and generate action items — all without human intervention. Listen to recordings right from the Standup tab.', timestamp: '08:13:15' },
    ],
  },
  {
    id: 's2', title: 'Discord Community Pulse', model: 'Gemini 3 Flash', modelColor: 'var(--model-gemini-flash)',
    tokens: '128.5K', cost: '$0.42', status: 'Analyzing member activity...', statusType: 'active', time: '5m ago',
    agent: 'Clay', agentEmoji: '🦞',
    transcript: [
      { role: 'system', content: 'Heartbeat check triggered. Analyzing Discord community activity.', timestamp: '08:07:00' },
      { role: 'assistant', content: 'Community pulse report:\n- 23 active members in last hour\n- 4 unanswered questions in #help\n- New member @CodeNinja joined, sent welcome message\n- Trending topic: "multi-agent orchestration patterns"\n- Sentiment: 94% positive', timestamp: '08:07:12' },
      { role: 'assistant', content: 'Responding to unanswered questions:\n1. @TechBuilder asked about cron job scheduling → provided example\n2. @DesignPro asked about custom themes → linked docs\n3. @NewUser42 asked about getting started → shared quickstart guide\n4. @DevMaster asked about API limits → explained rate limiting', timestamp: '08:08:30' },
    ],
  },
  {
    id: 's3', title: 'Backend Security Audit', model: 'GPT-5.3-Codex', modelColor: 'var(--model-codex)',
    tokens: '89.1K', cost: '$2.10', status: 'Scanning dependencies...', statusType: 'active', time: '8m ago',
    agent: 'Nova', agentEmoji: '🛡️',
    transcript: [
      { role: 'user', content: 'Run full security audit on the backend. Check dependencies, auth middleware, and API endpoints.', timestamp: '08:04:00' },
      { role: 'assistant', content: 'Starting comprehensive security audit...\n\n**Phase 1: Dependency Scan**\n- Scanning 142 npm packages\n- Found 2 moderate vulnerabilities in transitive dependencies\n- lodash@4.17.20 → prototype pollution (upgrade to 4.17.21)\n- axios@0.21.1 → SSRF vulnerability (upgrade to 1.6.0)', timestamp: '08:04:15' },
      { role: 'assistant', content: '**Phase 2: Auth Middleware**\n- JWT token validation: ✅ Secure\n- Session expiry: ✅ 24h max\n- CORS configuration: ⚠️ Overly permissive (allowing *)\n- Rate limiting: ✅ 100 req/min per IP\n- CSRF protection: ⚠️ Missing on 3 POST endpoints', timestamp: '08:05:30' },
    ],
  },
  {
    id: 's4', title: 'Partnership Outreach Emails', model: 'Opus 4.6', modelColor: 'var(--model-opus)',
    tokens: '32.0K', cost: '$1.20', status: 'Drafting personalized emails...', statusType: 'active', time: '12m ago',
    agent: 'Deal', agentEmoji: '🤝',
    transcript: [
      { role: 'user', content: 'Draft outreach emails for TechCorp, AIFlow, and DataStream. Personalize each based on their product focus.', timestamp: '08:00:00' },
      { role: 'assistant', content: 'Drafting 3 personalized outreach emails:\n\n**TechCorp** — Focus on API integration synergy\n**AIFlow** — Focus on shared multi-agent vision\n**DataStream** — Focus on data pipeline collaboration\n\nStarting with TechCorp...', timestamp: '08:00:12' },
    ],
  },
  {
    id: 's5', title: 'Daily Standup Prep', model: 'Opus 4.5', modelColor: 'var(--model-opus)',
    tokens: '18.7K', cost: '$0.85', status: 'Compiling agent reports...', statusType: 'idle', time: '15m ago',
    agent: 'Ray Dalio', agentEmoji: '📊',
    transcript: [
      { role: 'system', content: 'Daily standup preparation initiated.', timestamp: '07:45:00' },
      { role: 'assistant', content: 'Gathering status from all department heads...\n\n**Engineering (Elon):** 2 PRs merged, security patch deployed\n**Marketing (Gary):** Newsletter 80% complete, social metrics up\n**Revenue (Ray Lane):** 3 partner responses received, proposals in draft', timestamp: '07:45:30' },
    ],
  },
  {
    id: 's6', title: 'SEO Keyword Research', model: 'Gemini 3 Pro', modelColor: 'var(--model-gemini-pro)',
    tokens: '62.3K', cost: '$0.95', status: 'Analyzing search trends...', statusType: 'idle', time: '20m ago',
    agent: 'Funnel', agentEmoji: '📈',
    transcript: [
      { role: 'user', content: 'Research top SEO keywords for "AI agent management" and "multi-agent orchestration".', timestamp: '07:40:00' },
      { role: 'assistant', content: 'Keyword analysis complete:\n\n| Keyword | Volume | Difficulty | CPC |\n|---------|--------|-----------|-----|\n| ai agent management | 2,400/mo | 45 | $3.20 |\n| multi-agent orchestration | 880/mo | 32 | $4.50 |\n| ai operations platform | 1,200/mo | 58 | $5.80 |\n| autonomous ai agents | 3,600/mo | 62 | $2.90 |', timestamp: '07:41:15' },
    ],
  },
  {
    id: 's7', title: 'Cron: Heartbeat Check', model: 'Opus 4.6', modelColor: 'var(--model-opus)',
    tokens: '5.1K', cost: '$0.12', status: 'All agents healthy ✓', statusType: 'idle', time: '25m ago',
    agent: 'Ray Dalio', agentEmoji: '📊',
    transcript: [
      { role: 'system', content: 'Heartbeat check — all agents.', timestamp: '07:30:00' },
      { role: 'assistant', content: 'Agent health check complete:\n- 21/21 active agents responding\n- 1 scaffolded agent (Sentinel) — not yet deployed\n- Average response time: 1.2s\n- No error states detected\n- Cost in last hour: $4.82\n\nHEARTBEAT_OK', timestamp: '07:30:08' },
    ],
  },
  {
    id: 's8', title: 'Motion Graphics Brief', model: 'Nano Banana Pro', modelColor: 'var(--model-nano)',
    tokens: '22.4K', cost: '$0.38', status: 'Rendering concepts...', statusType: 'active', time: '30m ago',
    agent: 'Motion', agentEmoji: '🎬',
    transcript: [
      { role: 'user', content: 'Create motion graphics concepts for the partnership announcement video.', timestamp: '07:30:00' },
      { role: 'assistant', content: 'Generating 3 concept directions:\n\n1. **"Connected Nodes"** — Abstract network visualization showing AI agents connecting\n2. **"Growth Spiral"** — Organic growth animation with metrics overlay\n3. **"Command Center"** — Dashboard fly-through showing real-time operations\n\nRecommendation: Concept 1 aligns best with our brand identity.', timestamp: '07:31:20' },
    ],
  },
  {
    id: 's9', title: 'API Gateway Error Handler', model: 'Codex 5.3', modelColor: 'var(--model-codex)',
    tokens: '15.8K', cost: '$0.45', status: 'Connection timeout — retrying...', statusType: 'error', time: '35m ago',
    agent: 'Atlas', agentEmoji: '🏗️',
    transcript: [
      { role: 'user', content: 'Implement error handling middleware for the API gateway.', timestamp: '07:25:00' },
      { role: 'assistant', content: 'ERROR: Connection to code repository timed out after 30s. Retrying in 5s...', timestamp: '07:25:35' },
      { role: 'system', content: 'Retry 1/3 — connecting...', timestamp: '07:25:40' },
    ],
  },
  {
    id: 's10', title: 'UI Component Library Update', model: 'Sonnet 4.5', modelColor: 'var(--model-sonnet)',
    tokens: '38.9K', cost: '$0.72', status: 'Updated 12 components', statusType: 'idle', time: '45m ago',
    agent: 'Frame', agentEmoji: '🖼️',
    transcript: [
      { role: 'user', content: 'Update the component library to use the new phosphor emerald design tokens.', timestamp: '07:15:00' },
      { role: 'assistant', content: 'Updated 12 components:\n- Button (primary, secondary, ghost variants)\n- Card (with hover glow effect)\n- Badge (model color system)\n- Input (dark theme focus states)\n- Select, Toggle, Tooltip, Modal, Toast, Tabs, Avatar, Skeleton\n\nAll passing visual regression tests.', timestamp: '07:18:45' },
    ],
  },
]

export const cronJobs: CronJob[] = [
  { id: 'c1', name: 'Heartbeat Check', schedule: 'Every 30 min', lastRun: '07:30 UTC', nextRun: '08:00 UTC', status: 'active', agent: 'Ray Dalio', agentEmoji: '📊', model: 'Opus 4.6', modelColor: 'var(--model-opus)', tokens: '5.1K', cost: '$0.12' },
  { id: 'c2', name: 'Community Pulse', schedule: 'Every 2 hours', lastRun: '06:00 UTC', nextRun: '08:00 UTC', status: 'active', agent: 'Clay', agentEmoji: '🦞', model: 'Gemini Flash', modelColor: 'var(--model-gemini-flash)', tokens: '12.3K', cost: '$0.08' },
  { id: 'c3', name: 'Daily Standup', schedule: 'Daily 08:00 UTC', lastRun: 'Yesterday', nextRun: '08:00 UTC', status: 'active', agent: 'Ray Dalio', agentEmoji: '📊', model: 'Opus 4.6', modelColor: 'var(--model-opus)', tokens: '45K', cost: '$2.10' },
  { id: 'c4', name: 'Weekly Newsletter', schedule: 'Mon 09:00 UTC', lastRun: '3 days ago', nextRun: 'Mon 09:00', status: 'active', agent: 'Scribe', agentEmoji: '✍️', model: 'Opus 4.6', modelColor: 'var(--model-opus)', tokens: '60K', cost: '$3.40' },
  { id: 'c5', name: 'Security Scan', schedule: 'Daily 03:00 UTC', lastRun: '03:00 UTC', nextRun: 'Tomorrow 03:00', status: 'active', agent: 'Nova', agentEmoji: '🛡️', model: 'Codex 5.3', modelColor: 'var(--model-codex)', tokens: '30K', cost: '$0.85' },
  { id: 'c6', name: 'SEO Report', schedule: 'Weekly Fri', lastRun: '5 days ago', nextRun: 'Fri 10:00', status: 'paused', agent: 'Funnel', agentEmoji: '📈', model: 'Gemini Pro', modelColor: 'var(--model-gemini-pro)', tokens: '0', cost: '$0.00' },
  { id: 'c7', name: 'Dependency Audit', schedule: 'Daily 04:00 UTC', lastRun: '04:00 UTC', nextRun: 'Tomorrow 04:00', status: 'active', agent: 'Nova', agentEmoji: '🛡️', model: 'Codex 5.3', modelColor: 'var(--model-codex)', tokens: '18K', cost: '$0.52' },
]

export const overnightLog = [
  { time: '02:15 UTC', event: '🛡️ Nova completed nightly security scan — 0 critical issues', type: 'success' as const },
  { time: '02:45 UTC', event: '🦞 Clay responded to 3 community questions in Discord', type: 'info' as const },
  { time: '03:00 UTC', event: '📊 Ray Dalio heartbeat — all agents healthy', type: 'success' as const },
  { time: '03:30 UTC', event: '🏗️ Atlas deployed auth middleware patch v2.1.4', type: 'success' as const },
  { time: '04:00 UTC', event: '🛡️ Nova dependency audit — 2 moderate vulnerabilities found', type: 'warning' as const },
  { time: '04:15 UTC', event: '📧 Outreach scheduled 2 follow-up emails for morning send', type: 'info' as const },
  { time: '05:00 UTC', event: '📊 Ray Dalio heartbeat — all agents healthy', type: 'success' as const },
  { time: '05:30 UTC', event: '🏗️ Atlas API gateway error — connection timeout (auto-retry succeeded)', type: 'warning' as const },
  { time: '06:00 UTC', event: '🦞 Clay community pulse — 12 active members, 94% positive sentiment', type: 'info' as const },
  { time: '06:30 UTC', event: '📱 Viral posted scheduled tweet — "AI agent orchestration tips"', type: 'success' as const },
  { time: '07:00 UTC', event: '📊 Ray Dalio heartbeat — all agents healthy', type: 'success' as const },
  { time: '07:15 UTC', event: '🖼️ Frame updated 12 UI components to new design system', type: 'success' as const },
]
