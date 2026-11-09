import { getDb } from '../db/mongo.js';
import { ObjectId } from 'mongodb';

// Reference data only (not sample inventory). Categories match the tools page.
const DEFAULT_TYPES = [
  { code: 'TR', name: 'Trocar and cannula 10 mm', category: 'Access', drawing: 'trocar' },
  { code: 'VE', name: 'Veress needle', category: 'Access', drawing: 'veress' },
  { code: 'L0', name: 'Laparoscope 0° (green)', category: 'Optics', drawing: 'l0' },
  { code: 'LA', name: 'Laparoscope 30° (red)', category: 'Optics', drawing: 'l30' },
  { code: 'LC', name: 'Chameleon lens (black)', category: 'Optics', drawing: 'lch' },
  { code: 'GR', name: 'Grasper, ratchet 5 mm', category: 'Hand instruments', drawing: 'grasper' },
  { code: 'MD', name: 'Maryland dissector', category: 'Hand instruments', drawing: 'maryland' },
  { code: 'SC', name: 'Metzenbaum scissors', category: 'Hand instruments', drawing: 'scissors' },
  { code: 'NH', name: 'Needle holder', category: 'Hand instruments', drawing: 'needle' },
  { code: 'SI', name: 'Suction and irrigation cannula', category: 'Hand instruments', drawing: 'suction' },
  { code: 'HM', name: 'Harmonic handpiece', category: 'Energy', drawing: 'harm' },
  { code: 'HK', name: 'Monopolar L-hook', category: 'Energy', drawing: 'hook' },
  { code: 'LS', name: 'Linear stapler', category: 'Staplers', drawing: 'lstap' },
  { code: 'CS', name: 'Circular stapler', category: 'Staplers', drawing: 'cstap' },
  { code: 'HY', name: 'Hysteroscope set', category: 'Gynecology and urology', drawing: 'hyst' },
  { code: 'RE', name: 'Resectoscope 26 Fr', category: 'Gynecology and urology', drawing: 'resect' },
  { code: 'UM', name: 'Uterine manipulator', category: 'Gynecology and urology', drawing: 'manip' },
];

const CATEGORY_ALIASES: Record<string, string> = {
  access: 'Access',
  optics: 'Optics',
  forceps: 'Hand instruments',
  cutting: 'Hand instruments',
  suturing: 'Hand instruments',
  aspiration: 'Hand instruments',
  manipulation: 'Gynecology and urology',
  'hand instruments': 'Hand instruments',
  energy: 'Energy',
  stapling: 'Staplers',
  staplers: 'Staplers',
  gynecology: 'Gynecology and urology',
  urology: 'Gynecology and urology',
  'gynecology and urology': 'Gynecology and urology',
};

export function normalizeCategory(c: string): string {
  return CATEGORY_ALIASES[String(c || '').toLowerCase()] || 'Hand instruments';
}

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
  const list = await db.collection('toolTypes').find({}).toArray();
  return list.map((t: any) => ({ ...t, category: normalizeCategory(t.category) }));
}

export async function createToolType(data: any) {
  const db = await getDb();
  const name = String(data.name || '').trim();
  if (name.length < 2) throw new Error('Type name is too short');
  const drawing = String(data.drawing || 'grasper');
  let code = String(data.code || name.replace(/[^A-Za-z]/g, '').slice(0, 2)).toUpperCase();
  if (code.length < 2) code = (code + 'XX').slice(0, 2);
  const exists = await db.collection('toolTypes').findOne({ code });
  if (exists) {
    await db.collection('toolTypes').updateOne({ _id: exists._id }, { $set: { name, category: normalizeCategory(data.category), drawing } });
    return exists._id;
  }
  const res = await db.collection('toolTypes').insertOne({
    code,
    name,
    category: normalizeCategory(data.category),
    drawing,
    createdAt: new Date(),
  });
  return res.insertedId;
}

export async function listTools(filter: { search?: string; type?: string; status?: string } = {}) {
  const db = await getDb();
  const types = await listToolTypes();
  const byId = new Map(types.map((t: any) => [String(t._id), t]));
  const q: any = {};
  if (filter.status && filter.status !== 'all') q.status = filter.status;
  if (filter.type && filter.type !== 'all') q.typeId = filter.type;
  let list = await db.collection('tools').find(q).toArray();
  if (filter.search) {
    const s = filter.search.toLowerCase();
    list = list.filter((t: any) => {
      const ty = byId.get(String(t.typeId)) as any;
      return (t.serial || '').toLowerCase().includes(s) || (ty?.name || '').toLowerCase().includes(s);
    });
  }
  return list.map((t: any) => {
    const ty = byId.get(String(t.typeId)) as any;
    return {
      ...t,
      type: ty ? { id: String(ty._id), code: ty.code, name: ty.name, category: normalizeCategory(ty.category), drawing: ty.drawing } : null,
    };
  });
}

