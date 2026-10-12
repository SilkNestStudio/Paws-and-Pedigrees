import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';
import { generateRescue, type Dog } from '../src/core/dog/dog';
import { addFlag, migrate, newGame, update, type GameState } from '../src/game/state';
import { sleep } from '../src/game/rules';
import { breed, BREEDING, placePuppy, register } from '../src/game/breeding';
import { recordEvent, studPupRival, trialEvent } from '../src/game/events';
import {
  kennelType,
  reputationName,
  seasonalBookings,
  setAtStud,
  studFee,
  studProblem,
  studPupDue,
} from '../src/game/reputation';

function kennel(seed = 3): GameState {
  return update(newGame(seed), (s) => {
    const dam = generateRescue(createRng(seed * 10 + 1), 'Bess') as Dog;
    const sire = generateRescue(createRng(seed * 10 + 2), 'Rex') as Dog;
    dam.sex = 'female';
    sire.sex = 'male';
    dam.ageMonths = 30;
    sire.ageMonths = 30;
    s.dogs.push(dam, sire);
    s.activeDogId = sire.id;
    s.shelter = [];
    s.story = 'afterFunDay';
    s.kennelName = 'Oak Hollow';
    s.money = 1000;
    s.food = 99;
    addFlag(s, 'restored:whelpingRoom');
    register(s, dam, 'Larchwood Rescue');
    register(s, sire, 'Larchwood Rescue');
  });
}

describe('reputation', () => {
  it('grows with qualifying runs and titles', () => {
    let s = kennel();
    expect(reputationName(s.reputation)).toMatch(/Unknown/);
    const def = trialEvent(s.seed, 14, 'novice');
    const weak = def.rivals.map(() => [40, 40, 40]);
    s = update(s, (d) => {
      d.day = 14;
      recordEvent(d, def, [80, 80, 80], weak);
      d.day = 21;
      recordEvent(d, trialEvent(d.seed, 21, 'novice'), [80, 80, 80], weak);
    });
    // Two wins, two qualifying runs and a title.
    expect(s.reputation).toBe(3 + 4 + 3 + 4 + 10);
    expect(reputationName(s.reputation)).toMatch(/village/);
  });

  it('an older save gets credit for what it had already done', () => {
    const old = kennel() as unknown as Record<string, unknown>;
    (old.dogs as Dog[])[1]!.titles = ['novice'];
    delete old.reputation;
    delete old.letters;
    delete old.studBookings;
    old.version = 3;
    const s = migrate(structuredClone(old))!;
    expect(s.version).toBe(5);
    expect(s.reputation).toBe(10);
    expect(s.letters).toEqual([]);
  });
});

describe('letters from families', () => {
  it('a placed puppy writes home a season later, and good news builds the name', () => {
    let s = kennel(6);
    s = update(s, (d) => void breed(d, d.dogs[0]!.id, d.dogs[1]!.id));
    for (let i = 0; i < BREEDING.gestationDays; i++) s = update(s, (d) => void sleep(d));
    while (s.litters[0]!.puppies[0]!.ageMonths < 3) s = update(s, (d) => void sleep(d));
    const litter = s.litters[0]!;
    s = update(s, (d) => {
      for (const p of [...d.litters[0]!.puppies]) placePuppy(d, litter.id, p.id);
    });
    expect(s.letters.length).toBe(0);
    const placed = s.litters[0]!.placed.length;
    // Sleep through to the next two changes of season.
    for (let i = 0; i < 15; i++) s = update(s, (d) => void sleep(d));
    expect(s.letters.length).toBeGreaterThanOrEqual(placed);
    expect(s.letters[0]!.text.length).toBeGreaterThan(10);
    expect(s.diary.some((d) => d.text.startsWith('A letter from'))).toBe(true);
  });
});

describe('your dog at stud', () => {
  it('needs a title, earns fees, and his pups carry his genes into trials', () => {
    let s = kennel(8);
    const rex = s.dogs[1]!;
    expect(studProblem(rex)).toMatch(/title/);
    s = update(s, (d) => {
      expect(setAtStud(d, rex.id, true)).toBe(false);
      d.dogs[1]!.titles = ['novice', 'open'];
      d.reputation = 40;
      expect(setAtStud(d, rex.id, true)).toBe(true);
    });
    expect(studFee(s, s.dogs[1]!)).toBeGreaterThan(100);
    // Over several seasons a titled dog from a known kennel gets booked.
    let bookings = 0;
    const money = s.money;
    s = update(s, (d) => {
      for (let season = 0; season < 6; season++) {
        d.day += 7;
        bookings += seasonalBookings(d).length;
      }
    });
    expect(bookings).toBeGreaterThan(2);
    expect(s.money).toBeGreaterThan(money);
    const booking = s.studBookings[0]!;
    expect(studPupDue(s, booking.day + 10)).toBeNull();
    const due = studPupDue(s, booking.day + 28)!;
    expect(due).not.toBeNull();
    const rival = studPupRival(booking, s.dogs[1]!, 'novice');
    if (rival) {
      expect(rival.by).toBe('Rex');
      expect(rival.dog.sireId).toBe(rex.id);
      // Every coat gene pair has one allele from the sire.
      const sireE = s.dogs[1]!.genome.loci.E;
      expect(rival.dog.genome.loci.E.some((a) => sireE.includes(a))).toBe(true);
      const def = trialEvent(s.seed, 35, 'novice', rival);
      expect(def.rivals.some((r) => r.by === 'Rex')).toBe(true);
      expect(def.rivals.length).toBe(3);
    }
  });
});

describe("the kennel's type", () => {
  it('appears once enough puppies have been bred', () => {
    let s = kennel(11);
    expect(kennelType(s)).toBeNull();
    s = update(s, (d) => void breed(d, d.dogs[0]!.id, d.dogs[1]!.id));
    for (let i = 0; i < BREEDING.gestationDays; i++) s = update(s, (d) => void sleep(d));
    // A second litter after her rest, to be sure of five or more.
    for (let i = 0; i < 15; i++) s = update(s, (d) => void sleep(d));
    s = update(s, (d) => void breed(d, d.dogs[0]!.id, d.dogs[1]!.id));
    for (let i = 0; i < BREEDING.gestationDays; i++) s = update(s, (d) => void sleep(d));
    const bred = Object.values(s.pedigree).filter((e) => e.kennel === 'Oak Hollow').length;
    expect(bred).toBeGreaterThanOrEqual(5);
    expect(kennelType(s)).toMatch(/Oak Hollow|puppies bred here/);
  });
});
