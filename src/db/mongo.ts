import { MongoClient, Db } from 'mongodb';
import { env } from '../config/env.js';

// Module-level cache: one client per serverless instance.
let client: MongoClient | null = null;
let db: Db | null = null;
let connecting: Promise<Db> | null = null;

export async function getDb(): Promise<Db> {
  if (db) return db;
  if (connecting) return connecting;
  connecting = (async () => {
    if (!env.mongoUri) throw new Error('MONGODB_URI not set');
    const c = new MongoClient(env.mongoUri, {
      maxPoolSize: 5,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5000,
    });
    await c.connect();
    client = c;
    const d = c.db(env.dbName);
    db = d;
    // indexes (idempotent)
    await ensureIndexes(d);
    return d;
  })();
  try {
    return await connecting;
  } finally {
    // keep connecting reference cleared on success; on failure reset
    if (!db) connecting = null;
  }
}

async function ensureIndexes(d: Db) {
  await d.collection('users').createIndex({ username: 1 }, { unique: true }).catch(() => {});
  await d.collection('tools').createIndex({ serial: 1 }, { unique: true }).catch(() => {});
  await d.collection('tools').createIndex({ typeId: 1, status: 1 }).catch(() => {});
  await d.collection('courseDays').createIndex({ courseId: 1, date: 1 }).catch(() => {});
  await d.collection('candidates').createIndex({ courseId: 1 }).catch(() => {});
  await d.collection('places').createIndex({ type: 1 }).catch(() => {});
}

export async function closeDb() {
  if (client) await client.close();
  client = null;
  db = null;
  connecting = null;
}
