import { getDb } from '../db/mongo.js';

const SEED: { nameLatin: string; nameAr: string; gender: 'm' | 'f' }[] = [
  { nameLatin: 'ahmed', nameAr: 'احمد', gender: 'm' },
  { nameLatin: 'mohamed', nameAr: 'محمد', gender: 'm' },
  { nameLatin: 'omar', nameAr: 'عمر', gender: 'm' },
  { nameLatin: 'mostafa', nameAr: 'مصطفي', gender: 'm' },
  { nameLatin: 'khaled', nameAr: 'خالد', gender: 'm' },
  { nameLatin: 'hassan', nameAr: 'حسن', gender: 'm' },
  { nameLatin: 'ali', nameAr: 'علي', gender: 'm' },
  { nameLatin: 'youssef', nameAr: 'يوسف', gender: 'm' },
  { nameLatin: 'karim', nameAr: 'كريم', gender: 'm' },
  { nameLatin: 'ibrahim', nameAr: 'ابراهيم', gender: 'm' },
  { nameLatin: 'sara', nameAr: 'سارة', gender: 'f' },
  { nameLatin: 'nour', nameAr: 'نور', gender: 'f' },
  { nameLatin: 'mariam', nameAr: 'مريم', gender: 'f' },
  { nameLatin: 'fatma', nameAr: 'فاطمة', gender: 'f' },
  { nameLatin: 'fatima', nameAr: 'فاطمة', gender: 'f' },
  { nameLatin: 'mona', nameAr: 'منى', gender: 'f' },
  { nameLatin: 'hala', nameAr: 'هاله', gender: 'f' },
  { nameLatin: 'dina', nameAr: 'دينا', gender: 'f' },
  { nameLatin: 'salma', nameAr: 'سلمى', gender: 'f' },
  { nameLatin: 'rana', nameAr: 'رنا', gender: 'f' },
];

export async function seedNames() {
  const db = await getDb();
  const col = db.collection('names');
  const count = await col.countDocuments();
  if (count > 0) return;
  await col.insertMany(SEED.map(n => ({ ...n, createdAt: new Date() })));
}

export async function lookupGender(name: string): Promise<'m' | 'f' | 'u'> {
  const db = await getDb();
  await seedNames();
  const first = (name || '').trim().split(/\s+/)[0].toLowerCase();
  const n = await db.collection('names').findOne({ nameLatin: first });
  if (n) return n.gender as 'm' | 'f';
  // try arabic
  const n2 = await db.collection('names').findOne({ nameAr: first });
  if (n2) return n2.gender as 'm' | 'f';
  return 'u';
}
