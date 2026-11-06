import { Router } from 'express';
import { getDb } from '../db/mongo.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  try {
    const d = await getDb();
    await d.command({ ping: 1 });
    res.json({ ok: true, db: 'connected' });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message ?? 'db error' });
  }
});
