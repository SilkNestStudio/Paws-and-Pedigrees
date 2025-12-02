import { PersonalityTraitData } from '../types/personality';

export const PERSONALITY_TRAITS: Record<string, PersonalityTraitData> = {
  playful: {
    id: 'playful',
    name: 'Playful',
    description: 'Always ready for fun and games',
    icon: '🎾',
    rarity: 'common',
    effects: {
      happinessDecayRate: 0.8, // Slower happiness decay
      energyDecayRate: 1.2, // Faster energy decay
      bondGainRate: 1.2,
      playfulness: 1.3
    }
  },
  calm: {
    id: 'calm',
    name: 'Calm',
    description: 'Cool and collected in any situation',
    icon: '😌',
    rarity: 'common',
    effects: {
      stressResistance: 1.3,
      focusBonus: 1.1,
      energyDecayRate: 0.9
    }
  },
  energetic: {
    id: 'energetic',
    name: 'Energetic',
    description: 'Boundless energy and enthusiasm',
    icon: '⚡',
    rarity: 'common',
    effects: {
      trainingSpeed: 1.2,
      energyDecayRate: 1.3,
      competitionConfidence: 1.1
    }
  },
  lazy: {
    id: 'lazy',
    name: 'Lazy',
    description: 'Prefers naps to activity',
    icon: '😴',
    rarity: 'common',
    effects: {
      trainingSpeed: 0.8,
      energyDecayRate: 0.7,
      focusBonus: 0.9
    }
  },
  social: {
    id: 'social',
    name: 'Social',
    description: 'Loves being around others',
    icon: '🤝',
    rarity: 'common',
    effects: {
      bondGainRate: 1.3,
      breedingSuccess: 1.2,
      happinessDecayRate: 0.9
    }
  },
  independent: {
    id: 'independent',
    name: 'Independent',
    description: 'Self-sufficient and confident',
    icon: '🦅',
    rarity: 'uncommon',
    effects: {
      stressResistance: 1.2,
      bondGainRate: 0.8,
      focusBonus: 1.2
    }
  },
  loyal: {
    id: 'loyal',
    name: 'Loyal',
    description: 'Devoted and trustworthy',
    icon: '💙',
    rarity: 'uncommon',
    effects: {
      bondGainRate: 1.4,
      obedienceBonus: 1.2,
      competitionConfidence: 1.1
    }
  },
  stubborn: {
    id: 'stubborn',
    name: 'Stubborn',
    description: 'Strong-willed and determined',
    icon: '🐂',
    rarity: 'common',
    effects: {
      trainingSpeed: 0.7,
      obedienceBonus: 0.8,
      stressResistance: 1.2,
      focusBonus: 1.3
    }
  },
  brave: {
    id: 'brave',
    name: 'Brave',
    description: 'Fearless and bold',
    icon: '🦁',
    rarity: 'uncommon',
    effects: {
      competitionConfidence: 1.3,
      stressResistance: 1.3,
      // cautious: 0.7
    }
  },
  timid: {
    id: 'timid',
    name: 'Timid',
    description: 'Shy and nervous',
    icon: '🐭',
    rarity: 'common',
    effects: {
      competitionConfidence: 0.7,
      stressResistance: 0.7,
      bondGainRate: 1.2 // Bonds more with familiar people
    }
  },
  curious: {
    id: 'curious',
    name: 'Curious',
    description: 'Always exploring and learning',
    icon: '🔍',
    rarity: 'uncommon',
    effects: {
      trainingSpeed: 1.3,
      focusBonus: 0.9, // Gets distracted
      happinessDecayRate: 0.85
    }
  },
  cautious: {
    id: 'cautious',
    name: 'Cautious',
    description: 'Careful and observant',
    icon: '👀',
    rarity: 'common',
    effects: {
      stressResistance: 1.1,
      competitionConfidence: 0.9,
      focusBonus: 1.2
    }
  },
  gentle: {
    id: 'gentle',
    name: 'Gentle',
    description: 'Kind and tender',
    icon: '🌸',
    rarity: 'uncommon',
    effects: {
      bondGainRate: 1.3,
      breedingSuccess: 1.1,
      obedienceBonus: 1.1,
      competitionConfidence: 0.9
    }
  },
  rowdy: {
    id: 'rowdy',
    name: 'Rowdy',
    description: 'Rough and tumble',
    icon: '💥',
    rarity: 'common',
    effects: {
      energyDecayRate: 1.3,
      competitionConfidence: 1.2,
      obedienceBonus: 0.85,
      playfulness: 1.4
    }
  },
  focused: {
    id: 'focused',
    name: 'Focused',
    description: 'Highly attentive and dedicated',
    icon: '🎯',
    rarity: 'rare',
    effects: {
      trainingSpeed: 1.4,
      focusBonus: 1.4,
      obedienceBonus: 1.3,
      competitionConfidence: 1.2
    }
  },
  easily_distracted: {
    id: 'easily_distracted',
    name: 'Easily Distracted',
    description: 'Attention wanders frequently',
    icon: '🦋',
    rarity: 'common',
    effects: {
      trainingSpeed: 0.8,
      focusBonus: 0.7,
      obedienceBonus: 0.8,
      happinessDecayRate: 0.9 // Easily entertained
    }
  }
};

// Fun quirks that don't affect gameplay but add character
export const PERSONALITY_QUIRKS = [
  'Loves belly rubs',
  'Afraid of thunder',
  'Chases their tail',
  'Howls at sirens',
  'Steals socks',
  'Loves car rides',
  'Hates baths',
  'Snores loudly',
  'Talks in their sleep',
  'Collector of toys',
  'Sunbathing enthusiast',
  'Puddle jumper',
  'Shadow chaser',
  'Squirrel watcher',
  'Food motivated',
  'Treat connoisseur',
  'Couch potato',
  'Morning person',
  'Night owl',
  'Pillow thief'
];
