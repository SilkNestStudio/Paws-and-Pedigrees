import test from 'node:test';
import assert from 'node:assert/strict';
import type { Dog } from '../src/types';
import { regenerateEnergy, energyActivityCheckpoint } from '../src/utils/energyRegeneration';
import { regenerateTP, nextTPResetAt, tpRecoveryText, TP_RESET_MS } from '../src/utils/tpRegeneration';
import { ageDog } from '../src/utils/puppyAging';
import { dogTimeUpdates, startDogTimeRefresh, DOG_REFRESH_INTERVAL_MS } from '../src/utils/dogTimeRefresh';
import { useGameStore } from '../src/stores/gameStore';
import { newClubProgress } from '../src/game/club/model';
import { startClubRun, completeClubRound } from '../src/game/club/progress';

const hour = 3600000, start = Date.parse('2026-10-01T12:00:00Z');
const iso = (time: number) => new Date(time).toISOString();
function fixture(changes: Partial<Dog> = {}): Dog {
  return {
    id: 'clock-dog', user_id: 'clock-owner', name: 'Fern', breed_id: 1, gender: 'female',
    hunger: 100, thirst: 100, happiness: 100, health: 100, energy_stat: 40,
    training_points: 0, training_sessions_today: 8, tp_refills_today: 2,
    last_training_reset: iso(start), last_fed: iso(start), last_watered: iso(start),
    last_played: iso(start), created_at: iso(start), birth_date: iso(start - 104 * hour), age_weeks: 52,
    life_stage: 'adult', bond_level: 5, bond_xp: 0, is_rescue: true,
    speed: 60, agility: 60, strength: 60, endurance: 60, intelligence: 60, trainability: 60,
    energy: 60, prey_drive: 60, speed_trained: 0, agility_trained: 0, strength_trained: 0, endurance_trained: 0, obedience_trained: 0,
    ...changes,
  } as Dog;
}
const applyEnergy = (d: Dog, now: number) => ({ ...d, ...regenerateEnergy(d, 1, now) });

test('energy recovery initializes old saves, preserves a partial hour and is idempotent', () => {
  const d = fixture(), before = JSON.stringify(d);
  const initialized = applyEnergy(d, start + hour - 1);
  assert.equal(initialized.energy_stat, 40);
  assert.equal(initialized.last_energy_regeneration, iso(start));
  const recovered = applyEnergy(initialized, start + hour + 20 * 60000);
  assert.equal(recovered.energy_stat, 48);
  assert.equal(recovered.last_energy_regeneration, iso(start + hour));
  assert.equal(recovered.last_played, d.last_played);
  assert.deepEqual(regenerateEnergy(recovered, 1, start + hour + 20 * 60000), {});
  assert.equal(applyEnergy(recovered, start + 2 * hour).energy_stat, 56);
  assert.equal(JSON.stringify(d), before);
});

test('energy recovery is consistent across frequent and catch-up refreshes including low-energy bonus', () => {
  const d = fixture({ energy_stat: 20 });
  let minute = d, hourly = d;
  for (let i = 1; i <= 240; i++) minute = applyEnergy(minute, start + i * 60000);
  for (let i = 1; i <= 4; i++) hourly = applyEnergy(hourly, start + i * hour);
  const catchUp = applyEnergy(d, start + 4 * hour);
  assert.equal(minute.energy_stat, catchUp.energy_stat);
  assert.equal(hourly.energy_stat, catchUp.energy_stat);
  assert.equal(catchUp.energy_stat, 55); // 11 for the first hour, then 8/hour.
  assert.equal(minute.last_energy_regeneration, catchUp.last_energy_regeneration);
});

test('time at full energy cannot be spent again after a later activity', () => {
  const full = applyEnergy(fixture({ energy_stat: 100 }), start);
  assert.equal(full.last_energy_regeneration, iso(start));
  assert.deepEqual(regenerateEnergy(full, 1, start + 8 * hour), {});
  const spent = { ...full, ...energyActivityCheckpoint(full, 94, start + 8 * hour), energy_stat: 94 };
  assert.equal(applyEnergy(spent, start + 8 * hour).energy_stat, 94);
  assert.equal(applyEnergy(spent, start + 9 * hour - 1).energy_stat, 94);
  assert.equal(applyEnergy(spent, start + 9 * hour).energy_stat, 100);
  const rested = { ...fixture(), ...energyActivityCheckpoint(fixture(), 100, start + 8 * hour), energy_stat: 100 };
  assert.equal(rested.last_energy_regeneration, iso(start + 8 * hour));
});

