import { Dog } from '../types';

export interface PedigreeNode {
  dog: Dog | null;
  generation: number;
  relationship: string;
}

export interface InbreedingAnalysis {
  isInbred: boolean;
  coefficient: number; // 0-1, where 1 is most inbred
  commonAncestors: string[];
  relationship: string | null;
  penalty: number; // Stat reduction percentage
}

/**
 * Build ancestry tree for a dog
 */
export function buildAncestryTree(
  dog: Dog,
  allDogs: Dog[],
  maxGenerations: number = 5
): Map<string, PedigreeNode> {
  const tree = new Map<string, PedigreeNode>();

  function traverse(currentDog: Dog, generation: number, relationship: string) {
    if (generation > maxGenerations) return;

    tree.set(currentDog.id, {
      dog: currentDog,
      generation,
      relationship,
    });

    // Get parents
    if (currentDog.parent1_id) {
      const parent1 = allDogs.find(d => d.id === currentDog.parent1_id);
      if (parent1) {
        traverse(parent1, generation + 1, generation === 0 ? 'parent' : `${relationship}'s parent`);
      }
    }

    if (currentDog.parent2_id) {
      const parent2 = allDogs.find(d => d.id === currentDog.parent2_id);
      if (parent2) {
        traverse(parent2, generation + 1, generation === 0 ? 'parent' : `${relationship}'s parent`);
      }
    }
  }

  traverse(dog, 0, 'self');
  return tree;
}

/**
 * Check if two dogs are related
 */
export function analyzeInbreeding(
  dog1: Dog,
  dog2: Dog,
  allDogs: Dog[]
): InbreedingAnalysis {
  // Build ancestry trees
  const tree1 = buildAncestryTree(dog1, allDogs);
  const tree2 = buildAncestryTree(dog2, allDogs);

  // Find common ancestors
  const commonAncestors: string[] = [];
  let closestGeneration = Infinity;
  let relationship: string | null = null;

  tree1.forEach((node1, dogId) => {
    if (tree2.has(dogId) && dogId !== dog1.id && dogId !== dog2.id) {
      commonAncestors.push(dogId);
      const gen = Math.min(node1.generation, tree2.get(dogId)!.generation);
      if (gen < closestGeneration) {
        closestGeneration = gen;
      }
    }
  });

  // Check direct relationships
  if (dog1.parent1_id === dog2.id || dog1.parent2_id === dog2.id) {
    relationship = 'parent-child';
  } else if (dog2.parent1_id === dog1.id || dog2.parent2_id === dog1.id) {
    relationship = 'parent-child';
  } else if (dog1.parent1_id === dog2.parent1_id && dog1.parent1_id) {
    relationship = 'full siblings';
  } else if (
    (dog1.parent1_id === dog2.parent1_id || dog1.parent1_id === dog2.parent2_id ||
     dog1.parent2_id === dog2.parent1_id || dog1.parent2_id === dog2.parent2_id) &&
    (dog1.parent1_id || dog1.parent2_id)
  ) {
    relationship = 'half siblings';
  } else if (closestGeneration === 2) {
    relationship = 'grandparent-grandchild or uncle/aunt-niece/nephew';
  } else if (closestGeneration === 3) {
    relationship = 'cousins';
  } else if (closestGeneration === 4) {
    relationship = 'second cousins';
  }

  // Calculate inbreeding coefficient
  let coefficient = 0;
  if (commonAncestors.length > 0) {
    // More common ancestors and closer generation = higher coefficient
    coefficient = (commonAncestors.length / 10) * (1 / closestGeneration);
    coefficient = Math.min(coefficient, 1);

    // Direct relationships get max coefficient
    if (relationship === 'parent-child') coefficient = 1.0;
    else if (relationship === 'full siblings') coefficient = 0.9;
    else if (relationship === 'half siblings') coefficient = 0.7;
  }

  // Calculate stat penalty
  let penalty = 0;
  if (coefficient > 0) {
    // 0-50% stat reduction based on coefficient
    penalty = Math.floor(coefficient * 50);
  }

  return {
    isInbred: commonAncestors.length > 0 || relationship !== null,
    coefficient,
    commonAncestors,
    relationship,
    penalty,
  };
}

/**
 * Get full pedigree for display (3 generations)
 */
export interface PedigreeTree {
  dog: Dog;
  sire: PedigreeTree | null;
  dam: PedigreeTree | null;
}

export function buildPedigreeTree(
  dog: Dog,
  allDogs: Dog[],
  generations: number = 3
): PedigreeTree {
  if (generations === 0) {
    return {
      dog,
      sire: null,
      dam: null,
    };
  }

  const sire = dog.parent1_id && dog.parent1_id !== dog.parent2_id
    ? allDogs.find(d => d.id === dog.parent1_id)
    : null;

  const dam = dog.parent2_id && dog.parent2_id !== dog.parent1_id
    ? allDogs.find(d => d.id === dog.parent2_id)
    : null;

  return {
    dog,
    sire: sire ? buildPedigreeTree(sire, allDogs, generations - 1) : null,
    dam: dam ? buildPedigreeTree(dam, allDogs, generations - 1) : null,
  };
}

/**
 * Calculate coefficient of inbreeding (COI) - more precise calculation
 */
export function calculateCOI(dog: Dog, allDogs: Dog[]): number {
  const tree = buildAncestryTree(dog, allDogs, 5);
  const ancestors: string[] = [];

  tree.forEach((node, dogId) => {
    if (node.generation > 0) {
      ancestors.push(dogId);
    }
  });

  // Count duplicate ancestors
  const counts = new Map<string, number>();
  ancestors.forEach(id => {
    counts.set(id, (counts.get(id) || 0) + 1);
  });

  let coi = 0;
  counts.forEach((count, id) => {
    if (count > 1) {
      const node = tree.get(id);
      if (node) {
        // Each duplicate appearance in closer generations increases COI more
        const weight = 1 / Math.pow(2, node.generation);
        coi += (count - 1) * weight;
      }
    }
  });

  return Math.min(coi, 1);
}
