import { Certification, PrestigeRank } from '../types/certifications';

export const CERTIFICATIONS: Record<string, Certification> = {
  champion: {
    id: 'champion',
    name: 'Champion',
    titlePrefix: 'CH',
    description: 'Earned by winning multiple competitions',
    icon: '🏆',
    prestigeLevel: 3,
    requirements: {
      competitionWins: [
        { type: 'any', count: 10, minScore: 85 },
      ],
      minLevel: 8,
    },
    benefits: {
      prestigePoints: 100,
      cashReward: 1000,
      gemReward: 10,
      statBonus: {
        confidence: 5,
      },
      specialBonus: '+5% to all competition scores',
    },
    displayColor: 'text-yellow-600',
  },

  grand_champion: {
    id: 'grand_champion',
    name: 'Grand Champion',
    titlePrefix: 'GCH',
    description: 'Elite competitor with numerous victories',
    icon: '👑',
    prestigeLevel: 6,
    requirements: {
      competitionWins: [
        { type: 'any', count: 25, minScore: 90 },
        { type: 'national', count: 5 },
      ],
      minLevel: 15,
      requiredCertifications: ['champion'],
    },
    benefits: {
      prestigePoints: 300,
      cashReward: 5000,
      gemReward: 50,
      statBonus: {
        all_stats: 5,
      },
      specialBonus: '+10% to all competition scores, +15% prize money',
    },
    displayColor: 'text-purple-600',
  },

  obedience_titled: {
    id: 'obedience_titled',
    name: 'Obedience Trial Champion',
    titlePrefix: 'OTCH',
    description: 'Master of obedience and control',
    icon: '🎓',
    prestigeLevel: 4,
    requirements: {
      competitionWins: [
        { type: 'obedience', count: 15, minScore: 92 },
      ],
      minStats: {
        obedience_trained: 80,
        intelligence: 70,
      },
      minLevel: 10,
    },
    benefits: {
      prestigePoints: 150,
      cashReward: 2000,
      gemReward: 20,
      specialBonus: '+15% obedience competition bonus, unlock advanced commands',
    },
    displayColor: 'text-blue-600',
  },

  agility_master: {
    id: 'agility_master',
    name: 'Master Agility Champion',
    titlePrefix: 'MACH',
    description: 'Supreme agility and speed',
    icon: '⚡',
    prestigeLevel: 5,
    requirements: {
      competitionWins: [
        { type: 'agility', count: 20, minScore: 90 },
        { type: 'racing', count: 10, minScore: 85 },
      ],
      minStats: {
        agility: 85,
        speed: 75,
      },
      minLevel: 12,
    },
    benefits: {
      prestigePoints: 200,
      cashReward: 3000,
      gemReward: 30,
      statBonus: {
        agility: 10,
        speed: 5,
      },
      specialBonus: '+20% agility/racing performance',
    },
    displayColor: 'text-green-600',
  },

  therapy_certified: {
    id: 'therapy_certified',
    name: 'Therapy Dog',
    titlePrefix: 'ThD',
    description: 'Certified to bring comfort and healing',
    icon: '❤️',
    prestigeLevel: 4,
    requirements: {
      minStats: {
        friendliness: 85,
        obedience_trained: 75,
      },
      minBondLevel: 9,
      minLevel: 10,
      customRequirement: 'Complete Therapy Dog Training Program',
    },
    benefits: {
      prestigePoints: 175,
      cashReward: 1500,
      gemReward: 25,
      specialBonus: 'Generate $150/day from therapy work, +10 happiness for all kennel dogs',
    },
    displayColor: 'text-pink-600',
  },

  working_certified: {
    id: 'working_certified',
    name: 'Working Dog Certificate',
    titlePrefix: 'WD',
    description: 'Trained for professional work',
    icon: '🦺',
    prestigeLevel: 5,
    requirements: {
      minStats: {
        intelligence: 80,
        obedience_trained: 85,
        strength: 70,
      },
      minLevel: 14,
      requiredSpecialization: 'working_dog',
    },
    benefits: {
      prestigePoints: 225,
      cashReward: 4000,
      gemReward: 35,
      specialBonus: 'Unlock special work assignments worth $500-2000',
    },
    displayColor: 'text-indigo-600',
  },

  conformation_winner: {
    id: 'conformation_winner',
    name: 'Best in Show',
    titlePrefix: 'BIS',
    description: 'Perfect breed standard specimen',
    icon: '👑',
    prestigeLevel: 7,
    requirements: {
      competitionWins: [
        { type: 'show', count: 10, minScore: 95 },
      ],
      minLevel: 16,
      customRequirement: 'Near-perfect breed characteristics',
    },
    benefits: {
      prestigePoints: 350,
      cashReward: 7500,
      gemReward: 75,
      specialBonus: 'Breeding fees +200%, puppies worth +50%',
    },
    displayColor: 'text-amber-600',
  },

  versatility_excellent: {
    id: 'versatility_excellent',
    name: 'Versatility Excellence',
    titlePrefix: 'VX',
    description: 'Excels in all disciplines',
    icon: '🌟',
    prestigeLevel: 8,
    requirements: {
      competitionWins: [
        { type: 'agility', count: 10, minScore: 88 },
        { type: 'obedience', count: 10, minScore: 88 },
        { type: 'racing', count: 10, minScore: 88 },
        { type: 'weight_pull', count: 10, minScore: 88 },
      ],
      minLevel: 18,
      requiredSpecialization: 'versatile_competitor',
    },
    benefits: {
      prestigePoints: 500,
      cashReward: 10000,
      gemReward: 100,
      statBonus: {
        all_stats: 10,
      },
      specialBonus: '+25% all competitions, +50% training speed',
    },
    displayColor: 'text-violet-600',
  },

  hall_of_fame: {
    id: 'hall_of_fame',
    name: 'Hall of Fame',
    titlePrefix: 'HOF',
    description: 'Legendary status - one of the all-time greats',
    icon: '🏛️',
    prestigeLevel: 10,
    requirements: {
      competitionWins: [
        { type: 'any', count: 100, minScore: 85 },
        { type: 'national', count: 25, minScore: 90 },
      ],
      minLevel: 25,
      requiredCertifications: ['grand_champion', 'versatility_excellent'],
      customRequirement: 'Lifetime achievement',
    },
    benefits: {
      prestigePoints: 1000,
      cashReward: 50000,
      gemReward: 500,
      statBonus: {
        all_stats: 20,
      },
      specialBonus: 'Permanent monument in Hall of Fame, +100% all bonuses, legendary status',
    },
    displayColor: 'text-rose-600',
  },
};

