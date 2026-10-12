import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';
import { generateRescue, titlesIn, type Dog } from '../src/core/dog/dog';
import { addFlag, newGame, update, type GameState } from '../src/game/state';
import { agilityShow, recordEvent, rivalScore, trialLevel } from '../src/game/events';
import { isShowDay, nextShowDay } from '../src/game/calendar';
import { canStartActivity, finishActivity } from '../src/game/rules';
import {
  agilityLearning,
  buildAgilityReport,
  callHere,
  createAgilitySession,
  FIXED_DT,
  goOn,
  playAgility,
  standardTime,
  stepAgility,
} from '../src/sim/agility';
import { PRACTICE_COURSES, showCourse } from '../src/sim/courses';
import { createTrainingField, createVillageGreen } from '../src/sim/field';
import { testDog } from './helpers';

const field = createTrainingField();

function average(courseIndex: number, dogSkill: number, handler: number, runs = 10) {
  let score = 0;
  let done = 0;
  let faults = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const dog = testDog({ agility: 55, speed: 55 }, { agility: dogSkill }, seed);
    const s = playAgility(
      createAgilitySession(dog, PRACTICE_COURSES[courseIndex]!, field, seed * 17),
      handler,
      createRng(seed),
    );
    const st = s.stats;
    score += buildAgilityReport(s).score;
    faults += st.bars + st.refusals + st.contacts + st.weaves + st.offCourse;
    if (s.phase === 'complete') done++;
  }
  return { score: score / runs, done, faults };
}

describe('agility', () => {
  it('the dog does nothing until told to go, then takes the obstacle its handler runs at', () => {
    const dog = testDog({ agility: 60 }, { agility: 0.5 }, 3);
    const s = createAgilitySession(dog, PRACTICE_COURSES[0]!, field, 5);
    for (let i = 0; i < 120; i++) stepAgility(s, FIXED_DT);
    expect(s.phase).toBe('ready');
    expect(s.dog.pose).toBe('sit');
    goOn(s);
    s.keeper.input = { x: 0, z: -1 };
    s.keeper.running = true;
    for (let i = 0; i < 240 && s.next === 0; i++) stepAgility(s, FIXED_DT);
    expect(s.next).toBe(1);
    expect(s.stats.offCourse).toBe(0);
  });

  it('a good handler runs every practice course; a poor one collects faults', () => {
    for (let c = 0; c < PRACTICE_COURSES.length; c++) {
      const good = average(c, 0.7, 0.9);
      expect(good.done).toBe(10);
      expect(good.score).toBeGreaterThan(85);
    }
    const good = average(2, 0.7, 0.9);
    const poor = average(2, 0, 0.2);
    expect(poor.faults).toBeGreaterThan(good.faults + 5);
    expect(poor.score).toBeLessThan(good.score - 8);
  });

  it('running at the wrong obstacle sends the dog off course, and "Here" can call it back', () => {
    const course = PRACTICE_COURSES[2]!;
    const dog = testDog({ agility: 60 }, { agility: 0.8 }, 4);
    const s = createAgilitySession(dog, course, field, 9);
    goOn(s);
    // Head straight for the second jump's far side so the dog passes the first.
    const wrong = course.obstacles[7]!;
    let called = false;
    for (let i = 0; i < 60 * 12 && s.stats.offCourse === 0; i++) {
      const to = { x: wrong.pos.x - s.keeper.pos.x, z: wrong.pos.z - s.keeper.pos.z };
      const d = Math.hypot(to.x, to.z) || 1;
      s.keeper.input = { x: to.x / d, z: to.z / d };
      s.keeper.running = true;
      if (!called && s.target && s.target.index !== s.next && s.state === 'seek') {
        callHere(s);
        called = true;
        expect(s.target).toBeNull();
      }
      stepAgility(s, FIXED_DT);
    }
    expect(called || s.stats.offCourse > 0).toBe(true);
  });

  it('clean obstacles teach, and a simple course stops teaching once outgrown', () => {
    const fresh = testDog({ agility: 60, speed: 55 }, { agility: 0 }, 2);
    const run = playAgility(
      createAgilitySession(fresh, PRACTICE_COURSES[0]!, field, 3),
      0.9,
      createRng(3),
    );
    expect(run.phase).toBe('complete');
    const gain = agilityLearning(run);
    expect(gain).toBeGreaterThan(0.005);
    expect(gain).toBeLessThan(0.06);
    const old = testDog({ agility: 60, speed: 55 }, { agility: 0.35 }, 2);
    const again = playAgility(
      createAgilitySession(old, PRACTICE_COURSES[0]!, field, 3),
      0.9,
      createRng(3),
    );
    expect(agilityLearning(again)).toBe(0);
  });

  it('standard times are fair: a good round beats them, a walked one does not', () => {
    const course = PRACTICE_COURSES[2]!;
    const dog = testDog({ agility: 55, speed: 55 }, { agility: 0.7 }, 5);
    const s = playAgility(createAgilitySession(dog, course, field, 8), 0.9, createRng(8));
    const report = buildAgilityReport(s);
    expect(report.seconds).toBeLessThan(standardTime(course));
    expect(report.seconds).toBeGreaterThan(standardTime(course) * 0.5);
  });
});

