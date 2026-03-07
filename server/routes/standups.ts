import { Router } from 'express'
import { writeFile, readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import prisma from '../db.js'

const router = Router()

// ElevenLabs voice IDs for each agent
const ELEVENLABS_VOICES: Record<string, string> = {
  'Ray Dalio':    'pNInz6obpgDQGcFmaJgB', // Adam — deep, authoritative
  'Elon':         'VR6AewLTigWG4xSOukaG', // Arnold — technical, decisive
  'Steve Jobs':   'yoZ06aMxZJJ28mfd3POQ', // Sam — warm, persuasive
  'Marc Benioff': 'JBFqnCBsd6RMkjVDRZzb', // George — British, confident
}

// Generate ElevenLabs audio for a line of dialogue
async function generateElevenLabsAudio(text: string, agentName: string, apiKey: string): Promise<Buffer | null> {
  const voiceId = ELEVENLABS_VOICES[agentName] || ELEVENLABS_VOICES['Ray Dalio']
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch { return null }
}

// Generate standup conversation via Anthropic
async function generateStandupConversation(anthropicKey: string): Promise<{
  conversation: Array<{ speaker: string; text: string }>
  actionItems: Array<{ text: string; assignee: string; done: boolean }>
  title: string
}> {
  const systemPrompt = `You are orchestrating a brief executive standup for Grandview Tek (IT services/staffing, targeting $15M+ revenue).

Generate a realistic 5-turn standup conversation between:
- Ray Dalio (COO): Opens and closes the meeting. Operational focus, radical transparency.
- Elon (CTO): Engineering update. Technical, direct.
- Steve Jobs (CMO): Marketing update. Story-driven, metrics.
- Marc Benioff (CRO): Revenue update. Pipeline-focused, energetic.

Return ONLY valid JSON in this exact format:
{
  "title": "Executive Standup — [Day of week] Update",
  "conversation": [
    {"speaker": "Ray Dalio", "text": "..."},
    {"speaker": "Elon", "text": "..."},
    {"speaker": "Steve Jobs", "text": "..."},
    {"speaker": "Marc Benioff", "text": "..."},
    {"speaker": "Ray Dalio", "text": "..."}
  ],
  "actionItems": [
    {"text": "...", "assignee": "Elon", "done": false},
    {"text": "...", "assignee": "Steve Jobs", "done": false},
    {"text": "...", "assignee": "Marc Benioff", "done": false}
  ]
}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Generate the standup for today.' }],
    }),
    signal: AbortSignal.timeout(30000),
  })

  if (!res.ok) throw new Error('Anthropic API error')
  const data = await res.json() as any
  const text = data.content[0].text
  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in response')
  return JSON.parse(jsonMatch[0])
}

// GET /api/standups
router.get('/', async (req, res) => {
  try {
    const standups = await prisma.standup.findMany({
      where: { tenantId: req.tenantId! },
      orderBy: { triggeredAt: 'desc' },
    })
    const mapped = standups.map(s => ({
      id: s.id,
      title: s.title,
      date: s.triggeredAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      time: s.triggeredAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false }) + ' UTC',
      status: s.status === 'completed' ? 'complete' : s.status as any,
      participants: (s.participants as any[]) || [],
      conversation: (s.transcript as any[]) || [],
      actionItems: (s.actionItems as any[]) || [],
      audioFile: s.audioPath || undefined,
      hasAudio: !!s.audioPath,
      createdAt: s.triggeredAt.toISOString(),
    }))
    res.json(mapped)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/standups — trigger new standup with real AI + ElevenLabs audio
router.post('/', async (req, res) => {
  const anthropicKey = process.env.ANTHROPIC_API_KEY || ''
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY || ''

  try {
    // Generate conversation with AI
    let conversationData: any
    try {
      conversationData = await generateStandupConversation(anthropicKey)
    } catch {
      // Fallback conversation if AI fails
      conversationData = {
        title: `Executive Standup — ${new Date().toLocaleDateString('en-US', { weekday: 'long' })} Update`,
        conversation: [
          { speaker: 'Ray Dalio', text: 'Good morning team. Let\'s run through today\'s updates.' },
          { speaker: 'Elon', text: 'Engineering is on track. Shipped the agent chat system yesterday.' },
          { speaker: 'Steve Jobs', text: 'GrandviewOS launch is generating buzz. The product tells the story itself.' },
          { speaker: 'Marc Benioff', text: 'Revenue pipeline is building. Platform story is resonating with prospects.' },
          { speaker: 'Ray Dalio', text: 'Solid progress across all fronts. Keep executing. Meeting adjourned.' },
        ],
        actionItems: [
          { text: 'Complete ElevenLabs voice integration', assignee: 'Elon', done: false },
          { text: 'Draft GrandviewOS launch announcement', assignee: 'Steve Jobs', done: false },
          { text: 'Follow up with 3 enterprise prospects', assignee: 'Marc Benioff', done: false },
        ],
      }
    }

    // Create standup record immediately (in progress)
    const standup = await prisma.standup.create({
      data: {
        tenantId: req.tenantId!,
        title: conversationData.title,
        participants: [
          { name: 'Ray Dalio', emoji: '📊', role: 'COO', voiceId: ELEVENLABS_VOICES['Ray Dalio'] },
          { name: 'Elon', emoji: '🚀', role: 'CTO', voiceId: ELEVENLABS_VOICES['Elon'] },
          { name: 'Steve Jobs', emoji: '🍎', role: 'CMO', voiceId: ELEVENLABS_VOICES['Steve Jobs'] },
          { name: 'Marc Benioff', emoji: '☁️', role: 'CRO', voiceId: ELEVENLABS_VOICES['Marc Benioff'] },
        ],
        transcript: conversationData.conversation,
        actionItems: conversationData.actionItems,
        status: 'processing',
      },
    })

    res.json({ id: standup.id, status: 'processing', title: standup.title })

    // Generate audio in background if ElevenLabs key exists
    if (elevenLabsKey) {
      ;(async () => {
        try {
          const audioDir = join('/tmp', 'grandviewos-standups', standup.id)
          await mkdir(audioDir, { recursive: true })

          // Generate audio for each line
          const audioSegments: Buffer[] = []
          for (const line of conversationData.conversation) {
            const audio = await generateElevenLabsAudio(line.text, line.speaker, elevenLabsKey)
            if (audio) audioSegments.push(audio)
            // Small pause between speakers
            if (audioSegments.length > 0) {
              // 0.5s silence at 44100Hz, 16-bit, mono (raw PCM approximation via small buffer)
              audioSegments.push(Buffer.alloc(44100)) 
            }
          }

          if (audioSegments.length > 0) {
            const fullAudio = Buffer.concat(audioSegments)
            const audioPath = join(audioDir, 'standup.mp3')
            await writeFile(audioPath, fullAudio)
            await prisma.standup.update({
              where: { id: standup.id },
              data: { status: 'completed', completedAt: new Date(), audioPath },
            })
          } else {
            await prisma.standup.update({
              where: { id: standup.id },
              data: { status: 'completed', completedAt: new Date() },
            })
          }
        } catch {
          await prisma.standup.update({
            where: { id: standup.id },
            data: { status: 'completed', completedAt: new Date() },
          })
        }
      })()
    } else {
      await prisma.standup.update({
        where: { id: standup.id },
        data: { status: 'completed', completedAt: new Date() },
      })
    }
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/standups/:id
router.get('/:id', async (req, res) => {
  try {
    const s = await prisma.standup.findFirst({ where: { id: req.params.id, tenantId: req.tenantId! } })
    if (!s) { res.status(404).json({ error: 'Standup not found' }); return }
    res.json({
      id: s.id, title: s.title,
      date: s.triggeredAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      time: s.triggeredAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false }) + ' UTC',
      status: s.status === 'completed' ? 'complete' : s.status,
      participants: s.participants || [],
      conversation: s.transcript || [],
      actionItems: s.actionItems || [],
      audioFile: s.audioPath ? `/api/standups/${s.id}/audio` : undefined,
      hasAudio: !!s.audioPath,
      createdAt: s.triggeredAt.toISOString(),
    })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/standups/:id/audio — stream the audio file
router.get('/:id/audio', async (req, res) => {
  try {
    const s = await prisma.standup.findFirst({ where: { id: req.params.id } })
    if (!s?.audioPath) { res.status(404).json({ error: 'Audio not available' }); return }
    const audio = await readFile(s.audioPath)
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Content-Length', audio.length.toString())
    res.end(audio)
  } catch {
    res.status(404).json({ error: 'Audio file not found' })
  }
})

// PATCH /api/standups/:id/action-items/:idx
router.patch('/:id/action-items/:idx', async (req, res) => {
  try {
    const s = await prisma.standup.findFirst({ where: { id: req.params.id, tenantId: req.tenantId! } })
    if (!s) { res.status(404).json({ error: 'Not found' }); return }
    const items = (s.actionItems as any[]) || []
    const idx = parseInt(req.params.idx)
    if (items[idx]) {
      items[idx].done = !items[idx].done
      await prisma.standup.update({ where: { id: s.id }, data: { actionItems: items } })
    }
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
