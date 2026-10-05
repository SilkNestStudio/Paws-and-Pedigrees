import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';
import { coatOf, generateRescue, type Dog } from '../src/core/dog/dog';
import { addFlag, newGame, update, type GameState } from '../src/game/state';
import { canStartActivity, KENNEL_RUNS, sleep } from '../src/game/rules';
import {
  breed,
  BREEDING,
  dnaTest,
  forecast,
  keepPuppy,
  kinship,
  placePuppy,
  register,
  studBook,
  type PedigreeEntry,
} from '../src/game/breeding';

function dog(seed: number, sex: Dog['sex'], months = 30): Dog {
  const d = generateRescue(createRng(seed), `Dog${seed}`);
  d.sex = sex;
  d.ageMonths = months;
  return d;
}

/** A kennel with a female and a male, and the whelping room restored. */
function kennel(seed = 3): GameState {
  return update(newGame(seed), (s) => {
    const dam = dog(seed * 10 + 1, 'female');
    const sire = dog(seed * 10 + 2, 'male');
    s.dogs.push(dam, sire);
    s.activeDogId = dam.id;
    s.shelter = [];
    s.story = 'afterFunDay';
    s.kennelName = 'Oak Hollow';
    s.money = 1000;
    s.food = 50;
    addFlag(s, 'restored:whelpingRoom');
    register(s, dam, 'Larchwood Rescue');
    register(s, sire, 'Larchwood Rescue');
  });
}

const entry = (id: string, sireId?: string, damId?: string): PedigreeEntry => ({
  id,
  name: id,
  sex: 'male',
  sireId,
  damId,
  kennel: '',
  coat: '',
  breed: '',
  titles: [],
  inbreeding: 0,
});

describe('relatedness', () => {
  it('kinship follows the textbook values', () => {
    const ped: Record<string, PedigreeEntry> = {
      a: entry('a'),
      b: entry('b'),
      c: entry('c'),
      kid1: entry('kid1', 'a', 'b'),
      kid2: entry('kid2', 'a', 'b'),
      half: entry('half', 'a', 'c'),
    };
    expect(kinship(ped, 'a', 'b')).toBe(0);
    expect(kinship(ped, 'a', 'kid1')).toBeCloseTo(0.25);
    expect(kinship(ped, 'kid1', 'kid2')).toBeCloseTo(0.25); // full siblings
    expect(kinship(ped, 'kid1', 'half')).toBeCloseTo(0.125); // half siblings
    expect(kinship(ped, 'a', 'a')).toBeCloseTo(0.5);
  });
});

describe('planning a litter', () => {
  it('checks who can breed', () => {
    const s = kennel();
    const [dam, sire] = s.dogs as [Dog, Dog];
    expect(forecast(s, dam, sire).blocked).toBeNull();
    expect(forecast(s, sire, sire).blocked).toMatch(/female/);
    const young = { ...dam, ageMonths: 10 };
    expect(forecast(s, young, sire).blocked).toMatch(/young/i);
  });

  it('shows likely coats only once both parents are DNA tested', () => {
    let s = kennel(4);
    const [dam, sire] = s.dogs as [Dog, Dog];
    expect(forecast(s, dam, sire).coats).toBeNull();
    s = update(s, (d) => {
      expect(dnaTest(d, dam.id)).toBe(true);
      expect(dnaTest(d, sire.id)).toBe(true);
    });
    const f = forecast(s, s.dogs[0]!, s.dogs[1]!);
    expect(f.coats).not.toBeNull();
    const total = f.coats!.reduce((a, c) => a + c.share, 0);
    expect(total).toBeGreaterThan(0.6);
    expect(total).toBeLessThanOrEqual(1.0001);
  });

  it('knowing the parents well narrows the talent forecast', () => {
    let s = kennel(5);
    const [dam, sire] = s.dogs as [Dog, Dog];
    const wide = forecast(s, dam, sire).talents.find((t) => t.aptitude === 'nose')!;
    s = update(s, (d) => {
      d.knowledge[dam.id] = { nose: { lo: 60, hi: 70 } };
      d.knowledge[sire.id] = { nose: { lo: 62, hi: 72 } };
    });
    const narrow = forecast(s, dam, sire).talents.find((t) => t.aptitude === 'nose')!;
    expect(narrow.hi - narrow.lo).toBeLessThan(wide.hi - wide.lo);
    expect(narrow.mid).toBeGreaterThan(wide.mid);
  });

  it('refuses merle to merle', () => {
    const s = kennel(6);
    const [dam, sire] = s.dogs as [Dog, Dog];
    dam.genome.loci.M = ['M', 'm'];
    sire.genome.loci.M = ['M', 'm'];
    dam.dnaTested = true;
    sire.dnaTested = true;
    expect(forecast(s, dam, sire).blocked).toMatch(/merle/i);
  });
});

