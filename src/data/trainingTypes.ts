export interface TrainingType {
  id: string;
  name: string;
  icon: string;
  description: string;
  statImproved: 'speed' | 'agility' | 'strength' | 'endurance' | 'obedience';
  tpCost: number;
  duration: number; // seconds
  selfMultiplier: number; // Based on player training skill
  npcBasicCost: number;
  npcBasicMultiplier: number;
  npcProCost: number;
  npcProMultiplier: number;
}

export const trainingTypes: TrainingType[] = [
  {
    id: 'speed',
    name: 'Sprint Training',
    icon: '⚡',
    description: 'Run sprints to improve speed',
    statImproved: 'speed',
    tpCost: 10,
    duration: 15,
    selfMultiplier: 1.0,
    npcBasicCost: 50,
    npcBasicMultiplier: 1.2,
    npcProCost: 200,
    npcProMultiplier: 1.5,
  },
  {
    id: 'agility',
    name: 'Obstacle Course',
    icon: '🎯',
    description: 'Navigate obstacles to improve agility',
    statImproved: 'agility',
    tpCost: 15,
    duration: 20,
    selfMultiplier: 1.0,
    npcBasicCost: 50,
    npcBasicMultiplier: 1.2,
    npcProCost: 200,
    npcProMultiplier: 1.5,
  },
  {
    id: 'strength',
    name: 'Weight Pull',
    icon: '💪',
    description: 'Pull weights to build strength',
    statImproved: 'strength',
    tpCost: 20,
    duration: 25,
    selfMultiplier: 1.0,
    npcBasicCost: 50,
    npcBasicMultiplier: 1.2,
    npcProCost: 200,
    npcProMultiplier: 1.5,
  },
  {
    id: 'endurance',
    name: 'Distance Run',
    icon: '🏃',
    description: 'Long-distance running for endurance',
    statImproved: 'endurance',
    tpCost: 15,
    duration: 30,
    selfMultiplier: 1.0,
    npcBasicCost: 50,
    npcBasicMultiplier: 1.2,
    npcProCost: 200,
    npcProMultiplier: 1.5,
  },
  {
    id: 'obedience',
    name: 'Command Drills',
    icon: '🎓',
    description: 'Practice commands and obedience',
    statImproved: 'obedience',
    tpCost: 10,
    duration: 15,
    selfMultiplier: 1.0,
    npcBasicCost: 50,
    npcBasicMultiplier: 1.2,
    npcProCost: 200,
    npcProMultiplier: 1.5,
  },
];