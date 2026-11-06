import { Candidate, Layout, Plan, Station } from './types.js';

function genderRank(g: Candidate['gender']): number {
  return g === 'm' ? 0 : g === 'f' ? 1 : 2;
}

function compareCandidate(a: Candidate, b: Candidate): number {
  if (genderRank(a.gender) !== genderRank(b.gender)) return genderRank(a.gender) - genderRank(b.gender);
  if (a.countryId !== b.countryId) return a.countryId < b.countryId ? -1 : 1;
  if (a.cityId !== b.cityId) return a.cityId < b.cityId ? -1 : 1;
  if (a.hospitalId !== b.hospitalId) return a.hospitalId < b.hospitalId ? -1 : 1;
  return a.experienceYears - b.experienceYears;
}

function leavesTime(c: Candidate): number {
  if (!c.leavesAt) return Infinity;
  return new Date(c.leavesAt).getTime();
}

function pairHasNonEgyptian(pair: Candidate[]): boolean {
  return pair.some(c => !c.isEgyptian);
}

function earliestLeave(pair: Candidate[]): number {
  return Math.min(...pair.map(leavesTime));
}

function animalDoneCount(pair: Candidate[]): number {
  return pair.reduce((n, c) => n + ((c.history || []).some(h => h.kind === 'animal') ? 1 : 0), 0);
}

export function placeCandidates(candidates: Candidate[], layout: Layout, _options: any = {}): Plan {
  // pair
  const sorted = [...candidates].sort(compareCandidate);
  const pairs: Candidate[][] = [];
  for (let i = 0; i < sorted.length; i += 2) {
    pairs.push(i + 1 < sorted.length ? [sorted[i], sorted[i + 1]] : [sorted[i]]);
  }

  const kindsFor = (station: number, base: 'dry' | 'wet' | 'animal') => base; // placeholder

  if (layout === 'none') {
    return { morning: makeStations(12, 'dry', []) };
  }

  if (layout === 'd12') {
    const stations = fillStations(pairs, 12, () => 'dry');
    return { morning: stations };
  }

  if (layout === 'dw') {
    // first 6 dry, 7-12 wet; just fill in order
    const stations = fillStationsIndexed(pairs, n => (n <= 6 ? 'dry' : 'wet'));
    return { morning: stations };
  }

  // da or shift: split into dry and animal groups
  const target = Math.floor(candidates.length / 2);
  // rank pairs for animal selection
  const ranked = pairs.map((p, idx) => ({ p, idx })).sort((a, b) => {
    const an = pairHasNonEgyptian(a.p) ? 0 : 1;
    const bn = pairHasNonEgyptian(b.p) ? 0 : 1;
    if (an !== bn) return an - bn;
    const ad = animalDoneCount(a.p);
    const bd = animalDoneCount(b.p);
    if (ad !== bd) return ad - bd;
    return earliestLeave(a.p) - earliestLeave(b.p);
  });

  const selectedIdx = new Set<number>();
  let count = 0;
  for (const r of ranked) {
    if (count + r.p.length <= target) {
      selectedIdx.add(r.idx);
      count += r.p.length;
    }
  }
  const animalPairs = pairs.filter((_, i) => selectedIdx.has(i));
  const dryPairs = pairs.filter((_, i) => !selectedIdx.has(i));

  const morningDryStations = fillStationsForNumbers(dryPairs, [1, 2, 3, 4, 5, 6], 'dry');
  const morningAnimalStations = fillStationsForNumbers(animalPairs, [7, 8, 9, 10, 11, 12], 'animal');

  const morning = [...morningDryStations, ...morningAnimalStations];

  if (layout === 'da') {
    return { morning };
  }

  // shift: afternoon swaps groups
  const afternoonDryStations = fillStationsForNumbers(animalPairs, [1, 2, 3, 4, 5, 6], 'dry');
  const afternoonAnimalStations = fillStationsForNumbers(dryPairs, [7, 8, 9, 10, 11, 12], 'animal');
  const afternoon = [...afternoonDryStations, ...afternoonAnimalStations];

  return { morning, afternoon };
}

