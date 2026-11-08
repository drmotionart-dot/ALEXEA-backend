import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { lookupGender, seedNames } from '../services/nameService.js';

export const namesRouter = Router();

namesRouter.get('/gender', requireAuth, async (req, res) => {
  await seedNames();
  const name = String(req.query.name || '');
  const gender = await lookupGender(name);
  res.json({ gender });
});
