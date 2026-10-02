import { describeMix, mixBreeds, type BreedId, type BreedMix } from '../genetics/breeds';
import { deriveBody, type BodyShape } from '../genetics/body';
import { deriveCoat, type CoatAppearance } from '../genetics/coat';
import { createFounderGenome, inheritGenome, type Genome } from '../genetics/genome';
import { APTITUDES, toScore, traitZ, type Aptitude } from '../genetics/traits';
import { chance, int, pick, range, weighted, type Rng } from '../rng';

/**
 * Learned cues. Each has a reliability from 0 (unknown) to 1 (rock solid).
 * Skills are trained, never inherited.
 */
export const CUES = ['sit', 'stay', 'recall', 'stop', 'cast', 'deliver', 'indicate'] as const;
export type Cue = (typeof CUES)[number];

export const CUE_LABELS: Record<Cue, { name: string; meaning: string }> = {
  sit: { name: 'Sit', meaning: 'Sits when asked, close to you' },
  stay: { name: 'Steady', meaning: 'Stays put while things are thrown' },
  recall: { name: 'Recall', meaning: 'Comes straight back when called' },
  stop: { name: 'Stop whistle', meaning: 'Stops and sits at a distance on one blast' },
  cast: { name: 'Directions', meaning: 'Goes left, right or back when you signal' },
  deliver: { name: 'Delivery', meaning: 'Brings items all the way to your hand' },
  indicate: { name: 'Indicate', meaning: 'Sits and stares at a find instead of guessing' },
};

export type Sex = 'female' | 'male';
export type Origin = 'shelter' | 'bred' | 'purchased';

export interface Dog {
  id: string;
  name: string;
  sex: Sex;
  ageMonths: number;
  genome: Genome;
  breedMix: BreedMix;
  origin: Origin;
  /**
   * True if a purchased advantage ever applied to this dog. Keeps the
   * earned-only league fair once purchases exist.
   */
  premiumTouched: boolean;
  sireId?: string;
  damId?: string;
  skills: Record<Cue, number>;
  /** Partnership with the keeper, 0-100. */
  bond: number;
  /** 0-100. Drops through the day; a filled bowl tops it up. */
  fullness: number;
  /** 0-100. Work uses it; rest and a night's sleep restore it. */
  energy: number;
}

/** A dog's aptitude on the 1-99 scale (50 = average dog). */
export function aptitude(dog: Dog, which: Aptitude): number {
  return toScore(traitZ(dog.genome.traits[which]));
}

export function aptitudeProfile(dog: Dog): Record<Aptitude, number> {
  const profile = {} as Record<Aptitude, number>;
  for (const a of APTITUDES) profile[a] = aptitude(dog, a);
  return profile;
}

export const coatOf = (dog: Dog): CoatAppearance => deriveCoat(dog.genome);
export const bodyOf = (dog: Dog): BodyShape => deriveBody(dog.genome);
export const breedDescription = (dog: Dog): string => describeMix(dog.breedMix);

const SHELTER_NAMES: Record<Sex, string[]> = {
  female: [
    'Maple',
    'Willow',
    'Fern',
    'Juniper',
    'Pepper',
    'Hazel',
    'Clover',
    'Wren',
    'Ember',
    'Sage',
    'Tansy',
    'Nell',
    'Bramble',
    'Dot',
    'Ivy',
    'Luna',
    'Nutmeg',
    'Poppy',
    'Rosie',
    'Bess',
  ],
  male: [
    'Bruno',
    'Scout',
    'Rusty',
    'Otis',
    'Moss',
    'Biscuit',
    'Rook',
    'Pike',
    'Hollis',
    'Finch',
    'Jasper',
    'Kit',
    'Murphy',
    'Bear',
    'Ollie',
    'Toby',
    'Rufus',
    'Alfie',
    'Bodhi',
    'Ned',
  ],
};

let idCounter = 0;
function newId(rng: Rng): string {
  idCounter += 1;
  return `dog-${int(rng, 0, 0xffffff).toString(16)}-${idCounter}`;
}

const MIX_POOL: BreedId[] = [
  'labrador',
  'golden',
  'borderCollie',
  'germanShepherd',
  'aussie',
  'beagle',
  'boxer',
  'staffy',
  'husky',
  'poodle',
  'jackRussell',
];

function founder(rng: Rng, breed: BreedId): { genome: Genome; mix: BreedMix } {
  return { genome: createFounderGenome(rng, breed), mix: { [breed]: 1 } };
}

function cross(
  rng: Rng,
  a: { genome: Genome; mix: BreedMix },
  b: { genome: Genome; mix: BreedMix },
): { genome: Genome; mix: BreedMix } {
  return { genome: inheritGenome(rng, a.genome, b.genome), mix: mixBreeds(a.mix, b.mix) };
}

/**
 * A shelter dog. Its ancestry is built from real breed founders crossed
 * through two generations, so it carries hidden recessives like a real mix.
 */
export function generateRescue(rng: Rng, name?: string): Dog {
  const lineage = weighted(rng, { twoBreed: 0.55, fourBreed: 0.3, mostlyOne: 0.15 });
  const breedA = pick(rng, MIX_POOL);
  const breedB = pick(
    rng,
    MIX_POOL.filter((b) => b !== breedA),
  );
  const grandparents: BreedId[] =
    lineage === 'twoBreed'
      ? [breedA, breedB, breedA, breedB]
      : lineage === 'fourBreed'
        ? [breedA, breedB, pick(rng, MIX_POOL), pick(rng, MIX_POOL)]
        : [breedA, breedA, breedA, 'villageDog'];
  const [g1, g2, g3, g4] = grandparents.map((breed) => founder(rng, breed));
  const sire = cross(rng, g1!, g2!);
  const dam = cross(rng, g3!, g4!);
  const pup = cross(rng, sire, dam);

  const sex: Sex = chance(rng, 0.5) ? 'female' : 'male';
  return {
    id: newId(rng),
    name: name ?? pick(rng, SHELTER_NAMES[sex]),
    sex,
    ageMonths: int(rng, 12, 36),
    genome: pup.genome,
    breedMix: pup.mix,
    origin: 'shelter',
    premiumTouched: false,
    skills: {
      sit: range(rng, 0.3, 0.6),
      stay: range(rng, 0.25, 0.45),
      recall: range(rng, 0.25, 0.5),
      stop: 0,
      cast: 0,
      deliver: range(rng, 0.2, 0.45),
      indicate: 0,
    },
    bond: int(rng, 10, 20),
    fullness: 60,
    energy: 90,
  };
}

const strongestAptitude = (dog: Dog): Aptitude =>
  APTITUDES.reduce((best, a) => (aptitude(dog, a) > aptitude(dog, best) ? a : best));

/**
 * Three shelter dogs that clearly differ: different coat names, different
 * names and different standout aptitudes, so the choice means something.
 */
export function generateShelterTrio(rng: Rng): [Dog, Dog, Dog] {
  const dogs: Dog[] = [];
  for (let attempt = 0; attempt < 200 && dogs.length < 3; attempt++) {
    const candidate = generateRescue(rng);
    const clash = dogs.some(
      (d) =>
        d.name === candidate.name ||
        coatOf(d).name === coatOf(candidate).name ||
        strongestAptitude(d) === strongestAptitude(candidate),
    );
    if (!clash) dogs.push(candidate);
  }
  while (dogs.length < 3) dogs.push(generateRescue(rng));
  return dogs as [Dog, Dog, Dog];
}
