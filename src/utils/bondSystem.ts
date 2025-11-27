import { Dog } from '../types';

/**
 * Check if a dog should level up their bond and return updated stats
 */
export function checkBondLevelUp(dog: Dog): Partial<Dog> | null {
  if (dog.bond_xp >= 100 && dog.bond_level < 10) {
    return {
      bond_level: dog.bond_level + 1,
      bond_xp: dog.bond_xp - 100, // Carry over excess XP
    };
  }
  return null;
}

/**
 * Calculate training bonus for rescue dogs based on bond level
 * Rescue dogs become BETTER than purchased dogs at high bond levels!
 */
export function getRescueDogTrainingBonus(dog: Dog): number {
  if (!dog.is_rescue) return 0;

  // Rescue dogs get increasing bonuses as bond grows
  // Bond 0-2: No bonus (they're still adjusting)
  // Bond 3-5: +5-15% bonus (starting to trust)
  // Bond 6-8: +20-40% bonus (strong bond forming)
  // Bond 9-10: +50-75% bonus (unbreakable bond - BETTER than purchased!)

  if (dog.bond_level <= 2) return 0;
  if (dog.bond_level <= 5) return (dog.bond_level - 2) * 0.05; // 5%, 10%, 15%
  if (dog.bond_level <= 8) return 0.15 + (dog.bond_level - 5) * 0.1; // 25%, 35%, 45%

  // Bond 9-10: Huge bonuses!
  return dog.bond_level === 9 ? 0.5 : 0.75; // 50% or 75%!
}

/**
 * Get a description of the rescue dog bonus for display
 */
export function getRescueDogBonusDescription(dog: Dog): string | null {
  if (!dog.is_rescue) return null;

  const bonus = getRescueDogTrainingBonus(dog);
  if (bonus === 0) return null;

  const percentage = Math.round(bonus * 100);

  if (dog.bond_level <= 5) {
    return `🏠 Rescue Bond: +${percentage}% training (Growing trust!)`;
  } else if (dog.bond_level <= 8) {
    return `🏠 Rescue Bond: +${percentage}% training (Strong bond!)`;
  } else {
    return `🏠 Rescue Bond: +${percentage}% training (Unbreakable!)`;
  }
}

/**
 * Calculate competition bonus from bond (applies to all dogs)
 */
export function getBondCompetitionBonus(bondLevel: number): number {
  return (bondLevel / 10) * 0.1; // Up to 10% at max bond
}
