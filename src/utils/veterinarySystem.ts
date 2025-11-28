/**
 * Veterinary System
 *
 * Handles illnesses, injuries, and veterinary care
 * Dogs can get sick or injured based on their care quality
 */

import { Dog } from '../types';

// Illness/Injury Types
export interface Ailment {
  id: string;
  name: string;
  type: 'illness' | 'injury';
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
  symptoms: string[];
  treatmentCost: number;
  recoveryTime: number; // Hours
  healthImpact: number; // Health reduction
  statImpact?: {
    speed?: number;
    agility?: number;
    strength?: number;
    endurance?: number;
    obedience?: number;
  };
}

// Common Ailments
export const AILMENTS: Record<string, Ailment> = {
  // Illnesses
  kennel_cough: {
    id: 'kennel_cough',
    name: 'Kennel Cough',
    type: 'illness',
    severity: 'mild',
    description: 'Respiratory infection causing persistent coughing',
    symptoms: ['Coughing', 'Reduced energy', 'Loss of appetite'],
    treatmentCost: 150,
    recoveryTime: 48, // 2 days
    healthImpact: -15,
    statImpact: { endurance: -3 },
  },
  upset_stomach: {
    id: 'upset_stomach',
    name: 'Upset Stomach',
    type: 'illness',
    severity: 'mild',
    description: 'Digestive issues from poor diet or stress',
    symptoms: ['Vomiting', 'Diarrhea', 'Lethargy'],
    treatmentCost: 100,
    recoveryTime: 24, // 1 day
    healthImpact: -10,
  },
  ear_infection: {
    id: 'ear_infection',
    name: 'Ear Infection',
    type: 'illness',
    severity: 'moderate',
    description: 'Bacterial infection in the ear canal',
    symptoms: ['Head shaking', 'Ear discharge', 'Pain'],
    treatmentCost: 250,
    recoveryTime: 72, // 3 days
    healthImpact: -20,
    statImpact: { obedience: -5 },
  },
  skin_infection: {
    id: 'skin_infection',
    name: 'Skin Infection',
    type: 'illness',
    severity: 'moderate',
    description: 'Bacterial or fungal skin infection',
    symptoms: ['Itching', 'Hair loss', 'Red patches'],
    treatmentCost: 300,
    recoveryTime: 96, // 4 days
    healthImpact: -25,
  },
  parvovirus: {
    id: 'parvovirus',
    name: 'Parvovirus',
    type: 'illness',
    severity: 'severe',
    description: 'Serious viral infection affecting intestines',
    symptoms: ['Severe vomiting', 'Bloody diarrhea', 'Lethargy'],
    treatmentCost: 1500,
    recoveryTime: 168, // 7 days
    healthImpact: -50,
    statImpact: { endurance: -10, strength: -8 },
  },

  // Injuries
  sprained_paw: {
    id: 'sprained_paw',
    name: 'Sprained Paw',
    type: 'injury',
    severity: 'mild',
    description: 'Twisted ankle or paw from overexertion',
    symptoms: ['Limping', 'Reluctance to walk', 'Swelling'],
    treatmentCost: 200,
    recoveryTime: 48, // 2 days
    healthImpact: -15,
    statImpact: { agility: -5, speed: -5 },
  },
  pulled_muscle: {
    id: 'pulled_muscle',
    name: 'Pulled Muscle',
    type: 'injury',
    severity: 'mild',
    description: 'Strained muscle from intense activity',
    symptoms: ['Stiffness', 'Reduced mobility', 'Pain'],
    treatmentCost: 175,
    recoveryTime: 36, // 1.5 days
    healthImpact: -12,
    statImpact: { strength: -4, endurance: -3 },
  },
  torn_ligament: {
    id: 'torn_ligament',
    name: 'Torn Ligament',
    type: 'injury',
    severity: 'moderate',
    description: 'Partial tear in leg ligament',
    symptoms: ['Severe limping', 'Swelling', 'Pain'],
    treatmentCost: 800,
    recoveryTime: 120, // 5 days
    healthImpact: -30,
    statImpact: { agility: -10, speed: -8, endurance: -5 },
  },
  fractured_bone: {
    id: 'fractured_bone',
    name: 'Fractured Bone',
    type: 'injury',
    severity: 'severe',
    description: 'Bone fracture requiring immediate care',
    symptoms: ['Cannot bear weight', 'Intense pain', 'Swelling'],
    treatmentCost: 2500,
    recoveryTime: 240, // 10 days
    healthImpact: -45,
    statImpact: { agility: -15, speed: -12, strength: -10, endurance: -8 },
  },
  heat_exhaustion: {
    id: 'heat_exhaustion',
    name: 'Heat Exhaustion',
    type: 'injury',
    severity: 'moderate',
    description: 'Overheating from intense activity',
    symptoms: ['Excessive panting', 'Weakness', 'Drooling'],
    treatmentCost: 400,
    recoveryTime: 24, // 1 day
    healthImpact: -20,
    statImpact: { endurance: -7 },
  },
};

