/**
 * Kennel Upgrade System
 *
 * Complete upgrade system with progressive benefits
 * Each level unlocks capacity, bonuses, and features
 */

export interface KennelLevel {
  level: number;
  name: string;
  description: string;
  upgradeCost: number;

  // Capacity & Storage
  dogCapacity: number;
  foodStorageMax: number;

  // Passive Bonuses
  energyRegenBonus: number; // Additional energy per hour
  trainingEffectivenessBonus: number; // % bonus to stat gains
  ailmentRecoveryBonus: number; // % reduction in recovery time

  // Business Bonuses
  jobIncomeMultiplier: number; // % bonus to job earnings
  competitionPrizeBonus: number; // % bonus to competition winnings
  vetCostReduction: number; // % reduction in vet costs

  // Features Unlocked
  features: string[];

  // Visual
  backgroundImage: string; // Path to kennel background image
}

export const KENNEL_LEVELS: Record<number, KennelLevel> = {
  1: {
    level: 1,
    name: "Starter Kennel",
    description: "A humble beginning for your dog breeding journey",
    upgradeCost: 0, // Starting level
    dogCapacity: 2,
    foodStorageMax: 100,
    energyRegenBonus: 0,
    trainingEffectivenessBonus: 0,
    ailmentRecoveryBonus: 0,
    jobIncomeMultiplier: 1.0,
    competitionPrizeBonus: 0,
    vetCostReduction: 0,
    features: ["Basic care", "Manual feeding"],
    backgroundImage: "/assets/kennel/level1/background.jpg",
  },
  2: {
    level: 2,
    name: "Backyard Kennel",
    description: "Expanded space with basic improvements",
    upgradeCost: 500,
    dogCapacity: 4,
    foodStorageMax: 150,
    energyRegenBonus: 0.5,
    trainingEffectivenessBonus: 5,
    ailmentRecoveryBonus: 5,
    jobIncomeMultiplier: 1.05,
    competitionPrizeBonus: 5,
    vetCostReduction: 5,
    features: ["Basic care", "Improved kennels"],
    backgroundImage: "/assets/kennel/level2/background.jpg",
  },
  3: {
    level: 3,
    name: "Small Facility",
    description: "Professional-grade kennels with better amenities",
    upgradeCost: 1000,
    dogCapacity: 6,
    foodStorageMax: 200,
    energyRegenBonus: 1,
    trainingEffectivenessBonus: 8,
    ailmentRecoveryBonus: 10,
    jobIncomeMultiplier: 1.10,
    competitionPrizeBonus: 10,
    vetCostReduction: 10,
    features: ["Basic care", "Training yard", "Improved storage"],
    backgroundImage: "/assets/kennel/level3/background.jpg",
  },
  4: {
    level: 4,
    name: "Growing Operation",
    description: "Multiple kennels with dedicated training areas",
    upgradeCost: 2000,
    dogCapacity: 8,
    foodStorageMax: 250,
    energyRegenBonus: 1.5,
    trainingEffectivenessBonus: 12,
    ailmentRecoveryBonus: 15,
    jobIncomeMultiplier: 1.15,
    competitionPrizeBonus: 15,
    vetCostReduction: 12,
    features: ["Basic care", "Training yard", "Medical station"],
    backgroundImage: "/assets/kennel/level4/background.jpg",
  },
  5: {
    level: 5,
    name: "Professional Kennel",
    description: "Top-tier facilities with automated systems",
    upgradeCost: 4000,
    dogCapacity: 12,
    foodStorageMax: 300,
    energyRegenBonus: 2,
    trainingEffectivenessBonus: 15,
    ailmentRecoveryBonus: 20,
    jobIncomeMultiplier: 1.20,
    competitionPrizeBonus: 20,
    vetCostReduction: 15,
    features: ["Auto-feed system", "Training yard", "Medical station", "Climate control"],
    backgroundImage: "/assets/kennel/level5/background.jpg",
  },
  6: {
    level: 6,
    name: "Champion's Estate",
    description: "Luxurious facility for breeding champions",
    upgradeCost: 8000,
    dogCapacity: 16,
    foodStorageMax: 350,
    energyRegenBonus: 2.5,
    trainingEffectivenessBonus: 18,
    ailmentRecoveryBonus: 22,
    jobIncomeMultiplier: 1.25,
    competitionPrizeBonus: 25,
    vetCostReduction: 18,
    features: ["Auto-feed system", "Trophy room", "Advanced training", "Medical wing", "Breeding records"],
    backgroundImage: "/assets/kennel/level6/background.jpg",
  },
  7: {
    level: 7,
    name: "Elite Breeding Center",
    description: "State-of-the-art breeding and training complex",
    upgradeCost: 15000,
    dogCapacity: 20,
    foodStorageMax: 400,
    energyRegenBonus: 3,
    trainingEffectivenessBonus: 22,
    ailmentRecoveryBonus: 25,
    jobIncomeMultiplier: 1.30,
    competitionPrizeBonus: 28,
    vetCostReduction: 20,
    features: ["Auto-feed system", "Trophy room", "Elite training", "Medical wing", "Lineage tracking", "Bulk training"],
    backgroundImage: "/assets/kennel/level7/background.jpg",
  },
  8: {
    level: 8,
    name: "Grand Championship Facility",
    description: "World-class facility with kennel assistants",
    upgradeCost: 25000,
    dogCapacity: 25,
    foodStorageMax: 450,
    energyRegenBonus: 3.5,
    trainingEffectivenessBonus: 25,
    ailmentRecoveryBonus: 28,
    jobIncomeMultiplier: 1.35,
    competitionPrizeBonus: 30,
    vetCostReduction: 22,
    features: ["Auto-feed system", "Trophy room", "Elite training", "Medical wing", "Lineage tracking", "Bulk training", "Kennel assistant", "Advanced genetics"],
    backgroundImage: "/assets/kennel/level8/background.jpg",
  },
  9: {
    level: 9,
    name: "Legendary Complex",
    description: "Premium facility rivaling the best in the world",
    upgradeCost: 40000,
    dogCapacity: 30,
    foodStorageMax: 500,
    energyRegenBonus: 4,
    trainingEffectivenessBonus: 28,
    ailmentRecoveryBonus: 30,
    jobIncomeMultiplier: 1.40,
    competitionPrizeBonus: 32,
    vetCostReduction: 25,
    features: ["Auto-feed system", "Trophy room", "Elite training", "Medical wing", "Lineage tracking", "Bulk training", "Kennel assistant", "Advanced genetics", "Breeding services"],
    backgroundImage: "/assets/kennel/level9/background.jpg",
  },
  10: {
    level: 10,
    name: "Ultimate Dynasty",
    description: "The pinnacle of dog breeding excellence",
    upgradeCost: 60000,
    dogCapacity: 40,
    foodStorageMax: 600,
    energyRegenBonus: 5,
    trainingEffectivenessBonus: 30,
    ailmentRecoveryBonus: 35,
    jobIncomeMultiplier: 1.50,
    competitionPrizeBonus: 35,
    vetCostReduction: 30,
    features: ["Auto-feed system", "Trophy room", "Elite training", "Medical wing", "Lineage tracking", "Bulk training", "Kennel assistant", "Advanced genetics", "Breeding services", "Hall of Fame"],
    backgroundImage: "/assets/kennel/level10/background.jpg",
  },
};

