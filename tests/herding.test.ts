import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';
import { headingOf, sub, wrapAngle } from '../src/core/math';
import { generateRescue, titlesIn, type Dog } from '../src/core/dog/dog';
import { newGame, update, type GameState } from '../src/game/state';
import { recordEvent, rivalScore, sheepdogTrial, trialLevel } from '../src/game/events';
import {
  advise,
  buildHerdingReport,
  centroid,
  command,
  createHerdingSession,
  FIXED_DT,
  herdingLearning,
  inPen,
  playHerding,
  stepHerding,
  type HerdingSession,
} from '../src/sim/herding';
import { PRACTICE_PASTURES, trialPasture } from '../src/sim/pastures';
import { createFellTop } from '../src/sim/field';
import { testDog } from './helpers';

const field = createFellTop();
const collie = (herd: number, seed = 1) =>
  testDog({ focus: 62, biddability: 62, drive: 55, power: 50, speed: 55 }, { herd }, seed);

const run = (s: HerdingSession, seconds: number) => {
  for (let i = 0; i < seconds / FIXED_DT; i++) stepHerding(s, FIXED_DT);
};

function average(index: number, dogSkill: number, handler: number, runs = 6) {
  let score = 0;
  let penned = 0;
  let harried = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const s = playHerding(
      createHerdingSession(collie(dogSkill, seed), PRACTICE_PASTURES[index]!, field, seed * 13),
      handler,
      createRng(seed),
    );
    score += buildHerdingReport(s).score;
    harried += s.stats.harried;
    if (s.stats.penned === s.sheep.length && !s.stats.timedOut) penned++;
  }
  return { score: score / runs, penned, harried };
}

describe('sheep', () => {
  it('graze where they are until a dog is sent', () => {
    const setup = PRACTICE_PASTURES[0]!;
    const s = createHerdingSession(collie(0.6), setup, field, 5);
    run(s, 12);
    expect(s.phase).toBe('ready');
    const c = centroid(s);
    expect(Math.hypot(c.x - setup.sheepStart.x, c.z - setup.sheepStart.z)).toBeLessThan(4);
    expect(s.dog.pose).toBe('sit');
    // Only a flank starts the run.
    command(s, 'walkUp');
    expect(s.phase).toBe('ready');
  });

  it('move away from the dog, and bunch together as they go', () => {
    const s = createHerdingSession(collie(0.8), PRACTICE_PASTURES[0]!, field, 7);
    command(s, 'away');
    run(s, 14);
    command(s, 'walkUp');
    const before = centroid(s);
    const dogBefore = { ...s.dog.pos };
    run(s, 6);
    const after = centroid(s);
    const moved = sub(after, before);
    const awayFromDog = sub(before, dogBefore);
    expect(Math.hypot(moved.x, moved.z)).toBeGreaterThan(2);
    expect(moved.x * awayFromDog.x + moved.z * awayFromDog.z).toBeGreaterThan(0);
    const spread = Math.max(
      ...s.sheep.map((sh) => Math.hypot(sh.pos.x - after.x, sh.pos.z - after.z)),
    );
    expect(spread).toBeLessThan(4);
  });
});

describe('the dog on sheep', () => {
  it('"Come by" goes clockwise round the flock and "Away" anticlockwise', () => {
    for (const [cmd, sign] of [
      ['comeBy', -1],
      ['away', 1],
    ] as const) {
      const s = createHerdingSession(collie(1), PRACTICE_PASTURES[0]!, field, 3);
      const start = headingOf(sub(s.dog.pos, centroid(s)));
      command(s, cmd);
      run(s, 4);
      const now = headingOf(sub(s.dog.pos, centroid(s)));
      expect(Math.sign(wrapAngle(now - start))).toBe(sign);
    }
  });

  it('a trained dog stops on "Lie down" and stays there', () => {
    const s = createHerdingSession(collie(1), PRACTICE_PASTURES[0]!, field, 3);
    command(s, 'away');
    run(s, 3);
    expect(s.dog.speed).toBeGreaterThan(3);
    command(s, 'lieDown');
    run(s, 1.5);
    expect(s.dog.speed).toBeLessThan(0.2);
    expect(s.dog.pose).toBe('down');
    run(s, 6);
    expect(s.dog.mode).toBe('down');
  });

  it('stops itself behind the sheep on the outrun once it knows the job', () => {
    const s = createHerdingSession(collie(0.8), PRACTICE_PASTURES[0]!, field, 9);
    command(s, 'comeBy');
    run(s, 20);
    expect(s.stats.lifted).toBe(true);
    expect(s.stats.liftedEarly).toBe(false);
    expect(s.dog.mode).toBe('down');
    // Behind them means the far side from the handler.
    expect(s.dog.pos.z).toBeLessThan(centroid(s).z);
    expect(advise(s).command).toBe('walkUp');
    expect(advise(s).text).toMatch(/Walk up/);
  });
});

