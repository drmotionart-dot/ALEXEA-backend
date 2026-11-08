import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logActivity, listActivity } from '../services/activityService.js';

export const activityRouter = Router();

activityRouter.get('/', requireAuth, requireRole('head'), async (req, res) => {
  const list = await listActivity({
    kind: req.query.kind ? String(req.query.kind) : undefined,
    who: req.query.who ? String(req.query.who) : undefined,
  });
  res.json({ entries: list });
});

activityRouter.post('/', requireAuth, async (req, res) => {
  const schema = z.object({ kind: z.string(), text: z.string(), link: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const user = (req as any).user;
  await logActivity(user.name, user.role, parsed.data.kind, parsed.data.text, parsed.data.link);
  res.json({ ok: true });
});
