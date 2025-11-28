import { ShopItem } from '../types';

/**
 * Purchasable items in the shop
 * Categories: supplies (food storage), food (treats), toy, health, energy, training
 */
export const shopItems: ShopItem[] = [
  // SUPPLIES - Dog Food Bags (adds to food storage)
  {
    id: 'dog_food_small',
    name: 'Small Dog Food Bag',
    category: 'supplies',
    description: '8 bags fill storage. Essential for feeding your dogs.',
    price: 50,
    icon: '🛍️',
    effect: {
      food_storage: 12.5, // 12.5 units
    },
    unlock_level: 1,
  },
  {
    id: 'dog_food_medium',
    name: 'Medium Dog Food Bag',
    category: 'supplies',
    description: '4 bags fill storage. Better value for active kennels.',
    price: 90,
    icon: '📦',
    effect: {
      food_storage: 25, // 25 units
    },
    unlock_level: 1,
  },
  {
    id: 'dog_food_large',
    name: 'Large Dog Food Bag',
    category: 'supplies',
    description: '2 bags fill storage. Best value for large kennels.',
    price: 160,
    icon: '📦',
    effect: {
      food_storage: 50, // 50 units
    },
    unlock_level: 5,
  },

  // FOOD ITEMS - Treats (directly restore hunger, don't require storage)
  {
    id: 'kibble_basic',
    name: 'Basic Kibble',
    category: 'food',
    description: 'Standard dry dog food. Restores some hunger.',
    price: 10,
    icon: '🥘',
    effect: {
      hunger: 20,
    },
    unlock_level: 1,
  },
  {
    id: 'kibble_premium',
    name: 'Premium Kibble',
    category: 'food',
    description: 'High-quality dog food. Restores more hunger.',
    price: 25,
    icon: '🍖',
    effect: {
      hunger: 50,
    },
    unlock_level: 1,
  },
  {
    id: 'raw_diet',
    name: 'Raw Diet Meal',
    category: 'food',
    description: 'Fresh raw food. Fully restores hunger and boosts health.',
    price: 50,
    icon: '🥩',
    effect: {
      hunger: 100,
      health: 10,
    },
    unlock_level: 10,
  },

  // TOY ITEMS - Restore happiness
  {
    id: 'tennis_ball',
    name: 'Tennis Ball',
    category: 'toy',
    description: 'Classic fetch toy. Restores some happiness.',
    price: 15,
    icon: '🎾',
    effect: {
      happiness: 25,
    },
    unlock_level: 1,
  },
  {
    id: 'rope_toy',
    name: 'Rope Toy',
    category: 'toy',
    description: 'Durable tug toy. Restores more happiness.',
    price: 30,
    icon: '🪢',
    effect: {
      happiness: 40,
    },
    unlock_level: 1,
  },
  {
    id: 'interactive_puzzle',
    name: 'Puzzle Toy',
    category: 'toy',
    description: 'Mental stimulation. Restores happiness and energy.',
    price: 75,
    icon: '🧩',
    effect: {
      happiness: 60,
      energy_stat: 20,
    },
    unlock_level: 15,
  },
  {
    id: 'luxury_toy_set',
    name: 'Luxury Toy Set',
    category: 'toy',
    description: 'Premium toy collection. Fully restores happiness.',
    price: 150,
    gem_price: 15,
    icon: '🎁',
    effect: {
      happiness: 100,
    },
    unlock_level: 20,
  },

  // HEALTH ITEMS - Restore health
  {
    id: 'first_aid',
    name: 'First Aid Kit',
    category: 'health',
    description: 'Basic medical supplies. Restores some health.',
    price: 50,
    icon: '🏥',
    effect: {
      health: 30,
    },
    unlock_level: 1,
  },
  {
    id: 'vitamins',
    name: 'Vitamin Supplement',
    category: 'health',
    description: 'Daily vitamins. Restores health over time.',
    price: 100,
    icon: '💊',
    effect: {
      health: 50,
    },
    unlock_level: 10,
  },
  {
    id: 'vet_treatment',
    name: 'Vet Treatment',
    category: 'health',
    description: 'Professional care. Fully restores health.',
    price: 200,
    gem_price: 20,
    icon: '⚕️',
    effect: {
      health: 100,
    },
    unlock_level: 1,
  },

  // ENERGY ITEMS - Restore energy
  {
    id: 'energy_treat',
    name: 'Energy Treat',
    category: 'energy',
    description: 'Quick boost. Restores some energy.',
    price: 20,
    icon: '⚡',
    effect: {
      energy_stat: 30,
    },
    unlock_level: 1,
  },
  {
    id: 'power_meal',
    name: 'Power Meal',
    category: 'energy',
    description: 'Nutrient-rich food. Restores more energy and hunger.',
    price: 60,
    icon: '🍗',
    effect: {
      energy_stat: 60,
      hunger: 40,
    },
    unlock_level: 10,
  },
  {
    id: 'energy_elixir',
    name: 'Energy Elixir',
    category: 'energy',
    description: 'Potent formula. Fully restores energy.',
    price: 100,
    gem_price: 10,
    icon: '🧪',
    effect: {
      energy_stat: 100,
    },
    unlock_level: 15,
  },

  // TRAINING ITEMS - Grant training points
  {
    id: 'training_treats',
    name: 'Training Treats',
    category: 'training',
    description: 'Motivation snacks. Grants bonus training points.',
    price: 50,
    icon: '🦴',
    effect: {
      training_points: 50,
    },
    unlock_level: 5,
  },
  {
    id: 'clicker_kit',
    name: 'Clicker Training Kit',
    category: 'training',
    description: 'Professional tools. Grants more training points.',
    price: 150,
    icon: '🎯',
    effect: {
      training_points: 100,
    },
    unlock_level: 10,
  },
  {
    id: 'master_training_pack',
    name: 'Master Training Pack',
    category: 'training',
    description: 'Elite equipment. Grants maximum training points.',
    price: 300,
    gem_price: 30,
    icon: '🏅',
    effect: {
      training_points: 200,
    },
    unlock_level: 20,
  },

  // COMBO ITEMS - Multiple effects
  {
    id: 'care_package',
    name: 'Complete Care Package',
    category: 'health',
    description: 'Everything your dog needs. Restores all stats significantly.',
    price: 500,
    gem_price: 50,
    icon: '📦',
    effect: {
      hunger: 100,
      happiness: 100,
      health: 75,
      energy_stat: 75,
    },
    unlock_level: 25,
  },
];