describe('a litter', () => {
  it('is born after the gestation, with distinct puppies that inherit real genes', () => {
    let s = kennel(7);
    const [dam, sire] = s.dogs as [Dog, Dog];
    // Both recessive red: every puppy must be e/e too.
    dam.genome.loci.E = ['e', 'e'];
    sire.genome.loci.E = ['e', 'e'];
    s = update(s, (d) => {
      d.dogs[0]!.genome.loci.E = ['e', 'e'];
      d.dogs[1]!.genome.loci.E = ['e', 'e'];
      expect(breed(d, dam.id, sire.id)).not.toBeNull();
    });
    expect(s.pregnancies.length).toBe(1);
    expect(canStartActivity(s, 'mark').ok).toBe(false); // in whelp
    expect(canStartActivity(s, 'lesson').ok).toBe(true);
    for (let i = 0; i < BREEDING.gestationDays; i++) s = update(s, (d) => void sleep(d));
    expect(s.pregnancies.length).toBe(0);
    const litter = s.litters[0]!;
    expect(litter.puppies.length).toBeGreaterThanOrEqual(2);
    expect(litter.puppies.length).toBeLessThanOrEqual(7);
    for (const p of litter.puppies) {
      expect(p.genome.loci.E).toEqual(['e', 'e']);
      expect(p.sireId).toBe(sire.id);
      expect(p.damId).toBe(dam.id);
      expect(s.pedigree[p.id]).toBeDefined();
    }
    const genomes = new Set(litter.puppies.map((p) => JSON.stringify(p.genome.traits.speed)));
    expect(genomes.size).toBe(litter.puppies.length);
  });

  it('a stud from the book can sire a litter, for his fee', () => {
    let s = kennel(8);
    const stud = studBook()[1]!;
    const before = s.money;
    s = update(s, (d) => {
      expect(breed(d, d.dogs[0]!.id, stud.dog.id)).not.toBeNull();
    });
    expect(s.money).toBe(before - stud.fee);
    expect(s.pedigree[stud.dog.id]?.kennel).toBe(stud.kennel);
    for (let i = 0; i < BREEDING.gestationDays; i++) s = update(s, (d) => void sleep(d));
    expect(s.litters[0]!.sireName).toBe(stud.dog.name);
    expect(coatOf(s.litters[0]!.puppies[0]!).name.length).toBeGreaterThan(0);
  });

  it('puppies go home at three months: keep one, place the rest', () => {
    let s = kennel(9);
    s = update(s, (d) => void breed(d, d.dogs[0]!.id, d.dogs[1]!.id));
    for (let i = 0; i < BREEDING.gestationDays; i++) s = update(s, (d) => void sleep(d));
    const litter = s.litters[0]!;
    const [first, second] = litter.puppies as [Dog, Dog];
    s = update(s, (d) => {
      expect(keepPuppy(d, litter.id, first.id, 'Hope')).toBeNull(); // too young
    });
    // Sleep into the next season: three months older.
    while (s.litters[0]!.puppies[0]!.ageMonths < 3) s = update(s, (d) => void sleep(d));
    const money = s.money;
    s = update(s, (d) => {
      expect(keepPuppy(d, litter.id, first.id, 'Hope')?.name).toBe('Hope');
      expect(placePuppy(d, litter.id, second.id)?.fee).toBeGreaterThan(0);
    });
    expect(s.dogs.some((d) => d.name === 'Hope')).toBe(true);
    expect(s.money).toBeGreaterThan(money);
    expect(s.litters[0]!.placed.length).toBe(1);
    expect(s.dogs.length).toBeLessThanOrEqual(KENNEL_RUNS);
  });
});
