import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  listToolTypes, listTools, getToolBySerial, getToolById, createTool, updateTool,
  addComment, resolveComment, repairCount, generateToolCode, createToolType, deleteTool,
} from '../services/toolService.js';
import { logActivity } from '../services/activityService.js';

export const toolsRouter = Router();

toolsRouter.get('/types', requireAuth, async (_req, res) => {
  const types = await listToolTypes();
  res.json({ types });
});

// Add a new tool type (heads only).
toolsRouter.post('/types', requireAuth, requireRole('head'), async (req, res) => {
  try {
    const id = await createToolType(req.body || {});
    res.json({ id: String(id) });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'could not add type' });
  }
});

toolsRouter.get('/repair-count', requireAuth, async (_req, res) => {
  const n = await repairCount();
  res.json({ count: n });
});

toolsRouter.get('/serial/:serial', requireAuth, async (req, res) => {
  const t = await getToolBySerial(req.params.serial);
  if (!t) return res.status(404).json({ error: 'Serial not found' });
  res.json({ tool: t });
});

toolsRouter.get('/', requireAuth, async (req, res) => {
  const tools = await listTools({
    search: req.query.search ? String(req.query.search) : undefined,
    type: req.query.type ? String(req.query.type) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
  });
  res.json({ tools });
});

toolsRouter.post('/', requireAuth, requireRole('head'), async (req, res) => {
  try {
    const r = await createTool(req.body);
    const user = (req as any).user;
    logActivity(user.name, user.role, 'tool', 'registered a new tool <b>' + r.serial + '</b>', 'tools').catch(() => {});
    res.json({ id: String(r.id), serial: r.serial });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'create failed' });
  }
});

toolsRouter.get('/suggest-code', requireAuth, requireRole('head'), async (req, res) => {
  const typeCode = String(req.query.typeCode || 'XX');
  const date = req.query.date ? String(req.query.date) : undefined;
  const code = await generateToolCode(typeCode, date);
  res.json({ code });
});

// Any signed-in member can start using / return a tool. Heads can also set maintenance.
toolsRouter.patch('/:id', requireAuth, async (req, res) => {
  const patch = req.body || {};
  if (patch.status && patch.status === 'maintenance' && (req as any).user.role !== 'head') {
    return res.status(403).json({ error: 'Only heads can send a tool to maintenance' });
  }
  const t = await updateTool(req.params.id, patch);
  const user = (req as any).user;
  if (patch.status) {
    logActivity(user.name, user.role, 'tool', 'set <b>' + (t as any).serial + '</b> to ' + label(patch.status), 'tools').catch(() => {});
  }
  if (patch.photoUrl !== undefined) {
    logActivity(user.name, user.role, 'tool', 'updated the photo of <b>' + (t as any).serial + '</b>', 'tools').catch(() => {});
  }
  res.json({ tool: t });
});

// Remove a tool from the inventory (heads only). History lives in the activity log.
toolsRouter.delete('/:id', requireAuth, requireRole('head'), async (req, res) => {
  const t: any = await deleteTool(req.params.id);
  if (!t) return res.status(404).json({ error: 'Tool not found' });
  const user = (req as any).user;
  logActivity(user.name, user.role, 'tool', 'removed tool <b>' + (t.serial || '') + '</b> from the inventory', 'tools').catch(() => {});
  res.json({ ok: true });
});

toolsRouter.post('/:id/comments', requireAuth, async (req, res) => {
  const schema = z.object({ text: z.string().min(1), needsRepair: z.boolean().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const user = (req as any).user;
  const c = await addComment(req.params.id, user.name, parsed.data.text, !!parsed.data.needsRepair);
  const t: any = await getToolById(req.params.id);
  logActivity(
    user.name, user.role,
    parsed.data.needsRepair ? 'repair' : 'tool',
    (parsed.data.needsRepair ? 'reported <b>' + (t?.serial || '') + '</b> as needing repair: ' : 'commented on <b>' + (t?.serial || '') + '</b>: ') + '“' + parsed.data.text + '”',
    'tools'
  ).catch(() => {});
  res.json({ comment: c });
});

toolsRouter.patch('/:id/comments/:index/resolve', requireAuth, requireRole('head'), async (req, res) => {
  await resolveComment(req.params.id, Number(req.params.index));
  res.json({ ok: true });
});

function label(s: string) {
  return s === 'available' ? 'Available' : s === 'inuse' ? 'In use' : s === 'maintenance' ? 'Maintenance' : s;
}
