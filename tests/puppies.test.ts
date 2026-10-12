import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';
import { generateRescue, type Dog } from '../src/core/dog/dog';
import { addFlag, newGame, update, type GameState } from '../src/game/state';
import { sleep } from '../src/game/rules';
import {
  applyEvaluation,
  applyRaising,
  breed,
  BREEDING,
  canEvaluate,
  canRaiseToday,
  pupInputs,
  RAISING,
  register,
} from '../src/game/breeding';
import {
  createPuppySession,
  help,
  OUTCOME_BONUS,
  playPuppies,
  praise,
  rollResponse,
  stepPuppies,
  type PupInput,
} from '../src/sim/puppies';

const pups = (n: number, confidence: number): PupInput[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Pup${i}`, values: { confidence } }));

function gain(skill: number, confidence = 0): number {
  let total = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const s = createPuppySession(pups(5, confidence), 'raise', 'novelty', seed);
    playPuppies(s, skill, createRng(seed * 3));
    total += s.results.reduce((a, r) => a + (r.outcome ? OUTCOME_BONUS[r.outcome] : 0), 0);
  }
  return total / 20;
}

describe('raising a litter', () => {
  it('bold puppies are mostly keen and shy ones mostly worried', () => {
    const count = (z: number) => {
      const rng = createRng(4);
      const n = { keen: 0, unsure: 0, worried: 0 };
      for (let i = 0; i < 400; i++) n[rollResponse(z, false, rng)]++;
      return n;
    };
    expect(count(1.2).keen).toBeGreaterThan(300);
    expect(count(-1.2).worried).toBeGreaterThan(250);
    expect(count(0).unsure).toBeGreaterThan(count(0).worried);
  });

  it('a keeper who reads the puppies raises a better litter than a careless one', () => {
    const skilled = gain(0.95);
    const careless = gain(0.15);
    expect(skilled).toBeGreaterThan(careless + 0.25);
    expect(skilled).toBeGreaterThan(0.4);
  });

  it('praising a frightened puppy does harm; helping first does good', () => {
    const run = (helpFirst: boolean) => {
      const s = createPuppySession(pups(1, -3), 'raise', 'novelty', 7);
      for (let i = 0; i < 60 * 30 && s.phase !== 'done'; i++) {
        stepPuppies(s, 1 / 60);
        const r = s.round;
        if (!r || s.phase !== 'round') continue;
        if (r.phase === 'cower' && !r.easy) {
          if (helpFirst) help(s);
          else praise(s);
        } else if (r.phase === 'reached') praise(s);
      }
      return s.results[0]?.outcome ?? null;
    };
    expect(run(false)).toBe('rewardedFear');
    expect(['helped', null]).toContain(run(true));
  });
});

function withLitter(seed = 5): GameState {
  let s = update(newGame(seed), (d) => {
    const dam = generateRescue(createRng(seed + 1), 'Bess') as Dog;
    const sire = generateRescue(createRng(seed + 2), 'Rex') as Dog;
    dam.sex = 'female';
    sire.sex = 'male';
    dam.ageMonths = 30;
    sire.ageMonths = 30;
    d.dogs.push(dam, sire);
    d.activeDogId = sire.id;
    d.shelter = [];
    d.story = 'afterFunDay';
    d.money = 500;
    d.food = 60;
    addFlag(d, 'restored:whelpingRoom');
    register(d, dam, 'Larchwood Rescue');
    register(d, sire, 'Larchwood Rescue');
    breed(d, dam.id, sire.id);
  });
  for (let i = 0; i < BREEDING.gestationDays; i++) s = update(s, (d) => void sleep(d));
  return s;
}

describe('raising in the kennel', () => {
  it('a session moves each puppy a little, once a day, and never past the cap', () => {
    let s = withLitter();
    const litter = s.litters[0]!;
    expect(canRaiseToday(s, litter)).toBe(true);
    const before = litter.puppies.map((p) => p.genome.traits.confidence.e);
    const perfect = litter.puppies.map((p) => ({
      pupId: p.id,
      name: p.name,
      activity: 'novelty' as const,
      response: 'keen' as const,
      outcome: 'perfect' as const,
      readRight: null,
    }));
    s = update(s, (d) => {
      const lines = applyRaising(d, litter.id, 'novelty', perfect);
      expect(lines.every((l) => l.points === 3)).toBe(true);
    });
    expect(canRaiseToday(s, s.litters[0]!)).toBe(false);
    s.litters[0]!.puppies.forEach((p, i) =>
      expect(p.genome.traits.confidence.e).toBeCloseTo(before[i]! + 0.2),
    );
    // Day after day of perfect sessions stops at the cap.
    for (let day = 0; day < 6; day++)
      s = update(s, (d) => {
        d.litters[0]!.lastSessionDay = -1;
        applyRaising(d, litter.id, 'novelty', perfect);
      });
    expect(s.litters[0]!.puppies[0]!.rearing!.confidence).toBeCloseTo(RAISING.cap);
  });

  it('evaluation day waits until the puppies can leave, and a right read tells you more', () => {
    let s = withLitter(9);
    expect(canEvaluate(s, s.litters[0]!)).toBe(false);
    while (s.litters[0]!.puppies[0]!.ageMonths < 3) s = update(s, (d) => void sleep(d));
    expect(canEvaluate(s, s.litters[0]!)).toBe(true);
    const litter = s.litters[0]!;
    const width = (state: GameState, id: string) => {
      const e = state.knowledge[id]?.focus;
      return e ? e.hi - e.lo : 98;
    };
    const results = (right: boolean) =>
      pupInputs(litter).map((p) => ({
        pupId: p.id,
        name: p.name,
        activity: 'follow' as const,
        response: 'keen' as const,
        outcome: null,
        readRight: right,
      }));
    const good = update(s, (d) => void applyEvaluation(d, litter.id, results(true)));
    const poor = update(s, (d) => void applyEvaluation(d, litter.id, results(false)));
    const id = litter.puppies[0]!.id;
    expect(width(good, id)).toBeLessThan(width(poor, id));
    expect(good.litters[0]!.evaluated).toBe(true);
    expect(canEvaluate(good, good.litters[0]!)).toBe(false);
  });
});
