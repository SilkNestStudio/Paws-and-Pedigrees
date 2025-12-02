import { Specialization, SpecializationMilestone } from '../types/specialization';

export const SPECIALIZATIONS: Record<string, Specialization> = {
  // Tier 1 Specializations - Entry level
  agility_champion: {
    id: 'agility_champion',
    name: 'Agility Champion',
    icon: '🎯',
    description: 'Master of obstacle courses and quick reflexes',
    tier: 1,
    requirements: {
      minLevel: 5,
      minBondLevel: 3,
      minStats: {
        agility: 60,
        speed: 50,
      },
      minCompetitionWins: {
        agility: 3,
      },
    },
    benefits: {
      statBonus: {
        agility: 10,
        speed: 5,
      },
      competitionBonus: {
        agility: 0.15, // 15% bonus to agility competitions
      },
      trainingMultiplier: 1.2,
      specialAbility: 'Navigate obstacles 20% faster in competitions',
    },
  },

  obedience_master: {
    id: 'obedience_master',
    name: 'Obedience Master',
    icon: '🎓',
    description: 'Perfectly trained and responsive to commands',
    tier: 1,
    requirements: {
      minLevel: 5,
      minBondLevel: 5,
      minStats: {
        obedience_trained: 60,
        intelligence: 55,
      },
      minCompetitionWins: {
        obedience: 3,
      },
    },
    benefits: {
      statBonus: {
        obedience_trained: 10,
        intelligence: 5,
      },
      competitionBonus: {
        obedience: 0.15,
      },
      trainingMultiplier: 1.25,
      specialAbility: 'Learn new commands 25% faster',
    },
  },

  strength_athlete: {
    id: 'strength_athlete',
    name: 'Strength Athlete',
    icon: '💪',
    description: 'Power and endurance specialist',
    tier: 1,
    requirements: {
      minLevel: 5,
      minBondLevel: 3,
      minStats: {
        strength: 60,
        endurance: 50,
      },
      minCompetitionWins: {
        weight_pull: 3,
      },
    },
    benefits: {
      statBonus: {
        strength: 10,
        endurance: 5,
      },
      competitionBonus: {
        weight_pull: 0.15,
      },
      trainingMultiplier: 1.15,
      specialAbility: 'Pull 15% more weight in competitions',
    },
  },

  racing_speedster: {
    id: 'racing_speedster',
    name: 'Racing Speedster',
    icon: '⚡',
    description: 'Built for pure speed',
    tier: 1,
    requirements: {
      minLevel: 5,
      minBondLevel: 3,
      minStats: {
        speed: 65,
        endurance: 45,
      },
      minCompetitionWins: {
        racing: 3,
      },
    },
    benefits: {
      statBonus: {
        speed: 10,
        endurance: 5,
      },
      competitionBonus: {
        racing: 0.15,
      },
      trainingMultiplier: 1.2,
      specialAbility: 'Maintain top speed 20% longer',
    },
  },

  // Tier 2 Specializations - Advanced
  show_dog: {
    id: 'show_dog',
    name: 'Show Dog Elite',
    icon: '👑',
    description: 'Breed standard perfection and showmanship',
    tier: 2,
    requirements: {
      minLevel: 10,
      minBondLevel: 7,
      minStats: {
        intelligence: 65,
        obedience_trained: 70,
      },
      minCompetitionWins: {
        obedience: 5,
        agility: 3,
      },
    },
    benefits: {
      statBonus: {
        intelligence: 10,
        trainability: 10,
        obedience_trained: 10,
      },
      competitionBonus: {
        obedience: 0.2,
        agility: 0.1,
      },
      trainingMultiplier: 1.3,
      specialAbility: 'Impress judges with perfect presentation',
      unlockSpecialTraining: ['show_handling', 'breed_standard'],
    },
  },

  therapy_dog: {
    id: 'therapy_dog',
    name: 'Certified Therapy Dog',
    icon: '❤️',
    description: 'Brings comfort and joy to those in need',
    tier: 2,
    requirements: {
      minLevel: 10,
      minBondLevel: 8,
      minStats: {
        friendliness: 80,
        obedience_trained: 65,
        intelligence: 60,
      },
    },
    benefits: {
      statBonus: {
        friendliness: 15,
        bond_level: 2,
      },
      trainingMultiplier: 1.25,
      specialAbility: 'Generate passive income from therapy visits ($100/day)',
    },
  },

  working_dog: {
    id: 'working_dog',
    name: 'Professional Working Dog',
    icon: '🦺',
    description: 'Trained for real-world tasks and service',
    tier: 2,
    requirements: {
      minLevel: 12,
      minBondLevel: 8,
      minStats: {
        intelligence: 70,
        obedience_trained: 75,
        strength: 60,
      },
    },
    benefits: {
      statBonus: {
        intelligence: 10,
        obedience_trained: 10,
        strength: 10,
      },
      trainingMultiplier: 1.35,
      specialAbility: 'Unlock special work assignments for income',
      unlockSpecialTraining: ['search_rescue', 'protection', 'service_tasks'],
    },
  },

  // Tier 3 Specializations - Master level
  versatile_competitor: {
    id: 'versatile_competitor',
    name: 'Versatile Champion',
    icon: '🏆',
    description: 'Master of all disciplines',
    tier: 3,
    requirements: {
      minLevel: 15,
      minBondLevel: 9,
      minStats: {
        speed: 70,
        agility: 70,
        strength: 65,
        endurance: 65,
        obedience_trained: 75,
      },
      minCompetitionWins: {
        agility: 10,
        obedience: 10,
        racing: 5,
        weight_pull: 5,
      },
    },
    benefits: {
      statBonus: {
        speed: 15,
        agility: 15,
        strength: 10,
        endurance: 10,
        obedience_trained: 15,
      },
      competitionBonus: {
        agility: 0.25,
        obedience: 0.25,
        racing: 0.2,
        weight_pull: 0.2,
      },
      trainingMultiplier: 1.5,
      specialAbility: 'Excel in all competition types',
    },
  },
};

