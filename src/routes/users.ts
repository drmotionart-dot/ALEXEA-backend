import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { listPending, listActive, setStatus, resetPassword, getUserById } from '../services/userService.js';

export const usersRouter = Router();

usersRouter.use(requireAuth, requireRole('head'));

usersRouter.get('/pending', async (_req, res) => {
  const list = await listPending();
  res.json({ users: list.map((u: any) => ({ id: String(u._id), name: u.name, username: u.username, createdAt: u.createdAt })) });
});

usersRouter.post('/:id/approve', async (req, res) => {
  await setStatus(req.params.id, 'active');
  res.json({ ok: true });
});

usersRouter.post('/:id/reject', async (req, res) => {
  await setStatus(req.params.id, 'rejected');
  res.json({ ok: true });
});

const resetSchema = z.object({ password: z.string().min(4) });
usersRouter.post('/:id/reset-password', async (req, res) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  await resetPassword(req.params.id, parsed.data.password);
  res.json({ ok: true });
});

usersRouter.get('/', async (_req, res) => {
  const list = await listActive();
  res.json({ users: list.map((u: any) => ({ id: String(u._id), name: u.name, username: u.username, role: u.role })) });
});

usersRouter.patch('/:id/role', requireAuth, requireRole('head'), async (req, res) => {
  const role = req.body?.role === 'head' ? 'head' : 'member';
  const db = (await import('../db/mongo.js')).getDb;
  const d = await (await import('../db/mongo.js')).getDb();
  await d.collection('users').updateOne({ _id: new (await import('mongodb')).ObjectId(req.params.id) }, { $set: { role } });
  res.json({ ok: true });
});

usersRouter.get('/:id', async (req, res) => {
  const u = await getUserById(req.params.id);
  if (!u) return res.status(404).json({ error: 'not found' });
  res.json({ user: u });
});
