export type SpecializationType =
  | 'agility_champion'
  | 'obedience_master'
  | 'strength_athlete'
  | 'racing_speedster'
  | 'show_dog'
  | 'therapy_dog'
  | 'working_dog'
  | 'versatile_competitor';

export interface SpecializationRequirement {
  minLevel?: number;
  minBondLevel?: number;
  minTrainingPoints?: number;
  minCompetitionWins?: { [key: string]: number };
  minStats?: { [key: string]: number };
  requiredCertifications?: string[];
}

export interface SpecializationBenefit {
  statBonus?: { [key: string]: number }; // Permanent stat bonuses
  trainingMultiplier?: number; // Bonus to training effectiveness
  competitionBonus?: { [key: string]: number }; // Competition type bonuses
  specialAbility?: string; // Special ability description
  unlockSpecialTraining?: string[]; // Unlock special training programs
}

export interface Specialization {
  id: SpecializationType;
  name: string;
  icon: string;
  description: string;
  requirements: SpecializationRequirement;
  benefits: SpecializationBenefit;
  tier: 1 | 2 | 3; // Progression tiers
  prerequisite?: SpecializationType; // Required previous specialization
}

export interface DogSpecialization {
  specializationType: SpecializationType;
  tier: number;
  experiencePoints: number;
  unlockedAt: string;
  milestones: string[]; // Track achieved milestones
}

export interface SpecializationMilestone {
  id: string;
  specializationType: SpecializationType;
  name: string;
  description: string;
  requirement: string;
  reward: {
    xp?: number;
    cash?: number;
    gems?: number;
    statBoost?: { [key: string]: number };
  };
}