test('care and play timestamps do not restart an established local recovery clock', () => {
  const d = fixture({ last_energy_regeneration: iso(start), last_fed: iso(start + 55 * 60000), last_played: iso(start + 55 * 60000) });
  assert.equal(applyEnergy(d, start + hour).energy_stat, 48);
});

test('TP resets once at the 24-hour boundary and keeps its phase after an absence', () => {
  const d = fixture();
  assert.deepEqual(regenerateTP(d, start + TP_RESET_MS - 1), {});
  const reset = { ...d, ...regenerateTP(d, start + TP_RESET_MS) };
  assert.equal(reset.training_points, 85);
  assert.equal(reset.training_sessions_today, 0);
  assert.equal(reset.tp_refills_today, 0);
  assert.deepEqual(regenerateTP(reset, start + TP_RESET_MS), {});
  const later = { ...reset, ...regenerateTP(reset, start + 49 * hour) };
  assert.equal(later.last_training_reset, iso(start + 48 * hour));
  assert.equal(nextTPResetAt(later), start + 72 * hour);
  assert.match(tpRecoveryText(later, start + 49 * hour), /23h 0m/);
});

test('combined refresh uses recovered energy for TP, and repeated refresh/reload has no further awards', t => {
  const now = start + 24 * hour;
  t.mock.method(Date, 'now', () => now);
  const d = fixture({ last_fed: iso(now), last_watered: iso(now), last_energy_regeneration: iso(now - hour) });
  const updated = { ...d, ...dogTimeUpdates(d, 1, now) };
  assert.equal(updated.energy_stat, 48);
  assert.equal(updated.training_points, 87);
  assert.equal(updated.age_weeks, 64);
  assert.equal(updated.age_years, 1);
  const restored = JSON.parse(JSON.stringify(updated)) as Dog;
  assert.deepEqual(dogTimeUpdates(restored, 1, now), {});
  assert.equal(restored.speed_trained, d.speed_trained);
  assert.equal(restored.last_played, d.last_played);
});

test('aging uses the same clock, never rejuvenates, and leaves memorial dogs alone', () => {
  assert.deepEqual(ageDog(fixture({ age_weeks: 90 }), start), {});
  assert.equal(ageDog(fixture(), start + 2 * hour).age_weeks, 53);
  assert.deepEqual(ageDog(fixture({ is_dead: true }), start + 40 * hour), {});
  assert.deepEqual(dogTimeUpdates(fixture({ is_dead: true }), 1, start + 100 * hour), {});
});

test('invalid and future clocks cannot create NaN or duplicate recovery', () => {
  const broken = fixture({ last_training_reset: 'invalid', created_at: 'invalid', last_fed: 'invalid', last_played: 'invalid' });
  assert.deepEqual(regenerateEnergy(broken, 1, start), { last_energy_regeneration: iso(start) });
  assert.deepEqual(regenerateTP(broken, start), {});
  assert.deepEqual(regenerateEnergy(fixture({ last_energy_regeneration: iso(start + hour) }), 1, start), {});
  assert.deepEqual(regenerateTP(fixture({ last_training_reset: iso(start + hour) }), start), {});
  const recovered = applyEnergy(fixture(), start + 100000 * hour);
  assert.equal(recovered.energy_stat, 100);
  assert.deepEqual(regenerateEnergy(recovered, 1, start + 100000 * hour), {});
});

test('cloud compatibility retains the legacy checkpoint without requiring a new database column', () => {
  const d = fixture({ last_energy_regeneration: iso(start - 4 * hour) });
  const updates = regenerateEnergy(d, 1, start + hour, false);
  assert.equal(updates.energy_stat, 48);
  assert.equal(updates.last_played, iso(start + hour));
  assert.equal(updates.last_energy_regeneration, undefined);
  assert.deepEqual(regenerateEnergy({ ...d, ...updates }, 1, start + hour, false), {});
});

