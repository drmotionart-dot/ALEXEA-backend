import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getUserById } from '../services/userService.js';

export interface AuthedRequest extends Request {
  user?: { id: string; role: 'head' | 'member'; username: string; name: string };
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const h = req.headers.authorization ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { id: string };
    const u = await getUserById(payload.id);
    if (!u || u.status !== 'active') return res.status(401).json({ error: 'Account not active' });
    req.user = { id: payload.id, role: u.role as 'head' | 'member', username: u.username, name: u.name };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(role: 'head' | 'member') {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (role === 'head' && req.user.role !== 'head') return res.status(403).json({ error: 'Heads only' });
    next();
  };
}
