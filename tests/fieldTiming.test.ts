import test from 'node:test';
import assert from 'node:assert/strict';
import type { FieldDiscipline } from '../src/game/club/model';
import {
  createField, sendField, inspectField, stepField, fieldScore, distance, SEARCH_STATIONS,
  MAX_FIELD_FRAME_SECONDS, createFieldClock, pauseFieldClock, resumeFieldClock, advanceFieldFrame,
  type FieldState,
} from '../src/game/club/simulation';

const schedules = [
  { name: '15 fps', deltas: [1 / 15] }, { name: '30 fps', deltas: [1 / 30] },
  { name: '60 fps', deltas: [1 / 60] }, { name: '120 fps', deltas: [1 / 120] },
  { name: 'jittered', deltas: [.007, .073, .012, .14, .018] },
];
function advance(s: FieldState, seconds: number, deltas: number[]) {
  let elapsed = 0, frame = 0;
  while (elapsed < seconds - 1e-10) {
    const dt = Math.min(deltas[frame++ % deltas.length], seconds - elapsed);
    stepField(s, dt); elapsed += dt;
  }
}
function close(actual: number, expected: number, tolerance = 1e-8) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected} by more than ${tolerance}`);
}

test('Field Club preserves foreground elapsed time at 15/30/60/120 fps and jittered frame schedules', () => {
  for (const mode of ['search', 'herding', 'water'] as FieldDiscipline[]) {
    const states = schedules.map(({ name, deltas }) => {
      const s = createField(mode, 60, 42);
      sendField(s, { x: -6, z: -6 }); advance(s, 1, deltas);
      close(s.time, 1); assert.equal(s.phase, 'playing', `${mode}: ${name}`);
      return s;
    });
    for (const s of states) {
      assert.ok(distance(s.dog, states[0].dog) < .015, `${mode}: dog movement must not depend on frame rate`);
      close(s.stamina, states[0].stamina, .05);
    }
  }
});

test('inspection completes in real foreground seconds at every frame schedule, once only', () => {
  for (const { deltas } of schedules) {
    const s = createField('search', 50, 42), target = s.hidden[0];
    s.dog = { ...SEARCH_STATIONS[target] }; inspectField(s);
    const duration = 3 - s.ability * .018;
    advance(s, duration - .05, deltas);
    assert.deepEqual(s.found, []); assert.equal(s.inspecting, target);
    advance(s, .1, deltas);
    assert.deepEqual(s.found, [target]); assert.deepEqual(s.checked, [target]); assert.equal(s.inspecting, null);
    advance(s, 1, deltas); assert.deepEqual(s.found, [target]); assert.deepEqual(s.checked, [target]);
  }
});

test('water stamina and herding pressure remain consistent across slow and jittered frames', () => {
  const herds = schedules.map(({ deltas }) => {
    const s = createField('herding', 60, 42);
    s.dog = { x: .4, z: 4 }; s.target = { ...s.dog };
    advance(s, 4, deltas); return s;
  });
  for (const s of herds) for (let i = 0; i < 3; i++) {
    assert.ok(distance(s.sheep[i], herds[0].sheep[i]) < .003);
    assert.equal(s.mistakes, herds[0].mistakes);
  }
  for (const { deltas } of schedules) {
    const s = createField('water', 50, 42);
    s.dog = { x: 0, z: -2 }; s.target = { ...s.dog };
    advance(s, 4, deltas);
    close(s.stamina, 100 - 4 * 3 * (1.25 - s.ability * .008));
    close(s.time, 4);
  }
});

test('half-second foreground frames use bounded substeps without skipping retrieval interactions', () => {
  const s = createField('water', 100, 42), reference = createField('water', 100, 42);
  for (const state of [s, reference]) {
    state.dummies[0] = { x: -5, z: -3 };
    state.dog = { x: -5, z: -1 }; sendField(state, state.dummies[0]);
  }
  assert.equal(stepField(s, MAX_FIELD_FRAME_SECONDS), 'advanced');
  advance(reference, MAX_FIELD_FRAME_SECONDS, [1 / 60]);
  close(s.time, .5); assert.equal(s.carrying, true);
  assert.ok(distance(s.dog, reference.dog) < 1e-8); close(s.stamina, reference.stamina);
});

test('Field Club timeout is 180 foreground seconds at all frame schedules and never overshoots', () => {
  for (const { deltas } of schedules) {
    const s = createField('search', 50, 42); s.found = [s.hidden[0], s.hidden[1]];
    advance(s, 179.9, deltas); assert.equal(s.phase, 'playing'); close(s.time, 179.9, 1e-7);
    stepField(s, .2); assert.equal(s.phase, 'finished'); assert.equal(s.time, 180);
    assert.equal(fieldScore(s), 38);
    const snapshot = structuredClone(s); stepField(s, .5); assert.deepEqual(s, snapshot);
  }
});

test('invalid deltas do not mutate a round and long gaps are suspension, not catch-up', () => {
  const s = createField('water', 50, 42); sendField(s, s.dummies[0]);
  const before = structuredClone(s);
  for (const dt of [0, -1, NaN, Infinity, -Infinity]) {
    assert.equal(stepField(s, dt), 'idle'); assert.deepEqual(s, before);
  }
  for (const dt of [MAX_FIELD_FRAME_SECONDS + .001, 30, 3600]) {
    assert.equal(stepField(s, dt), 'suspended'); assert.deepEqual(s, before);
  }
});

test('loading, repeated pauses, hidden-tab gaps and resume never count as activity time', () => {
  const s = createField('search', 50, 42), clock = createFieldClock(); sendField(s, { x: -5, z: -4 });
  const initial = structuredClone(s);
  advanceFieldFrame(s, clock, 60); assert.deepEqual(s, initial);
  resumeFieldClock(clock); advanceFieldFrame(s, clock, 60); assert.deepEqual(s, initial);
  assert.equal(advanceFieldFrame(s, clock, 1 / 15), 'advanced'); close(s.time, 1 / 15);
  pauseFieldClock(clock); pauseFieldClock(clock);
  const paused = structuredClone(s);
  for (const dt of [1 / 60, 60, 3600]) advanceFieldFrame(s, clock, dt);
  assert.deepEqual(s, paused);
  resumeFieldClock(clock); advanceFieldFrame(s, clock, 3600); assert.deepEqual(s, paused);
  advanceFieldFrame(s, clock, 1 / 15); close(s.time, 2 / 15);
  const active = structuredClone(s);
  assert.equal(advanceFieldFrame(s, clock, 3), 'suspended'); assert.equal(clock.paused, true);
  advanceFieldFrame(s, clock, 1 / 60); assert.deepEqual(s, active);
  resumeFieldClock(clock); advanceFieldFrame(s, clock, 1 / 15); assert.deepEqual(s, active);
  advanceFieldFrame(s, clock, 1 / 15); close(s.time, 3 / 15);
  const newRound = createField('water', 50, 99), newClock = createFieldClock();
  advanceFieldFrame(newRound, newClock, .2); assert.equal(newRound.time, 0);
});
