import test from 'node:test';
import assert from 'node:assert/strict';
import { SaveQueue } from '../src/utils/saveQueue';
import { createRun, stepRun, surfaceHeight, runPerformance } from '../src/game/agility/simulation';
import { GATES, COURSE, FIELD, FINISH_Z } from '../src/game/agility/course';
import { generateDog } from '../src/utils/dogGenerator';
import { generateLitter, checkBreedingEligibility, calculatePregnancyDueDate } from '../src/utils/breedingCalculations';
import { isAptitudeKnown, activityRestriction } from '../src/utils/dogDevelopment';
import { prizeForPlacement, rankCompetition, leaderboardTier } from '../src/utils/competitionResults';
import { PREGNANCY_HOURS, MS_PER_HOUR, calculateAgeInWeeks } from '../src/utils/timeScaling';
import { useGameStore } from '../src/stores/gameStore';
import { calculateHealthDecay, getHealthStatus, visitVet } from '../src/utils/healthDecay';
import type { Breed, Dog } from '../src/types';
import type { CompetitionEvent } from '../src/types/competition';

const breed = { id: 1, name: 'Test dog', tier: 'rescue', coat_types: ['short'],
  ...Object.fromEntries(['size', 'energy', 'friendliness', 'trainability', 'intelligence', 'speed', 'agility', 'strength', 'endurance', 'prey_drive', 'protectiveness'].flatMap(k => [[k + '_min', 60], [k + '_max', 60]])),
} as Breed;
function dog(name = 'Fern', gender: 'male' | 'female' = 'female'): Dog {
  return { ...generateDog(breed, name, 'owner', true, gender), bond_level: 5, health: 100, hunger: 100, thirst: 100, energy_stat: 100 };
}
const event = { id: 'trial', discipline: 'agility', eventType: 'point_show', name: 'Meadow trial', maxEntries: 20, currentEntries: 10,
  judgeId: 'judge', prizes: { first: 100, second: 60, third: 40, participation: 10 }, pointsAwarded: { first: 2, second: 1, third: 0, fourth: 0 },
} as CompetitionEvent;

