import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/mongo.js';
import { normalizeText, soundKey, jaroWinkler } from '../matching/normalize.js';

export const matchRouter = Router();

matchRouter.post('/', requireAuth, async (req, res) => {
  const { type, raw, parentId } = req.body || {};
  const db = await getDb();
  const norm = normalizeText(raw);
  const sk = soundKey(raw);
  // alias lookup
  const places = await db.collection('places').find({ type }).toArray();
  let best: any = null;
  let bestScore = 0;
  for (const p of places) {
    if (parentId && p.parentId && String(p.parentId) !== String(parentId)) continue;
    const aliases = p.aliases || [];
    if (aliases.map((a: string) => normalizeText(a)).includes(norm)) { best = p; bestScore = 1; break; }
    const key = soundKey(p.canonicalEn || '');
    const score = jaroWinkler(sk, key);
    if (score > bestScore) { bestScore = score; best = p; }
    // also check arabic
    if (p.canonicalAr) {
      const score2 = jaroWinkler(sk, soundKey(p.canonicalAr));
      if (score2 > bestScore) { bestScore = score2; best = p; }
    }
  }
  let action = 'create';
  if (bestScore >= 0.90) action = 'match';
  else if (bestScore >= 0.70) action = 'confirm';
  res.json({ match: best ? { id: String(best._id), name: best.canonicalEn, score: bestScore } : null, action, score: bestScore });
});