export async function getToolBySerial(serial: string) {
  const db = await getDb();
  return db.collection('tools').findOne({ serial: String(serial || '').toUpperCase() });
}

export async function getToolById(id: string) {
  const db = await getDb();
  return db.collection('tools').findOne({ _id: new ObjectId(id) });
}

export async function generateToolCode(typeCode: string, date?: string) {
  const db = await getDb();
  const d = date ? new Date(date) : new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const datePart = dd + mm + yy;
  const prefix = (typeCode || 'XX').slice(0, 2).toUpperCase();
  // Count only serials that follow the "2 letters + number + date" rule for this tool type.
  const docs = await db.collection('tools').find({ serial: new RegExp('^' + prefix + '\\d', 'i') }).toArray();
  const num = docs.length + 1;
  return prefix + num + datePart;
}

export async function createTool(data: any) {
  const db = await getDb();
  let typeDoc: any = null;
  if (data.typeId) {
    typeDoc = await db.collection('toolTypes').findOne({ _id: ObjectId.isValid(String(data.typeId)) ? new ObjectId(String(data.typeId)) : undefined }).catch(() => null);
    if (!typeDoc) typeDoc = await db.collection('toolTypes').findOne({ code: String(data.typeId) });
  }
  if (!typeDoc && data.typeCode) typeDoc = await db.collection('toolTypes').findOne({ code: String(data.typeCode) });
  if (!typeDoc && data.typeName) {
    const id = await createToolType({ name: data.typeName, category: data.category, drawing: data.drawing, code: data.typeCode });
    typeDoc = await db.collection('toolTypes').findOne({ _id: id });
  }
  if (!typeDoc) throw new Error('Choose a tool type');

  let serial = String(data.serial || '').trim().toUpperCase();
  if (!serial) serial = await generateToolCode(typeDoc.code, data.registeredAt);
  const existing = await db.collection('tools').findOne({ serial });
  if (existing) throw new Error('That code is already registered');

  const now = new Date();
  const res = await db.collection('tools').insertOne({
    serial,
    typeId: typeDoc._id,
    status: data.status || 'available',
    registeredAt: data.registeredAt ? new Date(data.registeredAt) : now,
    lastMaintenanceAt: null,
    photoUrl: data.photoUrl || null,
    location: {},
    history: [{ date: now.toISOString().slice(0, 10), kind: 'Registered', note: 'Added to the inventory' }],
    comments: [],
    createdAt: now,
  });
  return { id: res.insertedId, serial };
}

export async function updateTool(id: string, patch: any) {
  const db = await getDb();
  const allowed: any = {};
  for (const k of ['status', 'photoUrl', 'location', 'lastMaintenanceAt', 'name']) {
    if (patch[k] !== undefined) allowed[k] = patch[k];
  }
  if (patch.status) {
    const t: any = await getToolById(id);
    if (t && t.status !== patch.status) {
      const note = patch.status === 'maintenance' ? 'Sent for repair' : patch.status === 'inuse' ? 'Put into use' : 'Returned to stock';
      await db.collection('tools').updateOne(
        { _id: new ObjectId(id) },
        { $push: { history: { date: new Date().toISOString().slice(0, 10), kind: 'Status', note } } as any }
      );
      if (patch.status === 'available') allowed.lastMaintenanceAt = new Date();
    }
  }
  await db.collection('tools').updateOne({ _id: new ObjectId(id) }, { $set: allowed });
  return getToolById(id);
}

export async function deleteTool(id: string) {
  const db = await getDb();
  if (!ObjectId.isValid(id)) return null;
  const t: any = await getToolById(id);
  if (!t) return null;
  await db.collection('tools').deleteOne({ _id: new ObjectId(id) });
  return t;
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
  const stillFlagged = comments.some((c: any) => c.needsRepair && !c.resolved);
  await db.collection('tools').updateOne(
    { _id: new ObjectId(toolId) },
    { $set: { comments, ...(stillFlagged ? {} : { status: 'available' }) } }
  );
}

export async function repairCount() {
  const db = await getDb();
  const tools = await db.collection('tools').find({}).toArray();
  let n = 0;
  for (const t of tools) for (const c of (t.comments || [])) if (c.needsRepair && !c.resolved) n++;
  return n;
}
