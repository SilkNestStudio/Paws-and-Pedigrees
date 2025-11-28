/**
 * Care System Calculations
 *
 * Handles food and water consumption based on dog size,
 * energy restoration, and care requirements.
 */

import { Dog } from '../types';
import { getSizeCategory } from '../data/sizeCompatibility';

/**
 * Food storage constants
 */
export const FOOD_STORAGE = {
  MAX_CAPACITY: 100, // Maximum units of food that can be stored
  SMALL_BAG: 12.5,   // 8 small bags = 100 units
  MEDIUM_BAG: 25,    // 4 medium bags = 100 units
  LARGE_BAG: 50,     // 2 large bags = 100 units
} as const;

/**
 * Care stat decline rates (per hour)
 */
export const CARE_DECLINE_RATES = {
  HUNGER: 2,   // Hunger decreases by 2% per hour
  THIRST: 3,   // Thirst decreases by 3% per hour (faster than hunger)
  ENERGY: 1.5, // Energy decreases by 1.5% per hour when active
  HAPPINESS: 1, // Happiness decreases by 1% per hour without interaction
} as const;

/**
 * Energy thresholds for activities
 */
export const ENERGY_THRESHOLDS = {
  MIN_FOR_TRAINING: 30,    // Need at least 30% energy to train
  MIN_FOR_COMPETITION: 40,  // Need at least 40% energy to compete
  MIN_FOR_BREEDING: 50,     // Need at least 50% energy to breed
} as const;

/**
 * Calculate food consumption based on dog size
 * Larger dogs eat more per feeding
 */
export function calculateFoodConsumption(dogSize: number): number {
  const sizeCategory = getSizeCategory(dogSize);

  switch (sizeCategory) {
    case 'toy':
      return 2; // 2 units per feeding (50 feedings from full storage)
    case 'small':
      return 3; // 3 units per feeding (33 feedings from full storage)
    case 'medium':
      return 5; // 5 units per feeding (20 feedings from full storage)
    case 'large':
      return 7; // 7 units per feeding (14 feedings from full storage)
    case 'giant':
      return 10; // 10 units per feeding (10 feedings from full storage)
    default:
      return 5; // Default to medium
  }
}

/**
 * Calculate water consumption based on dog size
 * Larger dogs drink more water (same scaling as food)
 */
export function calculateWaterConsumption(dogSize: number): number {
  // Water consumption follows same pattern as food
  return calculateFoodConsumption(dogSize);
}

/**
 * Calculate hunger restoration from feeding
 * Varies by dog size - smaller dogs get more full from each feeding
 */
export function calculateHungerRestoration(dogSize: number): number {
  const sizeCategory = getSizeCategory(dogSize);

  switch (sizeCategory) {
    case 'toy':
      return 50; // Tiny dogs get very full
    case 'small':
      return 45;
    case 'medium':
      return 40;
    case 'large':
      return 35;
    case 'giant':
      return 30; // Giant dogs need more food to get full
    default:
      return 40;
  }
}

/**
 * Calculate thirst restoration from watering
 * Same scaling as hunger
 */
export function calculateThirstRestoration(dogSize: number): number {
  return calculateHungerRestoration(dogSize);
}

/**
 * Calculate energy restoration from eating
 * Food provides energy boost
 */
export function calculateEnergyFromEating(dogSize: number): number {
  // Eating restores 15-25 energy depending on size
  const sizeCategory = getSizeCategory(dogSize);

  switch (sizeCategory) {
    case 'toy':
      return 25;
    case 'small':
      return 22;
    case 'medium':
      return 20;
    case 'large':
      return 18;
    case 'giant':
      return 15;
    default:
      return 20;
  }
}

/**
 * Calculate energy restoration from resting
 * Resting is the primary way to restore energy
 */
export function calculateEnergyFromResting(): number {
  return 30; // Resting restores 30 energy (more than eating)
}

/**
 * Check if dog has enough energy for an activity
 */
export function hasEnoughEnergy(
  dog: Dog,
  activityType: 'training' | 'competition' | 'breeding'
): { allowed: boolean; message?: string } {
  let threshold: number;
  let activityName: string;

  switch (activityType) {
    case 'training':
      threshold = ENERGY_THRESHOLDS.MIN_FOR_TRAINING;
      activityName = 'train';
      break;
    case 'competition':
      threshold = ENERGY_THRESHOLDS.MIN_FOR_COMPETITION;
      activityName = 'compete';
      break;
    case 'breeding':
      threshold = ENERGY_THRESHOLDS.MIN_FOR_BREEDING;
      activityName = 'breed';
      break;
  }

  if (dog.energy_stat < threshold) {
    return {
      allowed: false,
      message: `${dog.name} is too tired to ${activityName} (needs ${threshold}% energy, has ${dog.energy_stat}%). Feed or rest your dog first!`,
    };
  }

  return { allowed: true };
}

/**
 * Check if dog needs urgent care
 */
export function getUrgentCareNeeds(dog: Dog): string[] {
  const needs: string[] = [];

  if (dog.hunger < 20) {
    needs.push('Starving! Feed immediately!');
  }
  if (dog.thirst < 20) {
    needs.push('Dehydrated! Water immediately!');
  }
  if (dog.energy_stat < 15) {
    needs.push('Exhausted! Let them rest!');
  }
  if (dog.health < 30) {
    needs.push('Sick! Use medicine!');
  }
  if (dog.happiness < 20) {
    needs.push('Miserable! Play with them!');
  }

  return needs;
}

/**
 * Check if feeding/watering is needed
 */
export function needsCare(dog: Dog): {
  needsFood: boolean;
  needsWater: boolean;
  needsRest: boolean;
  needsPlay: boolean;
} {
  return {
    needsFood: dog.hunger < 60,
    needsWater: dog.thirst < 60,
    needsRest: dog.energy_stat < 40,
    needsPlay: dog.happiness < 50,
  };
}

/**
 * Calculate care quality score (0-100)
 * Used for determining bond XP gains and dog performance
 */
export function calculateCareQuality(dog: Dog): number {
  const weights = {
    hunger: 0.25,
    thirst: 0.25,
    energy: 0.2,
    health: 0.2,
    happiness: 0.1,
  };

  return Math.round(
    dog.hunger * weights.hunger +
    dog.thirst * weights.thirst +
    dog.energy_stat * weights.energy +
    dog.health * weights.health +
    dog.happiness * weights.happiness
  );
}

/**
 * Get size category display name
 */
export function getSizeCategoryName(dogSize: number): string {
  const category = getSizeCategory(dogSize);

  switch (category) {
    case 'toy':
      return 'Toy';
    case 'small':
      return 'Small';
    case 'medium':
      return 'Medium';
    case 'large':
      return 'Large';
    case 'giant':
      return 'Giant';
    default:
      return 'Medium';
  }
}
