/**
 * Item Definitions - All available items in the game
 */

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  category: 'treat' | 'toy' | 'training' | 'health' | 'special';
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  effects: {
    energy?: number;
    happiness?: number;
    health?: number;
    hunger?: number;
    bond_xp?: number;
    training_boost?: number; // Multiplier for next training session
    duration?: number; // How long effect lasts in minutes
  };
  stackable: boolean;
  maxStack?: number;
  usageText: string; // Text shown when using the item
}

export const items: Record<string, ItemDefinition> = {
  // === TREATS (Energy & Hunger) ===
  energy_treat: {
    id: 'energy_treat',
    name: 'Energy Treat',
    description: 'A delicious treat that restores energy',
    category: 'treat',
    icon: '🍖',
    rarity: 'common',
    effects: {
      energy: 25,
      happiness: 5,
    },
    stackable: true,
    maxStack: 99,
    usageText: 'gave your dog an energy treat! Energy +25, Happiness +5',
  },
  premium_treat: {
    id: 'premium_treat',
    name: 'Premium Treat',
    description: 'A high-quality treat that greatly restores energy',
    category: 'treat',
    icon: '🥩',
    rarity: 'uncommon',
    effects: {
      energy: 50,
      happiness: 10,
      bond_xp: 5,
    },
    stackable: true,
    maxStack: 99,
    usageText: 'gave your dog a premium treat! Energy +50, Happiness +10, Bond XP +5',
  },
  super_treat: {
    id: 'super_treat',
    name: 'Super Treat',
    description: 'An exceptional treat that fully restores energy',
    category: 'treat',
    icon: '⭐',
    rarity: 'rare',
    effects: {
      energy: 100,
      happiness: 20,
      bond_xp: 10,
    },
    stackable: true,
    maxStack: 50,
    usageText: 'gave your dog a super treat! Energy fully restored, Happiness +20, Bond XP +10',
  },

  // === TOYS (Happiness & Bond) ===
  tennis_ball: {
    id: 'tennis_ball',
    name: 'Tennis Ball',
    description: 'A classic toy that makes dogs happy',
    category: 'toy',
    icon: '🎾',
    rarity: 'common',
    effects: {
      happiness: 15,
      bond_xp: 5,
    },
    stackable: true,
    maxStack: 99,
    usageText: 'played fetch with your dog using a tennis ball! Happiness +15, Bond XP +5',
  },
  rope_toy: {
    id: 'rope_toy',
    name: 'Rope Toy',
    description: 'A durable rope for tug-of-war',
    category: 'toy',
    icon: '🪢',
    rarity: 'common',
    effects: {
      happiness: 20,
      bond_xp: 8,
      energy: -5, // Playing hard uses some energy
    },
    stackable: true,
    maxStack: 99,
    usageText: 'had a tug-of-war session with your dog! Happiness +20, Bond XP +8',
  },
  squeaky_toy: {
    id: 'squeaky_toy',
    name: 'Squeaky Toy',
    description: 'An entertaining toy that dogs love',
    category: 'toy',
    icon: '🦴',
    rarity: 'uncommon',
    effects: {
      happiness: 25,
      bond_xp: 10,
    },
    stackable: true,
    maxStack: 99,
    usageText: 'let your dog play with a squeaky toy! Happiness +25, Bond XP +10',
  },
  luxury_toy: {
    id: 'luxury_toy',
    name: 'Luxury Toy',
    description: 'A premium toy that provides great entertainment',
    category: 'toy',
    icon: '🎁',
    rarity: 'rare',
    effects: {
      happiness: 40,
      bond_xp: 15,
    },
    stackable: true,
    maxStack: 50,
    usageText: 'gave your dog a luxury toy! Happiness +40, Bond XP +15',
  },

  // === TRAINING ITEMS (Boosts) ===
  training_manual: {
    id: 'training_manual',
    name: 'Training Manual',
    description: 'Increases training effectiveness for next session',
    category: 'training',
    icon: '📖',
    rarity: 'uncommon',
    effects: {
      training_boost: 1.25, // 25% boost
      duration: 60, // Lasts 60 minutes
    },
    stackable: true,
    maxStack: 50,
    usageText: 'studied the training manual! Next training session will be 25% more effective for 1 hour',
  },
  advanced_training_guide: {
    id: 'advanced_training_guide',
    name: 'Advanced Training Guide',
    description: 'Greatly increases training effectiveness',
    category: 'training',
    icon: '📚',
    rarity: 'rare',
    effects: {
      training_boost: 1.5, // 50% boost
      duration: 90,
    },
    stackable: true,
    maxStack: 25,
    usageText: 'studied the advanced training guide! Next training session will be 50% more effective for 90 minutes',
  },
  master_training_tome: {
    id: 'master_training_tome',
    name: 'Master Training Tome',
    description: 'Doubles training effectiveness',
    category: 'training',
    icon: '📔',
    rarity: 'epic',
    effects: {
      training_boost: 2.0, // 100% boost (doubles)
      duration: 120,
    },
    stackable: true,
    maxStack: 10,
    usageText: 'studied the master training tome! Next training session will be DOUBLED in effectiveness for 2 hours!',
  },

  // === HEALTH ITEMS ===
  health_potion: {
    id: 'health_potion',
    name: 'Health Potion',
    description: 'Restores health',
    category: 'health',
    icon: '💊',
    rarity: 'uncommon',
    effects: {
      health: 30,
    },
    stackable: true,
    maxStack: 99,
    usageText: 'gave your dog a health potion! Health +30',
  },
  full_health_elixir: {
    id: 'full_health_elixir',
    name: 'Full Health Elixir',
    description: 'Fully restores health',
    category: 'health',
    icon: '🧪',
    rarity: 'rare',
    effects: {
      health: 100,
    },
    stackable: true,
    maxStack: 50,
    usageText: 'gave your dog a full health elixir! Health fully restored!',
  },
  vitamin_supplement: {
    id: 'vitamin_supplement',
    name: 'Vitamin Supplement',
    description: 'Restores health and provides a small boost',
    category: 'health',
    icon: '💉',
    rarity: 'uncommon',
    effects: {
      health: 20,
      energy: 10,
      happiness: 5,
    },
    stackable: true,
    maxStack: 99,
    usageText: 'gave your dog vitamins! Health +20, Energy +10, Happiness +5',
  },

  // === SPECIAL ITEMS ===
  bond_charm: {
    id: 'bond_charm',
    name: 'Bond Charm',
    description: 'A special charm that strengthens your bond',
    category: 'special',
    icon: '💝',
    rarity: 'epic',
    effects: {
      bond_xp: 25,
      happiness: 15,
    },
    stackable: true,
    maxStack: 20,
    usageText: 'used a bond charm on your dog! Bond XP +25, Happiness +15',
  },
  experience_booster: {
    id: 'experience_booster',
    name: 'Experience Booster',
    description: 'Boosts ALL stats for next training',
    category: 'special',
    icon: '✨',
    rarity: 'legendary',
    effects: {
      training_boost: 3.0, // Triples training!
      duration: 180,
      bond_xp: 20,
    },
    stackable: true,
    maxStack: 5,
    usageText: 'activated an experience booster! Next training will be TRIPLED for 3 hours! Bond XP +20',
  },
  champion_medal: {
    id: 'champion_medal',
    name: 'Champion Medal',
    description: 'A commemorative medal from a championship victory',
    category: 'special',
    icon: '🏆',
    rarity: 'legendary',
    effects: {
      happiness: 50,
      bond_xp: 30,
    },
    stackable: true,
    maxStack: 10,
    usageText: 'showed your dog their champion medal! They look so proud! Happiness +50, Bond XP +30',
  },
};

/**
 * Get item definition by ID
 */
export function getItem(itemId: string): ItemDefinition | undefined {
  return items[itemId];
}

/**
 * Get all items in a category
 */
export function getItemsByCategory(category: ItemDefinition['category']): ItemDefinition[] {
  return Object.values(items).filter(item => item.category === category);
}

/**
 * Get rarity color for UI
 */
export function getRarityColor(rarity: ItemDefinition['rarity']): string {
  const colors = {
    common: 'text-gray-600',
    uncommon: 'text-green-600',
    rare: 'text-blue-600',
    epic: 'text-purple-600',
    legendary: 'text-yellow-600',
  };
  return colors[rarity];
}

/**
 * Get rarity background color for UI
 */
export function getRarityBgColor(rarity: ItemDefinition['rarity']): string {
  const colors = {
    common: 'bg-gray-100',
    uncommon: 'bg-green-100',
    rare: 'bg-blue-100',
    epic: 'bg-purple-100',
    legendary: 'bg-yellow-100',
  };
  return colors[rarity];
}
