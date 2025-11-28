/**
 * Kennel Capacity System
 *
 * Determines how many dogs a player can have based on their kennel level
 */

export interface KennelCapacityInfo {
  current: number;
  max: number;
  canAddMore: boolean;
  nextLevelCapacity: number | null;
}

/**
 * Get maximum kennel capacity for a given kennel level
 */
export function getKennelCapacity(kennelLevel: number): number {
  const capacityByLevel: Record<number, number> = {
    1: 2,   // Level 1: 2 dogs max
    2: 4,   // Level 2: 4 dogs
    3: 6,   // Level 3: 6 dogs
    4: 8,   // Level 4: 8 dogs
    5: 12,  // Level 5: 12 dogs
    6: 16,  // Level 6: 16 dogs
    7: 20,  // Level 7: 20 dogs
    8: 25,  // Level 8: 25 dogs
    9: 30,  // Level 9: 30 dogs
    10: 40, // Level 10: 40 dogs (max)
  };

  return capacityByLevel[kennelLevel] || 2; // Default to 2 if invalid level
}

/**
 * Check if kennel has room for more dogs
 */
export function canAddDog(currentDogCount: number, kennelLevel: number): boolean {
  const maxCapacity = getKennelCapacity(kennelLevel);
  return currentDogCount < maxCapacity;
}

/**
 * Get kennel capacity info for UI display
 */
export function getKennelCapacityInfo(currentDogCount: number, kennelLevel: number): KennelCapacityInfo {
  const maxCapacity = getKennelCapacity(kennelLevel);
  const nextLevelCapacity = kennelLevel < 10 ? getKennelCapacity(kennelLevel + 1) : null;

  return {
    current: currentDogCount,
    max: maxCapacity,
    canAddMore: currentDogCount < maxCapacity,
    nextLevelCapacity,
  };
}

/**
 * Get kennel upgrade cost (for future feature)
 */
export function getKennelUpgradeCost(currentLevel: number): number {
  const costs: Record<number, number> = {
    1: 500,
    2: 1000,
    3: 2000,
    4: 4000,
    5: 8000,
    6: 15000,
    7: 25000,
    8: 40000,
    9: 60000,
  };

  return costs[currentLevel] || 0;
}
