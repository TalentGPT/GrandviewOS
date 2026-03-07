export interface Agent {
  id: string
  name: string
  emoji: string
  role: string
  title?: string
  status: 'active' | 'scaffolded' | 'deprecated' | 'idle' | 'error'
  model: string
  modelColor: string
  department?: string
  division?: string
  description?: string
}

export interface Division {
  label: string
  desc: string
  agents: Agent[]
}

export const ceoAgent: Agent = {
  id: 'marcelo', name: 'Marcelo Oliveira', emoji: '👤', role: 'Vision · Strategy · Final Decisions',
  title: 'CEO', status: 'active', model: 'Human', modelColor: 'var(--accent-gold)',
}

export const cooAgent: Agent = {
  id: 'muddy', name: 'Muddy', emoji: '🐕', role: 'Research · Delegation · Execution · Orchestration',
  title: 'COO', status: 'active', model: 'Opus 4.6', modelColor: 'var(--model-opus)',
  description: 'Chief Operating Officer. A loyal, hardworking golden retriever who never sleeps.',
}

export const departmentHeads: Agent[] = [
  { id: 'elon', name: 'Elon', emoji: '🚀', role: 'Engineering Lead', title: 'CTO', status: 'active', model: 'Opus 4.6', modelColor: 'var(--model-opus)', department: 'engineering' },
  { id: 'gary', name: 'Gary', emoji: '📣', role: 'Marketing Lead', title: 'CMO', status: 'active', model: 'Opus 4.6', modelColor: 'var(--model-opus)', department: 'marketing' },
  { id: 'warren', name: 'Warren', emoji: '💰', role: 'Revenue Lead', title: 'CRO', status: 'active', model: 'Opus 4.6', modelColor: 'var(--model-opus)', department: 'revenue' },
]

export const divisions: Record<string, Division[]> = {
  engineering: [
    { label: 'Backend & Security', desc: 'Core infrastructure and security', agents: [
      { id: 'nova', name: 'Nova', emoji: '🛡️', role: 'Security Specialist', status: 'active', model: 'Codex 5.3', modelColor: 'var(--model-codex)', department: 'engineering' },
      { id: 'atlas', name: 'Atlas', emoji: '🏗️', role: 'Backend Architect', status: 'active', model: 'Codex 5.3', modelColor: 'var(--model-codex)', department: 'engineering' },
    ]},
    { label: 'Frontend & UI', desc: 'User interfaces and design systems', agents: [
      { id: 'pixel', name: 'Pixel', emoji: '🎨', role: 'UI/UX Engineer', status: 'active', model: 'Opus 4.6', modelColor: 'var(--model-opus)', department: 'engineering' },
      { id: 'frame', name: 'Frame', emoji: '🖼️', role: 'Frontend Developer', status: 'active', model: 'Sonnet 4.5', modelColor: 'var(--model-sonnet)', department: 'engineering' },
    ]},
    { label: 'DevOps & Infra', desc: 'Deployment and infrastructure', agents: [
      { id: 'docker', name: 'Docker', emoji: '🐳', role: 'DevOps Engineer', status: 'active', model: 'Codex 5.3', modelColor: 'var(--model-codex)', department: 'engineering' },
      { id: 'sentinel', name: 'Sentinel', emoji: '📡', role: 'Monitoring Specialist', status: 'scaffolded', model: 'Gemini Flash', modelColor: 'var(--model-gemini-flash)', department: 'engineering' },
    ]},
    { label: 'QA & Testing', desc: 'Quality assurance', agents: [
      { id: 'tester', name: 'Tester', emoji: '🧪', role: 'QA Automation', status: 'active', model: 'Codex 5.3', modelColor: 'var(--model-codex)', department: 'engineering' },
    ]},
  ],
  marketing: [
    { label: 'Content & Social', desc: 'Content creation and social media', agents: [
      { id: 'scribe', name: 'Scribe', emoji: '✍️', role: 'Content Writer', status: 'active', model: 'Opus 4.6', modelColor: 'var(--model-opus)', department: 'marketing' },
      { id: 'viral', name: 'Viral', emoji: '📱', role: 'Social Media Manager', status: 'active', model: 'Gemini Flash', modelColor: 'var(--model-gemini-flash)', department: 'marketing' },
      { id: 'clay', name: 'Clay', emoji: '🦞', role: 'Community Bot', status: 'active', model: 'Gemini Flash', modelColor: 'var(--model-gemini-flash)', department: 'marketing' },
    ]},
    { label: 'Growth & Analytics', desc: 'User acquisition and analytics', agents: [
      { id: 'funnel', name: 'Funnel', emoji: '📈', role: 'Growth Hacker', status: 'active', model: 'Gemini Pro', modelColor: 'var(--model-gemini-pro)', department: 'marketing' },
      { id: 'lens', name: 'Lens', emoji: '🔍', role: 'Analytics Specialist', status: 'active', model: 'Gemini Pro', modelColor: 'var(--model-gemini-pro)', department: 'marketing' },
    ]},
    { label: 'Design & Creative', desc: 'Visual design and branding', agents: [
      { id: 'canvas', name: 'Canvas', emoji: '🎭', role: 'Creative Director', status: 'active', model: 'Nano Banana Pro', modelColor: 'var(--model-nano)', department: 'marketing' },
      { id: 'motion', name: 'Motion', emoji: '🎬', role: 'Motion Graphics', status: 'active', model: 'Nano Banana Pro', modelColor: 'var(--model-nano)', department: 'marketing' },
    ]},
  ],
  revenue: [
    { label: 'Partnerships', desc: 'Business development', agents: [
      { id: 'deal', name: 'Deal', emoji: '🤝', role: 'Partnership Manager', status: 'active', model: 'Opus 4.6', modelColor: 'var(--model-opus)', department: 'revenue' },
      { id: 'scout', name: 'Scout', emoji: '🔭', role: 'Opportunity Researcher', status: 'active', model: 'Opus 4.5', modelColor: 'var(--model-opus)', department: 'revenue' },
    ]},
    { label: 'Sales & Outreach', desc: 'Sales pipeline', agents: [
      { id: 'closer', name: 'Closer', emoji: '💼', role: 'Sales Agent', status: 'active', model: 'Opus 4.6', modelColor: 'var(--model-opus)', department: 'revenue' },
      { id: 'outreach', name: 'Outreach', emoji: '📧', role: 'Email Specialist', status: 'active', model: 'Sonnet 4.5', modelColor: 'var(--model-sonnet)', department: 'revenue' },
    ]},
  ],
}