export const PRESTIGE_RANKS: PrestigeRank[] = [
  {
    rank: 'Novice',
    minPrestigePoints: 0,
    icon: '🔰',
    benefits: ['Access to basic competitions'],
  },
  {
    rank: 'Amateur',
    minPrestigePoints: 100,
    icon: '⭐',
    benefits: ['Unlock regional competitions', '+5% prize money'],
  },
  {
    rank: 'Professional',
    minPrestigePoints: 300,
    icon: '🌟',
    benefits: ['Unlock national competitions', '+10% prize money', '+5% training speed'],
  },
  {
    rank: 'Elite',
    minPrestigePoints: 750,
    icon: '💫',
    benefits: ['Unlock championship events', '+15% prize money', '+10% training speed'],
  },
  {
    rank: 'Champion',
    minPrestigePoints: 1500,
    icon: '👑',
    benefits: ['Unlock invitational tournaments', '+25% prize money', '+15% training speed', 'Special breeding bonuses'],
  },
  {
    rank: 'Legend',
    minPrestigePoints: 3000,
    icon: '🏛️',
    benefits: ['Access to all events', '+50% prize money', '+25% training speed', '+25% breeding value', 'Hall of Fame eligibility'],
  },
];

// Helper to check if dog meets certification requirements
export function checkCertificationEligibility(
  dog: any,
  certification: Certification,
  _competitionHistory: any[]
): boolean {
  // Check level
  if (certification.requirements.minLevel && dog.level < certification.requirements.minLevel) {
    return false;
  }

  // Check bond level
  if (certification.requirements.minBondLevel && dog.bond_level < certification.requirements.minBondLevel) {
    return false;
  }

  // Check stats
  if (certification.requirements.minStats) {
    for (const [stat, minValue] of Object.entries(certification.requirements.minStats)) {
      if ((dog[stat] || 0) < minValue) {
        return false;
      }
    }
  }

  // Check specialization
  if (certification.requirements.requiredSpecialization) {
    if (dog.specialization?.specializationType !== certification.requirements.requiredSpecialization) {
      return false;
    }
  }

  // Check prerequisite certifications
  if (certification.requirements.requiredCertifications) {
    const dogCertIds = (dog.certifications || []).map((c: any) => c.certificationType);
    for (const reqCert of certification.requirements.requiredCertifications) {
      if (!dogCertIds.includes(reqCert)) {
        return false;
      }
    }
  }

  // Check competition wins (simplified - would need actual competition history)
  // This is a placeholder - actual implementation would query competition history

  return true;
}

// Get prestige rank from points
export function getPrestigeRank(prestigePoints: number): PrestigeRank {
  for (let i = PRESTIGE_RANKS.length - 1; i >= 0; i--) {
    if (prestigePoints >= PRESTIGE_RANKS[i].minPrestigePoints) {
      return PRESTIGE_RANKS[i];
    }
  }
  return PRESTIGE_RANKS[0];
}

// Format dog name with titles
export function formatDogNameWithTitles(
  dogName: string,
  certifications: any[]
): string {
  if (!certifications || certifications.length === 0) {
    return dogName;
  }

  // Get all title prefixes, sorted by prestige level
  const titles = certifications
    .map(cert => CERTIFICATIONS[cert.certificationType])
    .filter(Boolean)
    .sort((a, b) => b.prestigeLevel - a.prestigeLevel)
    .map(cert => cert.titlePrefix);

  if (titles.length === 0) {
    return dogName;
  }

  return `${titles.join(' ')} ${dogName}`;
}
