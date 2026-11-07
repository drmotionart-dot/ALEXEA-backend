import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getDb } from '../db/mongo.js';
import { env } from '../config/env.js';

export const cleanupRouter = Router();

// manual export (head)
cleanupRouter.get('/export', requireAuth, requireRole('head'), async (req, res) => {
  const db = await getDb();
  const courseId = req.query.courseId ? String(req.query.courseId) : undefined;
  const q: any = {};
  if (courseId) q.courseId = courseId;
  const candidates = await db.collection('candidates').find(q).toArray();
  const courseDays = courseId ? await db.collection('courseDays').find({ courseId }).toArray() : [];
  res.json({ exportedAt: new Date().toISOString(), candidates, courseDays });
});

// manual delete candidate data for a course (head)
cleanupRouter.delete('/purge', requireAuth, requireRole('head'), async (req, res) => {
  const db = await getDb();
  const courseId = req.body?.courseId;
  if (!courseId) return res.status(400).json({ error: 'courseId required' });
  await db.collection('candidates').deleteMany({ courseId });
  await db.collection('courseDays').updateMany({ courseId }, { $set: { candidates: [] } });
  res.json({ ok: true });
});

function cronAuthorized(req: any): boolean {
  if (!env.cronSecret) return false;
  const x = req.headers['x-cron-secret'];
  const auth = req.headers['authorization'];
  if (x === env.cronSecret) return true;
  if (auth === `Bearer ${env.cronSecret}`) return true;
  if (req.query?.secret === env.cronSecret) return true;
  return false;
}

// cron endpoint (secret header)
cleanupRouter.post('/cron', async (req, res) => {
  if (!cronAuthorized(req)) return res.status(401).json({ error: 'unauthorized' });
  const db = await getDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (env.retentionDays || 30));
  const courses = await db.collection('courses').find({ endDate: { $lt: cutoff.toISOString().slice(0, 10) } }).toArray();
  let deleted = 0;
  for (const c of courses) {
    const id = String(c._id);
    const r = await db.collection('candidates').deleteMany({ courseId: id });
    deleted += r.deletedCount || 0;
    await db.collection('courseDays').updateMany({ courseId: id }, { $set: { candidates: [] } });
  }
  res.json({ ok: true, courses: courses.length, deleted });
});

// GET for cron (Vercel cron uses GET)
cleanupRouter.get('/cron', async (req, res) => {
  if (!cronAuthorized(req)) return res.status(401).json({ error: 'unauthorized' });
  const db = await getDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (env.retentionDays || 30));
  const courses = await db.collection('courses').find({ endDate: { $lt: cutoff.toISOString().slice(0, 10) } }).toArray();
  let deleted = 0;
  for (const c of courses) {
    const id = String(c._id);
    const r = await db.collection('candidates').deleteMany({ courseId: id });
    deleted += r.deletedCount || 0;
    await db.collection('courseDays').updateMany({ courseId: id }, { $set: { candidates: [] } });
  }
  res.json({ ok: true, courses: courses.length, deleted });
});
