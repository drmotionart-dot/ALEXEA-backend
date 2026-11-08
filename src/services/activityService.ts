import { getDb } from '../db/mongo.js';
import { ObjectId } from 'mongodb';

export async function logActivity(by: string, role: string, kind: string, text: string, link?: string) {
  const db = await getDb();
  await db.collection('activity').insertOne({ by, role, kind, text, link: link || '', date: new Date().toISOString().slice(0, 10), time: new Date().toTimeString().slice(0, 5), createdAt: new Date() });
}

export async function listActivity(filter: { kind?: string; who?: string; limit?: number } = {}) {
  const db = await getDb();
  const q: any = {};
  if (filter.kind && filter.kind !== 'all') q.kind = filter.kind;
  if (filter.who && filter.who !== 'all') q.by = filter.who;
  return db.collection('activity').find(q).sort({ createdAt: -1 }).limit(filter.limit || 100).toArray();
}
