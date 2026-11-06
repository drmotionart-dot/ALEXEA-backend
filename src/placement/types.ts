export type Gender = 'm' | 'f' | 'u';
export type Layout = 'd12' | 'dw' | 'da' | 'shift' | 'none';

export interface Candidate {
  id: string;
  name?: string;
  gender: Gender;
  countryId: string;
  cityId: string;
  hospitalId: string;
  experienceYears: number;
  isEgyptian: boolean;
  leavesAt?: string | Date;
  history?: { date: string; kind: string; partner?: string }[];
}

export interface Station {
  station: number;
  kind: 'dry' | 'wet' | 'animal';
  people: string[];
}

export interface Plan {
  morning: Station[];
  afternoon?: Station[];
}
