import type { Allele, Locus } from './loci';
import type { TraitId } from './traits';

/**
 * Breed archetypes used to seed the game's dog population. Allele frequencies
 * approximate common colours within each breed. Trait means are game-design
 * starting points (in standard deviations from the all-dog average) chosen so
 * that breeds have recognisable tendencies with plenty of individual overlap.
 * They are not claims that one breed is universally better at anything.
 */
export type AlleleFrequencies = { [L in Locus]?: Partial<Record<Allele<L>, number>> };

export interface BreedArchetype {
  id: BreedId;
  name: string;
  /** Frequencies for loci that differ from the general population. */
  alleles: AlleleFrequencies;
  /** Trait means in standard deviations; unlisted traits average 0. */
  means: Partial<Record<TraitId, number>>;
}

export const POPULATION_ALLELES: Required<AlleleFrequencies> = {
  E: { Em: 0.04, E: 0.8, e: 0.16 },
  K: { KB: 0.4, kbr: 0.1, ky: 0.5 },
  A: { ay: 0.3, aw: 0.08, at: 0.45, a: 0.17 },
  B: { B: 0.85, b: 0.15 },
  D: { D: 0.9, d: 0.1 },
  M: { M: 0, m: 1 },
  S: { S: 0.7, sp: 0.3 },
  T: { T: 0.2, t: 0.8 },
  L: { L: 0.8, l: 0.2 },
  F: { F: 0.03, f: 0.97 },
  Cu: { Cu: 0.02, cu: 0.98 },
};

export type BreedId =
  | 'labrador'
  | 'golden'
  | 'borderCollie'
  | 'germanShepherd'
  | 'aussie'
  | 'beagle'
  | 'boxer'
  | 'staffy'
  | 'husky'
  | 'poodle'
  | 'jackRussell'
  | 'villageDog';

