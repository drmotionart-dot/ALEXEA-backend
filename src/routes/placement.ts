import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { placeCandidates } from '../placement/index.js';

export const placementRouter = Router();

placementRouter.post('/', requireAuth, async (req, res) => {
  const { candidates, layout } = req.body || {};
  const plan = placeCandidates(candidates || [], layout || 'd12');
  res.json({ plan });
});
