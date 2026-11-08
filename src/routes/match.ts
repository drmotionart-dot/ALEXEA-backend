import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/mongo.js';
import { normalizeText, soundKey, jaroWinkler } from '../matching/normalize.js';

export const matchRouter = Router();

async function bestMatch(type: string, raw: string, parentId?: string) {
  const db = await getDb();
  const norm = normalizeText(raw);
  const sk = soundKey(raw);
  if (!norm) return { match: null, action: 'create', score: 0 };
  const q: any = { type };
  const places = await db.collection('places').find(q).toArray();
  let best: any = null;
  let bestScore = 0;
  for (const p of places) {
    if (parentId && p.parentId && String(p.parentId) !== String(parentId)) continue;
    const aliases = (p.aliases || []).map((a: string) => normalizeText(a));
    if (aliases.includes(norm)) return { match: toMatch(p, 1), action: 'match', score: 1 };
    if (normalizeText(p.canonicalEn || '') === norm || (p.canonicalAr && normalizeText(p.canonicalAr) === norm)) {
      return { match: toMatch(p, 1), action: 'match', score: 1 };
    }
    let score = jaroWinkler(sk, soundKey(p.canonicalEn || ''));
    if (p.canonicalAr) score = Math.max(score, jaroWinkler(sk, soundKey(p.canonicalAr)));
    if (score > bestScore) { bestScore = score; best = p; }
  }
  let action = 'create';
  if (bestScore >= 0.90) action = 'match';
  else if (bestScore >= 0.70) action = 'confirm';
  return { match: best ? toMatch(best, bestScore) : null, action, score: Number(bestScore.toFixed(3)) };
}

function toMatch(p: any, score: number) {
  return {
    id: String(p._id),
    name: p.canonicalEn || p.canonicalAr || '',
    nameAr: p.canonicalAr || '',
    parentId: p.parentId || '',
    score: Number(score.toFixed(3)),
  };
}

matchRouter.post('/', requireAuth, async (req, res) => {
  const { type, raw, parentId } = req.body || {};
  if (!['country', 'city', 'hospital'].includes(String(type))) return res.status(400).json({ error: 'invalid type' });
  const result = await bestMatch(String(type), String(raw || ''), parentId ? String(parentId) : undefined);
  res.json(result);
});

// Batch: { items:[{key,type,raw,parentId}] } -> { results:{key:...} }
matchRouter.post('/batch', requireAuth, async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const results: any = {};
  for (const it of items) {
    results[String(it.key)] = await bestMatch(String(it.type), String(it.raw || ''), it.parentId ? String(it.parentId) : undefined);
  }
  res.json({ results });
});
