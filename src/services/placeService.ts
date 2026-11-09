import { getDb } from '../db/mongo.js';

type CountrySeed = { en: string; ar: string; aliases: string[] };
type CitySeed = { en: string; ar: string; country: string; aliases: string[] };
type HospitalSeed = { en: string; ar: string; city: string; aliases: string[] };

const COUNTRIES: CountrySeed[] = [
  { en: 'Egypt', ar: 'مصر', aliases: ['egypt', 'egyptian', 'مصر', 'مصري', 'مصرية'] },
  { en: 'Sudan', ar: 'السودان', aliases: ['sudan', 'sudanese', 'السودان', 'سوداني', 'سودانية'] },
  { en: 'Libya', ar: 'ليبيا', aliases: ['libya', 'libyan', 'ليبيا', 'ليبي', 'ليبية'] },
  { en: 'Saudi Arabia', ar: 'السعودية', aliases: ['saudi arabia', 'saudi', 'ksa', 'السعودية', 'سعودي', 'سعودية'] },
  { en: 'Yemen', ar: 'اليمن', aliases: ['yemen', 'yemeni', 'اليمن', 'يمني', 'يمنية'] },
  { en: 'Syria', ar: 'سوريا', aliases: ['syria', 'syrian', 'سوريا', 'سوري', 'سورية'] },
  { en: 'Jordan', ar: 'الأردن', aliases: ['jordan', 'jordanian', 'الاردن', 'الأردن', 'اردني', 'أردني'] },
  { en: 'Palestine', ar: 'فلسطين', aliases: ['palestine', 'palestinian', 'فلسطين', 'فلسطيني', 'فلسطينية'] },
  { en: 'Iraq', ar: 'العراق', aliases: ['iraq', 'iraqi', 'العراق', 'عراقي', 'عراقية'] },
  { en: 'United Arab Emirates', ar: 'الإمارات', aliases: ['uae', 'united arab emirates', 'emirati', 'الامارات', 'الإمارات', 'اماراتي'] },
  { en: 'Kuwait', ar: 'الكويت', aliases: ['kuwait', 'kuwaiti', 'الكويت', 'كويتي', 'كويتية'] },
  { en: 'Qatar', ar: 'قطر', aliases: ['qatar', 'qatari', 'قطر', 'قطري', 'قطرية'] },
  { en: 'Oman', ar: 'عمان', aliases: ['oman', 'omani', 'عمان', 'عماني', 'عمانية'] },
  { en: 'Bahrain', ar: 'البحرين', aliases: ['bahrain', 'bahraini', 'البحرين', 'بحريني', 'بحرينية'] },
  { en: 'Lebanon', ar: 'لبنان', aliases: ['lebanon', 'lebanese', 'لبنان', 'لبناني', 'لبنانية'] },
  { en: 'Morocco', ar: 'المغرب', aliases: ['morocco', 'moroccan', 'المغرب', 'مغربي', 'مغربية'] },
  { en: 'Algeria', ar: 'الجزائر', aliases: ['algeria', 'algerian', 'الجزائر', 'جزائري', 'جزائرية'] },
  { en: 'Tunisia', ar: 'تونس', aliases: ['tunisia', 'tunisian', 'تونس', 'تونسي', 'تونسية'] },
  { en: 'Turkey', ar: 'تركيا', aliases: ['turkey', 'turkish', 'تركيا', 'تركي', 'تركية'] },
];

