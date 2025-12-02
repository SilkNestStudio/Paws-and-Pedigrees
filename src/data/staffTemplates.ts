import { StaffTemplate } from '../types/staff';

export const STAFF_TEMPLATES: StaffTemplate[] = [
  // Basic Tier
  {
    role: 'caretaker',
    quality: 'basic',
    name: 'Junior Caretaker',
    description: 'Helps with basic dog care tasks',
    icon: '👤',
    unlockLevel: 3,
    kennelLevelRequired: 1,
    hiringCost: 500,
    dailyWage: 50,
    efficiency: 0.8,
    reliability: 85,
    maxDogs: 2,
    benefits: [
      'Automatically feeds assigned dogs',
      'Provides water throughout the day',
      'Basic grooming once per day',
    ],
  },
  {
    role: 'trainer',
    quality: 'basic',
    name: 'Assistant Trainer',
    description: 'Provides basic training assistance',
    icon: '🎓',
    unlockLevel: 5,
    kennelLevelRequired: 2,
    hiringCost: 1000,
    dailyWage: 75,
    efficiency: 0.9,
    reliability: 80,
    maxDogs: 3,
    benefits: [
      'Passive training: +0.5 points per day',
      'Reduces training time by 10%',
      'Can run basic training sessions',
    ],
    specialAbility: 'Basic obedience training automation',
  },

  // Experienced Tier
  {
    role: 'groomer',
    quality: 'experienced',
    name: 'Professional Groomer',
    description: 'Expert in dog grooming and presentation',
    icon: '✂️',
    unlockLevel: 8,
    kennelLevelRequired: 3,
    hiringCost: 2500,
    dailyWage: 125,
    efficiency: 1.1,
    reliability: 90,
    maxDogs: 4,
    benefits: [
      'Automatically grooms dogs to perfection',
      '+5 bonus to show competitions',
      'Keeps dogs happy and clean',
      'Reduces grooming costs by 25%',
    ],
    specialAbility: 'Show-ready grooming: +10% competition appearance',
  },
  {
    role: 'vet_assistant',
    quality: 'experienced',
    name: 'Veterinary Assistant',
    description: 'Monitors health and prevents illness',
    icon: '🩺',
    unlockLevel: 10,
    kennelLevelRequired: 3,
    hiringCost: 3000,
    dailyWage: 150,
    efficiency: 1.0,
    reliability: 95,
    maxDogs: 5,
    benefits: [
      'Daily health monitoring',
      'Early illness detection',
      'Reduces vet costs by 30%',
      'Automatic minor health issue resolution',
    ],
    specialAbility: 'Health Guardian: Prevents 50% of random illnesses',
  },
  {
    role: 'nutritionist',
    quality: 'experienced',
    name: 'Canine Nutritionist',
    description: 'Optimizes diet for peak performance',
    icon: '🥗',
    unlockLevel: 12,
    kennelLevelRequired: 4,
    hiringCost: 3500,
    dailyWage: 175,
    efficiency: 1.15,
    reliability: 92,
    maxDogs: 6,
    benefits: [
      'Optimized feeding schedules',
      '+10% energy recovery rate',
      '+5% training effectiveness',
      'Reduces food consumption by 20%',
    ],
    specialAbility: 'Perfect Nutrition: Dogs maintain peak condition',
  },

  // Expert Tier
  {
    role: 'trainer',
    quality: 'expert',
    name: 'Master Trainer',
    description: 'Elite training specialist',
    icon: '🏆',
    unlockLevel: 15,
    kennelLevelRequired: 5,
    hiringCost: 7500,
    dailyWage: 300,
    efficiency: 1.3,
    reliability: 95,
    maxDogs: 4,
    benefits: [
      'Passive training: +2 points per day',
      '+25% training speed',
      '+10% competition performance',
      'Can train specialized skills',
    ],
    specialAbility: 'Championship Training: Unlocks advanced techniques',
  },
  {
    role: 'handler',
    quality: 'expert',
    name: 'Professional Handler',
    description: 'Competition specialist and strategist',
    icon: '🎖️',
    unlockLevel: 18,
    kennelLevelRequired: 6,
    hiringCost: 10000,
    dailyWage: 400,
    efficiency: 1.4,
    reliability: 98,
    maxDogs: 3,
    benefits: [
      '+20% competition scores',
      'Automatic competition entry optimization',
      '+15% prize money',
      'Reduces stress on dogs during events',
    ],
    specialAbility: 'Championship Mindset: Dogs perform at 110% in major events',
  },

  // Master Tier
  {
    role: 'kennel_manager',
    quality: 'master',
    name: 'Elite Kennel Manager',
    description: 'Oversees entire kennel operations',
    icon: '👔',
    unlockLevel: 20,
    kennelLevelRequired: 7,
    hiringCost: 25000,
    dailyWage: 750,
    efficiency: 1.5,
    reliability: 99,
    maxDogs: 10,
    benefits: [
      'Manages all kennel operations',
      '+15% to all activities',
      'Coordinates staff efficiency',
      'Generates passive income: $200/day',
      'Reduces all costs by 20%',
    ],
    specialAbility: 'Master Operations: Entire kennel runs at peak efficiency',
  },
];

// Helper to get staff templates by role
export function getStaffTemplatesByRole(role: string): StaffTemplate[] {
  return STAFF_TEMPLATES.filter(template => template.role === role);
}

// Helper to get affordable staff
export function getAffordableStaff(
  userCash: number,
  userLevel: number,
  kennelLevel: number
): StaffTemplate[] {
  return STAFF_TEMPLATES.filter(
    template =>
      template.hiringCost <= userCash &&
      template.unlockLevel <= userLevel &&
      template.kennelLevelRequired <= kennelLevel
  );
}

// Calculate total daily wages for staff
export function calculateDailyWages(staffMembers: any[]): number {
  return staffMembers.reduce((total, staff) => total + (staff.dailyWage || 0), 0);
}

// Generate a random staff name
export function generateStaffName(_role: string): string {
  const firstNames = [
    'Alex', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Taylor', 'Jamie', 'Quinn',
    'Avery', 'Skyler', 'Dakota', 'Reese', 'Cameron', 'Parker', 'Drew', 'Sam'
  ];

  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
    'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson'
  ];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  return `${firstName} ${lastName}`;
}