export const BREEDS: Record<BreedId, BreedArchetype> = {
  labrador: {
    id: 'labrador',
    name: 'Labrador Retriever',
    alleles: {
      E: { E: 0.55, e: 0.45 },
      K: { KB: 1 },
      A: { ay: 0.4, at: 0.4, a: 0.2 },
      B: { B: 0.65, b: 0.35 },
      D: { D: 0.97, d: 0.03 },
      S: { S: 0.95, sp: 0.05 },
      T: { t: 1 },
      L: { L: 1 },
    },
    means: {
      water: 1.2,
      mouth: 1.0,
      nose: 0.6,
      biddability: 0.8,
      confidence: 0.5,
      drive: 0.5,
      stamina: 0.4,
      power: 0.5,
      speed: 0.2,
      agility: -0.2,
      size: 0.5,
      chestDepth: 0.5,
      muzzleLength: 0.2,
      headWidth: 0.6,
      earErect: -1.8,
      earSize: 0.2,
      tailCurl: -1,
      redIntensity: -0.8,
      whiteSpread: -1,
    },
  },
  golden: {
    id: 'golden',
    name: 'Golden Retriever',
    alleles: {
      E: { e: 1 },
      K: { KB: 0.5, ky: 0.5 },
      A: { ay: 0.7, at: 0.3 },
      B: { B: 1 },
      D: { D: 1 },
      S: { S: 0.9, sp: 0.1 },
      L: { l: 1 },
    },
    means: {
      water: 0.9,
      mouth: 1.1,
      biddability: 1.0,
      nose: 0.5,
      focus: 0.3,
      confidence: 0.4,
      size: 0.5,
      muzzleLength: 0.2,
      earErect: -1.8,
      tailCurl: -0.6,
      redIntensity: 0.3,
      whiteSpread: -0.8,
    },
  },
  borderCollie: {
    id: 'borderCollie',
    name: 'Border Collie',
    alleles: {
      E: { E: 0.9, e: 0.1 },
      K: { KB: 0.65, ky: 0.35 },
      A: { at: 0.5, ay: 0.2, a: 0.3 },
      B: { B: 0.7, b: 0.3 },
      D: { D: 0.9, d: 0.1 },
      M: { M: 0.08, m: 0.92 },
      S: { S: 0.15, sp: 0.85 },
      T: { T: 0.35, t: 0.65 },
      L: { L: 0.4, l: 0.6 },
    },
    means: {
      agility: 1.3,
      focus: 1.2,
      drive: 1.2,
      biddability: 1.1,
      speed: 0.6,
      stamina: 0.8,
      nose: 0.2,
      power: -0.1,
      legLength: 0.2,
      muzzleLength: 0.3,
      headWidth: -0.3,
      tailCurl: -0.5,
      whiteSpread: 0.1,
      saddle: 0.6,
    },
  },
  germanShepherd: {
    id: 'germanShepherd',
    name: 'German Shepherd',
    alleles: {
      E: { E: 0.9, Em: 0.05, e: 0.05 },
      K: { ky: 1 },
      A: { aw: 0.15, at: 0.75, a: 0.1 },
      B: { B: 1 },
      D: { D: 0.98, d: 0.02 },
      S: { S: 1 },
      L: { L: 0.85, l: 0.15 },
    },
    means: {
      nose: 1.0,
      confidence: 0.8,
      power: 0.7,
      biddability: 0.8,
      focus: 0.6,
      drive: 0.7,
      stamina: 0.6,
      speed: 0.4,
      agility: 0.2,
      water: 0.2,
      mouth: 0.2,
      size: 0.9,
      earErect: 2.0,
      earSize: 0.7,
      muzzleLength: 0.6,
      bodyLength: 0.5,
      tailCurl: -0.8,
      saddle: -0.4,
      redIntensity: 0.5,
    },
  },
  aussie: {
    id: 'aussie',
    name: 'Australian Shepherd',
    alleles: {
      E: { E: 1 },
      K: { ky: 0.7, KB: 0.3 },
      A: { at: 0.9, a: 0.1 },
      B: { B: 0.6, b: 0.4 },
      M: { M: 0.3, m: 0.7 },
      S: { S: 0.35, sp: 0.65 },
      L: { l: 0.9, L: 0.1 },
    },
    means: {
      agility: 0.9,
      drive: 1.0,
      focus: 0.8,
      biddability: 0.8,
      stamina: 0.6,
      confidence: 0.4,
      size: 0.2,
      earErect: 0.2,
      tailCurl: -0.3,
      saddle: 1.2,
      whiteSpread: -0.2,
    },
  },
  beagle: {
    id: 'beagle',
    name: 'Beagle',
    alleles: {
      E: { E: 0.95, e: 0.05 },
      K: { ky: 1 },
      A: { at: 0.75, ay: 0.25 },
      B: { B: 1 },
      S: { sp: 0.9, S: 0.1 },
      T: { T: 0.5, t: 0.5 },
      L: { L: 1 },
    },
    means: {
      nose: 1.8,
      stamina: 0.8,
      drive: 0.7,
      focus: -0.7,
      biddability: -0.8,
      confidence: 0.3,
      speed: -0.3,
      size: -1.3,
      legLength: -0.4,
      earErect: -2.2,
      earSize: 1.2,
      tailCurl: 0.2,
      saddle: -0.6,
      whiteSpread: 0.3,
    },
  },
  boxer: {
    id: 'boxer',
    name: 'Boxer',
    alleles: {
      E: { Em: 1 },
      K: { kbr: 0.55, ky: 0.45 },
      A: { ay: 1 },
      S: { S: 0.5, sp: 0.5 },
      L: { L: 1 },
    },
    means: {
      power: 1.2,
      confidence: 0.7,
      drive: 0.4,
      stamina: -0.2,
      nose: -0.3,
      biddability: 0.1,
      focus: -0.1,
      size: 0.6,
      muzzleLength: -1.8,
      headWidth: 1.2,
      earErect: -0.5,
      chestDepth: 0.9,
      tailCurl: -0.2,
      redIntensity: 0.9,
      sableShading: -1,
    },
  },
  staffy: {
    id: 'staffy',
    name: 'Staffordshire Terrier',
    alleles: {
      E: { E: 0.65, e: 0.2, Em: 0.15 },
      K: { KB: 0.3, kbr: 0.3, ky: 0.4 },
      A: { ay: 0.6, at: 0.2, a: 0.2 },
      B: { B: 0.8, b: 0.2 },
      D: { D: 0.6, d: 0.4 },
      S: { S: 0.45, sp: 0.55 },
      L: { L: 1 },
    },
    means: {
      power: 1.4,
      confidence: 1.0,
      drive: 0.7,
      agility: 0.3,
      speed: 0.2,
      biddability: 0.2,
      water: -0.3,
      size: 0.1,
      legLength: -0.3,
      headWidth: 1.5,
      muzzleLength: -0.5,
      chestDepth: 1.0,
      earErect: -0.3,
      earSize: -0.6,
      tailCurl: -0.8,
    },
  },
  husky: {
    id: 'husky',
    name: 'Siberian Husky',
    alleles: {
      E: { E: 1 },
      K: { ky: 1 },
      A: { aw: 0.6, at: 0.2, ay: 0.2 },
      B: { B: 0.85, b: 0.15 },
      S: { S: 0.3, sp: 0.7 },
      L: { L: 0.9, l: 0.1 },
    },
    means: {
      stamina: 1.8,
      speed: 0.7,
      biddability: -1.0,
      drive: 0.6,
      focus: -0.4,
      confidence: 0.4,
      nose: 0.3,
      water: -0.2,
      size: 0.3,
      earErect: 2.0,
      earSize: -0.3,
      tailCurl: 1.2,
      muzzleLength: 0.2,
      whiteSpread: 0.5,
    },
  },
  poodle: {
    id: 'poodle',
    name: 'Standard Poodle',
    alleles: {
      E: { E: 0.6, e: 0.4 },
      K: { KB: 1 },
      A: { ay: 0.4, a: 0.6 },
      B: { B: 0.6, b: 0.4 },
      D: { D: 0.85, d: 0.15 },
      S: { S: 0.9, sp: 0.1 },
      F: { F: 1 },
      Cu: { Cu: 1 },
      L: { l: 1 },
    },
    means: {
      biddability: 1.1,
      agility: 0.8,
      water: 0.9,
      focus: 0.5,
      nose: 0.3,
      mouth: 0.4,
      power: -0.3,
      size: 0.3,
      legLength: 0.6,
      muzzleLength: 0.6,
      headWidth: -0.6,
      earErect: -2.0,
      tailCurl: 0.3,
      redIntensity: -1,
    },
  },
  jackRussell: {
    id: 'jackRussell',
    name: 'Jack Russell Terrier',
    alleles: {
      E: { E: 0.8, e: 0.2 },
      K: { ky: 0.9, KB: 0.1 },
      A: { at: 0.6, ay: 0.4 },
      S: { sp: 1 },
      L: { L: 0.6, l: 0.4 },
      F: { F: 0.3, f: 0.7 },
    },
    means: {
      drive: 1.6,
      nose: 0.8,
      agility: 0.9,
      confidence: 1.0,
      speed: 0.3,
      biddability: -0.6,
      focus: -0.3,
      power: 0.2,
      size: -1.8,
      legLength: -0.2,
      earErect: 0.2,
      earSize: -0.4,
      whiteSpread: 1.5,
      tailCurl: -0.2,
    },
  },
  villageDog: {
    id: 'villageDog',
    name: 'Mixed heritage',
    alleles: {},
    means: {},
  },
};

export const BREED_IDS = Object.keys(BREEDS) as BreedId[];

/** Fraction of each breed in a dog's ancestry, summing to 1. */
export type BreedMix = Partial<Record<BreedId, number>>;

export function mixBreeds(a: BreedMix, b: BreedMix): BreedMix {
  const mix: BreedMix = {};
  for (const id of BREED_IDS) {
    const share = ((a[id] ?? 0) + (b[id] ?? 0)) / 2;
    if (share > 0) mix[id] = share;
  }
  return mix;
}

/** Plain-language description, e.g. "Border Collie × Labrador mix". */
export function describeMix(mix: BreedMix): string {
  const parts = (Object.entries(mix) as [BreedId, number][])
    .filter(([, share]) => share >= 0.2)
    .sort((x, y) => y[1] - x[1])
    .map(([id]) => BREEDS[id].name);
  const main = Object.values(mix).some((share) => (share ?? 0) >= 0.95);
  if (main && parts.length === 1) return parts[0]!;
  if (parts.length === 0) return 'Mixed breed';
  return `${parts.slice(0, 2).join(' × ')} mix`;
}
