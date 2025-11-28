/**
 * Health Decay System
 *
 * Dogs lose health when not fed/watered daily
 * Progressive consequences for neglect
 */

import { Dog } from '../types';

// Health decay constants
const HOURS_PER_DAY = 24;
const HEALTH_DECAY_PER_DAY = 10; // 10% health lost per day without care
const CRITICAL_HEALTH = 10; // Below this requires vet
const EMERGENCY_HEALTH = 5; // Below this requires emergency vet
const DEATH_HEALTH = 0; // Dog dies

// Time thresholds
const DAYS_AT_CRITICAL_BEFORE_EMERGENCY = 3; // 3 days at 10% = emergency
const DAYS_AT_EMERGENCY_BEFORE_DEATH = 7; // 7 days at 5% = death

// Vet costs
export const VET_COST = 500; // Medium cost for regular vet
export const EMERGENCY_VET_COST = 2000; // High cost for emergency vet
export const REVIVAL_GEM_COST = 100; // Gem cost to revive dead dog

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
  const now = Date.now();
  const hoursSince = (now - lastFed) / (60 * 60 * 1000);
  return Math.floor(hoursSince / HOURS_PER_DAY);
}

/**
 * Calculate current health based on care history
 */
export function calculateHealthDecay(dog: Dog): number {
  const daysSinceLastCare = getDaysSinceLastCare(dog);

  if (daysSinceLastCare === 0) {
    return dog.health; // No decay if cared for today
  }

  // Lose 10% health per day
  const healthLoss = daysSinceLastCare * HEALTH_DECAY_PER_DAY;
  const newHealth = Math.max(0, dog.health - healthLoss);

  return newHealth;
}

/**
 * Get health status and required actions
 */
export function getHealthStatus(dog: Dog): HealthStatus {
  const currentHealth = calculateHealthDecay(dog);
  const daysSinceLastCare = getDaysSinceLastCare(dog);

  // Dead
  if (currentHealth <= DEATH_HEALTH) {
    const daysAtEmergency = Math.max(0, daysSinceLastCare - 10); // Days after reaching 5%
    return {
      status: 'dead',
      needsVet: false,
      needsEmergencyVet: false,
      isDead: true,
      canRevive: daysAtEmergency <= DAYS_AT_EMERGENCY_BEFORE_DEATH,
      daysWithoutCare: daysSinceLastCare,
      healthPercentage: 0,
      warningMessage: 'Your dog has died from neglect. Use gems to revive or adopt a new dog.',
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
      warningMessage: `CRITICAL! Your dog needs vet care (${VET_COST} cash) immediately!`,
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
export function visitVet(dog: Dog): Partial<Dog> {
  return {
    health: 100,
    last_fed: new Date().toISOString(), // Reset care timer
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
