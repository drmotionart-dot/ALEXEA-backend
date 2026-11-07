import { getDb } from '../db/mongo.js';
import { ObjectId } from 'mongodb';

const DEFAULT_TYPES = [
  { code: 'GR', name: 'Grasper', category: 'forceps', drawing: 'grasper' },
  { code: 'MA', name: 'Maryland dissector', category: 'forceps', drawing: 'maryland' },
  { code: 'SC', name: 'Scissors', category: 'cutting', drawing: 'scissors' },
  { code: 'NE', name: 'Needle holder', category: 'suturing', drawing: 'needle' },
  { code: 'HK', name: 'Hook', category: 'cutting', drawing: 'hook' },
  { code: 'SU', name: 'Suction', category: 'aspiration', drawing: 'suction' },
  { code: 'TR', name: 'Trocar', category: 'access', drawing: 'trocar' },
  { code: 'VE', name: 'Veress needle', category: 'access', drawing: 'veress' },
  { code: 'L0', name: 'Telescope 0°', category: 'optics', drawing: 'l0' },
  { code: 'L3', name: 'Telescope 30°', category: 'optics', drawing: 'l30' },
  { code: 'LC', name: 'Telescope chameleon', category: 'optics', drawing: 'lch' },
  { code: 'HY', name: 'Hysteroscope', category: 'optics', drawing: 'hyst' },
  { code: 'RE', name: 'Resectoscope', category: 'optics', drawing: 'resect' },
  { code: 'HA', name: 'Harmonic scalpel', category: 'energy', drawing: 'harm' },
  { code: 'LS', name: 'Linear stapler', category: 'stapling', drawing: 'lstap' },
  { code: 'CS', name: 'Circular stapler', category: 'stapling', drawing: 'cstap' },
  { code: 'MA2', name: 'Manipulator', category: 'manipulation', drawing: 'manip' },
];

export async function seedToolTypes() {
  const db = await getDb();
  const col = db.collection('toolTypes');
  const count = await col.countDocuments();
  if (count > 0) return;
  await col.insertMany(DEFAULT_TYPES.map(t => ({ ...t, createdAt: new Date() })));
}

export async function listToolTypes() {
  const db = await getDb();
  await seedToolTypes();
  return db.collection('toolTypes').find({}).toArray();
}

export async function listTools(filter: { search?: string; type?: string; status?: string } = {}) {
  const db = await getDb();
  await seedToolTypes();
  const q: any = {};
  if (filter.type) q.typeId = filter.type;
  if (filter.status) q.status = filter.status;
  let list = await db.collection('tools').find(q).toArray();
  if (filter.search) {
    const s = filter.search.toLowerCase();
    list = list.filter((t: any) => (t.serial || '').toLowerCase().includes(s) || (t.name || '').toLowerCase().includes(s));
  }
  return list;
}

export async function getToolBySerial(serial: string) {
  const db = await getDb();
  return db.collection('tools').findOne({ serial });
}

export async function getToolById(id: string) {
  const db = await getDb();
  return db.collection('tools').findOne({ _id: new ObjectId(id) });
}

export async function createTool(data: any) {
  const db = await getDb();
  const res = await db.collection('tools').insertOne({
    serial: data.serial,
    typeId: data.typeId,
    status: data.status || 'available',
    registeredAt: new Date(),
    lastMaintenanceAt: null,
    photoUrl: data.photoUrl || null,
    location: data.location || {},
    history: [],
    comments: [],
  });
  return res.insertedId;
}

export async function updateTool(id: string, patch: any) {
  const db = await getDb();
  await db.collection('tools').updateOne({ _id: new ObjectId(id) }, { $set: patch });
  return getToolById(id);
}

export async function addComment(toolId: string, by: string, text: string, needsRepair: boolean) {
  const db = await getDb();
  const comment = { by, date: new Date(), text, needsRepair, resolved: false };
  await db.collection('tools').updateOne({ _id: new ObjectId(toolId) }, { $push: { comments: comment } as any });
  if (needsRepair) {
    await db.collection('tools').updateOne({ _id: new ObjectId(toolId) }, { $set: { status: 'maintenance' } });
  }
  return comment;
}

export async function resolveComment(toolId: string, commentIndex: number) {
  const db = await getDb();
  const t: any = await getToolById(toolId);
  if (!t) return;
  const comments = t.comments || [];
  if (comments[commentIndex]) comments[commentIndex].resolved = true;
  await db.collection('tools').updateOne({ _id: new ObjectId(toolId) }, { $set: { comments } });
}

export async function repairCount() {
  const db = await getDb();
  const tools = await db.collection('tools').find({}).toArray();
  let n = 0;
  for (const t of tools) for (const c of (t.comments || [])) if (c.needsRepair && !c.resolved) n++;
  return n;
}
