import { Achievement } from '../types/achievements';

export const ACHIEVEMENTS: Record<string, Achievement> = {
  // === KENNEL MANAGEMENT ===
  first_dog: {
    id: 'first_dog',
    category: 'kennel',
    name: 'First Friend',
    description: 'Adopt your first dog',
    icon: '🐕',
    rarity: 'common',
    reward: {
      cash: 100,
      xp: 50,
    },
    targetValue: 1,
  },

  dog_collector_5: {
    id: 'dog_collector_5',
    category: 'kennel',
    name: 'Growing Kennel',
    description: 'Have 5 dogs in your kennel at once',
    icon: '🏠',
    rarity: 'common',
    reward: {
      cash: 250,
      xp: 100,
    },
    targetValue: 5,
  },

  dog_collector_10: {
    id: 'dog_collector_10',
    category: 'kennel',
    name: 'Full House',
    description: 'Have 10 dogs in your kennel at once',
    icon: '🏘️',
    rarity: 'uncommon',
    reward: {
      cash: 500,
      gems: 5,
      xp: 200,
    },
    targetValue: 10,
    requires: ['dog_collector_5'],
  },

  kennel_upgrade_5: {
    id: 'kennel_upgrade_5',
    category: 'kennel',
    name: 'Serious Breeder',
    description: 'Upgrade your kennel to level 5',
    icon: '⬆️',
    rarity: 'uncommon',
    reward: {
      cash: 1000,
      gems: 10,
      xp: 300,
    },
    targetValue: 5,
  },

  // === TRAINING ===
  first_training: {
    id: 'first_training',
    category: 'training',
    name: 'Training Begins',
    description: 'Complete your first training session',
    icon: '🎓',
    rarity: 'common',
    reward: {
      cash: 50,
      xp: 25,
    },
    targetValue: 1,
  },

  training_sessions_50: {
    id: 'training_sessions_50',
    category: 'training',
    name: 'Dedicated Trainer',
    description: 'Complete 50 training sessions',
    icon: '📚',
    rarity: 'uncommon',
    reward: {
      cash: 500,
      xp: 150,
    },
    targetValue: 50,
  },

  training_sessions_200: {
    id: 'training_sessions_200',
    category: 'training',
    name: 'Master Trainer',
    description: 'Complete 200 training sessions',
    icon: '🏆',
    rarity: 'rare',
    reward: {
      cash: 2000,
      gems: 20,
      xp: 500,
    },
    targetValue: 200,
    requires: ['training_sessions_50'],
  },

  perfect_dog: {
    id: 'perfect_dog',
    category: 'training',
    name: 'Perfection',
    description: 'Train a dog to 100 in all trained stats',
    icon: '⭐',
    rarity: 'epic',
    reward: {
      cash: 5000,
      gems: 50,
      xp: 1000,
    },
    targetValue: 1,
  },

  // === COMPETITIONS ===
  first_competition: {
    id: 'first_competition',
    category: 'competition',
    name: 'First Competitor',
    description: 'Enter your first competition',
    icon: '🏁',
    rarity: 'common',
    reward: {
      cash: 100,
      xp: 50,
    },
    targetValue: 1,
  },

  first_win: {
    id: 'first_win',
    category: 'competition',
    name: 'First Victory',
    description: 'Win your first competition',
    icon: '🥇',
    rarity: 'common',
    reward: {
      cash: 250,
      xp: 100,
    },
    targetValue: 1,
  },

  competition_wins_10: {
    id: 'competition_wins_10',
    category: 'competition',
    name: 'Rising Star',
    description: 'Win 10 competitions',
    icon: '🌟',
    rarity: 'uncommon',
    reward: {
      cash: 1000,
      gems: 10,
      xp: 250,
    },
    targetValue: 10,
    requires: ['first_win'],
  },

  competition_wins_50: {
    id: 'competition_wins_50',
    category: 'competition',
    name: 'Champion',
    description: 'Win 50 competitions',
    icon: '👑',
    rarity: 'rare',
    reward: {
      cash: 5000,
      gems: 50,
      xp: 1000,
    },
    targetValue: 50,
    requires: ['competition_wins_10'],
  },

  national_champion: {
    id: 'national_champion',
    category: 'competition',
    name: 'National Champion',
    description: 'Win a National-tier competition',
    icon: '🏅',
    rarity: 'epic',
    reward: {
      cash: 3000,
      gems: 30,
      xp: 750,
    },
    targetValue: 1,
  },

  // === BREEDING ===
  first_breed: {
    id: 'first_breed',
    category: 'breeding',
    name: 'First Litter',
    description: 'Breed your first puppies',
    icon: '🍼',
    rarity: 'common',
    reward: {
      cash: 200,
      xp: 100,
    },
    targetValue: 1,
  },

  puppies_bred_10: {
    id: 'puppies_bred_10',
    category: 'breeding',
    name: 'Puppy Mill',
    description: 'Breed 10 litters',
    icon: '👶',
    rarity: 'uncommon',
    reward: {
      cash: 1000,
      gems: 10,
      xp: 300,
    },
    targetValue: 10,
    requires: ['first_breed'],
  },

  perfect_genetics: {
    id: 'perfect_genetics',
    category: 'breeding',
    name: 'Perfect Genes',
    description: 'Breed a puppy with all stats above 90',
    icon: '🧬',
    rarity: 'epic',
    reward: {
      cash: 5000,
      gems: 75,
      xp: 1500,
    },
    targetValue: 1,
  },

  // === COLLECTION ===
  breeds_unlocked_5: {
    id: 'breeds_unlocked_5',
    category: 'collection',
    name: 'Breed Variety',
    description: 'Own dogs of 5 different breeds',
    icon: '📖',
    rarity: 'common',
    reward: {
      cash: 300,
      xp: 100,
    },
    targetValue: 5,
  },

  breeds_unlocked_15: {
    id: 'breeds_unlocked_15',
    category: 'collection',
    name: 'Breed Enthusiast',
    description: 'Own dogs of 15 different breeds',
    icon: '🌈',
    rarity: 'rare',
    reward: {
      cash: 2000,
      gems: 25,
      xp: 500,
    },
    targetValue: 15,
    requires: ['breeds_unlocked_5'],
  },

  rare_breed_collector: {
    id: 'rare_breed_collector',
    category: 'collection',
    name: 'Rare Collector',
    description: 'Own a dog from every rarity tier',
    icon: '💎',
    rarity: 'epic',
    reward: {
      cash: 3000,
      gems: 50,
      xp: 750,
    },
    targetValue: 1,
  },

  // === CARE & BONDING ===
  bond_level_5: {
    id: 'bond_level_5',
    category: 'care',
    name: 'Best Friends',
    description: 'Reach bond level 5 with a dog',
    icon: '💕',
    rarity: 'common',
    reward: {
      cash: 200,
      xp: 100,
    },
    targetValue: 5,
  },

  bond_level_10: {
    id: 'bond_level_10',
    category: 'care',
    name: 'Unbreakable Bond',
    description: 'Reach bond level 10 with a dog',
    icon: '💖',
    rarity: 'uncommon',
    reward: {
      cash: 500,
      gems: 10,
      xp: 250,
    },
    targetValue: 10,
    requires: ['bond_level_5'],
  },

  play_sessions_100: {
    id: 'play_sessions_100',
    category: 'care',
    name: 'Playful Owner',
    description: 'Play with your dogs 100 times',
    icon: '🎾',
    rarity: 'uncommon',
    reward: {
      cash: 750,
      xp: 200,
    },
    targetValue: 100,
  },

  // === PROGRESSION ===
  level_10: {
    id: 'level_10',
    category: 'progression',
    name: 'Rising Through Ranks',
    description: 'Reach level 10',
    icon: '⬆️',
    rarity: 'common',
    reward: {
      cash: 500,
      gems: 10,
      xp: 0,
    },
    targetValue: 10,
  },

  level_25: {
    id: 'level_25',
    category: 'progression',
    name: 'Experienced Handler',
    description: 'Reach level 25',
    icon: '📈',
    rarity: 'uncommon',
    reward: {
      cash: 2000,
      gems: 25,
      xp: 0,
    },
    targetValue: 25,
    requires: ['level_10'],
  },

  level_50: {
    id: 'level_50',
    category: 'progression',
    name: 'Legendary Breeder',
    description: 'Reach level 50',
    icon: '👑',
    rarity: 'legendary',
    reward: {
      cash: 10000,
      gems: 100,
      xp: 0,
    },
    targetValue: 50,
    requires: ['level_25'],
  },

  millionaire: {
    id: 'millionaire',
    category: 'progression',
    name: 'Millionaire',
    description: 'Accumulate $1,000,000 total cash',
    icon: '💰',
    rarity: 'epic',
    reward: {
      gems: 100,
      xp: 1000,
    },
    targetValue: 1000000,
  },

  // === SPECIAL ===
  login_streak_7: {
    id: 'login_streak_7',
    category: 'special',
    name: 'Dedicated',
    description: 'Login 7 days in a row',
    icon: '📅',
    rarity: 'uncommon',
    reward: {
      cash: 500,
      gems: 15,
      xp: 200,
    },
    targetValue: 7,
  },

  login_streak_30: {
    id: 'login_streak_30',
    category: 'special',
    name: 'Unwavering Commitment',
    description: 'Login 30 days in a row',
    icon: '🔥',
    rarity: 'epic',
    reward: {
      cash: 3000,
      gems: 75,
      xp: 1000,
    },
    targetValue: 30,
    requires: ['login_streak_7'],
  },

  rescue_hero: {
    id: 'rescue_hero',
    category: 'special',
    name: 'Rescue Hero',
    description: 'Adopt 10 dogs from the pound',
    icon: '🦸',
    rarity: 'rare',
    reward: {
      cash: 1000,
      gems: 20,
      xp: 500,
    },
    targetValue: 10,
  },

  speed_demon: {
    id: 'speed_demon',
    category: 'special',
    name: 'Speed Demon',
    description: 'Win a competition with a dog that has 100+ speed',
    icon: '⚡',
    rarity: 'rare',
    reward: {
      cash: 1500,
      gems: 20,
      xp: 400,
    },
    targetValue: 1,
    isHidden: true,
  },

  gentle_giant: {
    id: 'gentle_giant',
    category: 'special',
    name: 'Gentle Giant',
    description: 'Raise a Giant-sized dog with the "Gentle" personality',
    icon: '🐻',
    rarity: 'rare',
    reward: {
      cash: 1000,
      gems: 15,
      xp: 350,
    },
    targetValue: 1,
    isHidden: true,
  },
};
