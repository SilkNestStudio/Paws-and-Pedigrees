import { TournamentSchedule } from '../types/tournament';

export const TOURNAMENT_SCHEDULES: TournamentSchedule[] = [
  {
    id: 'weekly_agility',
    name: 'Weekly Agility Challenge',
    competitionType: 'agility',
    frequency: 'weekly',
    nextOccurrence: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    entryFee: 50,
    prizes: {
      first: 500,
      second: 250,
      third: 100,
    },
  },
  {
    id: 'weekly_obedience',
    name: 'Weekly Obedience Trial',
    competitionType: 'obedience',
    frequency: 'weekly',
    nextOccurrence: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    entryFee: 50,
    prizes: {
      first: 500,
      second: 250,
      third: 100,
    },
  },
  {
    id: 'monthly_championship',
    name: 'Monthly Championship Series',
    competitionType: 'agility',
    frequency: 'monthly',
    nextOccurrence: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    entryFee: 200,
    prizes: {
      first: 3000,
      second: 1500,
      third: 750,
    },
  },
  {
    id: 'seasonal_grand_prix',
    name: 'Seasonal Grand Prix',
    competitionType: 'racing',
    frequency: 'seasonal',
    nextOccurrence: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    entryFee: 500,
    prizes: {
      first: 10000,
      second: 5000,
      third: 2500,
    },
  },
  {
    id: 'strength_showdown',
    name: 'Strength Showdown',
    competitionType: 'weight_pull',
    frequency: 'monthly',
    nextOccurrence: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    entryFee: 150,
    prizes: {
      first: 2000,
      second: 1000,
      third: 500,
    },
  },
];

// Tournament bracket size templates
export const BRACKET_SIZES = [4, 8, 16, 32];

// Round names for different bracket sizes
export const ROUND_NAMES: Record<number, Record<number, string>> = {
  4: {
    1: 'Semi-Finals',
    2: 'Finals',
  },
  8: {
    1: 'Quarter-Finals',
    2: 'Semi-Finals',
    3: 'Finals',
  },
  16: {
    1: 'Round of 16',
    2: 'Quarter-Finals',
    3: 'Semi-Finals',
    4: 'Finals',
  },
  32: {
    1: 'Round of 32',
    2: 'Round of 16',
    3: 'Quarter-Finals',
    4: 'Semi-Finals',
    5: 'Finals',
  },
};
