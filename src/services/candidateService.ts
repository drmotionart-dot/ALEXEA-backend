import { getDb } from '../db/mongo.js';
import { ObjectId } from 'mongodb';

export async function listCandidates(courseId?: string) {
  const db = await getDb();
  const q: any = {};
  if (courseId) q.courseId = courseId;
  return db.collection('candidates').find(q).toArray();
}

export async function createCandidate(data: any) {
  const db = await getDb();
  const res = await db.collection('candidates').insertOne({ ...normalizeCandidate(data), createdAt: new Date() });
  return res.insertedId;
}

export async function bulkCreateCandidates(items: any[]) {
  const db = await getDb();
  if (!items.length) return [];
  const res = await db.collection('candidates').insertMany(items.map(i => ({ ...normalizeCandidate(i), createdAt: new Date() })));
  return Object.values(res.insertedIds);
}

export async function updateCandidate(id: string, patch: any) {
  const db = await getDb();
  await db.collection('candidates').updateOne({ _id: new ObjectId(id) }, { $set: normalizeCandidate(patch) });
  return db.collection('candidates').findOne({ _id: new ObjectId(id) });
}

// The planner stores gender as m / f / u. Import screens may send full words; accept both.
function normalizeCandidate(data: any) {
  const out = { ...data };
  if (typeof out.gender === 'string') {
    const g = out.gender.trim().toLowerCase();
    out.gender = (g === 'm' || g === 'male' || g === 'man' || g === 'ذكر') ? 'm'
      : (g === 'f' || g === 'female' || g === 'woman' || g === 'انثى' || g === 'أنثى') ? 'f'
      : 'u';
  }
  return out;
}

export async function deleteCandidate(id: string) {
  const db = await getDb();
  await db.collection('candidates').deleteOne({ _id: new ObjectId(id) });
}
