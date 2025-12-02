export type TournamentStatus = 'upcoming' | 'registration_open' | 'in_progress' | 'completed';

export type TournamentFormat = 'single_elimination' | 'double_elimination' | 'round_robin';

export interface TournamentRound {
  roundNumber: number;
  name: string; // "Quarterfinals", "Semifinals", "Finals", etc.
  matches: TournamentMatch[];
  completed: boolean;
}

export interface TournamentMatch {
  matchId: string;
  participant1: TournamentParticipant;
  participant2: TournamentParticipant;
  winner?: string; // dogId of winner
  scores: {
    participant1: number;
    participant2: number;
  };
  completed: boolean;
}

export interface TournamentParticipant {
  dogId: string;
  dogName: string;
  ownerName: string;
  isPlayer: boolean;
  seed: number; // Tournament seeding
  currentRound: number;
  eliminated: boolean;
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  icon: string;
  competitionType: 'agility' | 'obedience' | 'racing' | 'weight_pull';
  format: TournamentFormat;
  status: TournamentStatus;

  // Timing
  registrationOpens: string; // ISO timestamp
  registrationCloses: string;
  startsAt: string;
  endsAt?: string;

  // Entry requirements
  entryFee: number;
  minLevel: number;
  minStatRequirement: number; // Minimum combined relevant stats
  maxParticipants: number;

  // Participants
  participants: TournamentParticipant[];

  // Tournament structure
  rounds: TournamentRound[];
  currentRound: number;

  // Prizes
  prizes: {
    first: number;
    second: number;
    third: number;
    fourthToEighth?: number;
  };

  // Special rewards
  specialRewards?: {
    gems?: number;
    title?: string;
    achievement?: string;
  };
}

export interface TournamentSchedule {
  id: string;
  name: string;
  competitionType: 'agility' | 'obedience' | 'racing' | 'weight_pull';
  frequency: 'weekly' | 'monthly' | 'seasonal';
  nextOccurrence: string;
  entryFee: number;
  prizes: {
    first: number;
    second: number;
    third: number;
  };
}
