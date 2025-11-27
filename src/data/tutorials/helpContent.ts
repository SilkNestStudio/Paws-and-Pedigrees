import { HelpContent } from '../../types';

export const HELP_CONTENT: Record<string, HelpContent> = {
  'training-points': {
    id: 'training-points',
    title: 'Training Points (TP)',
    content: 'Each dog gets 100 TP daily at midnight. Use TP to train and improve stats. Higher trainability = better gains.',
    tutorialId: 'training-basics'
  },

  'bond-level': {
    id: 'bond-level',
    title: 'Bond Level',
    content: 'Build bond through care and training. Rescue dogs get training bonuses based on bond level (up to +25% at max bond).',
  },

  'competition-tiers': {
    id: 'competition-tiers',
    title: 'Competition Tiers',
    content: 'Local (always unlocked), Regional (15 local wins), National (25 regional wins). Higher tiers = bigger prizes.',
    tutorialId: 'competition-basics'
  },

  'breeding-genetics': {
    id: 'breeding-genetics',
    title: 'Breeding & Genetics',
    content: 'Puppies inherit stats from parents. Avoid inbreeding for healthy litters. Costs $500, takes 2 weeks.',
    tutorialId: 'breeding-basics'
  },

  'jobs-daily-limits': {
    id: 'jobs-daily-limits',
    title: 'Daily Job Limits',
    content: 'Each job can only be done a set number of times per day. Limits reset at midnight. Plan wisely!',
    tutorialId: 'jobs-detailed'
  },

  'kennel-management': {
    id: 'kennel-management',
    title: 'Kennel Management',
    content: 'Keep your dogs happy, healthy, and well-fed. Check stats regularly and use activities to boost mood.',
    tutorialId: 'kennel-basics'
  },

  'dog-care-basics': {
    id: 'dog-care-basics',
    title: 'Dog Care',
    content: 'Feed when hunger is low, play when happiness drops, and rest when energy is depleted. Healthy dogs perform better!',
    tutorialId: 'dog-care-basics'
  },

  'office-overview': {
    id: 'office-overview',
    title: 'Office Dashboard',
    content: 'Your command center. Check alerts, view stats, and quickly navigate to any feature from here.',
  },

  'economy-basics': {
    id: 'economy-basics',
    title: 'Cash & Gems',
    content: 'Earn cash from jobs, competitions, and selling puppies. Gems are premium currency for special items and shortcuts.',
    tutorialId: 'economy-quick'
  },

  'shop-breeds': {
    id: 'shop-breeds',
    title: 'Buying Breeds',
    content: 'Higher tier breeds have better base stats. Choose breeds that excel in your target competition type.',
    tutorialId: 'shop-quick'
  },

  'shop-items': {
    id: 'shop-items',
    title: 'Shop Items',
    content: 'Buy food, toys, and health items to care for your dogs. Training items give bonus TP.',
    tutorialId: 'shop-quick'
  },

  'puppy-milestones': {
    id: 'puppy-milestones',
    title: 'Puppy Growth',
    content: 'Puppies mature over time. Train at 8+ weeks, compete at 12+ weeks, breed at 16+ weeks.',
  },

  'training-minigames': {
    id: 'training-minigames',
    title: 'Training Mini-Games',
    content: 'Play mini-games yourself for a performance bonus, or use NPC trainers for instant results. Better performance = bigger stat gains.',
    tutorialId: 'training-basics'
  },
};
