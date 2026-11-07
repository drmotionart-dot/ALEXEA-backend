import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { seedCourses, listCourses, getCourse, createCourse, listCourseDays, getCourseDay, updateCourseDay } from '../services/courseService.js';
import { getDb } from '../db/mongo.js';

export const coursesRouter = Router();

coursesRouter.get('/current-day', requireAuth, async (_req, res) => {
  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  const day = await db.collection('courseDays').findOne({ date: today });
  if (!day) return res.json({ day: null });
  const { ObjectId } = await import('mongodb');
  const course = await db.collection('courses').findOne({ _id: new ObjectId(day.courseId) });
  res.json({ day, course });
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

coursesRouter.patch('/day/:dayId', requireAuth, requireRole('head'), async (req, res) => {
  const d = await updateCourseDay(req.params.dayId, req.body);
  res.json({ day: d });
});
