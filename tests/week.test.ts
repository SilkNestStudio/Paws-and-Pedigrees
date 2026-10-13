import { describe, expect, it } from 'vitest';
import { addFlag, migrate, newGame, update, type GameState } from '../src/game/state';
import { objective, progressStory } from '../src/game/story';
import {
  ACTIVITY_ENERGY,
  buy,
  canStartActivity,
  dogAte,
  fillBowl,
  finishActivity,
  petDog,
  restAtHome,
  restore,
  sleep,
} from '../src/game/rules';
import { boardForDay } from '../src/game/jobs';
import { createRng } from '../src/core/rng';
import { observe } from '../src/core/dog/knowledge';
import { aptitude } from '../src/core/dog/dog';

function adopt(state: GameState): GameState {
  return update(state, (s) => {
    const dog = s.shelter[0]!;
    s.dogs.push(dog);
    s.activeDogId = dog.id;
    s.shelter = [];
    progressStory(s);
  });
}

describe('the first week', () => {
  it('walks through the opening story in order', () => {
    let s = newGame(42);
    s = update(s, (d) => {
      d.story = 'explore';
      addFlag(d, 'saw:office');
      addFlag(d, 'saw:runs');
      addFlag(d, 'saw:pantry');
      d.kennelName = 'Oak Hollow';
    });
    expect(objective(s).target).toBe('van');
    s = update(s, (d) => {
      d.story = 'toShelter';
    });
    s = adopt(s);
    expect(s.story).toBe('settle');
    s = update(s, (d) => {
      expect(fillBowl(d)).toBe(true);
      dogAte(d);
      petDog(d);
      progressStory(d);
    });
    expect(s.story).toBe('firstLesson');
    s = update(s, (d) => {
      addFlag(d, 'lesson:sit');
      progressStory(d);
    });
    expect(s.story).toBe('firstNight');
    s = update(s, (d) => {
      sleep(d);
      progressStory(d);
    });
    expect(s.day).toBe(2);
    expect(s.story).toBe('meetMara');
    expect(s.jobs.length).toBe(2);
  });

  it('feeding, energy and time behave sensibly', () => {
    let s = adopt(update(newGame(1), (d) => (d.story = 'toShelter')));
    const start = s.food;
    s = update(s, (d) => {
      fillBowl(d);
      expect(fillBowl(d)).toBe(false); // already full
      d.dogs[0]!.energy = 100;
      d.block = 'morning';
      finishActivity(d, {
        kind: 'mark',
        title: 'First mark',
        score: 70,
        grade: 'Good',
        observe: 'mark',
      });
    });
    expect(s.food).toBe(start - 1);
    expect(s.block).toBe('afternoon');
    expect(s.dogs[0]!.energy).toBe(100 - ACTIVITY_ENERGY.mark);
    s = update(s, (d) => sleep(d));
    expect(s.block).toBe('morning');
    expect(s.bowlFilled).toBe(false); // eaten overnight
  });

  it('a dog works until it is tired: energy, not the clock, ends its day', () => {
    let s = adopt(update(newGame(1), (d) => (d.story = 'toShelter')));
    s = update(s, (d) => {
      d.dogs[0]!.energy = 100;
      d.dogs[0]!.fullness = 100;
      d.block = 'morning';
    });
    // Lessons go on well past three, and the clock stops at evening.
    let lessons = 0;
    while (canStartActivity(s, 'lesson').ok) {
      s = update(s, (d) => {
        finishActivity(d, { kind: 'lesson', title: 'Sit on cue', score: 50, grade: 'Good' });
      });
      lessons++;
    }
    expect(lessons).toBe(Math.floor(100 / ACTIVITY_ENERGY.lesson));
    expect(lessons).toBeGreaterThan(3);
    expect(s.block).toBe('evening');
    const tired = canStartActivity(s, 'lesson');
    expect(tired.ok).toBe(false);
    expect(!tired.ok && tired.reason).toMatch(/worn out/);
    expect(!tired.ok && tired.reason).not.toMatch(/another dog/);
    // Work makes a dog hungry.
    expect(s.dogs[0]!.fullness).toBeLessThan(80);
    // A second dog has its own energy.
    s = update(s, (d) => {
      const other = structuredClone(d.dogs[0]!);
      other.id = 'second';
      other.name = 'Second';
      other.energy = 100;
      d.dogs.push(other);
    });
    const withFresh = canStartActivity(s, 'lesson');
    expect(!withFresh.ok && withFresh.reason).toMatch(/another dog/);
    s = update(s, (d) => {
      d.activeDogId = 'second';
    });
    expect(canStartActivity(s, 'mark').ok).toBe(true);
    // One quiet rest a day gives a little back.
    s = update(s, (d) => {
      d.activeDogId = d.dogs[0]!.id;
      const before = d.dogs[0]!.energy;
      expect(restAtHome(d)).toBe(true);
      expect(d.dogs[0]!.energy).toBe(before + 15);
      expect(restAtHome(d)).toBe(false);
    });
    s = update(s, (d) => void sleep(d));
    expect(update(s, (d) => void expect(restAtHome(d)).toBe(true))).toBeTruthy();
  });

  it('a save left at night under the old rule wakes up in the evening', () => {
    const old = adopt(update(newGame(1), (d) => (d.story = 'toShelter'))) as unknown as Record<
      string,
      unknown
    >;
    old.block = 'night';
    const s = migrate(structuredClone(old))!;
    expect(s.block).toBe('evening');
    expect(canStartActivity(s, 'lesson').ok).toBe(true);
  });

  it('money buys food and the scent garden', () => {
    let s = newGame(3);
    s = update(s, (d) => {
      expect(buy(d, 'food').ok).toBe(true);
    });
    expect(s.food).toBe(4 + 8);
    expect(s.money).toBe(40 - 24);
    s = update(s, (d) => {
      expect(restore(d, 'scentGarden').ok).toBe(false);
      d.money = 100;
      expect(restore(d, 'scentGarden').ok).toBe(true);
    });
    expect(s.flags).toContain('restored:scentGarden');
  });

  it('a paid job pays once and leaves the board', () => {
    let s = adopt(update(newGame(5), (d) => (d.story = 'toShelter')));
    s = update(s, (d) => {
      d.jobs = boardForDay(d.seed, 2, []);
      const job = d.jobs[0]!;
      finishActivity(d, {
        kind: 'search',
        title: job.title,
        score: 80,
        grade: 'Good',
        pay: job.pay,
        jobId: job.id,
      });
    });
    expect(s.jobsDone.length).toBe(1);
    expect(s.jobs.length).toBe(1);
    expect(s.money).toBeGreaterThan(40);
  });
});