test('foreground scheduler reads current dogs, handles reset/resume, and removes all listeners', () => {
  const page = Object.assign(new EventTarget(), { hidden: false });
  const host = Object.assign(new EventTarget(), {
    setInterval: (callback: () => void, delay: number) => { assert.equal(delay, DOG_REFRESH_INTERVAL_MS); timer = callback; return 9; },
    clearInterval: (id: number) => { assert.equal(id, 9); timer = undefined; },
  });
  let timer: (() => void) | undefined, now = start + hour, dogs: Dog[] = [], calls = 0;
  const stop = startDogTimeRefresh(() => { calls++; dogs = dogs.map(d => applyEnergy(d, now)); }, page as unknown as Document, host as unknown as Window);
  assert.equal(calls, 1);
  dogs = [fixture()]; timer!(); assert.equal(dogs[0].energy_stat, 48);
  host.dispatchEvent(new Event('focus')); assert.equal(dogs[0].energy_stat, 48);
  page.hidden = true; now += hour; timer!(); assert.equal(dogs[0].energy_stat, 48);
  page.hidden = false; page.dispatchEvent(new Event('visibilitychange')); assert.equal(dogs[0].energy_stat, 56);
  dogs = []; host.dispatchEvent(new Event('pageshow')); assert.deepEqual(dogs, []);
  const count = calls; stop(); assert.equal(timer, undefined);
  host.dispatchEvent(new Event('focus')); page.dispatchEvent(new Event('visibilitychange')); assert.equal(calls, count);
});

test('real store and Field Club full-energy spending cannot reclaim old idle time', t => {
  let now = start + 8 * hour;
  t.mock.method(Date, 'now', () => now);
  useGameStore.getState().resetGame();
  const d = fixture({ energy_stat: 100, training_points: 100, last_fed: iso(now), last_watered: iso(now), last_energy_regeneration: iso(start) });
  useGameStore.setState({ dogs: [d], selectedDog: d, syncEnabled: false, user: { ...useGameStore.getState().user!, id: d.user_id }, tutorialProgress: { completedTutorials: [], skippedTutorials: [], dismissedHelp: [], showHelpIcons: true, fieldClub: newClubProgress() } });
  assert.equal(startClubRun('practice', [{ dogId: d.id, discipline: 'search' }]).success, true);
  const run = useGameStore.getState().tutorialProgress.fieldClub!.active!;
  assert.equal(completeClubRound(run.id, 0, 70).success, true);
  let current = useGameStore.getState().dogs[0];
  assert.equal(current.energy_stat, 94);
  assert.equal(current.last_energy_regeneration, iso(now));
  assert.deepEqual(regenerateEnergy(current, 1, now), {});
  useGameStore.getState().restDog(d.id);
  assert.equal(useGameStore.getState().dogs[0].energy_stat, 100);
  now += 8 * hour;
  useGameStore.getState().updateDog(d.id, { energy_stat: 80 });
  current = useGameStore.getState().dogs[0];
  assert.equal(current.last_energy_regeneration, iso(now));
  assert.equal(useGameStore.getState().selectedDog?.last_energy_regeneration, iso(now));
  assert.deepEqual(regenerateEnergy(current, 1, now), {});
  useGameStore.getState().resetGame();
});

test('expired veterinary recovery respects absence caps before TP and is idempotent', () => {
  const now = start + 10 * 24 * hour;
  const d = fixture({ health: 80, energy_stat: 100, recovering_from: 'care_recovery', recovery_due: iso(start + 24 * hour) });
  const updates = dogTimeUpdates(d, 1, now);
  const recovered = { ...d, ...updates };
  assert.equal(recovered.health, 10);
  assert.equal(recovered.hunger, 0);
  assert.equal(recovered.training_points, 52);
  assert.equal(recovered.recovering_from, undefined);
  assert.deepEqual(dogTimeUpdates(recovered, 1, now), {});
  const cared = { ...d, last_fed: iso(now), last_watered: iso(now) };
  assert.equal(dogTimeUpdates(cared, 1, now).health, 100);
});
