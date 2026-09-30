import type { Dog, UserProfile } from '../../types';
import { rescueBreeds } from '../../data/rescueBreeds';
import { shopBreeds } from '../../data/shopBreeds';

export const DISCIPLINES = ['agility', 'search', 'herding', 'water'] as const;
export type Discipline = typeof DISCIPLINES[number];
export type FieldDiscipline = Exclude<Discipline, 'agility'>;
export const DISCIPLINE_INFO: Record<Discipline, { name: string; short: string; verb: string; detail: string; effect: string; color: string }> = {
  agility: { name: 'Agility', short: 'THE MEADOW', verb: 'Find your rhythm', detail: 'Guide the course in order. Cue jumps, negotiate the tunnel, and keep faults down.', effect: 'Course speed', color: '#b27847' },
  search: { name: 'Scent search', short: 'THE ORCHARD', verb: 'Follow their nose', detail: 'Send your dog between search stations. Read the scent signal and investigate three hidden objects.', effect: 'Scent detection range and inspection speed', color: '#6c778f' },
  herding: { name: 'Herding', short: 'THE PADDOCK', verb: 'Work as a partnership', detail: 'Position your dog behind the sheep. Use gentle pressure to guide all three into the far pen.', effect: 'Working distance and calm flock control', color: '#8c7852' },
  water: { name: 'Water retrieval', short: 'THE LAKE', verb: 'Plan the return', detail: 'Guide your dog to the numbered dummies in order and bring each back to shore. Avoid the current.', effect: 'Swimming speed and stamina efficiency', color: '#4e849c' },
};
export interface DisciplineRecord { xp: number; sessions: number; best: number; last: number; }
export interface ClubRound { discipline: Discipline; dogId: string; }
export interface ClubResult extends ClubRound { score: number; dogName: string; gain: number; }
export type ClubEvent = 'practice' | 'specialist' | 'combined' | 'team';
export interface ClubRun { id: string; kind: ClubEvent; rounds: ClubRound[]; results: ClubResult[]; seed: number; startedAt: string; }
export interface ClubMatch { id: string; kind: ClubEvent; results: ClubResult[]; average: number; placement: number; cash: number; finishedAt: string; }
export interface ClubProgress {
  version: 1;
  records: Record<string, Partial<Record<Discipline, DisciplineRecord>>>;
  active?: ClubRun;
  matches: ClubMatch[];
  completedAt?: string;
  prizes: string[];
}
export const newClubProgress = (): ClubProgress => ({ version: 1, records: {}, matches: [], prizes: [] });
export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
export function recordFor(progress: ClubProgress | undefined, dogId: string, discipline: Discipline): DisciplineRecord {
  return progress?.records[dogId]?.[discipline] ?? { xp: 0, sessions: 0, best: 0, last: 0 };
}
// Prototype sport profiles, not biological rankings. Existing inherited stats provide
// individual variation; composition weights give crossbreeds both parents' tendencies.
function sportProfile(name: string): number[] {
  if (/collie|australian shepherd/i.test(name)) return [86, 63, 90, 58];
  if (/german shepherd|malinois/i.test(name)) return [69, 88, 75, 57];
  if (/retriever|labrador|newfoundland|poodle/i.test(name)) return [65, 73, 50, 90];
  if (/beagle|hound/i.test(name)) return [63, 91, 47, 59];
  if (/terrier|staff|boxer/i.test(name)) return [75, 69, 57, 60];
  if (/husky|malamute|bernese/i.test(name)) return [61, 66, 59, 62];
  return [68, 68, 68, 68];
}
export function aptitude(dog: Dog, discipline: Discipline): number {
  const index = DISCIPLINES.indexOf(discipline);
  const portions = dog.breed_composition?.portions;
  const breed = [...rescueBreeds, ...shopBreeds].find(b => b.id === dog.breed_id);
  const total = portions?.reduce((n, p) => n + Math.max(0, p.percentage), 0) ?? 0;
  const profile = total > 0 ? portions!.reduce((n, p) => n + sportProfile(p.breedName)[index] * Math.max(0, p.percentage) / total, 0) : sportProfile(breed?.name ?? '')[index];
  const inherited = discipline === 'agility' ? dog.agility * .65 + dog.speed * .35
    : discipline === 'search' ? dog.intelligence * .55 + dog.prey_drive * .25 + dog.trainability * .2
    : discipline === 'herding' ? dog.intelligence * .4 + dog.agility * .3 + dog.trainability * .3
    : dog.endurance * .55 + dog.strength * .25 + dog.energy * .2;
  return Math.round(clamp(profile * .7 + inherited * .65, 25, 98));
}
export function learned(record: DisciplineRecord) { return clamp(record.xp / 10, 0, 100); }
export function fieldAbility(dog: Dog, discipline: Discipline, record: DisciplineRecord) {
  const legacy = discipline === 'agility' ? dog.agility_trained : discipline === 'water' ? dog.endurance_trained : dog.obedience_trained;
  return clamp(aptitude(dog, discipline) * .55 + learned(record) * .4 + clamp(legacy, 0, 100) * .12 + Math.min(10, dog.bond_level) * .5, 10, 100);
}
export function keeperBonus(user: Pick<UserProfile, 'level'>) { return 1 + Math.min(20, Math.max(0, user.level - 1)) * .04; }
export function trainingGain(dog: Dog, discipline: Discipline, score: number, user: Pick<UserProfile, 'level' | 'training_skill'>) {
  return Math.round((5 + clamp(score, 0, 100) * .08) * (.65 + aptitude(dog, discipline) / 100) * keeperBonus(user) * (1 + clamp(user.training_skill, 0, 100) / 400));
}
export function discoveredText(dog: Dog, discipline: Discipline, record: DisciplineRecord) {
  if (!record.sessions && dog.is_rescue) return 'Undiscovered · learn by playing';
  const value = aptitude(dog, discipline);
  const band = value >= 80 ? 'Natural strength' : value >= 65 ? 'Promising' : 'Room to grow';
  return record.sessions >= 3 || !dog.is_rescue ? `${band} · aptitude ${value}` : `${band} · early indication`;
}
export function sampledAll(progress: ClubProgress, dogId: string) { return DISCIPLINES.every(d => recordFor(progress, dogId, d).sessions > 0); }
export function roundScore(performance: number) { return Math.round(clamp((performance - .3) / 1.2 * 100, 0, 100)); }
export function standings(results: ClubResult[], team = false) {
  // Stable local club rivals, with visible strengths/weaknesses on the same 100-point scale.
  const rivals = team ? [
    { name: 'Oak Hollow team', scores: [72, 55, 75, 60] }, { name: 'Brookside team', scores: [55, 74, 55, 68] }, { name: 'Meadow team', scores: [44, 54, 50, 61] },
  ] : [
    { name: 'Fern · Oak Hollow', scores: [66, 48, 70, 43] }, { name: 'Milo · Brookside', scores: [46, 66, 44, 65] }, { name: 'Pip · Meadow', scores: [42, 48, 49, 45] },
  ];
  const rows = rivals.map(r => ({ name: r.name, player: false, scores: results.map(round => r.scores[DISCIPLINES.indexOf(round.discipline)]) }));
  rows.push({ name: 'Your kennel', player: true, scores: results.map(r => r.score) });
  return rows.map(r => ({ ...r, average: Math.round(r.scores.reduce((n, s) => n + s, 0) / Math.max(1, r.scores.length)) })).sort((a, b) => b.average - a.average || Number(b.player) - Number(a.player));
}
