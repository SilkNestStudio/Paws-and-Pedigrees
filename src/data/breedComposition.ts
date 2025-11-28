/**
 * Breed Composition Tracker
 *
 * Tracks breed percentages across multiple generations of breeding.
 * Determines whether dogs are purebred, first-generation crosses (F1),
 * multi-generation mixes, or recognized designer breeds.
 */

import { findDesignerBreed, DesignerBreed } from './designerBreeds';

/**
 * Represents a portion of a dog's breed makeup
 */
export interface BreedPortion {
  breedId: number;
  breedName: string;
  percentage: number; // 0-100
}

/**
 * Complete breed composition for a dog
 */
export interface BreedComposition {
  portions: BreedPortion[];
  isPurebred: boolean;
  isFirstGeneration: boolean; // F1 cross
  isDesignerBreed: boolean;
  designerBreedInfo?: DesignerBreed;
  displayName: string; // What to show as the breed name
  generation?: number; // F1, F2, F3, etc. (only for crosses)
}

/**
 * Create composition for a purebred dog
 */
export function createPurebredComposition(
  breedId: number,
  breedName: string
): BreedComposition {
  return {
    portions: [
      {
        breedId,
        breedName,
        percentage: 100,
      },
    ],
    isPurebred: true,
    isFirstGeneration: false,
    isDesignerBreed: false,
    displayName: breedName,
  };
}

/**
 * Calculate breed composition for a puppy based on parent compositions
 */
export function calculatePuppyComposition(
  sireComposition: BreedComposition,
  damComposition: BreedComposition,
  _sireBreedId: number,
  _damBreedId: number,
  _sireBreedName: string,
  _damBreedName: string
): BreedComposition {
  // Combine parent portions (each parent contributes 50%)
  const puppyPortions: Map<number, BreedPortion> = new Map();

  // Add sire's contributions (50% of sire's percentages)
  sireComposition.portions.forEach(portion => {
    const contribution = portion.percentage * 0.5;
    if (puppyPortions.has(portion.breedId)) {
      const existing = puppyPortions.get(portion.breedId)!;
      existing.percentage += contribution;
    } else {
      puppyPortions.set(portion.breedId, {
        breedId: portion.breedId,
        breedName: portion.breedName,
        percentage: contribution,
      });
    }
  });

  // Add dam's contributions (50% of dam's percentages)
  damComposition.portions.forEach(portion => {
    const contribution = portion.percentage * 0.5;
    if (puppyPortions.has(portion.breedId)) {
      const existing = puppyPortions.get(portion.breedId)!;
      existing.percentage += contribution;
    } else {
      puppyPortions.set(portion.breedId, {
        breedId: portion.breedId,
        breedName: portion.breedName,
        percentage: contribution,
      });
    }
  });

  // Convert map to array and sort by percentage
  const portions = Array.from(puppyPortions.values()).sort(
    (a, b) => b.percentage - a.percentage
  );

  // Determine if purebred
  const isPurebred = portions.length === 1 && portions[0].percentage === 100;

  // Determine if first generation cross (F1)
  const isFirstGeneration =
    portions.length === 2 &&
    portions[0].percentage === 50 &&
    portions[1].percentage === 50 &&
    sireComposition.isPurebred &&
    damComposition.isPurebred;

  // Check for designer breed
  let isDesignerBreed = false;
  let designerBreedInfo: DesignerBreed | undefined;

  if (isFirstGeneration && portions.length === 2) {
    const breed1 = portions[0].breedName;
    const breed2 = portions[1].breedName;
    const designerMatch = findDesignerBreed(breed1, breed2);

    if (designerMatch) {
      isDesignerBreed = true;
      designerBreedInfo = designerMatch;
    }
  }

  // Determine generation (for tracking F1, F2, F3, etc.)
  let generation: number | undefined;
  if (!isPurebred) {
    if (isFirstGeneration) {
      generation = 1; // F1
    } else {
      // Determine generation based on parent generations
      const sireGen = sireComposition.generation || 0;
      const damGen = damComposition.generation || 0;
      generation = Math.max(sireGen, damGen) + 1;
    }
  }

  // Generate display name
  const displayName = generateBreedDisplayName(
    portions,
    isPurebred,
    isFirstGeneration,
    isDesignerBreed,
    designerBreedInfo,
    generation
  );

  return {
    portions,
    isPurebred,
    isFirstGeneration,
    isDesignerBreed,
    designerBreedInfo,
    displayName,
    generation,
  };
}

/**
 * Generate appropriate display name based on composition
 */
