import { getDb } from '../db/mongo.js';
import { ObjectId } from 'mongodb';

export async function listAttendance(courseDayId: string) {
  const db = await getDb();
  return db.collection('attendance').find({ courseDayId }).toArray();
}

export async function upsertAttendance(courseDayId: string, userId: string, state: 'present' | 'late' | 'absent', checkedInAt?: string) {
  const db = await getDb();
  await db.collection('attendance').updateOne(
    { courseDayId, userId },
    { $set: { courseDayId, userId, state, checkedInAt: checkedInAt ?? new Date().toISOString() } },
    { upsert: true }
  );
}

export async function getAttendance(courseDayId: string, userId: string) {
  const db = await getDb();
  return db.collection('attendance').findOne({ courseDayId, userId });
}
