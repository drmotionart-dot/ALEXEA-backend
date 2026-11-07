export function normalizeText(s: string): string {
  let t = (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  // remove Arabic diacritics and tatweel
  t = t.replace(/[\u064B-\u065F\u0670\u0640]/g, '');
  // unify letters
  t = t.replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
  // remove filler words
  const fillers = ['hospital', 'university', 'center', 'centre', 'مستشفى', 'جامعة', 'مركز'];
  for (const f of fillers) t = t.replace(new RegExp('\\b' + f + '\\b', 'gi'), ' ');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

export function soundKey(s: string): string {
  const n = normalizeText(s);
  // if Arabic, transliterate roughly
  let t = n;
  // basic arabic->latin transliteration for common letters
  const map: Record<string, string> = { 'ا': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': '', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y' };
  let out = '';
  for (const ch of t) {
    if (map[ch] !== undefined) out += map[ch];
    else out += ch;
  }
  // latin sound replacements
  out = out.replace(/ph/g, 'f').replace(/ou/g, 'u').replace(/ee/g, 'i');
  out = out.replace(/c(?=[aou])/g, 'k');
  out = out.replace(/(.)\1+/g, '$1');
  // drop vowels except leading
  if (out.length > 1) {
    const first = out[0];
    const rest = out.slice(1).replace(/[aeiou]/g, '');
    out = first + rest;
  }
  return out;
}

export function jaroWinkler(a: string, b: string): number {
  // simple levenshtein-based similarity
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const maxDist = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  const aMatch = new Array(a.length).fill(false);
  const bMatch = new Array(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - maxDist);
    const end = Math.min(i + maxDist + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatch[j]) continue;
      if (a[i] !== b[j]) continue;
      aMatch[i] = true;
      bMatch[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;
  let t = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatch[i]) continue;
    while (!bMatch[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  t = t / 2;
  const m = matches;
  const jaro = (m / a.length + m / b.length + (m - t) / m) / 3;
  // winkler
  let l = 0;
  while (l < 4 && a[l] === b[l]) l++;
  return jaro + l * 0.1 * (1 - jaro);
}