function makeStations(n: number, kind: Station['kind'], _pairs: Candidate[][]): Station[] {
  return Array.from({ length: n }, (_, i) => ({ station: i + 1, kind, people: [] }));
}

function fillStations(pairs: Candidate[][], n: number, kindFn: (station: number) => Station['kind']): Station[] {
  const stations: Station[] = Array.from({ length: n }, (_, i) => ({ station: i + 1, kind: kindFn(i + 1), people: [] }));
  let si = 0;
  for (const pair of pairs) {
    // find station with capacity
    while (si < stations.length && stations[si].people.length + pair.length > 2) si++;
    if (si >= stations.length) {
      // find any with capacity
      const target = stations.find(s => s.people.length + pair.length <= 2);
      if (target) target.people.push(...pair.map(c => c.id));
    } else {
      stations[si].people.push(...pair.map(c => c.id));
      if (stations[si].people.length >= 2) si++;
    }
  }
  return stations;
}

function fillStationsIndexed(pairs: Candidate[][], kindFn: (station: number) => Station['kind']): Station[] {
  return fillStations(pairs, 12, kindFn);
}

function fillStationsForNumbers(pairs: Candidate[][], numbers: number[], kind: Station['kind']): Station[] {
  const stations: Station[] = numbers.map(n => ({ station: n, kind, people: [] }));
  let si = 0;
  for (const pair of pairs) {
    while (si < stations.length && stations[si].people.length + pair.length > 2) si++;
    if (si >= stations.length) {
      const target = stations.find(s => s.people.length + pair.length <= 2);
      if (target) target.people.push(...pair.map(c => c.id));
    } else {
      stations[si].people.push(...pair.map(c => c.id));
      if (stations[si].people.length >= 2) si++;
    }
  }
  return stations;
}

export function swapCandidates(plan: Plan, idA: string, idB: string, period: 'morning' | 'afternoon' = 'morning'): Plan {
  const stations = period === 'afternoon' && plan.afternoon ? plan.afternoon : plan.morning;
  const clone: Station[] = stations.map(s => ({ ...s, people: [...s.people] }));
  let posA: { si: number; pi: number } | null = null;
  let posB: { si: number; pi: number } | null = null;
  clone.forEach((s, si) => {
    s.people.forEach((p, pi) => {
      if (p === idA) posA = { si, pi };
      if (p === idB) posB = { si, pi };
    });
  });
  if (posA && posB) {
    const pa = posA as { si: number; pi: number };
    const pb = posB as { si: number; pi: number };
    const a = clone[pa.si].people[pa.pi];
    clone[pa.si].people[pa.pi] = clone[pb.si].people[pb.pi];
    clone[pb.si].people[pb.pi] = a;
  }
  const newPlan: Plan = { morning: plan.morning, afternoon: plan.afternoon };
  if (period === 'afternoon' && plan.afternoon) newPlan.afternoon = clone; else newPlan.morning = clone;
  return newPlan;
}

export function markAbsent(plan: Plan, candidateId: string): { plan: Plan; suggestion: string } {
  const clone: Plan = { morning: plan.morning.map(s => ({ ...s, people: s.people.filter(p => p !== candidateId) })), afternoon: plan.afternoon?.map(s => ({ ...s, people: s.people.filter(p => p !== candidateId) })) };
  return { plan: clone, suggestion: 'Seat left empty; assign a replacement manually.' };
}

export function addLate(plan: Plan, candidateId: string): Plan {
  const clone: Plan = { morning: plan.morning.map(s => ({ ...s, people: [...s.people] })), afternoon: plan.afternoon?.map(s => ({ ...s, people: [...s.people] })) };
  const target = clone.morning.find(s => s.people.length < 2);
  if (target) target.people.push(candidateId);
  return clone;
}