describe('a run', () => {
  it('a good handler and a trained dog pen the sheep on every practice course', () => {
    for (let i = 0; i < PRACTICE_PASTURES.length; i++) {
      const good = average(i, 0.8, 0.9);
      expect(good.penned).toBeGreaterThanOrEqual(5);
      expect(good.score).toBeGreaterThan(85);
    }
  });

  it('a green dog with a slow handler scatters sheep and scores far less', () => {
    const good = average(1, 0.8, 0.9);
    const poor = average(1, 0, 0.3);
    expect(poor.harried).toBeGreaterThan(good.harried + 5);
    expect(poor.score).toBeLessThan(good.score - 20);
  });

  it('doing nothing scores nothing, and time is called', () => {
    const setup = PRACTICE_PASTURES[0]!;
    const s = createHerdingSession(collie(0.5), setup, field, 2);
    command(s, 'away');
    command(s, 'thatllDo');
    run(s, setup.standard * 2);
    expect(s.phase).toBe('complete');
    expect(s.stats.timedOut).toBe(true);
    expect(buildHerdingReport(s).score).toBeLessThan(15);
  });

  it('sheep are counted through the gates and into the pen', () => {
    const setup = PRACTICE_PASTURES[0]!;
    const s = playHerding(createHerdingSession(collie(0.9), setup, field, 13), 0.95, createRng(1));
    expect(s.stats.through[0]).toBe(setup.sheep);
    expect(s.sheep.every((sh) => inPen(setup.pen, sh.pos))).toBe(true);
    const report = buildHerdingReport(s);
    expect(report.score).toBeGreaterThan(90);
    expect(report.notes.some((n) => n.text.includes('penned'))).toBe(true);
  });

  it('teaches more for a tidy run, and nothing once the course is outgrown', () => {
    const setup = PRACTICE_PASTURES[0]!;
    const s = playHerding(createHerdingSession(collie(0.1), setup, field, 13), 0.9, createRng(1));
    const gain = herdingLearning(s);
    expect(gain).toBeGreaterThan(0.01);
    expect(gain).toBeLessThan(0.08);
    const old = playHerding(createHerdingSession(collie(0.5), setup, field, 13), 0.9, createRng(1));
    expect(herdingLearning(old)).toBe(0);
  });
});

function kennel(seed = 4): GameState {
  return update(newGame(seed), (s) => {
    const dog = generateRescue(createRng(seed * 10 + 1), 'Moss') as Dog;
    dog.ageMonths = 24;
    s.dogs.push(dog);
    s.activeDogId = dog.id;
    s.shelter = [];
    s.story = 'afterFunDay';
    s.funDay = { entries: [], bestRound: 'mark' };
    s.money = 200;
  });
}

describe('the Fell Top sheepdog trial', () => {
  it('has two mirrored runs and rivals who really work the sheep', () => {
    const def = sheepdogTrial(77, 13, 'novice');
    expect(def.sport).toBe('herding');
    expect(def.place).toBe('fell');
    expect(def.rounds.length).toBe(2);
    const [a, b] = def.rounds.map((r) => r.pasture!);
    expect(a!.pen.center.x).toBeCloseTo(-b!.pen.center.x);
    const scores = def.rivals.flatMap((r) => [0, 1].map((i) => rivalScore(def, r, i)));
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
    expect(Math.max(...scores)).toBeGreaterThan(50);
    expect(rivalScore(def, def.rivals[0]!, 0)).toBe(scores[0]);
  });

  it('every level has a course a skilled pair can finish, mirrored or not', () => {
    for (const level of ['novice', 'open', 'excellent'] as const) {
      for (const round of [0, 1]) {
        const s = playHerding(
          createHerdingSession(collie(0.85, 3), trialPasture(level, round, 0), field, 21 + round),
          0.9,
          createRng(4 + round),
        );
        expect(s.stats.penned).toBe(s.sheep.length);
      }
    }
  });

  it('two qualifying runs earn a sheepdog title of its own', () => {
    let s = kennel();
    s = update(s, (d) => {
      for (const day of [13, 20]) {
        d.day = day;
        const def = sheepdogTrial(d.seed, day, trialLevel(d.dogs[0]!, 'herding'));
        recordEvent(
          d,
          def,
          [70, 65],
          def.rivals.map(() => [40, 40]),
        );
      }
    });
    const dog = s.dogs[0]!;
    expect(titlesIn(dog, 'herding')).toEqual(['novice']);
    expect(titlesIn(dog, 'agility')).toEqual([]);
    expect(dog.titles).toEqual([]);
    expect(trialLevel(dog, 'herding')).toBe('open');
  });
});
