import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/mongo.js';

export const placesRouter = Router();

placesRouter.get('/', requireAuth, async (req, res) => {
  const db = await getDb();
  const type = req.query.type ? String(req.query.type) : undefined;
  const q: any = {};
  if (type) q.type = type;
  const list = await db.collection('places').find(q).toArray();
  res.json({ places: list });
});

placesRouter.post('/', requireAuth, async (req, res) => {
  const db = await getDb();
  const res2 = await db.collection('places').insertOne({ ...req.body, createdAt: new Date() });
  res.json({ id: String(res2.insertedId) });
});
