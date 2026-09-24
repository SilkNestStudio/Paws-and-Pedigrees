/**
 * Health Decay System
 *
 * Dogs lose health when not fed/watered daily
 * Progressive consequences for neglect
 */

import { Dog } from '../types';

// Health decay constants
const HOURS_PER_DAY = 24;
const HEALTH_DECAY_PER_DAY = 15;
const CARE_GRACE_DAYS = 2;
const CRITICAL_HEALTH = 40; // Stop strenuous activity until assessed
const EMERGENCY_HEALTH = 5; // Below this requires emergency vet

// Vet costs
export const VET_COST = 0; // Community recovery is always accessible
export const EMERGENCY_VET_COST = 2000; // High cost for emergency vet
export const REVIVAL_GEM_COST = 0; // Compatibility recovery for legacy neglect deaths

// Stat loss from emergency vet
export const EMERGENCY_STAT_LOSS = 5; // Points lost from all stats

export interface HealthStatus {
  status: 'healthy' | 'declining' | 'critical' | 'emergency' | 'dead';
  needsVet: boolean;
  needsEmergencyVet: boolean;
  isDead: boolean;
  canRevive: boolean;
  daysWithoutCare: number;
  healthPercentage: number;
  warningMessage?: string;
}

/**
 * Calculate how many days since last fed/watered
 */
function getDaysSinceLastCare(dog: Dog): number {
  const lastFed = new Date(dog.last_fed).getTime();
  const lastWatered = new Date(dog.last_watered || dog.last_fed).getTime();
  const now = Date.now();
  const lastCare = Math.min(lastFed, lastWatered);
  const hoursSince = (now - (Number.isFinite(lastCare) ? lastCare : now)) / (60 * 60 * 1000);
  return Math.max(0, Math.floor(hoursSince / HOURS_PER_DAY));
}

/**
 * Calculate current health based on care history
 */
export function calculateHealthDecay(dog: Dog): number {
  if (dog.is_dead) return dog.health;
  const daysSinceLastCare = getDaysSinceLastCare(dog);

  if (daysSinceLastCare === 0) {
    return Math.max(10, dog.health);
  }

  // Lose 10% health per day from base of 100
  // Use min of stored health and decay-calculated health to prevent:
  // 1. Compounding decay (the original bug)
  // 2. Accidentally increasing health if it was lowered by illness
  const healthLoss = Math.max(0, daysSinceLastCare - CARE_GRACE_DAYS) * HEALTH_DECAY_PER_DAY;
  const decayedHealth = 100 - healthLoss;
  const newHealth = Math.max(10, Math.min(dog.health, decayedHealth));

  return newHealth;
}

/**
 * Get health status and required actions
 */
export function getHealthStatus(dog: Dog): HealthStatus {
  const currentHealth = calculateHealthDecay(dog);
  const daysSinceLastCare = getDaysSinceLastCare(dog);

  // Dead
  if (dog.is_dead) {
    return {
      status: 'dead',
      needsVet: false,
      needsEmergencyVet: false,
      isDead: true,
      canRevive: dog.death_cause !== 'old_age',
      daysWithoutCare: daysSinceLastCare,
      healthPercentage: 0,
      warningMessage: dog.death_cause === 'old_age' ? 'Remembered as part of your kennel’s history.' : 'This dog was affected by the previous health rules. Free recovery is available.',
    };
  }

  // Emergency (5% health)
  if (currentHealth <= EMERGENCY_HEALTH) {
    return {
      status: 'emergency',
      needsVet: false,
      needsEmergencyVet: true,
      isDead: false,
      canRevive: false,
      daysWithoutCare: daysSinceLastCare,
      healthPercentage: currentHealth,
      warningMessage: `EMERGENCY! Your dog needs immediate emergency vet care (${EMERGENCY_VET_COST} cash). Stats will be reduced.`,
    };
  }

  // Critical (10% health)
  if (currentHealth <= CRITICAL_HEALTH) {
    return {
      status: 'critical',
      needsVet: true,
      needsEmergencyVet: false,
      isDead: false,
      canRevive: false,
      daysWithoutCare: daysSinceLastCare,
      healthPercentage: currentHealth,
      warningMessage: 'Your dog needs a checkup before strenuous activity. Community care is free, followed by 24 hours of recovery.',
    };
  }

  // Declining
  if (currentHealth < 100) {
    return {
      status: 'declining',
      needsVet: false,
      needsEmergencyVet: false,
      isDead: false,
      canRevive: false,
      daysWithoutCare: daysSinceLastCare,
      healthPercentage: currentHealth,
      warningMessage: `Your dog's health is declining. Feed and water them daily!`,
    };
  }

  // Healthy
  return {
    status: 'healthy',
    needsVet: false,
    needsEmergencyVet: false,
    isDead: false,
    canRevive: false,
    daysWithoutCare: 0,
    healthPercentage: 100,
  };
}

/**
 * Visit vet to restore health
 */
export function visitVet(dog?: Dog): Partial<Dog> {
  const now = new Date().toISOString();
  return {
    health: 80,
    hunger: 100,
    thirst: 100,
    last_fed: now,
    last_watered: now,
    recovering_from: dog?.current_ailment || dog?.recovering_from || 'care_recovery',
    recovery_due: new Date(Math.max(Date.now() + 24 * 60 * 60 * 1000, Date.parse(dog?.recovery_due || '') || 0)).toISOString(),
    // A small, recoverable loss of conditioning; inherited ability is untouched.
    ...(dog ? { speed_trained: Math.max(0, dog.speed_trained - 2), agility_trained: Math.max(0, dog.agility_trained - 2), strength_trained: Math.max(0, dog.strength_trained - 2), endurance_trained: Math.max(0, dog.endurance_trained - 2) } : {}),
  };
}

/**
 * Visit emergency vet (restores health but reduces stats)
 */
export function visitEmergencyVet(dog: Dog): Partial<Dog> {
  return {
    health: 100,
    last_fed: new Date().toISOString(),
    // Reduce all trained stats
    speed_trained: Math.max(0, dog.speed_trained - EMERGENCY_STAT_LOSS),
    agility_trained: Math.max(0, dog.agility_trained - EMERGENCY_STAT_LOSS),
    strength_trained: Math.max(0, dog.strength_trained - EMERGENCY_STAT_LOSS),
    endurance_trained: Math.max(0, dog.endurance_trained - EMERGENCY_STAT_LOSS),
    obedience_trained: Math.max(0, dog.obedience_trained - EMERGENCY_STAT_LOSS),
  };
}

/**
 * Revive dead dog with gems
 */
export function reviveDog(dog: Dog): Partial<Dog> {
  return {
    health: 50, // Revive at 50% health
    last_fed: new Date().toISOString(),
    // Reduce stats significantly
    speed_trained: Math.max(0, dog.speed_trained - EMERGENCY_STAT_LOSS * 2),
    agility_trained: Math.max(0, dog.agility_trained - EMERGENCY_STAT_LOSS * 2),
    strength_trained: Math.max(0, dog.strength_trained - EMERGENCY_STAT_LOSS * 2),
    endurance_trained: Math.max(0, dog.endurance_trained - EMERGENCY_STAT_LOSS * 2),
    obedience_trained: Math.max(0, dog.obedience_trained - EMERGENCY_STAT_LOSS * 2),
  };
}

/**
 * Check if health needs to be updated
 */
export function shouldUpdateHealth(dog: Dog): boolean {
  const daysSinceLastCare = getDaysSinceLastCare(dog);
  return daysSinceLastCare > 0;
}