test('queued saves coalesce per record, preserve separate dogs and profiles', async () => {
  const q = new SaveQueue(), saved: string[] = [];
  q.schedule('dog:a', async () => { saved.push('old'); });
  q.schedule('dog:a', async () => { saved.push('new'); });
  q.schedule('dog:b', async () => { saved.push('other'); });
  q.schedule('profile:a', async () => { saved.push('profile'); });
  assert.equal(await q.flush(), true); assert.deepEqual(saved, ['new', 'other', 'profile']);
});
test('failed saves can retry without overwriting a newer snapshot', async () => {
  const q = new SaveQueue(); let count = 0;
  q.schedule('dog', async () => { count++; return false; });
  assert.equal(await q.flush(), false);
  q.schedule('dog', async () => { count += 10; return true; });
  assert.equal(await q.flush(), true); assert.equal(count, 11);
});
test('a newer save waits for an in-flight write', async () => {
  const q = new SaveQueue(), order: number[] = [];
  let release!: () => void;
  const blocker = new Promise<void>(resolve => { release = resolve; });
  q.schedule('dog', async () => { await blocker; order.push(1); });
  const first = q.flush();
  q.schedule('dog', async () => { order.push(2); });
  const second = q.flush(); release();
  await Promise.all([first, second]); assert.deepEqual(order, [1, 2]);
});
test('rescues keep breed potential and start as adults', () => {
  const rescue = generateDog(breed, 'Fern', 'owner', true);
  assert.equal(rescue.speed, 60); assert.equal(rescue.size, 60);
  assert.equal(calculateAgeInWeeks(rescue.birth_date), 52);
  assert.equal(isAptitudeKnown(rescue, 'agility'), false);
  assert.equal(isAptitudeKnown({ ...rescue, bond_level: 1, agility_trained: 1 }, 'agility'), true);
  assert.equal(isAptitudeKnown({ ...rescue, bond_level: 1, agility_trained: 1 }, 'speed'), false);
});
test('dead, pregnant, recovering and underfed dogs cannot train', () => {
  const d = dog(); assert.equal(activityRestriction(d), null);
  for (const changes of [{ is_dead: true }, { is_pregnant: true }, { recovering_from: 'injury' }, { thirst: 0 }]) assert.ok(activityRestriction({ ...d, ...changes }));
});
test('litter respects conception count, ancestry, and resets earned training/titles', () => {
  const sire = { ...dog('Oak', 'male'), speed_trained: 100, championship_title: 'champion' };
  const dam = { ...dog(), litter_size: 5, agility_trained: 100, championship_title: 'champion' };
  const litter = generateLitter(sire, dam, breed, breed, 'owner', [sire, dam]);
  assert.equal(litter.length, 5); assert.equal(new Set(litter.map(p => p.id)).size, 5);
  for (const puppy of litter) {
    assert.equal(puppy.parent1_id, sire.id); assert.equal(puppy.parent2_id, dam.id);
    assert.equal(puppy.speed_trained, 0); assert.equal(puppy.agility_trained, 0);
    assert.equal(puppy.championship_title, undefined); assert.ok(puppy.speed >= 1 && puppy.speed <= 100);
  }
});
test('pregnancy helpers use the same configured clock and reject unhealthy parents', () => {
  const duration = Date.parse(calculatePregnancyDueDate()) - Date.now();
  assert.ok(Math.abs(duration - PREGNANCY_HOURS * MS_PER_HOUR) < 100);
  const sire = dog('Oak', 'male'), dam = dog();
  assert.equal(checkBreedingEligibility(sire, dam, 1000, [sire, dam]).canBreed, true);
  assert.equal(checkBreedingEligibility(sire, { ...dam, is_dead: true }, 1000).canBreed, false);
});
test('ranking identifies the player by identity, keeps every placement, maps valid tiers', () => {
  const results = rankCompetition({ name: 'Fern', score: 1 }, Array.from({ length: 12 }, () => ({ name: 'Fern', score: 10, breed: 'Lab' })));
  assert.equal(results.length, 13); assert.equal(results.find(r => r.isPlayer)?.placement, 13);
  assert.equal(prizeForPlacement(event, 13), 10); assert.equal(prizeForPlacement(event, NaN), 0);
  assert.equal(leaderboardTier('championship'), 'national');
});
function setupStore(dogs: Dog[]) {
  useGameStore.getState().resetGame();
  const user = { ...useGameStore.getState().user!, id: 'owner', cash: 1000, kennel_level: 4 };
  useGameStore.setState({ dogs, user, syncEnabled: false, competitionEvents: [event], eventRegistrations: dogs.map(d => ({ id: d.id, eventId: event.id, userId: 'owner', dogId: d.id, status: 'registered', registeredAt: new Date().toISOString() })) });
}
test('competition completion pays exactly once, including below fourth place', () => {
  const d = dog(); setupStore([d]);
  assert.equal(useGameStore.getState().awardChampionshipPoints(d.id, event.id, 10, 50).success, true);
  assert.equal(useGameStore.getState().user!.cash, 1010);
  assert.equal(useGameStore.getState().eventRegistrations[0].status, 'competed');
  assert.equal(useGameStore.getState().awardChampionshipPoints(d.id, event.id, 1, 100).success, false);
  assert.equal(useGameStore.getState().user!.cash, 1010);
  setupStore([d]);
  useGameStore.getState().awardChampionshipPoints(d.id, event.id, 1, 100);
  assert.equal(useGameStore.getState().user!.cash, 1100);
});
test('breeding charges once, reserves litter space, and birth cannot duplicate puppies', () => {
  const sire = dog('Oak', 'male'), dam = dog(); setupStore([sire, dam]);
  assert.equal(useGameStore.getState().breedDogs(sire.id, dam.id, 3).success, true);
  assert.equal(useGameStore.getState().user!.cash, 650);
  assert.equal(useGameStore.getState().breedDogs(sire.id, dam.id, 3).success, false);
  assert.equal(useGameStore.getState().sellDog(sire.id).success, false);
  useGameStore.getState().updateDog(dam.id, { pregnancy_due: new Date(0).toISOString() });
  const mother = useGameStore.getState().dogs.find(d => d.id === dam.id)!;
  const puppies = generateLitter(sire, mother, breed, breed, 'owner');
  assert.equal(useGameStore.getState().giveBirth(dam.id, puppies), true);
  assert.equal(useGameStore.getState().giveBirth(dam.id, puppies), false);
  assert.equal(useGameStore.getState().dogs.length, 5);
});

