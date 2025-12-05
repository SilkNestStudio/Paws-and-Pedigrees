/**
 * Hunger & Thirst Decay System
 *
 * Dogs' hunger and thirst decay from 100% to 0% over 96 hours (4 days)
 * Low levels cause happiness and energy penalties
 *
 * This is intentionally SLOWER than the dog aging system to give players
 * time to care for their dogs without constant micromanagement.
 */

import { Dog } from '../types';

// Decay rate: 100% over 96 hours (4 days) = ~1.04% per hour
const DECAY_RATE_PER_HOUR = 100 / 96;

// Penalty thresholds
const SEVERE_THRESHOLD = 20; // Below 20% = severe penalty
const MODERATE_THRESHOLD = 50; // Below 50% = moderate penalty

// Penalty amounts
const SEVERE_HAPPINESS_PENALTY = 30;
const MODERATE_HAPPINESS_PENALTY = 15;
const SEVERE_ENERGY_PENALTY = 40;
const MODERATE_ENERGY_PENALTY = 20;

/**
 * Calculate hours since a timestamp
 */
function getHoursSince(timestamp: string | Date): number {
  const then = new Date(timestamp).getTime();
  const now = Date.now();
  return (now - then) / (60 * 60 * 1000);
}

/**
 * Calculate current hunger based on last fed time
 */
export function calculateHunger(lastFed: string | Date): number {
  const hoursSince = getHoursSince(lastFed);
  const decay = hoursSince * DECAY_RATE_PER_HOUR;
  return Math.max(0, Math.min(100, 100 - decay));
}

/**
 * Calculate current thirst based on last watered time
 */
export function calculateThirst(lastWatered: string | Date): number {
  const hoursSince = getHoursSince(lastWatered);
  const decay = hoursSince * DECAY_RATE_PER_HOUR;
  return Math.max(0, Math.min(100, 100 - decay));
}

/**
 * Calculate happiness penalty based on hunger and thirst
 */
export function calculateHappinessPenalty(hunger: number, thirst: number): number {
  let penalty = 0;

  // Hunger penalties
  if (hunger <= SEVERE_THRESHOLD) {
    penalty += SEVERE_HAPPINESS_PENALTY;
  } else if (hunger <= MODERATE_THRESHOLD) {
    penalty += MODERATE_HAPPINESS_PENALTY;
  }

  // Thirst penalties
  if (thirst <= SEVERE_THRESHOLD) {
    penalty += SEVERE_HAPPINESS_PENALTY;
  } else if (thirst <= MODERATE_THRESHOLD) {
    penalty += MODERATE_HAPPINESS_PENALTY;
  }

  return penalty;
}

/**
 * Calculate energy penalty based on hunger and thirst
 */
export function calculateEnergyPenalty(hunger: number, thirst: number): number {
  let penalty = 0;

  // Hunger penalties
  if (hunger <= SEVERE_THRESHOLD) {
    penalty += SEVERE_ENERGY_PENALTY;
  } else if (hunger <= MODERATE_THRESHOLD) {
    penalty += MODERATE_ENERGY_PENALTY;
  }

  // Thirst penalties (more severe for energy)
  if (thirst <= SEVERE_THRESHOLD) {
    penalty += SEVERE_ENERGY_PENALTY;
  } else if (thirst <= MODERATE_THRESHOLD) {
    penalty += MODERATE_ENERGY_PENALTY;
  }

  return penalty;
}

/**
 * Apply hunger/thirst decay and penalties to a dog
 * Returns updated hunger, thirst, happiness, and energy values
 */
export function applyHungerThirstDecay(dog: Dog): Partial<Dog> {
  // Calculate current hunger and thirst
  const currentHunger = calculateHunger(dog.last_fed);
  const currentThirst = calculateThirst(dog.last_watered || dog.last_fed); // Fallback to last_fed if no last_watered

  // Calculate penalties
  const happinessPenalty = calculateHappinessPenalty(currentHunger, currentThirst);
  const energyPenalty = calculateEnergyPenalty(currentHunger, currentThirst);

  // Apply penalties (can't go below 0)
  const baseHappiness = 100; // Assume base happiness (this could be more complex)
  const baseEnergy = 100; // Assume base energy

  const newHappiness = Math.max(0, Math.min(100, baseHappiness - happinessPenalty));
  const newEnergy = Math.max(0, Math.min(100, baseEnergy - energyPenalty));

  return {
    hunger: currentHunger,
    thirst: currentThirst,
    happiness: newHappiness,
    energy_stat: newEnergy,
  };
}

/**
 * Get status message for hunger/thirst levels
 */
export function getHungerThirstStatus(hunger: number, thirst: number): {
  status: 'good' | 'warning' | 'critical';
  message?: string;
} {
  if (hunger <= SEVERE_THRESHOLD || thirst <= SEVERE_THRESHOLD) {
    return {
      status: 'critical',
      message: hunger <= thirst
        ? '🍖 CRITICAL: Your dog is starving!'
        : '💧 CRITICAL: Your dog is severely dehydrated!',
    };
  }

  if (hunger <= MODERATE_THRESHOLD || thirst <= MODERATE_THRESHOLD) {
    return {
      status: 'warning',
      message: hunger <= thirst
        ? '🍖 Your dog is getting hungry'
        : '💧 Your dog needs water',
    };
  }

  return { status: 'good' };
}
