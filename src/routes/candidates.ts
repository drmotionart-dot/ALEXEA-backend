import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { listCandidates, createCandidate, bulkCreateCandidates, updateCandidate, deleteCandidate } from '../services/candidateService.js';

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
  res.json({ ids: ids.map(String) });
});

candidatesRouter.patch('/:id', requireAuth, requireRole('head'), async (req, res) => {
  const c = await updateCandidate(req.params.id, req.body);
  res.json({ candidate: c });
});

candidatesRouter.delete('/:id', requireAuth, requireRole('head'), async (req, res) => {
  await deleteCandidate(req.params.id);
  res.json({ ok: true });
});
