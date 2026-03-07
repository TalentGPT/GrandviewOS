export interface Participant {
  name: string
  emoji: string
  role: string
  color: string
}

export interface ConversationMessage {
  speaker: Participant
  text: string
}

export interface ActionItem {
  text: string
  assignee: Participant
  done: boolean
}

export interface StandupMeeting {
  id: string
  title: string
  date: string
  time: string
  participants: Participant[]
  conversation: ConversationMessage[]
  actionItems: ActionItem[]
  audioSegments: number
  audioDuration: string
}

const rayDalio: Participant = { name: 'Ray Dalio', emoji: '●', role: 'COO', color: 'var(--accent-teal)' }
const steveJobs: Participant = { name: 'Steve Jobs', emoji: '●', role: 'CMO', color: '#FF9800' }
const elon: Participant = { name: 'Elon', emoji: '●', role: 'CTO', color: '#E53935' }
const marcBenioff: Participant = { name: 'Marc Benioff', emoji: '●', role: 'CRO', color: '#7B1FA2' }

export const standups: StandupMeeting[] = [
  {
    id: 'standup-1',
    title: 'Partnership & Sponsorship Strategy',
    date: 'March 7, 2026',
    time: '08:00 UTC',
    participants: [rayDalio, steveJobs, elon, marcBenioff],
    audioSegments: 23,
    audioDuration: '24s',
    conversation: [
      { speaker: rayDalio, text: "Good morning team. Let's review our progress on the partnership pipeline and align on priorities for this week. Marc Benioff, you've been leading the outreach — what's the status?" },
      { speaker: marcBenioff, text: "We've identified 12 potential partners in the AI tooling space. Three have responded positively to initial outreach. I'm drafting personalized proposals for TechCorp, AIFlow, and DataStream. Expected to have all three proposals sent by end of day." },
      { speaker: elon, text: "On the technical side, I've completed the API integration framework that partners will need. The SDK documentation is 80% complete. I also patched two security vulnerabilities that Atlas flagged yesterday in the auth middleware." },
      { speaker: steveJobs, text: "Content is aligned with the partnership push. I've prepared co-marketing templates and a press release draft. The community engagement metrics are up 23% this week — Clay's been doing excellent work in Discord. I'm also finalizing the newsletter featuring our partnership vision." },
      { speaker: rayDalio, text: "Excellent progress across the board. Let me summarize the action items and we'll reconvene tomorrow for a quick sync. Steve Jobs, make sure the newsletter goes out before the partner proposals — we want them to see our momentum." },
    ],
    actionItems: [
      { text: 'Send personalized proposals to TechCorp, AIFlow, DataStream', assignee: marcBenioff, done: true },
      { text: 'Complete SDK documentation (remaining 20%)', assignee: elon, done: true },
      { text: 'Publish co-marketing templates to shared workspace', assignee: steveJobs, done: true },
      { text: 'Send weekly newsletter with partnership vision', assignee: steveJobs, done: true },
      { text: 'Review and approve partner API access levels', assignee: rayDalio, done: true },
      { text: 'Schedule follow-up calls with responsive partners', assignee: marcBenioff, done: true },
      { text: 'Update MEMORY.md with partnership pipeline status', assignee: rayDalio, done: true },
      { text: 'Run security scan on partner integration endpoints', assignee: elon, done: true },
      { text: 'Prepare Discord announcement for partnership program', assignee: steveJobs, done: true },
      { text: 'Brief Joe Hawn (CEO) on partnership progress and timeline', assignee: rayDalio, done: true },
    ],
  },
  {
    id: 'standup-2',
    title: 'Weekly Engineering Review',
    date: 'March 6, 2026',
    time: '08:00 UTC',
    participants: [rayDalio, elon, steveJobs, marcBenioff],
    audioSegments: 18,
    audioDuration: '19s',
    conversation: [
      { speaker: rayDalio, text: "Team, let's do a quick engineering review. Elon, the floor is yours — how did the sprint go?" },
      { speaker: elon, text: "Good week overall. We shipped the new auth middleware, closed 14 tickets, and Nova found a critical XSS vulnerability that's now patched. The GrandviewOS dashboard is running stable at 99.8% uptime. One concern: Atlas hit rate limiting issues with the external API — I've asked Docker to set up a caching layer." },
      { speaker: steveJobs, text: "From marketing's side, the new landing page Pixel designed is converting at 4.2% — that's double our previous rate. Content pipeline is healthy with 8 articles queued. One ask for engineering: can we get an API endpoint for real-time community metrics? Would help with the dashboard." },
      { speaker: marcBenioff, text: "Revenue update: we closed our first micro-sponsorship deal worth $500/month. Two more in the pipeline. The partner portal Elon's team built is getting positive feedback. I need marketing to prepare case studies for the next pitch cycle." },
      { speaker: rayDalio, text: "Great progress. Key takeaways: engineering is stable, marketing conversion is up, and revenue is showing traction. Let's keep the momentum going. Action items coming up..." },
    ],
    actionItems: [
      { text: 'Set up API caching layer for external calls', assignee: elon, done: true },
      { text: 'Build real-time community metrics endpoint', assignee: elon, done: false },
      { text: 'Prepare partner case studies for pitch deck', assignee: steveJobs, done: false },
      { text: 'Review and merge 3 pending PRs', assignee: elon, done: true },
      { text: 'Update dashboard uptime monitoring alerts', assignee: rayDalio, done: true },
      { text: 'Draft micro-sponsorship renewal terms', assignee: marcBenioff, done: false },
      { text: 'Deploy new landing page to production', assignee: elon, done: true },
      { text: 'Create social media posts for partnership announcement', assignee: steveJobs, done: true },
      { text: 'Audit agent costs for budget review', assignee: rayDalio, done: false },
      { text: 'Schedule demo call with prospective partner', assignee: marcBenioff, done: true },
    ],
  },
]
