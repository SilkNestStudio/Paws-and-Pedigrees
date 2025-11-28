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

/**
 * Check if energy should regenerate
 */
export function shouldRegenerateEnergy(dog: Dog): boolean {
  // Don't regenerate if already at max
  if (dog.energy_stat >= 100) return false;

  // Check if it's been at least 1 hour since last check
  const lastActivity = dog.last_played ? new Date(dog.last_played).getTime() : 0;
  const lastTraining = dog.last_training_reset ? new Date(dog.last_training_reset).getTime() : 0;
  const lastFed = dog.last_fed ? new Date(dog.last_fed).getTime() : 0;

  // Use the most recent timestamp as baseline
  const lastUpdate = Math.max(lastActivity, lastTraining, lastFed);
  const now = Date.now();
  const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);

  return hoursSinceUpdate >= REGEN_CHECK_INTERVAL_HOURS;
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
export function regenerateEnergy(dog: Dog, kennelLevel: number = 1): Partial<Dog> {
  if (!shouldRegenerateEnergy(dog)) {
    return {};
  }

  // Calculate how many hours have passed
  const lastActivity = dog.last_played ? new Date(dog.last_played).getTime() : 0;
  const lastTraining = dog.last_training_reset ? new Date(dog.last_training_reset).getTime() : 0;
  const lastFed = dog.last_fed ? new Date(dog.last_fed).getTime() : 0;

  const lastUpdate = Math.max(lastActivity, lastTraining, lastFed, new Date(dog.created_at).getTime());
  const now = Date.now();
  const hoursPassed = (now - lastUpdate) / (1000 * 60 * 60);

  // Calculate total regeneration with kennel bonus
  const regenRate = calculateEnergyRegenRate(dog, kennelLevel);
  const totalRegen = Math.floor(hoursPassed * regenRate);

  // Apply regeneration (cap at 100)
  const newEnergy = Math.min(100, dog.energy_stat + totalRegen);

  // Only update if there's actual change
  if (newEnergy === dog.energy_stat) {
    return {};
  }

  return {
    energy_stat: newEnergy,
    // Update last_played timestamp to track last regen check
    last_played: new Date().toISOString(),
  };
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
