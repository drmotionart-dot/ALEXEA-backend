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
  const res = await db.collection('candidates').insertOne({ ...data, createdAt: new Date() });
  return res.insertedId;
}

export async function bulkCreateCandidates(items: any[]) {
  const db = await getDb();
  if (!items.length) return [];
  const res = await db.collection('candidates').insertMany(items.map(i => ({ ...i, createdAt: new Date() })));
  return Object.values(res.insertedIds);
}

export async function updateCandidate(id: string, patch: any) {
  const db = await getDb();
  await db.collection('candidates').updateOne({ _id: new ObjectId(id) }, { $set: patch });
  return db.collection('candidates').findOne({ _id: new ObjectId(id) });
}

export async function deleteCandidate(id: string) {
  const db = await getDb();
  await db.collection('candidates').deleteOne({ _id: new ObjectId(id) });
}
