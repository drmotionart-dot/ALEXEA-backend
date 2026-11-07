import { getDb } from '../db/mongo.js';
import { ObjectId } from 'mongodb';
import coursesData from '../data/courses2026.json' with { type: 'json' };

export async function seedCourses() {
  const db = await getDb();
  const col = db.collection('courses');
  const count = await col.countDocuments();
  if (count > 0) return { seeded: false, count };
  const docs = (coursesData as any).courses.map((c: any) => ({
    name: c.name,
    dept: c.dept,
    color: c.dept,
    startDate: c.start,
    endDate: c.end,
    closed: !!c.closed,
    createdAt: new Date(),
  }));
  const res = await col.insertMany(docs);
  // generate courseDays for each
  for (const d of docs) {
    await generateCourseDays(String((await col.findOne({ name: d.name, startDate: d.startDate }))?._id), d.startDate, d.endDate);
  }
  return { seeded: true, count: docs.length };
}

export async function generateCourseDays(courseId: string, start: string, end: string) {
  const db = await getDb();
  const col = db.collection('courseDays');
  const s = new Date(start);
  const e = new Date(end);
  let idx = 1;
  const days: any[] = [];
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    const exists = await col.findOne({ courseId, date: dateStr });
    if (!exists) {
      days.push({
        courseId,
        date: dateStr,
        index: idx,
        type: 'none',
        rows: [],
        candidates: [],
        plan: { morning: [], afternoon: [] },
        team: {},
        toolAssignments: [],
        locked: false,
        version: 1,
      });
    }
    idx++;
  }
  if (days.length) await col.insertMany(days);
  return days.length;
}

export async function listCourses() {
  const db = await getDb();
  return db.collection('courses').find({}).sort({ startDate: 1 }).toArray();
}

export async function getCourse(id: string) {
  const db = await getDb();
  return db.collection('courses').findOne({ _id: new ObjectId(id) });
}

export async function createCourse(data: any) {
  const db = await getDb();
  const res = await db.collection('courses').insertOne({ ...data, createdAt: new Date() });
  if (data.startDate && data.endDate) {
    await generateCourseDays(String(res.insertedId), data.startDate, data.endDate);
  }
  return res.insertedId;
}

export async function listCourseDays(courseId: string) {
  const db = await getDb();
  return db.collection('courseDays').find({ courseId }).sort({ date: 1 }).toArray();
}

export async function getCourseDay(id: string) {
  const db = await getDb();
  return db.collection('courseDays').findOne({ _id: new ObjectId(id) });
}

export async function updateCourseDay(id: string, patch: any) {
  const db = await getDb();
  patch.version = (patch.version ?? 0) + 1;
  await db.collection('courseDays').updateOne({ _id: new ObjectId(id) }, { $set: patch });
  return getCourseDay(id);
}
