import { getDb } from '../db/mongo.js';
import { env } from '../config/env.js';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';

export type Role = 'head' | 'member';
export type Status = 'pending' | 'active' | 'rejected';

export interface UserDoc {
  _id?: ObjectId;
  name: string;
  username: string;
  passwordHash: string;
  role: Role;
  status: Status;
  createdAt: Date;
}

let seeded = false;
export async function ensureFirstHead() {
  if (seeded) return;
  seeded = true;
  const db = await getDb();
  const count = await db.collection('users').countDocuments();
  if (count > 0) return;
  const passwordHash = await bcrypt.hash(env.firstHeadPassword, 10);
  await db.collection('users').insertOne({
    name: env.firstHeadName,
    username: env.firstHeadUsername,
    passwordHash,
    role: 'head',
    status: 'active',
    createdAt: new Date(),
  });
}

export async function findUserByUsername(username: string) {
  const db = await getDb();
  return db.collection<UserDoc>('users').findOne({ username });
}

export async function createUser(name: string, username: string, password: string) {
  const db = await getDb();
  const exists = await db.collection('users').findOne({ username });
  if (exists) throw new Error('Username already taken');
  const passwordHash = await bcrypt.hash(password, 10);
  const res = await db.collection('users').insertOne({
    name,
    username,
    passwordHash,
    role: 'member',
    status: 'pending',
    createdAt: new Date(),
  });
  return res.insertedId;
}

export async function verifyPassword(user: UserDoc, password: string) {
  return bcrypt.compare(password, user.passwordHash);
}

export async function listPending() {
  const db = await getDb();
  return db.collection('users').find({ status: 'pending' }).project({ passwordHash: 0 }).toArray();
}

export async function setStatus(id: string, status: Status) {
  const db = await getDb();
  await db.collection('users').updateOne({ _id: new ObjectId(id) }, { $set: { status } });
}

export async function resetPassword(id: string, newPassword: string) {
  const db = await getDb();
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.collection('users').updateOne({ _id: new ObjectId(id) }, { $set: { passwordHash } });
}

export async function getUserById(id: string) {
  const db = await getDb();
  return db.collection<UserDoc>('users').findOne({ _id: new ObjectId(id) }, { projection: { passwordHash: 0 } });
}
