import { describe, expect, it } from 'vitest';
import { distance, headingOf, sub, fromHeading, add } from '../src/core/math';
import {
  blowWhistle,
  callForThrows,
  castDog,
  createRetrieveSession,
  FIXED_DT,
  sendDog,
  stepSession,
  type RetrieveSession,
} from '../src/sim/retrieve';
import { setupById } from '../src/sim/exercises';
import { windAt } from '../src/sim/scent';
import { testDog } from './helpers';

function run(s: RetrieveSession, seconds: number, each?: (s: RetrieveSession) => void): void {
  const steps = Math.round(seconds / FIXED_DT);
  for (let i = 0; i < steps && s.phase !== 'complete'; i++) {
    stepSession(s, FIXED_DT);
    each?.(s);
  }
}

function runUntil(s: RetrieveSession, done: (s: RetrieveSession) => boolean, maxSeconds: number) {
  const steps = Math.round(maxSeconds / FIXED_DT);
  for (let i = 0; i < steps; i++) {
    if (done(s)) return true;
    stepSession(s, FIXED_DT);
  }
  return done(s);
}

describe('marks', () => {
  it('a steady dog watches a mark, is sent, finds it and delivers', () => {
    const dog = testDog({ focus: 60, nose: 55 }, { stay: 0.9 });
    const s = createRetrieveSession(dog, setupById('first-mark'), 1);
    callForThrows(s);
    run(s, 4);
    expect(s.stats.broke).toBe(false);
    const mark = s.items[0]!;
    expect(mark.state).toBe('lying');
    expect(mark.memory).not.toBeNull();
    sendDog(s, mark.pos);
    run(s, 60);
    expect(s.phase).toBe('complete');
    expect(s.stats.delivered).toBe(1);
  });

  it('a high-drive dog with no steadiness training breaks before being sent', () => {
    let broke = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const s = createRetrieveSession(
        testDog({ drive: 90, focus: 30 }, { stay: 0 }),
        setupById('first-mark'),
        seed,
      );
      callForThrows(s);
      run(s, 8);
      if (s.stats.broke) broke++;
    }
    expect(broke).toBeGreaterThanOrEqual(8);
  });

  it('a well-trained, calm dog stays put through the throw', () => {
    const s = createRetrieveSession(
      testDog({ drive: 40, focus: 70 }, { stay: 0.95 }),
      setupById('first-mark'),
      3,
    );
    callForThrows(s);
    run(s, 10);
    expect(s.stats.broke).toBe(false);
  });

  it('dogs with better focus remember falls more precisely', () => {
    const error = (focus: number) => {
      let total = 0;
      for (let seed = 1; seed <= 30; seed++) {
        const s = createRetrieveSession(
          testDog({ focus }, { stay: 1 }),
          setupById('long-mark'),
          seed,
        );
        callForThrows(s);
        run(s, 6);
        const mark = s.items[0]!;
        total += distance(mark.memory!, mark.pos);
      }
      return total / 30;
    };
    expect(error(90)).toBeLessThan(error(20));
  });
});

describe('the stop whistle', () => {
  function whistleOnLine(stop: number, seed: number): boolean {
    const s = createRetrieveSession(
      testDog({ biddability: 50 }, { stop }),
      setupById('first-blind'),
      seed,
    );
    sendDog(s, s.items[0]!.pos);
    run(s, 1.5);
    blowWhistle(s);
    return runUntil(s, (x) => x.dog.mode === 'stopped', 2);
  }

  it('a dog trained to the whistle stops; an untrained one does not', () => {
    let trained = 0;
    let untrained = 0;
    for (let seed = 1; seed <= 20; seed++) {
      if (whistleOnLine(0.9, seed)) trained++;
      if (whistleOnLine(0, seed)) untrained++;
    }
    expect(trained).toBeGreaterThanOrEqual(18);
    expect(untrained).toBeLessThanOrEqual(2);
  });
});

describe('scent and the wind', () => {
  /** Runs the dog straight across the blind's scent plume, `downwind` metres from it. */
  function crossesPlume(nose: number, downwind: number): boolean {
    const s = createRetrieveSession(testDog({ nose }), setupById('long-blind'), 4);
    const blind = s.items[0]!.pos;
    const { dir } = windAt(s.wind, 0);
    const across = { x: -dir.z, z: dir.x };
    s.dog.pos = add(add(blind, fromHeading(headingOf(dir), downwind)), {
      x: across.x * -14,
      z: across.z * -14,
    });
    s.dog.lineHeading = headingOf(across);
    s.dog.heading = s.dog.lineHeading;
    s.dog.carryLeft = 28;
    s.dog.mode = 'line';
    return runUntil(s, (x) => x.dog.mode === 'scent', 8);
  }

  it('a better nose picks up a blind from further downwind', () => {
    const reach = (nose: number) =>
      [6, 10, 14, 18, 22, 26].filter((d) => crossesPlume(nose, d)).length;
    expect(reach(90)).toBeGreaterThan(reach(25) + 1);
    expect(reach(25)).toBeGreaterThanOrEqual(1);
  });

  it('upwind of the blind there is nothing to smell', () => {
    expect(crossesPlume(99, -12)).toBe(false);
  });
});

describe('handling skill matters', () => {
  /**
   * A competent handler: sends straight at the blind, stops the dog whenever it
   * drifts more than 5 m off line or starts hunting the wrong place, and casts
   * it toward a point just downwind of the blind.
   */
  function skilledHandler(s: RetrieveSession): void {
    const blind = s.items.find((i) => i.kind === 'blind')!;
    if (blind.state !== 'lying') return;
    const { dog } = s;
    if (dog.mode === 'stopped' || dog.mode === 'popped') {
      if (dog.modeTime > 0.6) {
        const { dir } = windAt(s.wind, s.time);
        castDog(s, add(blind.pos, fromHeading(headingOf(dir), 4)));
      }
      return;
    }
    if (dog.mode === 'line' || dog.mode === 'hunt') {
      const lineDir = sub(blind.pos, s.lineFrom ?? s.field.line);
      const off = sub(dog.pos, s.lineFrom ?? s.field.line);
      const len = Math.hypot(lineDir.x, lineDir.z);
      const offLine = Math.abs(off.x * lineDir.z - off.z * lineDir.x) / len;
      const wrongHunt = dog.mode === 'hunt' && distance(dog.huntCenter, blind.pos) > 8;
      if ((offLine > 5 || wrongHunt) && Math.round(s.time * 60) % 45 === 0) blowWhistle(s);
    }
  }

  function blindTime(handled: boolean, seed: number): number {
    const dog = testDog({ nose: 50, biddability: 60, drive: 60 }, { stop: 0.85, cast: 0.7 }, seed);
    const s = createRetrieveSession(dog, setupById('long-blind'), seed);
    sendDog(s, s.items[0]!.pos);
    run(s, 240, handled ? skilledHandler : undefined);
    return s.phase === 'complete' ? s.stats.finishedAt! - s.stats.startedAt! : 240;
  }

  it('a skilled handler gets the long blind much faster than one who just sends and waits', () => {
    let skilled = 0;
    let passive = 0;
    for (let seed = 1; seed <= 8; seed++) {
      skilled += blindTime(true, seed);
      passive += blindTime(false, seed);
    }
    expect(skilled).toBeLessThan(passive * 0.7);
  });
});
