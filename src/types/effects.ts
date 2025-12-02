// Effect type definitions for items, shop purchases, and other game effects

export interface ItemEffect {
  energy?: number;          // Energy stat change (for dog)
  happiness?: number;       // Happiness change
  health?: number;          // Health change
  hunger?: number;          // Hunger change (positive or negative)
  thirst?: number;          // Thirst/water change
  bond_xp?: number;         // Bond experience points
  training_boost?: number;  // Training multiplier (e.g., 1.5 = +50% training)
  duration?: number;        // Duration in minutes for temporary effects
}

export interface ShopItemEffect {
  hunger?: number;
  thirst?: number;
  happiness?: number;
  health?: number;
  energy_stat?: number;
  training_points?: number;
  food_storage?: number;    // Adds to user's food storage
}

export interface TrainingEffect {
  statGain: number;         // Amount of stat increase
  tpCost: number;           // Training points cost
  energyCost: number;       // Energy cost
  bondXpGain: number;       // Bond XP gained
}

export interface CompetitionEffect {
  scoreModifier: number;    // Score bonus/penalty
  confidenceBoost: number;  // Confidence modifier
  stressReduction: number;  // Stress resistance
}

// Color genes structure (for breeds)
export interface ColorGenes {
  primaryColors: string[];   // Possible primary coat colors
  secondaryColors?: string[]; // Possible secondary colors
  patterns: string[];         // Possible coat patterns
  rarities?: Record<string, 'common' | 'uncommon' | 'rare'>; // Color rarity
}
