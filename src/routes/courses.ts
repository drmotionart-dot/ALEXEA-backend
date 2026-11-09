import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { seedCourses, listCourses, getCourse, createCourse, listCourseDays, getCourseDay, updateCourseDay } from '../services/courseService.js';
import { getDb } from '../db/mongo.js';
import { ObjectId } from 'mongodb';
import { logActivity } from '../services/activityService.js';

export const coursesRouter = Router();

async function dayWithCourse(date?: string) {
  const db = await getDb();
  const today = date || new Date().toISOString().slice(0, 10);
  let day = await db.collection('courseDays').findOne({ date: today });
  if (!day) {
    // next day with a course, so the hands-on/attendance page is useful before the course starts
    day = await db.collection('courseDays').findOne({ date: { $gte: today } }, { sort: { date: 1 } });
  }
  if (!day) return { day: null, course: null };
  const course = await db.collection('courses').findOne({ _id: new ObjectId(day.courseId) });
  return { day, course };
}

coursesRouter.get('/current-day', requireAuth, async (req, res) => {
  const date = req.query.date ? String(req.query.date) : undefined;
  const db = await getDb();
  const today = date || new Date().toISOString().slice(0, 10);
  const day = await db.collection('courseDays').findOne({ date: today });
  if (!day) return res.json({ day: null, course: null });
  const course = await db.collection('courses').findOne({ _id: new ObjectId(day.courseId) });
  res.json({ day, course });
});

// Today's day, or the next course day when no course runs today.
coursesRouter.get('/active-day', requireAuth, async (_req, res) => {
  res.json(await dayWithCourse());
});

coursesRouter.get('/day-by-date/:date', requireAuth, async (req, res) => {
  const db = await getDb();
  const day = await db.collection('courseDays').findOne({ date: req.params.date });
  if (!day) return res.json({ day: null, course: null });
  const course = await db.collection('courses').findOne({ _id: new ObjectId(day.courseId) });
  res.json({ day, course });
});

// Day types for a date range, so the calendar can mark real hands-on days without loading every day document.
coursesRouter.get('/days', requireAuth, async (req, res) => {
  const from = String(req.query.from || '').slice(0, 10);
  const to = String(req.query.to || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).json({ error: 'from and to are required (YYYY-MM-DD)' });
  }
  const db = await getDb();
  const list = await db.collection('courseDays')
    .find({ date: { $gte: from, $lte: to } }, { projection: { date: 1, type: 1, courseId: 1, index: 1 } })
    .sort({ date: 1 })
    .toArray();
  res.json({ days: list.map((d: any) => ({ date: d.date, type: d.type || 'none', courseId: d.courseId, index: d.index })) });
});

coursesRouter.get('/', requireAuth, async (_req, res) => {
  const list = await listCourses();
  if (list.length === 0) {
    await seedCourses();
    return res.json({ courses: await listCourses() });
  }
  res.json({ courses: list });
});

coursesRouter.post('/seed', requireAuth, requireRole('head'), async (_req, res) => {
  const r = await seedCourses();
  res.json(r);
});

const createSchema = z.object({
  name: z.string().min(1),
  dept: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  closed: z.boolean().optional(),
});

coursesRouter.post('/', requireAuth, requireRole('head'), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  const id = await createCourse(parsed.data);
  res.json({ id: String(id) });
});

coursesRouter.get('/:id', requireAuth, async (req, res) => {
  const c = await getCourse(req.params.id);
  if (!c) return res.status(404).json({ error: 'not found' });
  res.json({ course: c });
});

coursesRouter.get('/:id/days', requireAuth, async (req, res) => {
  const days = await listCourseDays(req.params.id);
  res.json({ days });
});

coursesRouter.get('/day/:dayId', requireAuth, async (req, res) => {
  const d = await getCourseDay(req.params.dayId);
  if (!d) return res.status(404).json({ error: 'not found' });
  res.json({ day: d });
});

const dayPatch = z.object({
  type: z.enum(['d12', 'dw', 'da', 'sh', 'shift', 'none']).optional(),
  rows: z.array(z.any()).optional(),
  candidates: z.array(z.string()).optional(),
  plan: z.any().optional(),
  team: z.any().optional(),
  toolAssignments: z.array(z.any()).optional(),
  locked: z.boolean().optional(),
});

coursesRouter.patch('/day/:dayId', requireAuth, requireRole('head'), async (req, res) => {
  const parsed = dayPatch.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  const patch: any = { ...parsed.data };
  if (patch.type === 'shift') patch.type = 'sh';
  const d = await updateCourseDay(req.params.dayId, patch);
  const user = (req as any).user;
  const date = (d as any)?.date || '';
  if (patch.team !== undefined) {
    logActivity(user.name, user.role, 'assign', 'changed the Upper and Lower team for <b>' + date + '</b>', 'attendance').catch(() => {});
  } else if (patch.plan !== undefined) {
    logActivity(user.name, user.role, 'assign', 'changed the hands-on plan for <b>' + date + '</b>', 'hands-on').catch(() => {});
  } else {
    logActivity(user.name, user.role, 'cal', 'updated the programme of <b>' + date + '</b>', 'calendar').catch(() => {});
  }
  res.json({ day: d });
});
