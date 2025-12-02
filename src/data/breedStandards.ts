// Breed standards for conformation judging
// Based on AKC breed standards - simplified for gameplay

export interface BreedStandard {
  breedId: string | number;
  breedName: string;

  // Physical attributes (ideal ranges)
  idealSize: { min: number; max: number }; // lbs
  idealProportions: {
    height: number; // Relative proportion (0-100)
    length: number; // Relative proportion (0-100)
    depth: number; // Chest depth (0-100)
  };

  // Appearance categories (weighted scoring)
  categories: {
    head: number; // Weight percentage
    body: number;
    legs: number;
    coat: number;
    movement: number;
    temperament: number;
  };

  // Key characteristics
  characteristics: string[];

  // Faults (deductions)
  minorFaults: string[];
  majorFaults: string[];
  disqualifications: string[];

  // Minigame modifiers for breed-specific performance
  gameModifiers?: {
    // Agility game
    agility?: {
      baseSpeed: number; // 0.8-1.2 (multiplier)
      timingWindow: number; // 0.8-1.2 (larger = easier)
      goodWindow: number; // 0.8-1.2
      momentumBonus: number; // 0.8-1.2
    };
    // Racing game
    racing?: {
      baseSpeed: number; // 0.8-1.2
      handling: number; // 0.8-1.2 (lane change ease)
      maxBoost: number; // 0.8-1.2
      boostEfficiency: number; // 0.8-1.2
    };
    // Obedience game
    obedience?: {
      maxRounds: number; // 8-12
      displayTime: number; // 0.8-1.2
      inputTime: number; // 0.8-1.2
      errorTolerance: number; // 0-2
    };
    // Weight Pull game
    weightPull?: {
      maxWeight: number; // 0.8-1.2
      stamina: number; // 0.8-1.2
      powerWindow: number; // 0.8-1.2
      recoveryTime: number; // 0.8-1.2
    };
    // Conformation game
    conformation?: {
      stackingDifficulty: number; // 0.8-1.2 (lower = easier)
      idealGaitSpeed: number; // 0.8-1.2
      temperamentBonus: number; // 0.8-1.2
    };
  };
}