/**
 * Calculate risk of illness based on care quality
 * Returns probability (0-1) of getting sick
 */
export function calculateIllnessRisk(dog: Dog): number {
  let risk = 0.0;

  // Base risk: 1% per day
  const baseRisk = 0.01;

  // Poor hunger increases risk
  if (dog.hunger < 30) risk += 0.05; // +5% if very hungry
  else if (dog.hunger < 60) risk += 0.02; // +2% if somewhat hungry

  // Poor thirst increases risk
  if (dog.thirst < 30) risk += 0.05;
  else if (dog.thirst < 60) risk += 0.02;

  // Low happiness increases stress-related illness risk
  if (dog.happiness < 30) risk += 0.03;
  else if (dog.happiness < 60) risk += 0.01;

  // Low health makes them more susceptible
  if (dog.health < 50) risk += 0.04;
  else if (dog.health < 75) risk += 0.02;

  // Good care reduces risk
  if (dog.hunger > 80 && dog.thirst > 80 && dog.happiness > 80) {
    risk -= 0.015; // -1.5% for excellent care
  }

  return Math.max(baseRisk, Math.min(0.15, baseRisk + risk)); // Cap at 15% per check
}

/**
 * Calculate risk of injury during training
 */
export function calculateTrainingInjuryRisk(dog: Dog, trainingIntensity: 'light' | 'moderate' | 'intense'): number {
  let risk = 0.0;

  // Base risk by intensity
  const intensityRisk = {
    light: 0.005,    // 0.5%
    moderate: 0.015, // 1.5%
    intense: 0.03,   // 3%
  };
  risk = intensityRisk[trainingIntensity];

  // Poor health increases injury risk significantly
  if (dog.health < 50) risk += 0.05;
  else if (dog.health < 75) risk += 0.02;

  // Low energy increases risk (tired = sloppy = injuries)
  if (dog.energy_stat < 30) risk += 0.04;
  else if (dog.energy_stat < 60) risk += 0.02;

  // Existing injuries/illnesses increase risk
  if (dog.current_ailment) risk += 0.03;

  // Good condition reduces risk
  if (dog.health > 90 && dog.energy_stat > 70) {
    risk -= 0.01; // -1% for great condition
  }

  return Math.max(0, Math.min(0.15, risk)); // Cap at 15%
}

/**
 * Calculate risk of injury during competition
 */
export function calculateCompetitionInjuryRisk(
  dog: Dog,
  competitionTier: 'local' | 'regional' | 'national' | 'championship'
): number {
  let risk = 0.0;

  // Base risk by tier (higher competition = more intense)
  const tierRisk = {
    local: 0.01,        // 1%
    regional: 0.025,    // 2.5%
    national: 0.04,     // 4%
    championship: 0.06, // 6%
  };
  risk = tierRisk[competitionTier];

  // Poor health increases injury risk
  if (dog.health < 50) risk += 0.08;
  else if (dog.health < 75) risk += 0.04;

  // Low energy = pushing too hard
  if (dog.energy_stat < 40) risk += 0.05;
  else if (dog.energy_stat < 70) risk += 0.02;

  // Existing ailments compound risk
  if (dog.current_ailment) risk += 0.05;

  // Peak condition reduces risk
  if (dog.health > 95 && dog.energy_stat > 80) {
    risk -= 0.015; // -1.5% for peak condition
  }

  return Math.max(0, Math.min(0.20, risk)); // Cap at 20%
}

/**
 * Select a random ailment based on context
 */
export function selectRandomAilment(
  type: 'illness' | 'injury' | 'any',
  severity?: 'mild' | 'moderate' | 'severe'
): Ailment {
  const ailmentList = Object.values(AILMENTS).filter(a => {
    if (type !== 'any' && a.type !== type) return false;
    if (severity && a.severity !== severity) return false;
    return true;
  });

  // Weight by severity (milder ailments more common)
  const weights = ailmentList.map(a => {
    if (a.severity === 'mild') return 50;
    if (a.severity === 'moderate') return 30;
    return 10; // severe
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < ailmentList.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return ailmentList[i];
    }
  }

  return ailmentList[0]; // Fallback
}

