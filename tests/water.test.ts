import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';
import { trialEvent } from '../src/game/events';
import {
  createTrainingField,
  createTrialGround,
  DUCK_POND,
  LARKSPUR_LAKE,
  inWater,
  resolvePonds,
  waterCrossing,
} from '../src/sim/field';
import { WATER_SETUPS } from '../src/sim/exercises';
import { createRetrieveSession, FIXED_DT, stepSession } from '../src/sim/retrieve';
import { buildReport } from '../src/sim/report';
import { playRetrieve } from '../src/sim/bots';
import { testDog } from './helpers';

const field = () => createTrainingField({ pond: true });
const setup = (id: string) => WATER_SETUPS.find((s) => s.id === id)!;

function runs(water: number, skill: number, id = 'water-across', n = 12) {
  let bankRuns = 0;
  let score = 0;
  let swam = 0;
  for (let seed = 1; seed <= n; seed++) {
    const dog = testDog(
      { water, confidence: water, speed: 60 },
      { stay: 0.9, cast: 0.6, stop: 0.6 },
    );
    const s = createRetrieveSession(dog, setup(id), seed * 31, field());
    let wet = false;
    const rng = createRng(seed);
    // Step manually for a moment to notice swimming, then let the bot finish.
    playRetrieve(s, skill, rng);
    wet = s.stats.trace.some((p) => inWater(s.field, p));
    bankRuns += s.stats.bankRuns;
    score += buildReport(s).score;
    if (wet) swam++;
  }
  return { bankRuns: bankRuns / n, score: score / n, swam: swam / n };
}

describe('water work', () => {
  it('the pond only exists once restored, and the keeper stays dry', () => {
    expect(createTrainingField().ponds).toBeUndefined();
    const f = field();
    expect(inWater(f, DUCK_POND.center)).toBe(true);
    const out = resolvePonds(f, { x: DUCK_POND.center.x + 2, z: DUCK_POND.center.z + 1 }, 0.4);
    expect(inWater(f, out)).toBe(false);
    expect(waterCrossing(f, { x: -36, z: -12 }, { x: -43, z: -40 })).not.toBeNull();
  });

  it('a water-loving dog takes the water; a reluctant one runs the bank', () => {
    const keen = runs(90, 0.2);
    const shy = runs(10, 0.2);
    expect(keen.bankRuns).toBeLessThan(shy.bankRuns);
    expect(keen.swam).toBeGreaterThan(0.6);
    expect(keen.score).toBeGreaterThan(shy.score);
  });

  it('good handling stops a bank run and sends the dog back into the water', () => {
    const poor = runs(25, 0.1);
    const good = runs(25, 0.95);
    expect(good.bankRuns).toBeLessThan(poor.bankRuns);
    expect(good.score).toBeGreaterThan(poor.score);
  });

  it('a mark into the pond means swimming, and it still comes back', () => {
    const dog = testDog({ water: 70, confidence: 60 }, { stay: 0.9 });
    const s = createRetrieveSession(dog, setup('water-into'), 5, field());
    const r = playRetrieve(s, 0.6, createRng(2));
    expect(r.phase).toBe('complete');
    expect(r.stats.trace.some((p) => inWater(r.field, p))).toBe(true);
    expect(r.stats.delivered).toBe(1);
  });

  it('swimming is much slower than running', () => {
    const dog = testDog({ water: 50, speed: 50 });
    const s = createRetrieveSession(dog, setup('water-into'), 9, field());
    s.dog.pos = { ...DUCK_POND.center };
    s.dog.mode = 'line';
    s.dog.lineHeading = 0;
    s.dog.carryLeft = 30;
    s.dog.waterChecked = true;
    for (let i = 0; i < 120; i++) stepSession(s, FIXED_DT);
    expect(s.dog.swimming).toBe(true);
    expect(s.dog.speed).toBeLessThan(s.params.gallop * 0.5);
  });
});

describe('water at Larkspur', () => {
  it('the Open trial ends with a blind across the lake', () => {
    for (const day of [14, 21, 28]) {
      const round = trialEvent(9, day, 'open').rounds[2]!;
      const blind = round.retrieve!.blinds[0]!;
      const ground = createTrialGround();
      expect(waterCrossing(ground, ground.line, blind)?.pond).toBe(LARKSPUR_LAKE);
      expect(inWater(ground, blind)).toBe(false);
    }
  });
});