export const SPECIALIZATION_MILESTONES: SpecializationMilestone[] = [
  // Agility Champion Milestones
  {
    id: 'agility_first_win',
    specializationType: 'agility_champion',
    name: 'First Agility Victory',
    description: 'Win your first agility competition',
    requirement: 'Win 1 agility competition',
    reward: {
      xp: 100,
      cash: 200,
      statBoost: { agility: 2 },
    },
  },
  {
    id: 'agility_speed_demon',
    specializationType: 'agility_champion',
    name: 'Speed Demon',
    description: 'Complete course in record time',
    requirement: 'Score 90+ in agility competition',
    reward: {
      xp: 250,
      cash: 500,
      statBoost: { agility: 3, speed: 2 },
    },
  },

  // Obedience Master Milestones
  {
    id: 'obedience_perfect_score',
    specializationType: 'obedience_master',
    name: 'Perfect Execution',
    description: 'Achieve a perfect score in obedience',
    requirement: 'Score 95+ in obedience competition',
    reward: {
      xp: 300,
      cash: 600,
      statBoost: { obedience_trained: 5 },
    },
  },

  // Racing Speedster Milestones
  {
    id: 'racing_speed_record',
    specializationType: 'racing_speedster',
    name: 'Speed Record',
    description: 'Set a new speed record',
    requirement: 'Win racing competition with 92+ score',
    reward: {
      xp: 250,
      cash: 500,
      gems: 5,
      statBoost: { speed: 3 },
    },
  },

  // Strength Athlete Milestones
  {
    id: 'strength_heavyweight',
    specializationType: 'strength_athlete',
    name: 'Heavyweight Champion',
    description: 'Win 5 weight pull competitions',
    requirement: 'Win 5 weight pull competitions',
    reward: {
      xp: 300,
      cash: 750,
      statBoost: { strength: 4, endurance: 2 },
    },
  },

  // Show Dog Milestones
  {
    id: 'show_best_in_show',
    specializationType: 'show_dog',
    name: 'Best in Show',
    description: 'Win a major show event',
    requirement: 'Win 3 competitions with 95+ scores',
    reward: {
      xp: 500,
      cash: 1500,
      gems: 15,
    },
  },

  // Therapy Dog Milestones
  {
    id: 'therapy_hundred_visits',
    specializationType: 'therapy_dog',
    name: '100 Healing Hearts',
    description: 'Complete 100 therapy visits',
    requirement: 'Complete 100 therapy sessions',
    reward: {
      xp: 400,
      cash: 1000,
      gems: 10,
    },
  },

  // Working Dog Milestones
  {
    id: 'working_certification',
    specializationType: 'working_dog',
    name: 'Professional Certification',
    description: 'Complete all working dog certifications',
    requirement: 'Complete all working training programs',
    reward: {
      xp: 600,
      cash: 2000,
      gems: 20,
    },
  },

  // Versatile Competitor Milestones
  {
    id: 'versatile_all_disciplines',
    specializationType: 'versatile_competitor',
    name: 'Master of All',
    description: 'Win in every competition type',
    requirement: 'Win at least once in each competition type',
    reward: {
      xp: 1000,
      cash: 5000,
      gems: 50,
    },
  },
];

// Helper function to get available specializations for a dog
export function getAvailableSpecializations(
  dogStats: any,
  dogLevel: number,
  bondLevel: number,
  competitionWins: Record<string, number>
): Specialization[] {
  return Object.values(SPECIALIZATIONS).filter(spec => {
    // Check level requirement
    if (spec.requirements.minLevel && dogLevel < spec.requirements.minLevel) {
      return false;
    }

    // Check bond level requirement
    if (spec.requirements.minBondLevel && bondLevel < spec.requirements.minBondLevel) {
      return false;
    }

    // Check stat requirements
    if (spec.requirements.minStats) {
      for (const [stat, minValue] of Object.entries(spec.requirements.minStats)) {
        if ((dogStats[stat] || 0) < minValue) {
          return false;
        }
      }
    }

    // Check competition win requirements
    if (spec.requirements.minCompetitionWins) {
      for (const [compType, minWins] of Object.entries(spec.requirements.minCompetitionWins)) {
        if ((competitionWins[compType] || 0) < minWins) {
          return false;
        }
      }
    }

    return true;
  });
}

// Helper function to check if a dog can specialize
export function canSpecialize(
  dogLevel: number,
  bondLevel: number
): boolean {
  return dogLevel >= 5 && bondLevel >= 3;
}

// Helper function to get specialization benefits
export function getSpecializationBonuses(specialization: string) {
  const spec = SPECIALIZATIONS[specialization];
  return spec ? spec.benefits : null;
}