// Simplified breed standards for common breeds
export const breedStandards: Record<string, BreedStandard> = {
  '1': {
    breedId: 1,
    breedName: 'American Staffordshire Terrier',
    idealSize: { min: 45, max: 65 },
    idealProportions: {
      height: 50, // Medium height
      length: 55, // Slightly longer than tall
      depth: 60, // Deep chest
    },
    categories: {
      head: 20,
      body: 25,
      legs: 15,
      coat: 10,
      movement: 20,
      temperament: 10,
    },
    characteristics: [
      'Strong, muscular build',
      'Broad head with pronounced cheek muscles',
      'Short, stiff coat',
      'Confident, alert expression',
    ],
    minorFaults: ['Slightly long coat', 'Minor color variations'],
    majorFaults: ['Excessive size', 'Poor muscle tone', 'Timid temperament'],
    disqualifications: ['Pink nose', 'Long coat', 'Aggressive behavior'],
    gameModifiers: {
      agility: {
        baseSpeed: 1.0,
        timingWindow: 1.0,
        goodWindow: 1.0,
        momentumBonus: 1.1, // Strong, powerful jumps
      },
      racing: {
        baseSpeed: 0.95,
        handling: 1.05,
        maxBoost: 1.1,
        boostEfficiency: 1.0,
      },
      obedience: {
        maxRounds: 9,
        displayTime: 1.0,
        inputTime: 1.0,
        errorTolerance: 1,
      },
      weightPull: {
        maxWeight: 1.15, // Excellent strength
        stamina: 1.1,
        powerWindow: 1.0,
        recoveryTime: 1.0,
      },
      conformation: {
        stackingDifficulty: 0.9, // Easier to stack
        idealGaitSpeed: 1.0,
        temperamentBonus: 1.05,
      },
    },
  },

  '2': {
    breedId: 2,
    breedName: 'Labrador Retriever',
    idealSize: { min: 55, max: 80 },
    idealProportions: {
      height: 55,
      length: 60,
      depth: 55,
    },
    categories: {
      head: 15,
      body: 25,
      legs: 15,
      coat: 15,
      movement: 20,
      temperament: 10,
    },
    characteristics: [
      'Athletic, well-balanced build',
      'Otter tail',
      'Water-resistant double coat',
      'Friendly, outgoing temperament',
    ],
    minorFaults: ['Slightly wavy coat', 'Minor proportional issues'],
    majorFaults: ['Excessive size', 'Poor coat quality', 'Nervous temperament'],
    disqualifications: ['Curly coat', 'Wrong tail set', 'Aggressive behavior'],
    gameModifiers: {
      agility: {
        baseSpeed: 1.05, // Athletic and fast
        timingWindow: 1.1,
        goodWindow: 1.1,
        momentumBonus: 1.0,
      },
      racing: {
        baseSpeed: 1.0,
        handling: 1.1, // Good balance
        maxBoost: 1.0,
        boostEfficiency: 1.05,
      },
      obedience: {
        maxRounds: 11, // Highly trainable
        displayTime: 1.1,
        inputTime: 1.15,
        errorTolerance: 2,
      },
      weightPull: {
        maxWeight: 1.0,
        stamina: 1.15, // Great endurance
        powerWindow: 1.1,
        recoveryTime: 0.9, // Fast recovery
      },
      conformation: {
        stackingDifficulty: 0.95,
        idealGaitSpeed: 1.05,
        temperamentBonus: 1.15, // Excellent temperament
      },
    },
  },

  '3': {
    breedId: 3,
    breedName: 'German Shepherd',
    idealSize: { min: 50, max: 90 },
    idealProportions: {
      height: 60,
      length: 65,
      depth: 55,
    },
    categories: {
      head: 15,
      body: 25,
      legs: 20,
      coat: 15,
      movement: 15,
      temperament: 10,
    },
    characteristics: [
      'Strong, agile, well-muscled',
      'Noble appearance',
      'Double coat with dense undercoat',
      'Confident, alert demeanor',
    ],
    minorFaults: ['Slightly soft coat', 'Minor ear set issues'],
    majorFaults: ['Poor angulation', 'Weak topline', 'Timid temperament'],
    disqualifications: ['Cropped ears', 'Blue eyes', 'Aggressive behavior'],
    gameModifiers: {
      agility: {
        baseSpeed: 1.1, // Very agile
        timingWindow: 1.05,
        goodWindow: 1.0,
        momentumBonus: 1.05,
      },
      racing: {
        baseSpeed: 1.05,
        handling: 1.15, // Excellent coordination
        maxBoost: 1.0,
        boostEfficiency: 1.0,
      },
      obedience: {
        maxRounds: 12, // Extremely trainable
        displayTime: 1.15,
        inputTime: 1.2,
        errorTolerance: 2,
      },
      weightPull: {
        maxWeight: 1.1,
        stamina: 1.1,
        powerWindow: 1.05,
        recoveryTime: 0.95,
      },
      conformation: {
        stackingDifficulty: 1.0,
        idealGaitSpeed: 1.1, // Excellent movement
        temperamentBonus: 1.1,
      },
    },
  },

  // Add more breed standards as needed
  'default': {
    breedId: 'default',
    breedName: 'Generic',
    idealSize: { min: 30, max: 70 },
    idealProportions: {
      height: 50,
      length: 55,
      depth: 50,
    },
    categories: {
      head: 20,
      body: 25,
      legs: 15,
      coat: 10,
      movement: 20,
      temperament: 10,
    },
    characteristics: ['Well-balanced', 'Healthy appearance', 'Good temperament'],
    minorFaults: ['Minor proportional issues'],
    majorFaults: ['Poor condition', 'Nervous behavior'],
    disqualifications: ['Aggressive behavior'],
    gameModifiers: {
      agility: {
        baseSpeed: 1.0,
        timingWindow: 1.0,
        goodWindow: 1.0,
        momentumBonus: 1.0,
      },
      racing: {
        baseSpeed: 1.0,
        handling: 1.0,
        maxBoost: 1.0,
        boostEfficiency: 1.0,
      },
      obedience: {
        maxRounds: 10,
        displayTime: 1.0,
        inputTime: 1.0,
        errorTolerance: 1,
      },
      weightPull: {
        maxWeight: 1.0,
        stamina: 1.0,
        powerWindow: 1.0,
        recoveryTime: 1.0,
      },
      conformation: {
        stackingDifficulty: 1.0,
        idealGaitSpeed: 1.0,
        temperamentBonus: 1.0,
      },
    },
  },
};

