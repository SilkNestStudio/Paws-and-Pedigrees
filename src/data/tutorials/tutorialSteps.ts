import { Tutorial } from '../../types';

export const TUTORIALS: Record<string, Tutorial> = {
  'kennel-basics': {
    id: 'kennel-basics',
    name: 'Kennel Management',
    triggerType: 'auto',
    triggerCondition: 'hasAdoptedFirstDog',
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to Your Kennel!',
        content: 'Let\'s learn the basics of caring for your new dog.',
        spotlightMode: false,
        position: 'center',
        canSkip: true
      },
      {
        id: 'stats-intro',
        title: 'Dog Stats',
        content: 'Keep hunger, happiness, health, and energy high for peak performance.',
        spotlightMode: false,
        position: 'center',
        canSkip: true
      },
      {
        id: 'care-basics',
        title: 'Daily Care',
        content: 'Click on your dog to feed, play, and rest. Check stats daily!',
        spotlightMode: false,
        position: 'center',
        canSkip: true
      },
    ]
  },

  'dog-care-basics': {
    id: 'dog-care-basics',
    name: 'Dog Care Basics',
    triggerType: 'auto',
    triggerCondition: 'firstDogDetailView',
    steps: [
      {
        id: 'intro',
        title: 'Caring for Your Dog',
        content: 'Keep your dog healthy and happy to maximize performance in training and competitions.',
        spotlightMode: false,
        position: 'center',
        canSkip: true
      },
      {
        id: 'feeding',
        title: 'Feeding',
        content: 'Feed your dog when hunger drops below 70. Choose from free kibble, premium food, or treats.',
        spotlightMode: false,
        position: 'center',
        canSkip: true
      },
      {
        id: 'happiness',
        title: 'Happiness & Bond',
        content: 'Play and bond activities keep your dog happy. Higher bond = better training for rescue dogs!',
        spotlightMode: false,
        position: 'center',
        canSkip: true
      },
    ]
  },

  'training-basics': {
    id: 'training-basics',
    name: 'Training Your Dog',
    triggerType: 'prompt',
    triggerCondition: 'firstVisitTraining',
    steps: [
      {
        id: 'tp-intro',
        title: 'Training Points',
        content: 'Each dog has 100 TP daily. Use them to improve stats.',
        spotlightMode: false,
        position: 'center',
        canSkip: true
      },
      {
        id: 'choose-stat',
        title: 'Choose What to Train',
        content: 'Pick stats based on competition goals. Speed for racing, strength for weight pull.',
        spotlightMode: false,
        position: 'center',
        canSkip: true
      },
      {
        id: 'training-methods',
        title: 'Training Methods',
        content: 'Train yourself (free, play mini-game) or hire trainers (costs money, instant results).',
        spotlightMode: false,
        position: 'center',
        canSkip: true
      },
      {
        id: 'rescue-bonus',
        title: 'Rescue Dog Bonus',
        content: 'Rescue dogs get training bonuses! Higher bond = bigger bonuses (up to +25%).',
        spotlightMode: false,
        position: 'center',
        canSkip: true
      },
    ]
  },

  'breeding-basics': {
    id: 'breeding-basics',
    name: 'Breeding System',
    triggerType: 'prompt',
    triggerCondition: 'firstVisitBreeding',
    steps: [
      {
        id: 'intro',
        title: 'Breeding Basics',
        content: 'Breed dogs to create puppies with inherited stats. Costs $500, takes 2 weeks.',
        spotlightMode: false,
        position: 'center',
        canSkip: true
      },
      {
        id: 'genetics',
        title: 'Genetics Preview',
        content: 'Check expected stats, colors, and litter size before breeding. Avoid inbreeding!',
        spotlightMode: false,
        position: 'center',
        canSkip: true
      },
      {
        id: 'requirements',
        title: 'Breeding Requirements',
        content: 'Dogs must be 8+ weeks old and not on cooldown. Females have a 1-week cooldown after birth.',
        spotlightMode: false,
        position: 'center',
        canSkip: true
      },
    ]
  },

  'competition-basics': {
    id: 'competition-basics',
    name: 'Competition System',
    triggerType: 'prompt',
    triggerCondition: 'firstVisitCompetition',
    steps: [
      {
        id: 'intro',
        title: 'Enter Competitions',
        content: 'Compete to earn cash and unlock higher tiers. Each competition type tests different stats.',
        spotlightMode: false,
        position: 'center',
        canSkip: true
      },
      {
        id: 'tiers',
        title: 'Competition Tiers',
        content: 'Local (unlocked), Regional (15 wins), National (25 wins). Higher tiers = bigger prizes!',
        spotlightMode: false,
        position: 'center',
        canSkip: true
      },
      {
        id: 'manual-vs-auto',
        title: 'Manual vs Auto',
        content: 'Play mini-games yourself for bonus points, or auto-compete for quick results.',
        spotlightMode: false,
        position: 'center',
        canSkip: true
      },
    ]
  },

  'jobs-detailed': {
    id: 'jobs-detailed',
    name: 'Jobs System',
    triggerType: 'prompt',
    triggerCondition: 'firstVisitJobs',
    steps: [
      {
        id: 'overview',
        title: 'Earn Cash with Jobs',
        content: 'Complete jobs to earn money between competitions. Each has a daily limit.',
        spotlightMode: false,
        position: 'center',
        canSkip: true
      },
      {
        id: 'skill-bonus',
        title: 'Skill Bonuses',
        content: 'Your skill level increases job pay. Level up to earn more per job!',
        spotlightMode: false,
        position: 'center',
        canSkip: true
      },
      {
        id: 'daily-limits',
        title: 'Daily Limits',
        content: 'Jobs reset at midnight. Plan which jobs to prioritize each day.',
        spotlightMode: false,
        position: 'center',
        canSkip: true
      },
      {
        id: 'unlocks',
        title: 'Level Unlocks',
        content: 'Higher player level = better paying jobs. Keep leveling up!',
        spotlightMode: false,
        position: 'center',
        canSkip: true
      },
      {
        id: 'strategy',
        title: 'Income Strategy',
        content: 'Use jobs for steady income. Competitions give bigger payouts but require prepared dogs.',
        spotlightMode: false,
        position: 'center',
        canSkip: true
      },
    ]
  },

  'economy-quick': {
    id: 'economy-quick',
    name: 'Economy Basics',
    triggerType: 'manual',
    steps: [
      {
        id: 'two-currencies',
        title: 'Cash vs Gems',
        content: 'Cash for daily purchases, gems for premium items and shortcuts.',
        spotlightMode: false,
        position: 'center',
        canSkip: true
      },
      {
        id: 'earning',
        title: 'Earning Money',
        content: 'Get cash from jobs, competitions, and selling puppies. Gems from daily rewards and achievements.',
        spotlightMode: false,
        position: 'center',
        canSkip: true
      },
    ]
  },

  'shop-quick': {
    id: 'shop-quick',
    name: 'Shop Basics',
    triggerType: 'manual',
    steps: [
      {
        id: 'breeds',
        title: 'Buying Breeds',
        content: 'Higher tier breeds have better stats. Match breed to your competition goals.',
        spotlightMode: false,
        position: 'center',
        canSkip: true
      },
      {
        id: 'items',
        title: 'Shop Items',
        content: 'Food, toys, and training items help care for and improve your dogs.',
        spotlightMode: false,
        position: 'center',
        canSkip: true
      },
    ]
  },
};
