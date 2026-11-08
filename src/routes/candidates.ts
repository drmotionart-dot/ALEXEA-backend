import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { listCandidates, createCandidate, bulkCreateCandidates, updateCandidate, deleteCandidate } from '../services/candidateService.js';
import { getDb } from '../db/mongo.js';
import { logActivity } from '../services/activityService.js';

export const candidatesRouter = Router();

candidatesRouter.get('/', requireAuth, async (req, res) => {
  const courseId = req.query.courseId ? String(req.query.courseId) : undefined;
  const list = await listCandidates(courseId);
  res.json({ candidates: list });
});

candidatesRouter.post('/', requireAuth, requireRole('head'), async (req, res) => {
  const id = await createCandidate(req.body);
  res.json({ id: String(id) });
});

candidatesRouter.post('/bulk', requireAuth, requireRole('head'), async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const ids = await bulkCreateCandidates(items);
  const user = (req as any).user;
  logActivity(user.name, user.role, 'cand', 'imported <b>' + items.length + ' candidates</b>', 'candidates').catch(() => {});
  res.json({ ids: ids.map(String) });
});

// Clear every candidate of one course (head only).
candidatesRouter.delete('/', requireAuth, requireRole('head'), async (req, res) => {
  const courseId = String(req.query.courseId || '');
  if (!courseId) return res.status(400).json({ error: 'courseId required' });
  const db = await getDb();
  const r = await db.collection('candidates').deleteMany({ courseId });
  await db.collection('courseDays').updateMany({ courseId }, { $set: { candidates: [], plan: { morning: [], afternoon: [] } } });
  res.json({ ok: true, deleted: r.deletedCount || 0 });
});

candidatesRouter.patch('/:id', requireAuth, requireRole('head'), async (req, res) => {
  const c = await updateCandidate(req.params.id, req.body);
  res.json({ candidate: c });
});

candidatesRouter.delete('/:id', requireAuth, requireRole('head'), async (req, res) => {
  await deleteCandidate(req.params.id);
  res.json({ ok: true });
});
