import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { seedToolTypes, listToolTypes, listTools, getToolBySerial, getToolById, createTool, updateTool, addComment, resolveComment, repairCount, generateToolCode } from '../services/toolService.js';

export const toolsRouter = Router();

toolsRouter.get('/types', requireAuth, async (_req, res) => {
  const types = await listToolTypes();
  res.json({ types });
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

toolsRouter.patch('/:id', requireAuth, requireRole('head'), async (req, res) => {
  const t = await updateTool(req.params.id, req.body);
  res.json({ tool: t });
});

toolsRouter.post('/:id/comments', requireAuth, async (req, res) => {
  const schema = z.object({ text: z.string().min(1), needsRepair: z.boolean().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const user = (req as any).user;
  const c = await addComment(req.params.id, user.name, parsed.data.text, !!parsed.data.needsRepair);
  res.json({ comment: c });
});

toolsRouter.patch('/:id/comments/:index/resolve', requireAuth, requireRole('head'), async (req, res) => {
  await resolveComment(req.params.id, Number(req.params.index));
  res.json({ ok: true });
});
