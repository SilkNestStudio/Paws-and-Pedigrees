import { describe, expect, it } from 'vitest';
import { migrate, newGame, update, type GameState } from '../src/game/state';
import { progressStory } from '../src/game/story';
import {
  adoptDog,
  ADOPTION_FEE,
  canAdoptMore,
  feedRuns,
  finishActivity,
  refreshShelter,
  sleep,
} from '../src/game/rules';
import { FIRST_TRIAL_DAY, isTrialDay, nextTrialDay, seasonOf, yearOf } from '../src/game/calendar';
import {
  enterEvent,
  qualifies,
  recordEvent,
  rivalScore,
  trialEvent,
  trialLevel,
  TRIAL_RULES,
} from '../src/game/events';

function withDog(seed = 11): GameState {
  return update(newGame(seed), (s) => {
    const dog = s.shelter[0]!;
    s.dogs.push(dog);
    s.activeDogId = dog.id;
    s.shelter = [];
    s.story = 'afterFunDay';
    progressStory(s);
  });
}

describe('the calendar', () => {
  it('seven days make a season and four seasons a year', () => {
    expect(seasonOf(1)).toBe('Spring');
    expect(seasonOf(7)).toBe('Spring');
    expect(seasonOf(8)).toBe('Summer');
    expect(seasonOf(29)).toBe('Spring');
    expect(yearOf(29)).toBe(2);
  });

  it('trials run every Sunday from the second week', () => {
    expect(isTrialDay(7)).toBe(false); // the Fun Day
    expect(isTrialDay(FIRST_TRIAL_DAY)).toBe(true);
    expect(isTrialDay(21)).toBe(true);
    expect(isTrialDay(20)).toBe(false);
    expect(nextTrialDay(3)).toBe(14);
    expect(nextTrialDay(15)).toBe(21);
  });
});

describe('the turn of a season', () => {
  it('ages every dog three months and writes a recap', () => {
    let s = withDog();
    const age = s.dogs[0]!.ageMonths;
    s = update(s, (d) => {
      d.day = 7;
      d.block = 'night';
      finishActivity(d, { kind: 'mark', title: 'First mark', score: 70, grade: 'Good' });
      d.dogs[0]!.skills.sit = 0.9;
      sleep(d);
    });
    expect(s.day).toBe(8);
    expect(s.dogs[0]!.ageMonths).toBe(age + 3);
    expect(s.recap?.season).toBe('Spring');
    expect(s.recap?.next).toBe('Summer');
    expect(s.recap?.skillGains.some((g) => g.cue === 'sit')).toBe(true);
    expect(s.season.startDay).toBe(8);
  });

  it('jobs done last season come back on the board', () => {
    let s = withDog(4);
    s = update(s, (d) => {
      d.day = 6;
      d.jobs = [];
      d.recentJobs = ['hollins-glove', 'ellis-knife', 'pip-rabbit', 'keeper-marks'];
      sleep(d);
    });
    expect(s.jobs.every((j) => !s.recentJobs.includes(j.id))).toBe(true);
    s = update(s, (d) => sleep(d)); // into the new season
    expect(s.recentJobs).toEqual([]);
    expect(s.jobs.length).toBe(2);
  });
});

describe('older saves', () => {
  it('a first-week save upgrades without losing anything', () => {
    const old = withDog() as unknown as Record<string, unknown>;
    old.version = 1;
    delete old.trials;
    delete old.season;
    delete old.recap;
    delete old.recentJobs;
    const dog = (old.dogs as Record<string, unknown>[])[0]!;
    delete dog.titles;
    delete dog.qualifiers;
    const s = migrate(structuredClone(old))!;
    expect(s.version).toBe(2);
    expect(s.trials).toEqual([]);
    expect(s.dogs[0]!.titles).toEqual([]);
    expect(s.dogs[0]!.name).toBe((dog as { name: string }).name);
    expect(migrate({ nonsense: true })).toBeNull();
  });
});

