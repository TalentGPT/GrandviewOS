// API types for OpenClaw data

export interface SessionUsage {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  totalTokens: number
  cost: {
    input: number
    output: number
    cacheRead: number
    cacheWrite: number
    total: number
  }
}

export interface SessionMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  model?: string
  provider?: string
  usage?: SessionUsage
  stopReason?: string
  isToolCall?: boolean
  toolName?: string
}

export interface ApiSession {
  id: string
  timestamp: string
  lastActivity: string
  model: string
  provider: string
  messageCount: number
  totalTokens: number
  totalCost: number
  isActive: boolean
  messages: SessionMessage[]
  title: string
  lastMessage?: string
}

export interface ApiAgent {
  id: string
  name: string
  workspace: string
  hasSoul: boolean
  hasIdentity: boolean
  hasMemory: boolean
  soulSnippet: string
  files: string[]
}

export interface SystemHealth {
  gatewayRunning: boolean
  gatewayPid: number | null
  gatewayPort: number | null
  totalSessions: number
  activeSessions: number
  version: string
  uptime: string
}

export interface ApiConfig {
  model: {
    primary: string
    fallbacks: string[]
  }
  workspace: string
  channels: Record<string, { enabled: boolean }>
  agentCount: number
  maxConcurrent: number
}

export interface CronJobInfo {
  id: string
  name: string
  schedule: string
  lastRun: string
  nextRun: string
  status: string
}

// Standup types
export interface StandupParticipant {
  name: string
  emoji: string
  role: string
  voice: string
}

export interface StandupConversationMessage {
  speaker: string
  text: string
}

export interface StandupActionItem {
  text: string
  assignee: string
  done: boolean
}

export interface StandupResponse {
  id: string
  title: string
  date: string
  time: string
  status: 'running' | 'complete' | 'error'
  participants: StandupParticipant[]
  conversation: StandupConversationMessage[]
  actionItems: StandupActionItem[]
  audioFile?: string
  createdAt: string
}

// Cost types
export interface CostBreakdown {
  byModel: Record<string, { cost: number; tokens: number; sessions: number }>
  byAgent: Record<string, { cost: number; tokens: number; sessions: number }>
  total: { cost: number; tokens: number; sessions: number }
}

export interface DailyCostEntry {
  date: string
  totalCost: number
  totalTokens: number
  byModel: Record<string, { cost: number; tokens: number; sessions: number }>
  byAgent: Record<string, { cost: number; tokens: number; sessions: number }>
}
