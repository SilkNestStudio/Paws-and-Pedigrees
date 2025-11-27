export interface JobType {
  id: string;
  name: string;
  icon: string;
  description: string;
  basePay: number;
  duration: number; // seconds
  skillType: 'training_skill' | 'care_knowledge' | 'business_acumen' | null;
  unlockLevel: number;
  dailyLimit: number;
}

export const jobTypes: JobType[] = [
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
  {
    id: 'grooming',
    name: 'Dog Grooming',
    icon: '✂️',
    description: 'Groom a client dog',
    basePay: 75,
    duration: 5,
    skillType: 'care_knowledge',
    unlockLevel: 10,
    dailyLimit: 5,
  },
  {
    id: 'training_others',
    name: 'Train Client Dog',
    icon: '🎓',
    description: 'Train someone else\'s dog',
    basePay: 100,
    duration: 10,
    skillType: 'training_skill',
    unlockLevel: 11,
    dailyLimit: 3,
  },
];
