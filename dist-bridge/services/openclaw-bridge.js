/**
 * OpenClaw Bridge API — reads local OpenClaw filesystem data
 * and exposes it as REST endpoints for GrandviewOS
 */
import { Router } from 'express';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
const router = Router();
const OPENCLAW_DIR = process.env.OPENCLAW_DIR || '/home/ubuntu/.openclaw';
// --- Helpers ---
async function readJsonl(filePath) {
    try {
        const content = await readFile(filePath, 'utf-8');
        return content.trim().split('\n').filter(Boolean).map(line => {
            try {
                return JSON.parse(line);
            }
            catch {
                return null;
            }
        }).filter(Boolean);
    }
    catch {
        return [];
    }
}
async function getSessionFiles() {
    const files = [];
    const agentsDir = join(OPENCLAW_DIR, 'agents');
    try {
        const agents = await readdir(agentsDir);
        for (const agent of agents) {
            const sessDir = join(agentsDir, agent, 'sessions');
            try {
                const sessions = await readdir(sessDir);
                for (const s of sessions) {
                    if (s.endsWith('.jsonl'))
                        files.push(join(sessDir, s));
                }
            }
            catch { /* no sessions dir */ }
        }
    }
    catch { /* no agents dir */ }
    return files;
}
function extractSessionMeta(lines, filePath) {
    const sessionLine = lines.find(l => l.type === 'session');
    const modelLine = lines.find(l => l.type === 'model_change');
    const messages = lines.filter(l => l.type === 'message');
    const costLines = lines.filter(l => l.type === 'usage' || l.type === 'custom' && l.customType === 'cost');
    // Calculate tokens and cost from message usage entries
    let totalTokens = 0;
    let totalCost = 0;
    for (const l of lines) {
        const usage = l.message?.usage || l.usage;
        if (usage) {
            totalTokens += usage.totalTokens || ((usage.input || 0) + (usage.output || 0) + (usage.cacheRead || 0) + (usage.cacheWrite || 0));
            const cost = typeof usage.cost === 'object' ? usage.cost.total || 0 : (usage.cost || 0);
            totalCost += cost;
        }
    }
    const id = sessionLine?.id || filePath.split('/').pop()?.replace('.jsonl', '') || 'unknown';
    const lastMessage = messages[messages.length - 1];
    const firstTimestamp = sessionLine?.timestamp || lines[0]?.timestamp;
    const lastTimestamp = lastMessage?.timestamp || lines[lines.length - 1]?.timestamp;
    return {
        id,
        title: `Session ${id.slice(0, 8)}`,
        model: modelLine?.modelId || 'unknown',
        provider: modelLine?.provider || 'unknown',
        messageCount: messages.length,
        totalTokens,
        totalCost: Math.round(totalCost * 10000) / 10000,
        isActive: false, // will be updated below
        timestamp: firstTimestamp,
        lastActivity: lastTimestamp,
        agent: filePath.includes('/agents/') ? filePath.split('/agents/')[1]?.split('/')[0] : 'unknown',
    };
}
// --- Routes ---
// Health check
router.get('/health', (_req, res) => {
    res.json({ ok: true, gatewayRunning: true, version: 'bridge-1.0', timestamp: new Date().toISOString() });
});
// List all sessions
router.get('/sessions', async (_req, res) => {
    try {
        const files = await getSessionFiles();
        const sessions = [];
        for (const f of files) {
            const lines = await readJsonl(f);
            if (lines.length === 0)
                continue;
            const meta = extractSessionMeta(lines, f);
            // Check if active (last activity within 5 min)
            if (meta.lastActivity) {
                const lastAct = new Date(meta.lastActivity).getTime();
                meta.isActive = Date.now() - lastAct < 5 * 60 * 1000;
            }
            sessions.push(meta);
        }
        // Sort by last activity descending
        sessions.sort((a, b) => new Date(b.lastActivity || 0).getTime() - new Date(a.lastActivity || 0).getTime());
        res.json({ sessions });
    }
    catch (err) {
        res.status(500).json({ error: String(err) });
    }
});
// Get session transcript
router.get('/sessions/:id/transcript', async (req, res) => {
    try {
        const files = await getSessionFiles();
        const target = files.find(f => f.includes(req.params.id));
        if (!target)
            return res.status(404).json({ error: 'Session not found' });
        const lines = await readJsonl(target);
        const meta = extractSessionMeta(lines, target);
        const messages = lines.filter(l => l.type === 'message').map(l => {
            const usage = l.message?.usage;
            return {
                role: l.message?.role || 'unknown',
                content: typeof l.message?.content === 'string' ? l.message.content :
                    Array.isArray(l.message?.content) ? l.message.content.map((c) => c.text || '').join('') : '',
                timestamp: l.timestamp,
                isToolCall: l.message?.content?.some?.((c) => c.type === 'tool_use') || false,
                toolName: l.message?.content?.find?.((c) => c.type === 'tool_use')?.name,
                usage: usage ? {
                    totalTokens: usage.totalTokens || 0,
                    cost: { total: typeof usage.cost === 'object' ? usage.cost.total || 0 : usage.cost || 0 },
                } : undefined,
            };
        });
        res.json({ ...meta, messages });
    }
    catch (err) {
        res.status(500).json({ error: String(err) });
    }
});
// List cron jobs
router.get('/cron-jobs', async (_req, res) => {
    try {
        const jobsFile = join(OPENCLAW_DIR, 'cron', 'jobs.json');
        const content = await readFile(jobsFile, 'utf-8');
        const data = JSON.parse(content);
        res.json(data.jobs || []);
    }
    catch (err) {
        res.status(500).json({ error: String(err) });
    }
});
// System info
router.get('/system/health', async (_req, res) => {
    try {
        const files = await getSessionFiles();
        const cronFile = join(OPENCLAW_DIR, 'cron', 'jobs.json');
        let cronCount = 0;
        try {
            const c = JSON.parse(await readFile(cronFile, 'utf-8'));
            cronCount = c.jobs?.length || 0;
        }
        catch { }
        res.json({
            gatewayRunning: true,
            sessionCount: files.length,
            cronJobCount: cronCount,
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        });
    }
    catch (err) {
        res.status(500).json({ error: String(err) });
    }
});
export default router;
