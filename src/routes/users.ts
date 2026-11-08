import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { listPending, listActive, setStatus, resetPassword, getUserById } from '../services/userService.js';
import { getDb } from '../db/mongo.js';
import { ObjectId } from 'mongodb';
import { logActivity } from '../services/activityService.js';

export const usersRouter = Router();

usersRouter.use(requireAuth);

// Team list for attendance: active users only (any member can see names).
usersRouter.get('/', async (_req, res) => {
  const list = await listActive();
  res.json({ users: list.map((u: any) => ({ id: String(u._id), name: u.name, username: u.username, role: u.role })) });
});

// Everything below is heads only.
usersRouter.use(requireRole('head'));

usersRouter.get('/pending', async (_req, res) => {
  const list = await listPending();
  res.json({ users: list.map((u: any) => ({ id: String(u._id), name: u.name, username: u.username, createdAt: u.createdAt })) });
});

// All accounts with their status, so heads can see a real pending friend too.
usersRouter.get('/team', async (_req, res) => {
  const db = await getDb();
  const list = await db.collection('users')
    .find({}, { projection: { passwordHash: 0 } })
    .sort({ createdAt: 1 })
    .toArray();
  res.json({
    users: list.map((u: any) => ({
      id: String(u._id), name: u.name, username: u.username, role: u.role, status: u.status, createdAt: u.createdAt,
    })),
  });
});

usersRouter.post('/:id/approve', async (req, res) => {
  await setStatus(req.params.id, 'active');
  const u = await getUserById(req.params.id);
  const actor = (req as any).user;
  logActivity(actor.name, actor.role, 'acct', 'approved the account of <b>' + (u?.name || '') + '</b>', 'account').catch(() => {});
  res.json({ ok: true });
});

usersRouter.post('/:id/reject', async (req, res) => {
  await setStatus(req.params.id, 'rejected');
  const u = await getUserById(req.params.id);
  const actor = (req as any).user;
  logActivity(actor.name, actor.role, 'acct', 'rejected the account of <b>' + (u?.name || '') + '</b>', 'account').catch(() => {});
  res.json({ ok: true });
});

const resetSchema = z.object({ password: z.string().min(4).optional() });
usersRouter.post('/:id/reset-password', async (req, res) => {
  const parsed = resetSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const password = parsed.data.password || randomPassword();
  await resetPassword(req.params.id, password);
  res.json({ ok: true, password });
});

usersRouter.patch('/:id/role', async (req, res) => {
  const role = req.body?.role === 'head' ? 'head' : 'member';
  const db = await getDb();
  const id = new ObjectId(req.params.id);
  const target = await db.collection('users').findOne({ _id: id });
  if (!target) return res.status(404).json({ error: 'not found' });
  if (target.role === 'head' && role === 'member') {
    const heads = await db.collection('users').countDocuments({ role: 'head', status: 'active' });
    if (heads <= 1) return res.status(400).json({ error: 'At least one head must stay' });
  }
  await db.collection('users').updateOne({ _id: id }, { $set: { role } });
  const actor = (req as any).user;
  logActivity(actor.name, actor.role, 'acct', (role === 'head' ? 'made <b>' : 'removed head privileges from <b>') + target.name + '</b>', 'account').catch(() => {});
  res.json({ ok: true, role });
});

usersRouter.delete('/:id', async (req, res) => {
  const actor = (req as any).user;
  if (String(actor.id) === req.params.id) return res.status(400).json({ error: 'You cannot delete your own account' });
  const db = await getDb();
  const r = await db.collection('users').deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ ok: true, deleted: r.deletedCount || 0 });
});

usersRouter.get('/:id', async (req, res) => {
  const u = await getUserById(req.params.id);
  if (!u) return res.status(404).json({ error: 'not found' });
  res.json({ user: u });
});

function randomPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}