describe('getting to know a dog', () => {
  it('estimates always contain the true value and narrow with experience', () => {
    const s = adopt(update(newGame(9), (d) => (d.story = 'toShelter')));
    const dog = s.dogs[0]!;
    const knowledge = {};
    const rng = createRng(4);
    let width = 99;
    for (let i = 0; i < 6; i++) {
      observe(rng, dog, knowledge, [{ aptitude: 'nose', precision: 12 }]);
      const est = (knowledge as Record<string, { lo: number; hi: number }>).nose!;
      expect(est.lo).toBeLessThanOrEqual(aptitude(dog, 'nose'));
      expect(est.hi).toBeGreaterThanOrEqual(aptitude(dog, 'nose'));
      expect(est.hi - est.lo).toBeLessThanOrEqual(width);
      width = est.hi - est.lo;
    }
    expect(width).toBeLessThan(20);
  });
});

import { funDayEvent, rivalScore, standings } from '../src/game/events';

describe('the Fun Day', () => {
  it('rivals play real rounds: the trained dog with an expert handler beats the novice', () => {
    const def = funDayEvent(7);
    const [victor, billy] = def.rivals;
    const v = def.rounds.map((_, i) => rivalScore(def, victor!, i));
    const b = def.rounds.map((_, i) => rivalScore(def, billy!, i));
    expect(v.reduce((a, x) => a + x, 0)).toBeGreaterThan(b.reduce((a, x) => a + x, 0));
    const table = standings(def, 'Oak Hollow', 'Rex', [90, 40, 30], [v, b]);
    expect(table.entries.length).toBe(3);
    expect(table.entries[0]!.total).toBeGreaterThanOrEqual(table.entries[2]!.total);
  });
});
