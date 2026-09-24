import type { CompetitionEvent, EventType } from '../types/competition';
import type { CompetitionTier } from '../types/leaderboard';

export function prizeForPlacement(event: Pick<CompetitionEvent, 'prizes'>, placement: number): number {
  if (!Number.isInteger(placement) || placement < 1) return 0;
  return placement === 1 ? event.prizes.first : placement === 2 ? event.prizes.second
    : placement === 3 ? event.prizes.third : event.prizes.participation;
}

export function leaderboardTier(type: EventType): CompetitionTier {
  if (type === 'match_show' || type === 'point_show') return 'local';
  if (type === 'specialty_show' || type === 'group_show') return 'regional';
  return 'national';
}

export function rankCompetition(player: { name: string; score: number }, rivals: { name: string; score: number; breed: string }[]) {
  // Identity is explicit: rival names may match the player's dog.
  return [{ ...player, breed: 'Your dog', isPlayer: true }, ...rivals.map(r => ({ ...r, isPlayer: false }))]
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ ...entry, placement: index + 1 }));
}
