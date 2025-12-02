import { Dog } from '../types';

/**
 * Get XP required for next bond level
 * Increases progressively to make higher bonds take much longer
 */
export function getXPForNextBondLevel(currentLevel: number): number {
  const xpRequirements: Record<number, number> = {
    0: 100,   // Level 1: 100 XP (easy start)
    1: 150,   // Level 2: 150 XP
    2: 200,   // Level 3: 200 XP
    3: 300,   // Level 4: 300 XP
    4: 400,   // Level 5: 400 XP
    5: 500,   // Level 6: 500 XP
    6: 750,   // Level 7: 750 XP
    7: 1000,  // Level 8: 1000 XP
    8: 1500,  // Level 9: 1500 XP
    9: 2000,  // Level 10: 2000 XP (max bond is special)
  };

  return xpRequirements[currentLevel] || 2000;
}

/**
 * Check if a dog should level up their bond and return updated stats
 */
export function checkBondLevelUp(dog: Dog): Partial<Dog> | null {
  const xpNeeded = getXPForNextBondLevel(dog.bond_level);

  if (dog.bond_xp >= xpNeeded && dog.bond_level < 10) {
    return {
      bond_level: dog.bond_level + 1,
      bond_xp: dog.bond_xp - xpNeeded, // Carry over excess XP
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

/**
 * Calculate bond XP gain with rescue dog bonus
 * Rescue dogs bond 50% faster! (1.5x multiplier)
 */
export function calculateBondXpGain(baseXp: number, isRescue: boolean): number {
  return isRescue ? Math.ceil(baseXp * 1.5) : baseXp;
}
