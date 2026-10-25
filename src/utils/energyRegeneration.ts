/**
 * Energy Regeneration System
 *
 * Dogs passively recover energy over time
 * Rate depends on care quality and current energy level
 * Kennel level provides bonus regeneration
 */

import { Dog } from '../types';
import { getEnergyRegenBonus } from './kennelUpgrades';

// Regeneration constants
const BASE_REGEN_PER_HOUR = 5; // Base energy recovery per hour
const LOW_ENERGY_THRESHOLD = 30; // Below this gets bonus regen
const LOW_ENERGY_BONUS = 3; // Extra regen when tired
const REGEN_CHECK_INTERVAL_HOURS = 1; // Check every hour

/** Old saves get one conservative baseline; later care and TP resets never move it. */
export function energyRecoveryBaseline(dog: Dog, separateClock = true): number {
  const checkpoint = Date.parse(dog.last_energy_regeneration || '');
  if (separateClock && Number.isFinite(checkpoint)) return checkpoint;
  const timestamps = [dog.last_played, dog.last_training_reset, dog.last_fed, dog.created_at]
    .map(value => Date.parse(value)).filter(Number.isFinite);
  return timestamps.length ? Math.max(...timestamps) : NaN;
}

export function shouldRegenerateEnergy(dog: Dog, now = Date.now()): boolean {
  return !dog.is_dead && dog.energy_stat < 100 && now - energyRecoveryBaseline(dog) >= REGEN_CHECK_INTERVAL_HOURS * 3600000;
}

/** Never bank time spent at full energy for an activity performed much later. */
export function energyActivityCheckpoint(dog: Dog, energy: number, now = Date.now(), separateClock = true): Partial<Dog> {
  if (energy === dog.energy_stat || (energy < 100 && dog.energy_stat < 100)) return {};
  return separateClock ? { last_energy_regeneration: new Date(now).toISOString() } : { last_played: new Date(now).toISOString() };
}

/**
 * Calculate energy regeneration rate based on care quality and kennel level
 */
export function calculateEnergyRegenRate(dog: Dog, kennelLevel: number = 1): number {
  let regenRate = BASE_REGEN_PER_HOUR;

  // Care quality multiplier (0.5x to 1.5x)
  const hungerFactor = dog.hunger / 100;
  const happinessFactor = dog.happiness / 100;
  const healthFactor = dog.health / 100;

  // Average care quality
  const careQuality = (hungerFactor + happinessFactor + healthFactor) / 3;

  // Well-cared dogs (80%+ average) get bonus regen
  if (careQuality >= 0.8) {
    regenRate *= 1.5; // 50% bonus
  }
  // Poor care (below 40% average) slows regen
  else if (careQuality < 0.4) {
    regenRate *= 0.5; // 50% penalty
  }
  // Normal care (40-80%) gets standard rate
  else {
    regenRate *= (0.5 + careQuality); // Scale between 0.5x and 1.3x
  }

  // Low energy bonus (tired dogs rest more deeply)
  if (dog.energy_stat < LOW_ENERGY_THRESHOLD) {
    regenRate += LOW_ENERGY_BONUS;
  }

  // Sick/injured dogs recover slower
  if (dog.current_ailment || dog.recovering_from) {
    regenRate *= 0.5; // 50% slower when sick/injured
  }

  // Add kennel level bonus
  const kennelBonus = getEnergyRegenBonus(kennelLevel);
  regenRate += kennelBonus;

  return Math.round(regenRate);
}

/**
 * Regenerate energy for a dog
 */
export function regenerateEnergy(dog: Dog, kennelLevel = 1, now = Date.now(), separateClock = true): Partial<Dog> {
  if (dog.is_dead || !Number.isFinite(now)) return {};
  const baseline = energyRecoveryBaseline(dog, separateClock);
  const stamp = (time: number): Partial<Dog> => separateClock
    ? { last_energy_regeneration: new Date(time).toISOString() }
    : { last_played: new Date(time).toISOString() };
  // A missing clock starts now rather than granting unbounded recovery. A future
  // checkpoint is left alone until wall time catches up, avoiding clock-rollback grants.
  if (!Number.isFinite(baseline)) return stamp(now);
  if (baseline > now) return {};
  if (dog.energy_stat >= 100) return separateClock && !dog.last_energy_regeneration ? stamp(now) : {};
  const hours = Math.floor((now - baseline) / 3600000);
  if (hours < REGEN_CHECK_INTERVAL_HOURS) return separateClock && !dog.last_energy_regeneration ? stamp(baseline) : {};
  let energy = dog.energy_stat;
  // At least one point recovers each hour under the existing rates. Capping at
  // 100 iterations keeps long absences bounded without losing possible recovery.
  for (let i = 0; i < Math.min(hours, 100) && energy < 100; i++) {
    energy = Math.min(100, energy + calculateEnergyRegenRate({ ...dog, energy_stat: energy }, kennelLevel));
  }
  const checkpoint = energy >= 100 ? now : baseline + hours * 3600000;
  return { energy_stat: energy, ...stamp(checkpoint) };
}

/**
 * Get energy regeneration info for display
 */
export function getEnergyRegenInfo(dog: Dog, kennelLevel: number = 1): {
  isRegenerating: boolean;
  regenRate: number;
  hoursToFull: number;
  careBonus: boolean;
  lowEnergyBonus: boolean;
  ailmentPenalty: boolean;
  kennelBonus: number;
} {
  const regenRate = calculateEnergyRegenRate(dog, kennelLevel);
  const energyNeeded = 100 - dog.energy_stat;
  const hoursToFull = regenRate > 0 ? Math.ceil(energyNeeded / regenRate) : 999;

  // Care quality check
  const careQuality = (dog.hunger + dog.happiness + dog.health) / 300;
  const careBonus = careQuality >= 0.8;

  const lowEnergyBonus = dog.energy_stat < LOW_ENERGY_THRESHOLD;
  const ailmentPenalty = !!(dog.current_ailment || dog.recovering_from);
  const kennelBonus = getEnergyRegenBonus(kennelLevel);

  return {
    isRegenerating: dog.energy_stat < 100,
    regenRate,
    hoursToFull,
    careBonus,
    lowEnergyBonus,
    ailmentPenalty,
    kennelBonus,
  };
}