export const deprecatedAgents: Agent[] = [
  { id: 'legacy-bot', name: 'Legacy-Bot', emoji: '💀', role: 'Deprecated v1 bot', status: 'deprecated', model: 'GPT-4', modelColor: '#666' },
  { id: 'oldscribe', name: 'OldScribe', emoji: '💀', role: 'Replaced by Scribe', status: 'deprecated', model: 'GPT-4', modelColor: '#666' },
  { id: 'proto-1', name: 'Proto-1', emoji: '💀', role: 'Early prototype', status: 'deprecated', model: 'Claude 3', modelColor: '#666' },
  { id: 'proto-2', name: 'Proto-2', emoji: '💀', role: 'Early prototype', status: 'deprecated', model: 'Claude 3', modelColor: '#666' },
  { id: 'testagent', name: 'TestAgent', emoji: '💀', role: 'Testing only', status: 'deprecated', model: 'Haiku', modelColor: 'var(--model-haiku)' },
  { id: 'draftbot', name: 'DraftBot', emoji: '💀', role: 'Draft generation', status: 'deprecated', model: 'Sonnet 3.5', modelColor: '#666' },
  { id: 'oldgrowth', name: 'OldGrowth', emoji: '💀', role: 'Replaced by Funnel', status: 'deprecated', model: 'GPT-4', modelColor: '#666' },
]

export const allActiveAgents: Agent[] = [
  cooAgent,
  ...departmentHeads,
  ...Object.values(divisions).flatMap(divs => divs.flatMap(d => d.agents)),
]

export const modelLegend = [
  { label: 'Opus', color: 'var(--model-opus)' },
  { label: 'Codex', color: 'var(--model-codex)' },
  { label: 'Sonnet', color: 'var(--model-sonnet)' },
  { label: 'Haiku', color: 'var(--model-haiku)' },
  { label: 'Gemini Flash', color: 'var(--model-gemini-flash)' },
  { label: 'Gemini Pro', color: 'var(--model-gemini-pro)' },
  { label: 'Nano Banana', color: 'var(--model-nano)' },
]