test('absence consequences are capped and consider water as well as food', () => {
  const d = dog();
  const away = { ...d, last_watered: new Date(Date.now() - 30 * 24 * MS_PER_HOUR).toISOString() };
  assert.equal(calculateHealthDecay(away), 10);
  assert.equal(getHealthStatus(away).isDead, false);
  assert.equal(getHealthStatus(away).needsVet, true);
  const recovering = { ...away, ...visitVet(away) };
  assert.equal(recovering.speed, away.speed);
  assert.ok(activityRestriction(recovering));
  assert.equal(activityRestriction({ ...recovering, recovery_due: new Date(0).toISOString() }), null);
});
test('community care works with no money and legacy recovery never charges gems', () => {
  const d = { ...dog(), health: 10 }; setupStore([d]);
  useGameStore.setState({ user: { ...useGameStore.getState().user!, cash: 0, gems: 0 } });
  assert.equal(useGameStore.getState().takeToVet(d.id).success, true);
  assert.equal(useGameStore.getState().user!.cash, 0);
  assert.equal(useGameStore.getState().dogs[0].recovering_from, 'care_recovery');
  useGameStore.getState().updateDog(d.id, { is_dead: true, death_cause: 'neglect', revival_count: 5 });
  assert.equal(useGameStore.getState().reviveDeadDog(d.id).success, true);
  assert.equal(useGameStore.getState().user!.gems, 0);
  useGameStore.getState().updateDog(d.id, { is_dead: true, death_cause: 'old_age' });
  assert.equal(useGameStore.getState().reviveDeadDog(d.id).success, false);
});
test('repeated care clicks cannot farm unlimited bond XP', () => {
  const d = { ...dog(), thirst: 50 }; setupStore([d]);
  assert.equal(useGameStore.getState().waterDog(d.id).success, true);
  const xp = useGameStore.getState().dogs[0].bond_xp;
  assert.equal(useGameStore.getState().waterDog(d.id).success, false);
  assert.equal(useGameStore.getState().dogs[0].bond_xp, xp);
});
test('movement is consistent at 30/60/120 fps and diagonal input is normalized', () => {
  const distances = [30, 60, 120].map(fps => { const r = createRun(); for (let i = 0; i < fps; i++) stepRun(r, { x: 1, z: 0, jump: false }, 1 / fps); return r.x; });
  assert.ok(Math.max(...distances) - Math.min(...distances) < 0.01);
  const r = createRun(); for (let i = 0; i < 120; i++) stepRun(r, { x: 1, z: 1, jump: false }, 1 / 120);
  assert.ok(Math.hypot(r.vx, r.vz) <= 6.0001);
});
test('uncleared jumps block progress and charge only one fault per gate', () => {
  const r = createRun(); r.z = 5.2;
  for (let i = 0; i < 120; i++) stepRun(r, { x: 0, z: -1, jump: false }, 1 / 60);
  assert.equal(r.gate, 0); assert.equal(r.faults, 1); assert.ok(r.z > 5);
});
test('swept gate checks reject bypasses, weaving on wrong side, and airborne seesaw', () => {
  for (const index of [0, 2, 4, 10]) {
    const g = GATES[index], r = createRun();
    Object.assign(r, { gate: index, x: g.x + 3, z: g.z + 0.01, vz: -6 });
    stepRun(r, { x: 0, z: -1, jump: false }, 0.1);
    assert.equal(r.gate, index);
  }
});
test('every gate can be cleared in order and finishing requires the final line', () => {
  const r = createRun();
  for (let i = 0; i < GATES.length; i++) {
    const g = GATES[i];
    Object.assign(r, { x: g.x, z: g.z + 0.02, vx: 0, vz: -6, vy: 0, y: g.clearance ? 1 : surfaceHeight(g.x, g.z + 0.02), grounded: !g.clearance });
    stepRun(r, { x: 0, z: -1, jump: false }, 1 / 60);
    assert.equal(r.gate, i + 1, `gate ${i} (${COURSE[g.obstacle].kind})`);
  }
  assert.equal(r.finished, false); r.z = FINISH_Z + 0.01;
  stepRun(r, { x: 0, z: -1, jump: false }, 1 / 60); assert.equal(r.finished, true);
  assert.ok(runPerformance(r) >= 0.4 && runPerformance(r) <= 1.5);
});
test('course geometry stays within playable bounds and holding jump cannot auto-repeat', () => {
  assert.ok(COURSE.every(o => o.z >= FIELD.minZ && o.z <= FIELD.maxZ));
  const r = createRun(); for (let i = 0; i < 180; i++) stepRun(r, { x: 0, z: 0, jump: true }, 1 / 60);
  assert.equal(r.grounded, true); assert.equal(r.y, 0);
});

test('a continuous run can traverse the whole course without teleporting', () => {
  const r = createRun();
  for (let i = 0; i < 120 * 180 && !r.finished; i++) {
    const gate = GATES[r.gate];
    const dx = (gate?.x ?? 0) - r.x;
    const distance = r.z - (gate?.z ?? FINISH_Z);
    const x = Math.max(-1, Math.min(1, dx * 2));
    const align = gate && distance < 3 && Math.abs(dx) > gate.halfWidth * 0.65;
    stepRun(r, { x, z: align ? 0 : -1, jump: Boolean(gate?.clearance && distance < 1.9 && distance > 0.1) }, 1 / 120);
  }
  assert.equal(r.finished, true, `stopped at gate ${r.gate}, x=${r.x}, z=${r.z}`);
  assert.equal(r.faults, 0);
});
