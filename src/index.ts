import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { coursesRouter } from './routes/courses.js';
import { attendanceRouter } from './routes/attendance.js';
import { candidatesRouter } from './routes/candidates.js';
import { placesRouter } from './routes/places.js';
import { toolsRouter } from './routes/tools.js';
import { cleanupRouter } from './routes/cleanup.js';
import { ensureFirstHead } from './services/userService.js';

export const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// seed first head lazily on first request
let seeded = false;
app.use(async (_req, _res, next) => {
  if (!seeded) {
    seeded = true;
    try { await ensureFirstHead(); } catch (e) { console.error('seed failed', e); seeded = false; }
  }
  next();
});

app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/candidates', candidatesRouter);
app.use('/api/places', placesRouter);
app.use('/api/tools', toolsRouter);
app.use('/api/cleanup', cleanupRouter);

app.get('/', (_req, res) => res.json({ name: 'alex-ea-backend', ok: true }));

export default app;

const isVercel = process.env.VERCEL === '1';
const isTest = process.env.NODE_ENV === 'test' || process.argv.includes('--test');
if (!isVercel && !isTest) {
  const port = Number(process.env.PORT ?? 4000);
  app.listen(port, () => console.log(`backend listening on ${port}`));
}
