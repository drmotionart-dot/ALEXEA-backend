import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { createUser, findUserByUsername, verifyPassword } from '../services/userService.js';

export const authRouter = Router();

const signupSchema = z.object({
  name: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(4),
});

authRouter.post('/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  try {
    await createUser(parsed.data.name, parsed.data.username, parsed.data.password);
    res.json({ ok: true, message: 'Waiting for a head to approve your account' });
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? 'signup failed' });
  }
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const user = await findUserByUsername(parsed.data.username);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });
  if (user.status !== 'active') {
    return res.status(403).json({ error: 'Account is pending approval or rejected' });
  }
  const ok = await verifyPassword(user as any, parsed.data.password);
  if (!ok) return res.status(401).json({ error: 'Invalid username or password' });
  const token = jwt.sign({ id: String(user._id) }, env.jwtSecret, { expiresIn: '7d' });
  res.json({ token, user: { id: String(user._id), name: user.name, username: user.username, role: user.role } });
});
