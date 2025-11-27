// Advanced Genetics System for Dog Breeding

export type GeneType = 'dominant' | 'recessive';

export interface Gene {
  trait: string;
  allele1: string; // From parent 1
  allele2: string; // From parent 2
  dominance: Record<string, GeneType | number>; // Which alleles are dominant (string for appearance, number for performance)
}

export interface DogGenetics {
  // Coat genetics
  coatColor: Gene;
  coatPattern: Gene;
  coatLength: Gene;

  // Eye color
  eyeColor: Gene;

  // Size genetics
  sizeGene: Gene;

  // Performance genetics (affects stat inheritance)
  speedGene: Gene;
  agilityGene: Gene;
  strengthGene: Gene;
  enduranceGene: Gene;
  intelligenceGene: Gene;

  // Temperament
  friendlinessGene: Gene;
  energyGene: Gene;
  trainabilityGene: Gene;
}

// Allele dominance chart
export const COAT_COLOR_DOMINANCE: Record<string, GeneType> = {
  'black': 'dominant',
  'brown': 'recessive',
  'red': 'recessive',
  'cream': 'recessive',
  'white': 'recessive',
  'tan': 'recessive',
  'fawn': 'recessive',
  'blue': 'recessive',
};

export const COAT_PATTERN_DOMINANCE: Record<string, GeneType> = {
  'solid': 'dominant',
  'brindle': 'dominant',
  'merle': 'dominant',
  'spotted': 'recessive',
  'patched': 'recessive',
  'sable': 'recessive',
};

export const EYE_COLOR_DOMINANCE: Record<string, GeneType> = {
  'brown': 'dominant',
  'amber': 'recessive',
  'blue': 'recessive',
  'green': 'recessive',
  'heterochromia': 'recessive',
};

export const COAT_LENGTH_DOMINANCE: Record<string, GeneType> = {
  'short': 'dominant',
  'medium': 'recessive',
  'long': 'recessive',
};

// Performance gene alleles (S=strong, W=weak)
export const PERFORMANCE_ALLELES = ['S+', 'S', 'N', 'W', 'W-']; // Strong+ to Weak-

export const PERFORMANCE_DOMINANCE: Record<string, number> = {
  'S+': 5,  // Dominant
  'S': 4,
  'N': 3,   // Neutral
  'W': 2,
  'W-': 1,  // Most recessive
};

/**
 * Determine expressed phenotype based on two alleles
 */
export function expressTrait(allele1: string, allele2: string, dominanceMap: Record<string, GeneType>): string {
  const dom1 = dominanceMap[allele1];
  const dom2 = dominanceMap[allele2];

  if (dom1 === 'dominant' && dom2 === 'recessive') return allele1;
  if (dom2 === 'dominant' && dom1 === 'recessive') return allele2;
  if (dom1 === 'dominant' && dom2 === 'dominant') {
    // Both dominant - random
    return Math.random() > 0.5 ? allele1 : allele2;
  }

  // Both recessive - random
  return Math.random() > 0.5 ? allele1 : allele2;
}

/**
 * Determine expressed performance trait based on allele strength
 */
export function expressPerformanceTrait(allele1: string, allele2: string): string {
  const strength1 = PERFORMANCE_DOMINANCE[allele1] || 3;
  const strength2 = PERFORMANCE_DOMINANCE[allele2] || 3;

  // Stronger allele has higher chance to express
  const total = strength1 + strength2;
  const chance1 = strength1 / total;

  return Math.random() < chance1 ? allele1 : allele2;
}

/**
 * Calculate stat modifier based on gene quality
 */
export function calculateGeneStatModifier(allele1: string, allele2: string): number {
  const strength1 = PERFORMANCE_DOMINANCE[allele1] || 3;
  const strength2 = PERFORMANCE_DOMINANCE[allele2] || 3;

  const average = (strength1 + strength2) / 2;

  // Return multiplier: 0.7 to 1.3
  return 0.7 + (average / 5) * 0.6;
}

/**
 * Get a random allele from a gene (for passing to offspring)
 */
export function getRandomAllele(gene: Gene): string {
  return Math.random() > 0.5 ? gene.allele1 : gene.allele2;
}

/**
 * Create genetics from phenotype (for dogs without explicit genetics)
 */
export function createGeneticsFromPhenotype(
  coatColor: string,
  coatPattern: string,
  eyeColor: string,
  coatType: string,
  stats: {
    speed: number;
    agility: number;
    strength: number;
    endurance: number;
    intelligence: number;
    friendliness: number;
    energy: number;
    trainability: number;
  }
): DogGenetics {
  // Helper to infer alleles from stat value
  const inferAllele = (statValue: number): string => {
    if (statValue >= 9) return 'S+';
    if (statValue >= 7) return 'S';
    if (statValue >= 5) return 'N';
    if (statValue >= 3) return 'W';
    return 'W-';
  };

  const coatLengthMap: Record<string, string> = {
    'smooth': 'short',
    'short': 'short',
    'medium': 'medium',
    'long': 'long',
    'wire': 'short',
    'curly': 'medium',
  };

  return {
    coatColor: {
      trait: 'coatColor',
      allele1: coatColor,
      allele2: coatColor,
      dominance: COAT_COLOR_DOMINANCE,
    },
    coatPattern: {
      trait: 'coatPattern',
      allele1: coatPattern,
      allele2: coatPattern,
      dominance: COAT_PATTERN_DOMINANCE,
    },
    coatLength: {
      trait: 'coatLength',
      allele1: coatLengthMap[coatType] || 'short',
      allele2: coatLengthMap[coatType] || 'short',
      dominance: COAT_LENGTH_DOMINANCE,
    },
    eyeColor: {
      trait: 'eyeColor',
      allele1: eyeColor,
      allele2: eyeColor,
      dominance: EYE_COLOR_DOMINANCE,
    },
    sizeGene: {
      trait: 'size',
      allele1: 'N',
      allele2: 'N',
      dominance: {},
    },
    speedGene: {
      trait: 'speed',
      allele1: inferAllele(stats.speed),
      allele2: inferAllele(stats.speed),
      dominance: PERFORMANCE_DOMINANCE,
    },
    agilityGene: {
      trait: 'agility',
      allele1: inferAllele(stats.agility),
      allele2: inferAllele(stats.agility),
      dominance: PERFORMANCE_DOMINANCE,
    },
    strengthGene: {
      trait: 'strength',
      allele1: inferAllele(stats.strength),
      allele2: inferAllele(stats.strength),
      dominance: PERFORMANCE_DOMINANCE,
    },
    enduranceGene: {
      trait: 'endurance',
      allele1: inferAllele(stats.endurance),
      allele2: inferAllele(stats.endurance),
      dominance: PERFORMANCE_DOMINANCE,
    },
    intelligenceGene: {
      trait: 'intelligence',
      allele1: inferAllele(stats.intelligence),
      allele2: inferAllele(stats.intelligence),
      dominance: PERFORMANCE_DOMINANCE,
    },
    friendlinessGene: {
      trait: 'friendliness',
      allele1: inferAllele(stats.friendliness),
      allele2: inferAllele(stats.friendliness),
      dominance: PERFORMANCE_DOMINANCE,
    },
    energyGene: {
      trait: 'energy',
      allele1: inferAllele(stats.energy),
      allele2: inferAllele(stats.energy),
      dominance: PERFORMANCE_DOMINANCE,
    },
    trainabilityGene: {
      trait: 'trainability',
      allele1: inferAllele(stats.trainability),
      allele2: inferAllele(stats.trainability),
      dominance: PERFORMANCE_DOMINANCE,
    },
  };
}