/**
 * Get kennel level info
 */
export function getKennelLevelInfo(level: number): KennelLevel {
  return KENNEL_LEVELS[level] || KENNEL_LEVELS[1];
}

/**
 * Get upgrade cost for next level
 */
export function getUpgradeCost(currentLevel: number): number {
  const nextLevel = currentLevel + 1;
  return KENNEL_LEVELS[nextLevel]?.upgradeCost || 0;
}

/**
 * Check if can upgrade kennel
 */
export function canUpgradeKennel(currentLevel: number, cash: number): {
  canUpgrade: boolean;
  reason?: string;
  cost?: number;
} {
  if (currentLevel >= 10) {
    return { canUpgrade: false, reason: "Already at maximum kennel level!" };
  }

  const cost = getUpgradeCost(currentLevel);
  if (cash < cost) {
    return {
      canUpgrade: false,
      reason: `Not enough cash! Need $${cost}, have $${cash}`,
      cost,
    };
  }

  return { canUpgrade: true, cost };
}

/**
 * Calculate training effectiveness with kennel bonus
 */
export function applyTrainingBonus(baseGain: number, kennelLevel: number): number {
  const levelInfo = getKennelLevelInfo(kennelLevel);
  const bonus = levelInfo.trainingEffectivenessBonus / 100;
  return Math.round(baseGain * (1 + bonus));
}

/**
 * Calculate job income with kennel bonus
 */
export function applyJobIncomeBonus(baseIncome: number, kennelLevel: number): number {
  const levelInfo = getKennelLevelInfo(kennelLevel);
  return Math.round(baseIncome * levelInfo.jobIncomeMultiplier);
}

/**
 * Calculate competition prize with kennel bonus
 */
export function applyCompetitionBonus(basePrize: number, kennelLevel: number): number {
  const levelInfo = getKennelLevelInfo(kennelLevel);
  const bonus = levelInfo.competitionPrizeBonus / 100;
  return Math.round(basePrize * (1 + bonus));
}

/**
 * Calculate vet cost with kennel reduction
 */
export function applyVetCostReduction(baseCost: number, kennelLevel: number): number {
  const levelInfo = getKennelLevelInfo(kennelLevel);
  const reduction = levelInfo.vetCostReduction / 100;
  return Math.round(baseCost * (1 - reduction));
}

/**
 * Calculate ailment recovery time with kennel bonus
 */
export function applyRecoveryBonus(baseHours: number, kennelLevel: number): number {
  const levelInfo = getKennelLevelInfo(kennelLevel);
  const reduction = levelInfo.ailmentRecoveryBonus / 100;
  return Math.round(baseHours * (1 - reduction));
}

/**
 * Get energy regen bonus from kennel
 */
export function getEnergyRegenBonus(kennelLevel: number): number {
  const levelInfo = getKennelLevelInfo(kennelLevel);
  return levelInfo.energyRegenBonus;
}

/**
 * Check if feature is unlocked at kennel level
 */
export function isFeatureUnlocked(feature: string, kennelLevel: number): boolean {
  const levelInfo = getKennelLevelInfo(kennelLevel);
  return levelInfo.features.includes(feature);
}

/**
 * Get all new features unlocked at a specific level
 */
export function getNewFeaturesAtLevel(level: number): string[] {
  if (level <= 1) return [];

  const currentFeatures = KENNEL_LEVELS[level]?.features || [];
  const previousFeatures = KENNEL_LEVELS[level - 1]?.features || [];

  return currentFeatures.filter(f => !previousFeatures.includes(f));
}

/**
 * Get kennel background image path
 */
export function getKennelBackground(kennelLevel: number): string {
  const levelInfo = getKennelLevelInfo(kennelLevel);
  return levelInfo.backgroundImage;
}

/**
 * Get food storage max for kennel level
 */
export function getFoodStorageMax(kennelLevel: number): number {
  const levelInfo = getKennelLevelInfo(kennelLevel);
  return levelInfo.foodStorageMax;
}
