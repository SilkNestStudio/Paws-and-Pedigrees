/**
 * Size Compatibility System for Breeding
 *
 * Ensures realistic breeding restrictions based on dog sizes.
 * Prevents dangerous pairings (like Chihuahua × Great Dane) while allowing
 * reasonable size differences with appropriate warnings.
 */

export type SizeCategory = 'toy' | 'small' | 'medium' | 'large' | 'giant';

export interface SizeRange {
  category: SizeCategory;
  minWeight: number; // in pounds
  maxWeight: number;
  description: string;
}

export interface BreedingCompatibility {
  compatible: boolean;
  warningLevel: 'none' | 'caution' | 'warning' | 'blocked';
  message: string;
  healthRiskFactor: number; // 0-1, higher = more risk to puppies/dam
}

/**
 * Size category definitions
 */
export const SIZE_CATEGORIES: Record<SizeCategory, SizeRange> = {
  toy: {
    category: 'toy',
    minWeight: 0,
    maxWeight: 20,
    description: 'Toy breeds (under 20 lbs)',
  },
  small: {
    category: 'small',
    minWeight: 20,
    maxWeight: 40,
    description: 'Small breeds (20-40 lbs)',
  },
  medium: {
    category: 'medium',
    minWeight: 40,
    maxWeight: 70,
    description: 'Medium breeds (40-70 lbs)',
  },
  large: {
    category: 'large',
    minWeight: 70,
    maxWeight: 100,
    description: 'Large breeds (70-100 lbs)',
  },
  giant: {
    category: 'giant',
    minWeight: 100,
    maxWeight: 200,
    description: 'Giant breeds (100+ lbs)',
  },
};

/**
 * Determine size category based on average weight
 */
export function getSizeCategory(avgWeight: number): SizeCategory {
  if (avgWeight < 20) return 'toy';
  if (avgWeight < 40) return 'small';
  if (avgWeight < 70) return 'medium';
  if (avgWeight < 100) return 'large';
  return 'giant';
}

/**
 * Calculate size difference between two categories
 */
function getSizeDifference(size1: SizeCategory, size2: SizeCategory): number {
  const sizeOrder: SizeCategory[] = ['toy', 'small', 'medium', 'large', 'giant'];
  const index1 = sizeOrder.indexOf(size1);
  const index2 = sizeOrder.indexOf(size2);
  return Math.abs(index1 - index2);
}

/**
 * Check if two dogs are compatible for breeding based on size
 *
 * Rules:
 * - Same size: Always OK
 * - 1 size difference: OK (e.g., Small × Medium)
 * - 2 size differences: Caution/Warning depending on which parent is larger
 * - 3+ size differences: Blocked (e.g., Toy × Giant)
 *
 * Special consideration: Smaller female + larger male is riskier than reverse
 */
export function checkSizeCompatibility(
  sire: { avgWeight: number; sex: 'male' | 'female' },
  dam: { avgWeight: number; sex: 'male' | 'female' }
): BreedingCompatibility {
  const sireSize = getSizeCategory(sire.avgWeight);
  const damSize = getSizeCategory(dam.avgWeight);
  const sizeDifference = getSizeDifference(sireSize, damSize);

  // Same size - always compatible
  if (sizeDifference === 0) {
    return {
      compatible: true,
      warningLevel: 'none',
      message: 'Both parents are similar size - ideal pairing.',
      healthRiskFactor: 0,
    };
  }

  // 1 size difference - compatible
  if (sizeDifference === 1) {
    return {
      compatible: true,
      warningLevel: 'none',
      message: 'Size difference is minimal - safe pairing.',
      healthRiskFactor: 0.1,
    };
  }

  // 2 size differences - caution/warning
  if (sizeDifference === 2) {
    // Check if smaller dog is the dam (more risky)
    const smallerIsDam = dam.avgWeight < sire.avgWeight;

    if (smallerIsDam) {
      return {
        compatible: true,
        warningLevel: 'warning',
        message: `⚠️ WARNING: Size mismatch detected. The smaller dam (${damSize}) may have difficulty carrying puppies from larger sire (${sireSize}). Increased risk of complications during pregnancy and birth. Veterinary supervision strongly recommended.`,
        healthRiskFactor: 0.4,
      };
    } else {
      return {
        compatible: true,
        warningLevel: 'caution',
        message: `⚠️ CAUTION: Moderate size difference (${sireSize} × ${damSize}). Puppies may vary significantly in size. Monitor pregnancy closely.`,
        healthRiskFactor: 0.25,
      };
    }
  }

  // 3+ size differences - blocked
  return {
    compatible: false,
    warningLevel: 'blocked',
    message: `🚫 BLOCKED: Extreme size mismatch (${sireSize} × ${damSize}). This pairing is not safe and would be extremely dangerous for the smaller parent. Natural breeding is not possible - would require artificial insemination and poses severe health risks.`,
    healthRiskFactor: 1.0,
  };
}

/**
 * Check if a specific pairing requires artificial insemination
 *
 * Note: Some designer breeds (like Pomsky) are only possible via AI
 * due to size incompatibility, even though they're popular.
 */
export function requiresArtificialInsemination(
  sire: { avgWeight: number },
  dam: { avgWeight: number }
): boolean {
  const sizeSize = getSizeCategory(sire.avgWeight);
  const damSize = getSizeCategory(dam.avgWeight);
  const sizeDifference = getSizeDifference(sizeSize, damSize);

  // 2+ size differences require AI
  return sizeDifference >= 2;
}

/**
 * Get expected puppy size range based on parents
 */
export function getExpectedPuppySize(
  sireWeight: number,
  damWeight: number
): { minWeight: number; maxWeight: number; description: string } {
  const avgParentWeight = (sireWeight + damWeight) / 2;
  const variance = Math.abs(sireWeight - damWeight) * 0.3; // 30% of difference

  const minWeight = Math.max(5, Math.round(avgParentWeight - variance));
  const maxWeight = Math.round(avgParentWeight + variance);

  const size = getSizeCategory(avgParentWeight);
  const sizeInfo = SIZE_CATEGORIES[size];

  return {
    minWeight,
    maxWeight,
    description: `Puppies expected to be ${sizeInfo.description.toLowerCase()}, ranging from ${minWeight}-${maxWeight} lbs at maturity.`,
  };
}

/**
 * Calculate health risks for breeding based on size compatibility
 * Returns percentage penalty to apply to health/success chance
 */
export function calculateSizeHealthPenalty(
  sire: { avgWeight: number; sex: 'male' | 'female' },
  dam: { avgWeight: number; sex: 'male' | 'female' }
): number {
  const compatibility = checkSizeCompatibility(sire, dam);

  // Convert health risk factor to percentage penalty
  // 0 = no penalty, 1.0 = 100% penalty (blocked)
  return compatibility.healthRiskFactor * 100;
}

/**
 * Get size category display information
 */
export function getSizeCategoryInfo(avgWeight: number): {
  category: SizeCategory;
  emoji: string;
  color: string;
  description: string;
} {
  const category = getSizeCategory(avgWeight);
  const info = SIZE_CATEGORIES[category];

  const emojiMap: Record<SizeCategory, string> = {
    toy: '🐕',
    small: '🐕',
    medium: '🐕‍🦺',
    large: '🐕‍🦺',
    giant: '🐾',
  };

  const colorMap: Record<SizeCategory, string> = {
    toy: 'text-purple-600',
    small: 'text-blue-600',
    medium: 'text-green-600',
    large: 'text-orange-600',
    giant: 'text-red-600',
  };

  return {
    category,
    emoji: emojiMap[category],
    color: colorMap[category],
    description: info.description,
  };
}
