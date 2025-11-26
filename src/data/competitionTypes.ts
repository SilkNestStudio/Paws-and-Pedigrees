export interface CompetitionType {
  id: string;
  name: string;
  icon: string;
  description: string;
  primaryStat: 'speed' | 'agility' | 'strength' | 'endurance' | 'obedience';
  secondaryStats: Array<'speed' | 'agility' | 'strength' | 'endurance' | 'obedience' | 'intelligence' | 'trainability'>;
  statWeights: { [key: string]: number };
}

export interface CompetitionTier {
  id: string;
  name: string;
  entryFee: number;
  minRequirement: number;
  prizes: {
    first: number;
    second: number;
    third: number;
    participation: number;
  };
  aiDifficulty: { min: number; max: number };
}

export const competitionTypes: CompetitionType[] = [
  {
    id: 'agility',
    name: 'Agility Trial',
    icon: '🎯',
    description: 'Navigate obstacle courses at speed',
    primaryStat: 'agility',
    secondaryStats: ['speed', 'intelligence'],
    statWeights: {
      agility: 0.5,
      speed: 0.3,
      intelligence: 0.2,
    }
  },
  {
    id: 'obedience',
    name: 'Obedience Trial',
    icon: '🎓',
    description: 'Demonstrate control and training',
    primaryStat: 'obedience',
    secondaryStats: ['intelligence', 'trainability'],
    statWeights: {
      obedience: 0.5,
      intelligence: 0.3,
      trainability: 0.2,
    }
  },
  {
    id: 'weight_pull',
    name: 'Weight Pull',
    icon: '💪',
    description: 'Pull maximum weight',
    primaryStat: 'strength',
    secondaryStats: ['endurance'],
    statWeights: {
      strength: 0.7,
      endurance: 0.3,
    }
  },
  {
    id: 'racing',
    name: 'Racing',
    icon: '⚡',
    description: 'Pure speed competition',
    primaryStat: 'speed',
    secondaryStats: ['endurance', 'agility'],
    statWeights: {
      speed: 0.6,
      endurance: 0.2,
      agility: 0.2,
    }
  },
];

export const competitionTiers: CompetitionTier[] = [
  {
    id: 'local',
    name: 'Local Competition',
    entryFee: 25,
    minRequirement: 15, // Minimum total relevant stats
    prizes: {
      first: 150,
      second: 75,
      third: 40,
      participation: 10,
    },
    aiDifficulty: { min: 5, max: 7 },
  },
  {
    id: 'regional',
    name: 'Regional Competition',
    entryFee: 100,
    minRequirement: 30, // Need more training
    prizes: {
      first: 750,
      second: 400,
      third: 200,
      participation: 50,
    },
    aiDifficulty: { min: 7, max: 9 },
  },
  {
    id: 'national',
    name: 'National Championship',
    entryFee: 500,
    minRequirement: 50, // Elite level required
    prizes: {
      first: 5000,
      second: 2500,
      third: 1000,
      participation: 250,
    },
    aiDifficulty: { min: 9, max: 11 },
  },
];