function kennel(seed = 4): GameState {
  return update(newGame(seed), (s) => {
    const dog = generateRescue(createRng(seed * 10 + 1), 'Fern') as Dog;
    dog.ageMonths = 24;
    s.dogs.push(dog);
    s.activeDogId = dog.id;
    s.shelter = [];
    s.story = 'afterFunDay';
    s.funDay = { entries: [], bestRound: 'mark' };
    s.money = 200;
  });
}

describe('the Saturday agility show', () => {
  it('runs on Saturdays from the second week', () => {
    expect(isShowDay(6)).toBe(false);
    expect(isShowDay(13)).toBe(true);
    expect(isShowDay(14)).toBe(false);
    expect(nextShowDay(1)).toBe(13);
    expect(nextShowDay(14)).toBe(20);
  });

  it('has two rounds over a mirrored course and rivals who really run it', () => {
    const def = agilityShow(99, 13, 'novice');
    expect(def.sport).toBe('agility');
    expect(def.rounds.length).toBe(2);
    const [a, b] = def.rounds.map((r) => r.course!);
    expect(a!.obstacles.length).toBe(b!.obstacles.length);
    expect(a!.obstacles[0]!.pos.x).toBeCloseTo(-b!.obstacles[0]!.pos.x);
    const scores = def.rivals.flatMap((r) => [0, 1].map((i) => rivalScore(def, r, i)));
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
    expect(Math.max(...scores)).toBeGreaterThan(60);
    // The same show is the same every time it is built.
    expect(rivalScore(def, def.rivals[0]!, 0)).toBe(scores[0]);
  });

  it('every level has a course a skilled pair can finish', () => {
    const green = createVillageGreen();
    for (const level of ['novice', 'open', 'excellent'] as const) {
      let done = 0;
      for (let seed = 1; seed <= 6; seed++) {
        const dog = testDog({ agility: 60, speed: 55 }, { agility: 0.8 }, seed);
        const s = playAgility(
          createAgilitySession(dog, showCourse(level, seed % 2, 0), green, seed),
          0.9,
          createRng(seed),
        );
        if (s.phase === 'complete') done++;
      }
      expect(done).toBe(6);
    }
  });

  it('two qualifying runs earn an agility title without touching field titles', () => {
    let s = kennel();
    const weak = (def: ReturnType<typeof agilityShow>) => def.rivals.map(() => [40, 40]);
    s = update(s, (d) => {
      d.day = 13;
      const def = agilityShow(d.seed, 13, trialLevel(d.dogs[0]!, 'agility'));
      const out = recordEvent(d, def, [80, 70], weak(def))!;
      expect(out.record.qualified).toBe(true);
      expect(out.title).toBeNull();
    });
    expect(s.dogs[0]!.sportQualifiers?.agility?.novice).toBe(1);
    s = update(s, (d) => {
      d.day = 20;
      const def = agilityShow(d.seed, 20, trialLevel(d.dogs[0]!, 'agility'));
      // 50 and 55 is not enough in total: 110 is needed over two rounds.
      expect(recordEvent(d, def, [50, 55], weak(def))!.record.qualified).toBe(false);
      d.day = 27;
      const next = agilityShow(d.seed, 27, 'novice');
      expect(recordEvent(d, next, [60, 60], weak(next))!.title).toBe('novice');
    });
    const dog = s.dogs[0]!;
    expect(titlesIn(dog, 'agility')).toEqual(['novice']);
    expect(dog.titles).toEqual([]);
    expect(trialLevel(dog, 'agility')).toBe('open');
    expect(trialLevel(dog)).toBe('novice');
    expect(s.trials.filter((t) => t.sport === 'agility').length).toBe(3);
  });

  it('practice costs energy and time once per session, and puppies may not jump', () => {
    let s = kennel();
    addFlag(s, 'restored:agilityRing');
    const before = s.dogs[0]!.energy;
    s = update(s, (d) => {
      d.block = 'morning';
      finishActivity(d, {
        kind: 'agility',
        title: 'First jumps',
        score: 90,
        grade: 'Excellent',
        skill: { cue: 'agility', value: 0.04 },
      });
      finishActivity(d, {
        kind: 'agility',
        title: 'First jumps',
        score: 95,
        grade: 'Excellent',
        skill: { cue: 'agility', value: 0.08 },
        extra: true,
      });
    });
    expect(s.block).toBe('afternoon');
    expect(s.dogs[0]!.energy).toBe(before - 18);
    expect(s.dogs[0]!.skills.agility).toBeCloseTo(0.08);
    s = update(s, (d) => {
      d.dogs[0]!.ageMonths = 6;
    });
    expect(canStartActivity(s, 'agility').ok).toBe(false);
    expect(canStartActivity(s, 'lesson').ok).toBe(true);
  });
});
