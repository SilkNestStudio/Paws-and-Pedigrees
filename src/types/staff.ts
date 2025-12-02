export type StaffRole =
  | 'trainer'
  | 'groomer'
  | 'vet_assistant'
  | 'caretaker'
  | 'nutritionist'
  | 'handler'
  | 'kennel_manager';

export type StaffQuality = 'basic' | 'experienced' | 'expert' | 'master';

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  quality: StaffQuality;
  level: number;
  experience: number;
  hiredAt: string;

  // Costs
  hiringCost: number;
  dailyWage: number;

  // Specializations
  specialties?: string[];

  // Performance
  efficiency: number; // 0.8 to 1.5 multiplier
  reliability: number; // 80-100% (affects task completion)

  // Assignment
  assignedDogs?: string[]; // Dog IDs this staff is caring for
  currentTask?: StaffTask;

  // Stats
  tasksCompleted: number;
  daysWorked: number;
}

export interface StaffTask {
  taskType: 'training' | 'grooming' | 'feeding' | 'health_check' | 'exercise';
  targetDogId: string;
  startedAt: string;
  completesAt: string;
  reward?: {
    cash?: number;
    xp?: number;
  };
}

export interface StaffTemplate {
  role: StaffRole;
  quality: StaffQuality;
  name: string;
  description: string;
  icon: string;

  // Requirements
  unlockLevel: number;
  kennelLevelRequired: number;

  // Costs
  hiringCost: number;
  dailyWage: number;

  // Capabilities
  efficiency: number;
  reliability: number;
  maxDogs: number; // How many dogs can they handle

  // Benefits
  benefits: string[];
  specialAbility?: string;
}

export interface StaffBenefits {
  autoFeeding?: boolean; // Automatically feed dogs
  autoGrooming?: boolean; // Automatically groom dogs
  autoTraining?: boolean; // Passive training gains
  autoHealthCheck?: boolean; // Monitor and alert health issues
  reducedCareCosts?: number; // Percentage reduction in care costs
  bonusTrainingSpeed?: number; // Training multiplier
  bonusHappiness?: number; // Happiness boost for assigned dogs
}