describe('trials and titles', () => {
  it('a qualifying run needs every round and the total', () => {
    expect(qualifies([60, 60, 60])).toBe(true);
    expect(qualifies([90, 90, 45])).toBe(false);
    expect(qualifies([55, 55, 50])).toBe(false);
  });

  it('the same Sunday builds the same trial', () => {
    const a = trialEvent(5, 14, 'novice');
    const b = trialEvent(5, 14, 'novice');
    expect(a.rounds.map((r) => r.title)).toEqual(b.rounds.map((r) => r.title));
    expect(a.rivals.map((r) => r.id)).toEqual(b.rivals.map((r) => r.id));
    expect(a.rivals.length).toBe(3);
    expect(trialEvent(5, 14, 'open').rivals.some((r) => r.id === 'billy')).toBe(false);
  });

  it('two qualifying runs earn a title and move the dog up a level', () => {
    let s = withDog(8);
    const def14 = trialEvent(s.seed, 14, 'novice');
    const weak = def14.rivals.map(() => [40, 40, 40]);
    s = update(s, (d) => {
      d.day = 14;
      d.money = 100;
      expect(enterEvent(d, def14)).toBe(true);
      const out = recordEvent(d, def14, [80, 75, 70], weak)!;
      expect(out.record.qualified).toBe(true);
      expect(out.record.placing).toBe(1);
      expect(out.title).toBeNull();
    });
    expect(s.money).toBe(100 - TRIAL_RULES.novice.entryFee + TRIAL_RULES.novice.prizes[0]!);
    expect(trialLevel(s.dogs[0]!)).toBe('novice');
    const def21 = trialEvent(s.seed, 21, 'novice');
    s = update(s, (d) => {
      d.day = 21;
      const out = recordEvent(d, def21, [70, 70, 70], weak)!;
      expect(out.title).toBe('novice');
    });
    expect(s.dogs[0]!.titles).toEqual(['novice']);
    expect(trialLevel(s.dogs[0]!)).toBe('open');
    expect(s.trials.length).toBe(2);
  });

  it('rivals at Open are stronger than rivals at Novice', () => {
    const avg = (level: 'novice' | 'open') => {
      let total = 0;
      let n = 0;
      for (const day of [14, 21]) {
        const def = trialEvent(3, day, level);
        for (const r of def.rivals)
          for (let i = 0; i < def.rounds.length; i++) {
            if (def.rounds[i]!.kind === 'search') continue;
            total += rivalScore({ ...def, rounds: trialEvent(3, day, 'novice').rounds }, r, i);
            n++;
          }
      }
      return total / n;
    };
    expect(avg('open')).toBeGreaterThan(avg('novice'));
  });
});

describe('a second dog', () => {
  it('new arrivals come once a season, and later adoptions cost a fee', () => {
    let s = withDog(21);
    s = update(s, (d) => {
      d.funDay = { entries: [], bestRound: 'mark' };
      d.money = 100;
      expect(canAdoptMore(d)).toBe(true);
      refreshShelter(d);
      expect(d.shelter.length).toBe(3);
      const names = d.shelter.map((x) => x.id);
      refreshShelter(d);
      expect(d.shelter.map((x) => x.id)).toEqual(names); // same season, same dogs
      const dog = adoptDog(d, 1, 'Juniper')!;
      expect(dog.name).toBe('Juniper');
      expect(d.activeDogId).toBe(dog.id);
    });
    expect(s.dogs.length).toBe(2);
    expect(s.money).toBe(100 - ADOPTION_FEE);
  });

  it('dogs in the runs are fed from the pantry and go hungry without it', () => {
    let s = withDog(22);
    s = update(s, (d) => {
      d.funDay = { entries: [], bestRound: 'mark' };
      d.money = 100;
      refreshShelter(d);
      adoptDog(d, 0, 'Second');
      d.activeDogId = d.dogs[1]!.id;
      d.dogs[0]!.fullness = 20;
      d.food = 1;
      const out = feedRuns(d);
      expect(out.fed).toEqual([d.dogs[0]!.name]);
      d.dogs[0]!.fullness = 20;
      expect(feedRuns(d).hungry).toEqual([d.dogs[0]!.name]);
    });
    expect(s.food).toBe(0);
  });
});
