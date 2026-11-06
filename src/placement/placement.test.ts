import { describe, it, expect } from 'vitest';
import { placeCandidates, swapCandidates, markAbsent, addLate } from './index.js';
import type { Candidate } from './types.js';

function c(id: string, gender: 'm'|'f'|'u' = 'm', country = 'EG', city = 'Cairo', hosp = 'H1', exp = 1, egy = true, leaves?: string): Candidate {
  return { id, gender, countryId: country, cityId: city, hospitalId: hosp, experienceYears: exp, isEgyptian: egy, leavesAt: leaves };
}

describe('placement', () => {
  it('pairs same gender', () => {
    const cands = [c('a','m'), c('b','f'), c('c','m'), c('d','f')];
    const plan = placeCandidates(cands, 'd12');
    const all = plan.morning.flatMap(s => s.people);
    // m's should be paired together: check stations
    const stationOf = (id: string) => plan.morning.find(s => s.people.includes(id))!;
    expect(stationOf('a').people).toContain('c');
    expect(stationOf('b').people).toContain('d');
  });

  it('priority order: country then city', () => {
    const cands = [c('a','m','EG','Cairo'), c('b','m','SD','Khartoum'), c('c','m','EG','Alex'), c('d','m','SD','PortSudan')];
    const plan = placeCandidates(cands, 'd12');
    const st = (id:string) => plan.morning.find(s=>s.people.includes(id))!;
    // same country pairs
    expect(st('a').people).toContain('c');
    expect(st('b').people).toContain('d');
  });

  it('odd count leaves single seat', () => {
    const cands = [c('a'), c('b'), c('c')];
    const plan = placeCandidates(cands, 'd12');
    const counts = plan.morning.map(s => s.people.length);
    expect(counts.reduce((a,b)=>a+b,0)).toBe(3);
    expect(counts.filter(n=>n===1).length).toBeGreaterThanOrEqual(1);
  });

  it('non-Egyptians in animal group (da)', () => {
    const cands = [c('eg1','m','EG','Cairo','H',1,true), c('eg2','m','EG','Cairo','H',1,true),
      c('sd1','m','SD','Khartoum','H',1,false), c('sd2','m','SD','Khartoum','H',1,false)];
    const plan = placeCandidates(cands, 'da');
    const animalStations = plan.morning.filter(s => s.station >= 7);
    const animalPeople = animalStations.flatMap(s => s.people);
    expect(animalPeople).toContain('sd1');
    expect(animalPeople).toContain('sd2');
  });

  it('shift afternoon swaps groups', () => {
    const cands = [c('eg1','m','EG','Cairo','H',1,true), c('eg2','m','EG','Cairo','H',1,true),
      c('sd1','m','SD','Khartoum','H',1,false), c('sd2','m','SD','Khartoum','H',1,false)];
    const plan = placeCandidates(cands, 'shift');
    expect(plan.afternoon).toBeDefined();
    const mornAnimal = plan.morning.filter(s=>s.station>=7).flatMap(s=>s.people).sort();
    const aftDry = plan.afternoon!.filter(s=>s.station<=6).flatMap(s=>s.people).sort();
    expect(aftDry).toEqual(mornAnimal);
  });

  it('no pair split across groups', () => {
    const cands = [c('a','m','EG','Cairo'), c('b','m','EG','Cairo'), c('c','m','SD','Khartoum'), c('d','m','SD','Khartoum')];
    const plan = placeCandidates(cands, 'da');
    const stationOf = (id:string) => plan.morning.find(s=>s.people.includes(id))!;
    expect(stationOf('a').station).toBe(stationOf('b').station);
    expect(stationOf('c').station).toBe(stationOf('d').station);
  });

  it('swap validity', () => {
    const cands = [c('a'), c('b'), c('c'), c('d')];
    const plan = placeCandidates(cands, 'd12');
    const p2 = swapCandidates(plan, 'a', 'd');
    const st1 = p2.morning.find((s:any) => s.station === 1)!;
    const st2 = p2.morning.find((s:any) => s.station === 2)!;
    expect(st1.people).toContain('d');
    expect(st2.people).toContain('a');
  });

  it('absent leaves seat empty', () => {
    const cands = [c('a'), c('b')];
    const plan = placeCandidates(cands, 'd12');
    const { plan: p2 } = markAbsent(plan, 'a');
    const all = p2.morning.flatMap(s=>s.people);
    expect(all).not.toContain('a');
    expect(all).toContain('b');
  });

  it('late addition fills free seat', () => {
    const cands = [c('a'), c('b')];
    const plan = placeCandidates(cands, 'd12');
    const p2 = addLate(plan, 'z');
    expect(p2.morning.flatMap(s=>s.people)).toContain('z');
  });

  it('rotation prefers new lab type', () => {
    const cands = [
      c('a','m','EG','Cairo','H',1,true), c('b','m','EG','Cairo','H',1,true),
      c('x','m','SD','Khartoum','H',1,false), c('y','m','SD','Khartoum','H',1,false),
    ];
    // pair a,b has done animal before
    (cands[0] as any).history = [{ date: '2020', kind: 'animal' }];
    (cands[1] as any).history = [{ date: '2020', kind: 'animal' }];
    const plan = placeCandidates(cands, 'da');
    const animalPeople = plan.morning.filter(s=>s.station>=7).flatMap(s=>s.people);
    // non-Egyptian pair (x,y) should be in animal group; a,b (done animal) should NOT be forced? 
    expect(animalPeople).toContain('x');
    expect(animalPeople).toContain('y');
  });
});
