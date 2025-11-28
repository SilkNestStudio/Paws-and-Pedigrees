export interface JobType {
  id: string;
  name: string;
  icon: string;
  description: string;
  basePay: number;
  duration: number; // seconds
  skillType: 'training_skill' | 'care_knowledge' | 'business_acumen' | 'breeding_expertise' | null;
  unlockLevel: number;
  dailyLimit: number;
}

export const jobTypes: JobType[] = [
  // Level 1 Jobs (Starter)
  {
    id: 'dog_walking',
    name: 'Dog Walking',
    icon: '🐕',
    description: 'Walk a neighborhood dog',
    basePay: 20,
    duration: 5,
    skillType: 'care_knowledge',
    unlockLevel: 1,
    dailyLimit: 10,
  },
  {
    id: 'kennel_cleaning',
    name: 'Kennel Cleaning',
    icon: '🧹',
    description: 'Clean up after dogs',
    basePay: 50,
    duration: 2,
    skillType: null,
    unlockLevel: 1,
    dailyLimit: 5,
  },

  // Level 3 Jobs
  {
    id: 'pet_sitting',
    name: 'Pet Sitting',
    icon: '🏠',
    description: 'Watch a client\'s dog while they\'re away',
    basePay: 40,
    duration: 8,
    skillType: 'care_knowledge',
    unlockLevel: 3,
    dailyLimit: 8,
  },

  // Level 5 Jobs
  {
    id: 'basic_obedience',
    name: 'Basic Obedience Class',
    icon: '🦴',
    description: 'Teach basic commands to a group',
    basePay: 60,
    duration: 7,
    skillType: 'training_skill',
    unlockLevel: 5,
    dailyLimit: 6,
  },

  // Level 7 Jobs
  {
    id: 'dog_photography',
    name: 'Dog Photography',
    icon: '📸',
    description: 'Take professional photos of client dogs',
    basePay: 80,
    duration: 6,
    skillType: 'business_acumen',
    unlockLevel: 7,
    dailyLimit: 5,
  },

  // Level 10 Jobs
  {
    id: 'grooming',
    name: 'Dog Grooming',
    icon: '✂️',
    description: 'Groom a client dog professionally',
    basePay: 90,
    duration: 5,
    skillType: 'care_knowledge',
    unlockLevel: 10,
    dailyLimit: 5,
  },

  // Level 12 Jobs
  {
    id: 'vet_assistant',
    name: 'Veterinary Assistant',
    icon: '🩺',
    description: 'Help at the local vet clinic',
    basePay: 110,
    duration: 10,
    skillType: 'care_knowledge',
    unlockLevel: 12,
    dailyLimit: 4,
  },

  // Level 15 Jobs
  {
    id: 'training_others',
    name: 'Advanced Training',
    icon: '🎓',
    description: 'Provide advanced training for competition dogs',
    basePay: 140,
    duration: 12,
    skillType: 'training_skill',
    unlockLevel: 15,
    dailyLimit: 4,
  },

  // Level 18 Jobs
  {
    id: 'breeding_consultant',
    name: 'Breeding Consultant',
    icon: '🧬',
    description: 'Advise other breeders on pairing selection',
    basePay: 180,
    duration: 15,
    skillType: 'breeding_expertise',
    unlockLevel: 18,
    dailyLimit: 3,
  },

  // Level 20 Jobs
  {
    id: 'kennel_inspector',
    name: 'Kennel Inspector',
    icon: '📋',
    description: 'Inspect kennels for certification',
    basePay: 220,
    duration: 20,
    skillType: 'business_acumen',
    unlockLevel: 20,
    dailyLimit: 3,
  },

  // Level 25 Jobs
  {
    id: 'show_judge',
    name: 'Dog Show Judge',
    icon: '🏆',
    description: 'Judge conformation at local dog shows',
    basePay: 300,
    duration: 25,
    skillType: 'breeding_expertise',
    unlockLevel: 25,
    dailyLimit: 2,
  },
];