const CITIES: CitySeed[] = [
  { en: 'Cairo', ar: 'القاهرة', country: 'Egypt', aliases: ['cairo', 'kairo', 'القاهرة', 'القاهره'] },
  { en: 'Alexandria', ar: 'الإسكندرية', country: 'Egypt', aliases: ['alexandria', 'alex', 'الإسكندرية', 'الاسكندرية', 'اسكندرية', 'الاسكندريه'] },
  { en: 'Giza', ar: 'الجيزة', country: 'Egypt', aliases: ['giza', 'gizeh', 'الجيزة', 'الجيزه'] },
  { en: 'Mansoura', ar: 'المنصورة', country: 'Egypt', aliases: ['mansoura', 'mansura', 'المنصورة', 'المنصوره'] },
  { en: 'Tanta', ar: 'طنطا', country: 'Egypt', aliases: ['tanta', 'طنطا'] },
  { en: 'Zagazig', ar: 'الزقازيق', country: 'Egypt', aliases: ['zagazig', 'الزقازيق'] },
  { en: 'Assiut', ar: 'أسيوط', country: 'Egypt', aliases: ['assiut', 'asyut', 'أسيوط', 'اسيوط'] },
  { en: 'Sohag', ar: 'سوهاج', country: 'Egypt', aliases: ['sohag', 'سوهاج'] },
  { en: 'Aswan', ar: 'أسوان', country: 'Egypt', aliases: ['aswan', 'أسوان', 'اسوان'] },
  { en: 'Luxor', ar: 'الأقصر', country: 'Egypt', aliases: ['luxor', 'الأقصر', 'الاقصر'] },
  { en: 'Ismailia', ar: 'الإسماعيلية', country: 'Egypt', aliases: ['ismailia', 'الإسماعيلية', 'الاسماعيلية', 'الاسماعيليه'] },
  { en: 'Port Said', ar: 'بورسعيد', country: 'Egypt', aliases: ['port said', 'بورسعيد', 'بور سعيد'] },
  { en: 'Suez', ar: 'السويس', country: 'Egypt', aliases: ['suez', 'السويس'] },
  { en: 'Damietta', ar: 'دمياط', country: 'Egypt', aliases: ['damietta', 'dumyat', 'دمياط'] },
  { en: 'Beni Suef', ar: 'بني سويف', country: 'Egypt', aliases: ['beni suef', 'bani suef', 'بني سويف', 'بنى سويف'] },
  { en: 'Minya', ar: 'المنيا', country: 'Egypt', aliases: ['minya', 'menia', 'المنيا'] },
  { en: 'Fayoum', ar: 'الفيوم', country: 'Egypt', aliases: ['fayoum', 'faiyum', 'الفيوم'] },
  { en: 'Damanhour', ar: 'دمنهور', country: 'Egypt', aliases: ['damanhour', 'damanhur', 'دمنهور'] },
  { en: 'Kafr El Sheikh', ar: 'كفر الشيخ', country: 'Egypt', aliases: ['kafr el sheikh', 'kafr elshikh', 'كفر الشيخ'] },
  { en: 'Banha', ar: 'بنها', country: 'Egypt', aliases: ['banha', 'benha', 'بنها'] },
  { en: 'Shibin El Kom', ar: 'شبين الكوم', country: 'Egypt', aliases: ['shibin el kom', 'shebin el kom', 'شبين الكوم'] },
  { en: 'Hurghada', ar: 'الغردقة', country: 'Egypt', aliases: ['hurghada', 'الغردقة', 'الغردقه'] },
  { en: 'Khartoum', ar: 'الخرطوم', country: 'Sudan', aliases: ['khartoum', 'kartoum', 'الخرطوم'] },
  { en: 'Omdurman', ar: 'أم درمان', country: 'Sudan', aliases: ['omdurman', 'أم درمان', 'ام درمان'] },
  { en: 'Port Sudan', ar: 'بورتسودان', country: 'Sudan', aliases: ['port sudan', 'بورتسودان', 'بورت سودان'] },
  { en: 'Wad Madani', ar: 'ود مدني', country: 'Sudan', aliases: ['wad madani', 'ود مدني'] },
  { en: 'Kassala', ar: 'كسلا', country: 'Sudan', aliases: ['kassala', 'كسلا'] },
  { en: 'Tripoli', ar: 'طرابلس', country: 'Libya', aliases: ['tripoli', 'طرابلس'] },
  { en: 'Benghazi', ar: 'بنغازي', country: 'Libya', aliases: ['benghazi', 'بنغازي', 'بنغازى'] },
  { en: 'Misrata', ar: 'مصراتة', country: 'Libya', aliases: ['misrata', 'مصراتة', 'مصراته'] },
];

const HOSPITALS: HospitalSeed[] = [
  { en: 'Kasr Alainy', ar: 'قصر العيني', city: 'Cairo', aliases: ['kasr alainy', 'kasr el ainy', 'kasr al ainy', 'قصر العيني', 'قصر العينى'] },
  { en: 'Alexandria Main University Hospital', ar: 'المستشفى الجامعي الرئيسي بالإسكندرية', city: 'Alexandria', aliases: ['alexandria main university hospital', 'alexandria main', 'المستشفى الجامعي', 'الجامعي'] },
  { en: 'Soba University Hospital', ar: 'مستشفى سوبا الجامعي', city: 'Khartoum', aliases: ['soba', 'soba university hospital', 'سوبا'] },
  { en: 'Cairo University Hospital', ar: 'مستشفى القاهرة الجامعي', city: 'Cairo', aliases: ['cairo university hospital', 'مستشفى القاهرة الجامعي'] },
  { en: 'Ain Shams University Hospital', ar: 'مستشفى عين شمس الجامعي', city: 'Cairo', aliases: ['ain shams', 'ain shams university hospital', 'عين شمس'] },
  { en: 'Mansoura University Hospital', ar: 'مستشفى المنصورة الجامعي', city: 'Mansoura', aliases: ['mansoura university hospital', 'مستشفى المنصورة الجامعي', 'المنصورة الجامعي'] },
  { en: 'Assiut University Hospital', ar: 'مستشفى أسيوط الجامعي', city: 'Assiut', aliases: ['assiut university hospital', 'مستشفى أسيوط الجامعي'] },
  { en: 'Tanta University Hospital', ar: 'مستشفى طنطا الجامعي', city: 'Tanta', aliases: ['tanta university hospital', 'مستشفى طنطا الجامعي'] },
  { en: 'Zagazig University Hospital', ar: 'مستشفى الزقازيق الجامعي', city: 'Zagazig', aliases: ['zagazig university hospital', 'مستشفى الزقازيق الجامعي'] },
  { en: 'Sohag University Hospital', ar: 'مستشفى سوهاج الجامعي', city: 'Sohag', aliases: ['sohag university hospital', 'مستشفى سوهاج الجامعي'] },
];

export async function seedPlaces() {
  const db = await getDb();
  const col = db.collection('places');
  const count = await col.countDocuments();
  if (count > 0) return;
  const ids: Record<string, string> = {};
  for (const c of COUNTRIES) {
    const r = await col.insertOne({
      type: 'country', canonicalEn: c.en, canonicalAr: c.ar, parentId: '', aliases: c.aliases, createdAt: new Date(),
    });
    ids['country:' + c.en] = String(r.insertedId);
  }
  for (const c of CITIES) {
    const r = await col.insertOne({
      type: 'city', canonicalEn: c.en, canonicalAr: c.ar, parentId: ids['country:' + c.country] || '', aliases: c.aliases, createdAt: new Date(),
    });
    ids['city:' + c.en] = String(r.insertedId);
  }
  for (const h of HOSPITALS) {
    await col.insertOne({
      type: 'hospital', canonicalEn: h.en, canonicalAr: h.ar, parentId: ids['city:' + h.city] || '', aliases: h.aliases, createdAt: new Date(),
    });
  }
}
