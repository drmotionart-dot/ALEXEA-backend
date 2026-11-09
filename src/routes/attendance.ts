import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { listAttendance, upsertAttendance, getAttendance } from '../services/attendanceService.js';
import { getCourseDay } from '../services/courseService.js';
import { logActivity } from '../services/activityService.js';

export const attendanceRouter = Router();

attendanceRouter.delete('/assignments', requireAuth, requireRole('head'), async (req, res) => {
  const courseDayId = String(req.query.courseDayId || '');
  if (!courseDayId) return res.status(400).json({ error: 'courseDayId required' });
  const { updateCourseDay } = await import('../services/courseService.js');
  const day = await getCourseDay(courseDayId);
  await updateCourseDay(courseDayId, { team: {} });
  const user = (req as any).user;
  logActivity(user.name, user.role, 'assign', 'cleared the Upper and Lower team for <b>' + (day?.date || '') + '</b>', 'attendance').catch(() => {});
  res.json({ ok: true });
});

attendanceRouter.get('/', requireAuth, async (req, res) => {
  const courseDayId = String(req.query.courseDayId || '');
  if (!courseDayId) return res.status(400).json({ error: 'courseDayId required' });
  const list = await listAttendance(courseDayId);
  res.json({ attendance: list });
});

const setSchema = z.object({
  courseDayId: z.string(),
  userId: z.string(),
  state: z.enum(['present', 'late', 'absent']),
  checkedInAt: z.string().optional(),
});

attendanceRouter.post('/', requireAuth, requireRole('head'), async (req, res) => {
  const parsed = setSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  await upsertAttendance(parsed.data.courseDayId, parsed.data.userId, parsed.data.state, parsed.data.checkedInAt);
  const user = (req as any).user;
  const { getUserById } = await import('../services/userService.js');
  const target = await getUserById(parsed.data.userId).catch(() => null);
  logActivity(user.name, user.role, 'checkin', 'marked <b>' + (target?.name || 'a member') + '</b> ' + parsed.data.state, 'attendance').catch(() => {});
  res.json({ ok: true });
});

const checkinSchema = z.object({
  courseDayId: z.string(),
  time: z.string(), // HH:MM
});

attendanceRouter.post('/checkin', requireAuth, async (req, res) => {
  const parsed = checkinSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const day = await getCourseDay(parsed.data.courseDayId);
  const rows = (day?.rows || []).slice().sort((a: any, b: any) => a.start.localeCompare(b.start));
  const start = rows.length ? rows[0].start : null;
  const late = start ? parsed.data.time > start : false;
  const state = late ? 'late' : 'present';
  await upsertAttendance(parsed.data.courseDayId, (req as any).user.id, state, parsed.data.time);
  const user = (req as any).user;
  logActivity(user.name, user.role, 'checkin', 'checked in (' + state + ')', 'attendance').catch(() => {});
  res.json({ state, late });
});
