import { describe, expect, it } from 'vitest';
import {
  createTrainingSession,
  giveCue,
  mark,
  stepTraining,
  type Lesson,
  type TrainingSession,
} from '../src/sim/training';
import { FIXED_DT } from '../src/sim/retrieve';
import { testDog } from './helpers';

type Trainer = (t: TrainingSession) => void;

function session(lesson: Lesson, trainer: Trainer, skill = 0.2, seed = 1): TrainingSession {
  const dog = testDog({ biddability: 60, focus: 55, drive: 55 }, { [lesson]: skill }, seed);
  const t = createTrainingSession(dog, lesson, seed);
  for (let i = 0; i < 600 / FIXED_DT && t.phase !== 'done'; i++) {
    stepTraining(t, FIXED_DT);
    trainer(t);
  }
  return t;
}

/** Marks `delay` seconds after the ideal moment, but only responses `worthIt` accepts. */
function trainer(
  lesson: Lesson,
  delay: number,
  worthIt: (quality: number, skill: number) => boolean,
): Trainer {
  let cueAt = 0;
  return (t) => {
    if (t.phase === 'idle' && t.time > cueAt) {
      giveCue(
        t,
        lesson === 'cast'
          ? (['left', 'right', 'back'] as const)[t.reps % 3]
          : lesson === 'stay' && t.skill < 0.45
            ? 'gentle'
            : 'full',
      );
      cueAt = t.time + 0.5;
    }
    // Stop lesson: whistle once the dog is well into its run.
    if (
      lesson === 'stop' &&
      t.phase === 'waiting' &&
      !t.current &&
      !t.pendingResponse &&
      t.dog.speed > 4
    ) {
      giveCue(t);
    }
    const r = t.current;
    if (r && !r.marked && t.time >= r.completeAt + delay) {
      if (worthIt(r.def.quality, t.skill)) mark(t);
    }
  };
}

const onlyGood = (q: number) => q >= 0.9;
const shaping = (q: number, skill: number) => q > 0 && q >= skill - 0.05;

describe('marker training', () => {
  it('good timing teaches faster than late timing', () => {
    let quick = 0;
    let slow = 0;
    for (let seed = 1; seed <= 6; seed++) {
      quick += session('sit', trainer('sit', 0.1, onlyGood), 0.3, seed).skill;
      slow += session('sit', trainer('sit', 1.2, onlyGood), 0.3, seed).skill;
    }
    expect(quick).toBeGreaterThan(slow + 0.1);
  });

  it('rewarding the wrong response makes things worse', () => {
    const t = session(
      'sit',
      trainer('sit', 0.1, (q) => q < 0.5),
      0.4,
    );
    expect(t.skill).toBeLessThan(0.4);
  });

  it('a good session makes a real difference to the sit', () => {
    const t = session('sit', trainer('sit', 0.1, onlyGood), 0.3);
    expect(t.skill).toBeGreaterThan(0.45);
  });

  it('shaping small steps builds a stop whistle from nothing faster than waiting for perfection', () => {
    let shaped = 0;
    let perfectionist = 0;
    for (let seed = 1; seed <= 6; seed++) {
      shaped += session('stop', trainer('stop', 0.1, shaping), 0, seed).skill;
      perfectionist += session('stop', trainer('stop', 0.1, onlyGood), 0, seed).skill;
    }
    expect(shaped).toBeGreaterThan(perfectionist);
    expect(shaped / 6).toBeGreaterThan(0.12);
  });

  it('the directions drill improves casting with clean timing', () => {
    const t = session('cast', trainer('cast', 0.1, onlyGood), 0.1);
    expect(t.skill).toBeGreaterThan(0.2);
  });

  it('gentle tosses let even a keen, unsteady dog learn to stay', () => {
    const t = session('stay', trainer('stay', 0.1, shaping), 0.05);
    expect(t.skill).toBeGreaterThan(0.2);
  });

  it("a session ends when the treats or the dog's interest run out", () => {
    const t = session('sit', trainer('sit', 0.1, onlyGood), 0.3);
    expect(t.phase).toBe('done');
    expect(t.reps).toBeGreaterThan(5);
  });
});