/**
 * Check if dog gets sick (call this periodically, e.g., daily)
 */
export function checkForIllness(dog: Dog): Ailment | null {
  if (dog.current_ailment) return null; // Already sick/injured

  const risk = calculateIllnessRisk(dog);
  if (Math.random() < risk) {
    return selectRandomAilment('illness');
  }

  return null;
}

/**
 * Check if dog gets injured during training
 */
export function checkForTrainingInjury(
  dog: Dog,
  trainingIntensity: 'light' | 'moderate' | 'intense'
): Ailment | null {
  if (dog.current_ailment) return null; // Already has ailment

  const risk = calculateTrainingInjuryRisk(dog, trainingIntensity);
  if (Math.random() < risk) {
    // More likely to get mild injuries than severe
    return selectRandomAilment('injury');
  }

  return null;
}

/**
 * Check if dog gets injured during competition
 */
export function checkForCompetitionInjury(
  dog: Dog,
  competitionTier: 'local' | 'regional' | 'national' | 'championship'
): Ailment | null {
  if (dog.current_ailment) return null; // Already has ailment

  const risk = calculateCompetitionInjuryRisk(dog, competitionTier);
  if (Math.random() < risk) {
    return selectRandomAilment('injury');
  }

  return null;
}

/**
 * Apply ailment to dog
 */
export function applyAilment(dog: Dog, ailment: Ailment): Partial<Dog> {
  const updates: Partial<Dog> = {
    current_ailment: ailment.id,
    ailment_contracted_at: new Date().toISOString(),
    health: Math.max(0, dog.health + ailment.healthImpact),
  };

  // Apply stat impacts if any
  if (ailment.statImpact) {
    if (ailment.statImpact.speed) {
      updates.speed_trained = Math.max(0, dog.speed_trained + ailment.statImpact.speed);
    }
    if (ailment.statImpact.agility) {
      updates.agility_trained = Math.max(0, dog.agility_trained + ailment.statImpact.agility);
    }
    if (ailment.statImpact.strength) {
      updates.strength_trained = Math.max(0, dog.strength_trained + ailment.statImpact.strength);
    }
    if (ailment.statImpact.endurance) {
      updates.endurance_trained = Math.max(0, dog.endurance_trained + ailment.statImpact.endurance);
    }
    if (ailment.statImpact.obedience) {
      updates.obedience_trained = Math.max(0, dog.obedience_trained + ailment.statImpact.obedience);
    }
  }

  return updates;
}

/**
 * Treat ailment at vet
 */
export function treatAilment(dog: Dog, ailment: Ailment): Partial<Dog> {
  const recoveryDue = new Date();
  recoveryDue.setTime(recoveryDue.getTime() + ailment.recoveryTime * 60 * 60 * 1000);

  return {
    current_ailment: undefined,
    ailment_contracted_at: undefined,
    recovery_due: recoveryDue.toISOString(),
    recovering_from: ailment.id,
    // Health restored partially during treatment
    health: Math.min(100, dog.health + 30),
  };
}

/**
 * Check if recovery is complete
 */
export function checkRecoveryComplete(dog: Dog): boolean {
  if (!dog.recovery_due) return false;
  return Date.now() >= new Date(dog.recovery_due).getTime();
}

/**
 * Complete recovery
 */
export function completeRecovery(dog: Dog): Partial<Dog> {
  return {
    recovery_due: undefined,
    recovering_from: undefined,
    health: Math.min(100, dog.health + 20), // Final health boost
  };
}

/**
 * Get ailment info by ID
 */
export function getAilmentById(ailmentId: string): Ailment | null {
  return AILMENTS[ailmentId] || null;
}

/**
 * Check if dog can train/compete
 */
export function canPerformActivity(dog: Dog): { allowed: boolean; reason?: string } {
  if (dog.current_ailment) {
    const ailment = getAilmentById(dog.current_ailment);
    return {
      allowed: false,
      reason: `${dog.name} has ${ailment?.name} and cannot train or compete until treated.`,
    };
  }

  if (dog.recovering_from) {
    const ailment = getAilmentById(dog.recovering_from);
    return {
      allowed: false,
      reason: `${dog.name} is recovering from ${ailment?.name}. Rest is required.`,
    };
  }

  return { allowed: true };
}