function generateBreedDisplayName(
  portions: BreedPortion[],
  isPurebred: boolean,
  isFirstGeneration: boolean,
  isDesignerBreed: boolean,
  designerBreedInfo?: DesignerBreed,
  generation?: number
): string {
  // Purebred - use breed name
  if (isPurebred) {
    return portions[0].breedName;
  }

  // Designer breed - use special name
  if (isDesignerBreed && designerBreedInfo) {
    if (generation && generation > 1) {
      return `${designerBreedInfo.name} (F${generation})`;
    }
    return designerBreedInfo.name;
  }

  // First generation cross - use "X Mix" format
  if (isFirstGeneration && portions.length === 2) {
    const breed1 = portions[0].breedName;
    const breed2 = portions[1].breedName;
    return `${breed1} × ${breed2} Mix`;
  }

  // Multi-generation or complex mix
  if (portions.length === 1) {
    // Shouldn't happen, but handle it
    return portions[0].breedName;
  }

  if (portions.length === 2) {
    // Two breeds, but not 50/50
    const dominant = portions[0];
    const secondary = portions[1];

    if (dominant.percentage >= 75) {
      // Mostly one breed
      return `${dominant.breedName} Mix`;
    } else {
      // Show both breeds with generation
      const gen = generation ? ` (F${generation})` : '';
      return `${dominant.breedName} × ${secondary.breedName} Mix${gen}`;
    }
  }

  // 3+ breeds - show dominant breed
  const dominant = portions[0];
  if (dominant.percentage >= 50) {
    return `${dominant.breedName} Mix`;
  } else {
    // No clear dominant - show top 2
    return `${portions[0].breedName} × ${portions[1].breedName} Mix`;
  }
}

/**
 * Get breed composition summary as human-readable string
 */
export function getCompositionSummary(composition: BreedComposition): string {
  if (composition.isPurebred) {
    return `Purebred ${composition.portions[0].breedName}`;
  }

  if (composition.isDesignerBreed && composition.designerBreedInfo) {
    const gen = composition.generation ? ` (Generation ${composition.generation})` : '';
    return `${composition.designerBreedInfo.name} designer breed${gen}`;
  }

  // List all breeds with percentages
  const percentages = composition.portions
    .map(p => `${Math.round(p.percentage)}% ${p.breedName}`)
    .join(', ');

  const gen = composition.generation ? ` (F${composition.generation})` : '';
  return `Mixed breed: ${percentages}${gen}`;
}

/**
 * Get simplified composition for display (rounds to nearest 5%)
 */
export function getSimplifiedComposition(
  composition: BreedComposition
): BreedPortion[] {
  return composition.portions.map(portion => ({
    ...portion,
    percentage: Math.round(portion.percentage / 5) * 5, // Round to nearest 5%
  }));
}

/**
 * Determine primary breed (highest percentage)
 */
export function getPrimaryBreed(composition: BreedComposition): BreedPortion {
  return composition.portions[0];
}

/**
 * Check if a dog has a specific breed in its ancestry
 */
export function hasBreedInAncestry(
  composition: BreedComposition,
  breedId: number
): boolean {
  return composition.portions.some(p => p.breedId === breedId);
}

/**
 * Get percentage of a specific breed in composition
 */
export function getBreedPercentage(
  composition: BreedComposition,
  breedId: number
): number {
  const portion = composition.portions.find(p => p.breedId === breedId);
  return portion ? portion.percentage : 0;
}

/**
 * Determine if two dogs are the same breed composition
 * (useful for breeding similar mixes)
 */
export function hasSameComposition(
  comp1: BreedComposition,
  comp2: BreedComposition,
  tolerance: number = 5 // Allow 5% difference
): boolean {
  if (comp1.portions.length !== comp2.portions.length) {
    return false;
  }

  // Check each breed
  for (const portion1 of comp1.portions) {
    const portion2 = comp2.portions.find(p => p.breedId === portion1.breedId);
    if (!portion2) {
      return false;
    }

    const difference = Math.abs(portion1.percentage - portion2.percentage);
    if (difference > tolerance) {
      return false;
    }
  }

  return true;
}

/**
 * Get breed composition color coding for UI
 */
export function getCompositionColor(composition: BreedComposition): string {
  if (composition.isPurebred) {
    return 'text-blue-700 bg-blue-50 border-blue-300';
  }

  if (composition.isDesignerBreed) {
    return 'text-purple-700 bg-purple-50 border-purple-300';
  }

  if (composition.isFirstGeneration) {
    return 'text-green-700 bg-green-50 border-green-300';
  }

  return 'text-orange-700 bg-orange-50 border-orange-300';
}

/**
 * Get emoji for breed composition type
 */
export function getCompositionEmoji(composition: BreedComposition): string {
  if (composition.isPurebred) {
    return '🏆'; // Trophy for purebred
  }

  if (composition.isDesignerBreed) {
    return '⭐'; // Star for designer breed
  }

  if (composition.isFirstGeneration) {
    return '🧬'; // DNA for F1 cross
  }

  return '🔀'; // Shuffle for multi-generation mix
}
