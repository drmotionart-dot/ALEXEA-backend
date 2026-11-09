import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/mongo.js';
import { ObjectId } from 'mongodb';
import { normalizeText } from '../matching/normalize.js';
import { seedPlaces } from '../services/placeService.js';

export const placesRouter = Router();

placesRouter.get('/', requireAuth, async (req, res) => {
  await seedPlaces();
  const db = await getDb();
  const type = req.query.type ? String(req.query.type) : undefined;
  const q: any = {};
  if (type) q.type = type;
  const list = await db.collection('places').find(q).sort({ canonicalEn: 1 }).toArray();
  res.json({ places: list });
});

placesRouter.post('/', requireAuth, async (req, res) => {
  const db = await getDb();
  const type = String(req.body?.type || '').toLowerCase();
  const canonicalEn = String(req.body?.canonicalEn || '').trim();
  const canonicalAr = String(req.body?.canonicalAr || '').trim();
  const parentId = req.body?.parentId ? String(req.body.parentId) : '';
  if (!['country', 'city', 'hospital'].includes(type)) return res.status(400).json({ error: 'type must be country, city or hospital' });
  if (!canonicalEn && !canonicalAr) return res.status(400).json({ error: 'name required' });
  const norm = normalizeText(canonicalEn || canonicalAr);
  const existing = await db.collection('places').findOne({ type, $or: [{ canonicalEn }, { canonicalAr }, { aliases: norm }] });
  if (existing) return res.json({ id: String(existing._id), existed: true });
  const res2 = await db.collection('places').insertOne({
    type,
    canonicalEn,
    canonicalAr,
    parentId,
    aliases: norm ? [norm] : [],
    createdAt: new Date(),
  });
  res.json({ id: String(res2.insertedId) });
});

// Remember a confirmed spelling so it is never asked again.
placesRouter.post('/:id/aliases', requireAuth, async (req, res) => {
  const db = await getDb();
  const raw = String(req.body?.alias || '').trim();
  if (!raw) return res.status(400).json({ error: 'alias required' });
  const alias = normalizeText(raw);
  if (!alias) return res.status(400).json({ error: 'alias required' });
  const r = await db.collection('places').updateOne(
    { _id: new ObjectId(req.params.id) },
    { $addToSet: { aliases: alias } }
  );
  if (!r.matchedCount) return res.status(404).json({ error: 'place not found' });
  res.json({ ok: true, alias });
});
