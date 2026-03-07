import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'grandview-tek' },
    update: {},
    create: { name: 'Grandview Tek', slug: 'grandview-tek' },
  })
  console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`)

  // Create admin user
  const hashed = await bcrypt.hash('admin123', 10)
  const user = await prisma.user.upsert({
    where: { email_tenantId: { email: 'admin@grandview.com', tenantId: tenant.id } },
    update: { password: hashed },
    create: { email: 'admin@grandview.com', password: hashed, name: 'Admin', role: 'admin', tenantId: tenant.id },
  })
  console.log(`✅ User: ${user.email}`)

  // Agent definitions
  const agents = [
    { slug: 'muddy', name: 'Muddy', emoji: '🐕', role: 'coo', persona: 'COO', department: 'operations', primaryModel: 'claude-opus-4-6', description: 'Chief Operating Officer. A loyal, hardworking golden retriever.' },
    { slug: 'elon', name: 'Elon', emoji: '🚀', role: 'department_head', persona: 'CTO', department: 'engineering', primaryModel: 'claude-opus-4-6', parentId: 'muddy' },
    { slug: 'gary', name: 'Gary', emoji: '📣', role: 'department_head', persona: 'CMO', department: 'marketing', primaryModel: 'claude-opus-4-6', parentId: 'muddy' },
    { slug: 'warren', name: 'Warren', emoji: '💰', role: 'department_head', persona: 'CRO', department: 'revenue', primaryModel: 'claude-opus-4-6', parentId: 'muddy' },
    // Engineering
    { slug: 'nova', name: 'Nova', emoji: '🛡️', role: 'specialist', department: 'engineering', division: 'Backend & Security', primaryModel: 'codex-5.3', parentId: 'elon' },
    { slug: 'atlas', name: 'Atlas', emoji: '🏗️', role: 'specialist', department: 'engineering', division: 'Backend & Security', primaryModel: 'codex-5.3', parentId: 'elon' },
    { slug: 'pixel', name: 'Pixel', emoji: '🎨', role: 'specialist', department: 'engineering', division: 'Frontend & UI', primaryModel: 'claude-opus-4-6', parentId: 'elon' },
    { slug: 'frame', name: 'Frame', emoji: '🖼️', role: 'specialist', department: 'engineering', division: 'Frontend & UI', primaryModel: 'claude-sonnet-4-5', parentId: 'elon' },
    { slug: 'docker', name: 'Docker', emoji: '🐳', role: 'specialist', department: 'engineering', division: 'DevOps & Infra', primaryModel: 'codex-5.3', parentId: 'elon' },
    { slug: 'sentinel', name: 'Sentinel', emoji: '📡', role: 'specialist', department: 'engineering', division: 'DevOps & Infra', primaryModel: 'gemini-flash', parentId: 'elon', status: 'scaffolded' },
    { slug: 'tester', name: 'Tester', emoji: '🧪', role: 'specialist', department: 'engineering', division: 'QA & Testing', primaryModel: 'codex-5.3', parentId: 'elon' },
    // Marketing
    { slug: 'scribe', name: 'Scribe', emoji: '✍️', role: 'specialist', department: 'marketing', division: 'Content & Social', primaryModel: 'claude-opus-4-6', parentId: 'gary' },
    { slug: 'viral', name: 'Viral', emoji: '📱', role: 'specialist', department: 'marketing', division: 'Content & Social', primaryModel: 'gemini-flash', parentId: 'gary' },
    { slug: 'clay', name: 'Clay', emoji: '🦞', role: 'specialist', department: 'marketing', division: 'Content & Social', primaryModel: 'gemini-flash', parentId: 'gary' },
    { slug: 'funnel', name: 'Funnel', emoji: '📈', role: 'specialist', department: 'marketing', division: 'Growth & Analytics', primaryModel: 'gemini-pro', parentId: 'gary' },
    { slug: 'lens', name: 'Lens', emoji: '🔍', role: 'specialist', department: 'marketing', division: 'Growth & Analytics', primaryModel: 'gemini-pro', parentId: 'gary' },
    { slug: 'canvas', name: 'Canvas', emoji: '🎭', role: 'specialist', department: 'marketing', division: 'Design & Creative', primaryModel: 'nano-banana-pro', parentId: 'gary' },
    { slug: 'motion', name: 'Motion', emoji: '🎬', role: 'specialist', department: 'marketing', division: 'Design & Creative', primaryModel: 'nano-banana-pro', parentId: 'gary' },
    // Revenue
    { slug: 'deal', name: 'Deal', emoji: '🤝', role: 'specialist', department: 'revenue', division: 'Partnerships', primaryModel: 'claude-opus-4-6', parentId: 'warren' },
    { slug: 'scout', name: 'Scout', emoji: '🔭', role: 'specialist', department: 'revenue', division: 'Partnerships', primaryModel: 'claude-opus-4-5', parentId: 'warren' },
    { slug: 'closer', name: 'Closer', emoji: '💼', role: 'specialist', department: 'revenue', division: 'Sales & Outreach', primaryModel: 'claude-opus-4-6', parentId: 'warren' },
    { slug: 'outreach', name: 'Outreach', emoji: '📧', role: 'specialist', department: 'revenue', division: 'Sales & Outreach', primaryModel: 'claude-sonnet-4-5', parentId: 'warren' },
  ]

  for (const a of agents) {
    await prisma.agent.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: a.slug } },
      update: {},
      create: {
        tenantId: tenant.id,
        slug: a.slug,
        name: a.name,
        emoji: a.emoji,
        role: a.role,
        persona: a.persona,
        department: a.department,
        division: a.division,
        primaryModel: a.primaryModel,
        parentId: a.parentId,
        description: a.description,
        status: (a as any).status || 'active',
      },
    })
  }
  console.log(`✅ ${agents.length} agents seeded`)

  // LLM Providers
  const providers = [
    { provider: 'anthropic', name: 'Anthropic', models: [
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', enabled: true, is_default: true },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', enabled: true, is_default: false },
      { id: 'claude-haiku-3-5', name: 'Claude Haiku 3.5', enabled: true, is_default: false },
    ]},
    { provider: 'openai', name: 'OpenAI', models: [
      { id: 'gpt-4o', name: 'GPT-4o', enabled: true, is_default: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', enabled: true, is_default: false },
    ]},
    { provider: 'google', name: 'Google AI', models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', enabled: true, is_default: true },
      { id: 'gemini-2.0-pro', name: 'Gemini 2.0 Pro', enabled: true, is_default: false },
    ]},
  ]

  for (const p of providers) {
    await prisma.llmProvider.upsert({
      where: { tenantId_provider: { tenantId: tenant.id, provider: p.provider } },
      update: {},
      create: { tenantId: tenant.id, provider: p.provider, name: p.name, models: p.models },
    })
  }
  console.log(`✅ ${providers.length} LLM providers seeded`)

  // Default integrations
  const integrations = [
    { type: 'github', name: 'GitHub', config: { icon: '🐙', auth_method: 'bearer_token', required_secrets: ['github_token'], configured_secrets: {} } },
    { type: 'slack', name: 'Slack', config: { icon: '💬', auth_method: 'oauth_token', required_secrets: ['slack_bot_token'], configured_secrets: {} } },
    { type: 'telegram', name: 'Telegram', config: { icon: '✈️', auth_method: 'bot_token', required_secrets: ['telegram_bot_token'], configured_secrets: {} } },
    { type: 'aws', name: 'AWS', config: { icon: '☁️', auth_method: 'access_key', required_secrets: ['aws_access_key', 'aws_secret_key'], configured_secrets: {} } },
    { type: 'stripe', name: 'Stripe', config: { icon: '💳', auth_method: 'api_key', required_secrets: ['stripe_api_key'], configured_secrets: {} } },
  ]

  for (const i of integrations) {
    await prisma.integration.upsert({
      where: { tenantId_type: { tenantId: tenant.id, type: i.type } },
      update: {},
      create: { tenantId: tenant.id, type: i.type, name: i.name, config: i.config },
    })
  }
  console.log(`✅ ${integrations.length} integrations seeded`)

  // Sample standup
  await prisma.standup.create({
    data: {
      tenantId: tenant.id,
      title: 'Executive Standup — March 7, 2026',
      participants: [
        { name: 'Muddy', emoji: '🐕', role: 'COO', voice: 'en-US-GuyNeural' },
        { name: 'Elon', emoji: '🚀', role: 'CTO', voice: 'en-US-ChristopherNeural' },
        { name: 'Gary', emoji: '📣', role: 'CMO', voice: 'en-US-JasonNeural' },
        { name: 'Warren', emoji: '💰', role: 'CRO', voice: 'en-GB-RyanNeural' },
      ],
      transcript: [
        { speaker: 'Muddy', text: 'Good morning team. Status updates please.' },
        { speaker: 'Elon', text: 'Engineering shipped 3 PRs. Pipeline green.' },
        { speaker: 'Gary', text: 'Newsletter open rate 34%. Community growing.' },
        { speaker: 'Warren', text: 'TechCorp deal in final review.' },
        { speaker: 'Muddy', text: 'Great work. Action items compiled.' },
      ],
      actionItems: [
        { text: 'Ship cost breakdown view', assignee: 'Elon', done: false },
        { text: 'Complete TechCorp case study', assignee: 'Gary', done: false },
        { text: 'Close TechCorp deal', assignee: 'Warren', done: true },
      ],
      status: 'completed',
      completedAt: new Date(),
    },
  })
  console.log('✅ Sample standup seeded')

  console.log('\n🎉 Seeding complete!')
  console.log(`\n📧 Login: admin@grandview.com / admin123`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