// Get breed standard by ID or use default
export function getBreedStandard(breedId: string | number): BreedStandard {
  return breedStandards[breedId.toString()] || breedStandards['default'];
}

// Calculate conformance score based on dog's attributes
export interface ConformationScore {
  totalScore: number; // 0-100
  categoryScores: {
    head: number;
    body: number;
    legs: number;
    coat: number;
    movement: number;
    temperament: number;
  };
  deductions: {
    reason: string;
    points: number;
  }[];
  rating: 'Excellent' | 'Very Good' | 'Good' | 'Fair' | 'Poor';
}

export function calculateConformationScore(
  dog: any,
  breedStandard: BreedStandard,
  playerPerformance: number = 50 // 0-100, represents how well player poses/presents dog
): ConformationScore {
  const scores = {
    head: 0,
    body: 0,
    legs: 0,
    coat: 0,
    movement: 0,
    temperament: 0,
  };

  const deductions: { reason: string; points: number }[] = [];

  // Size conformance (affects body score)
  const dogSize = dog.size || 50;
  const sizeScore = calculateSizeScore(dogSize, breedStandard.idealSize);
  scores.body = sizeScore * (breedStandard.categories.body / 100);

  if (sizeScore < 70) {
    deductions.push({
      reason: 'Size outside ideal range',
      points: (100 - sizeScore) * 0.1,
    });
  }

  // Physical stats affect different categories
  const strength = (dog.strength || 0) + (dog.strength_trained || 0);
  const agility = (dog.agility || 0) + (dog.agility_trained || 0);
  const intelligence = dog.intelligence || 0;
  const friendliness = dog.friendliness || 0;

  // Head score (based on intelligence + proportion)
  scores.head = ((intelligence / 40) * 100) * (breedStandard.categories.head / 100);

  // Legs score (based on agility + strength)
  const legsQuality = (agility + strength) / 2;
  scores.legs = ((legsQuality / 40) * 100) * (breedStandard.categories.legs / 100);

  // Coat score (randomized with slight stat influence)
  const coatQuality = 60 + Math.random() * 30 + (strength / 100) * 10;
  scores.coat = coatQuality * (breedStandard.categories.coat / 100);

  // Movement score (agility + player performance)
  const movementQuality = ((agility / 40) * 50) + (playerPerformance * 0.5);
  scores.movement = movementQuality * (breedStandard.categories.movement / 100);

  // Temperament score (friendliness + intelligence)
  const temperamentQuality = ((friendliness + intelligence) / 80) * 100;
  scores.temperament = temperamentQuality * (breedStandard.categories.temperament / 100);

  // Calculate total score
  const baseScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
  const totalDeductions = deductions.reduce((sum, d) => sum + d.points, 0);
  const totalScore = Math.max(0, Math.min(100, baseScore - totalDeductions));

  // Determine rating
  let rating: 'Excellent' | 'Very Good' | 'Good' | 'Fair' | 'Poor';
  if (totalScore >= 90) rating = 'Excellent';
  else if (totalScore >= 80) rating = 'Very Good';
  else if (totalScore >= 70) rating = 'Good';
  else if (totalScore >= 60) rating = 'Fair';
  else rating = 'Poor';

  return {
    totalScore,
    categoryScores: scores,
    deductions,
    rating,
  };
}

// Calculate how close dog's size is to breed standard
function calculateSizeScore(dogSize: number, idealSize: { min: number; max: number }): number {
  if (dogSize >= idealSize.min && dogSize <= idealSize.max) {
    // Within ideal range - perfect score
    return 100;
  }

  // Outside ideal range - calculate deduction
  const midpoint = (idealSize.min + idealSize.max) / 2;
  const range = idealSize.max - idealSize.min;
  const deviation = Math.abs(dogSize - midpoint);
  const deviationPercent = (deviation / range) * 100;

  return Math.max(0, 100 - deviationPercent);
}
