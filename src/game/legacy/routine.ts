import type { Journey } from './journey';

export type CareAction = 'meal' | 'water' | 'rest';
export interface Routine {
  food: number; water: number; energy: number; meals: number; fed: boolean; watered: boolean;
  focus: number; keeperXp: number; sessions: number; bestQuality: number; lastQuality: number;
  invitationRead: boolean;
}
export const newRoutine = (): Routine => ({ food: 55, water: 50, energy: 75, meals: 4, fed: false, watered: false, focus: 0, keeperXp: 0, sessions: 0, bestQuality: 0, lastQuality: 0, invitationRead: false });
export function validateRoutine(value: Routine) {
  if (!value || ['food', 'water', 'energy', 'focus', 'bestQuality', 'lastQuality'].some(k => !Number.isFinite(value[k as keyof Routine]) || Number(value[k as keyof Routine]) < 0 || Number(value[k as keyof Routine]) > 100) || ['meals', 'keeperXp', 'sessions'].some(k => !Number.isSafeInteger(value[k as keyof Routine]) || Number(value[k as keyof Routine]) < 0) || ['fed', 'watered', 'invitationRead'].some(k => typeof value[k as keyof Routine] !== 'boolean')) throw new Error('This Homecoming care record is invalid. It has not been overwritten.');
}
export function careBlocked(j: Journey, action: CareAction): string | null {
  if (!j.dog || !j.settled) return 'Help your dog settle into the run first.';
  if (action === 'meal' && !j.routine.meals) return 'Collect an emergency meal from the rescue first.';
  const value = action === 'meal' ? j.routine.food : action === 'water' ? j.routine.water : j.routine.energy;
  return value >= 90 ? action === 'meal' ? 'Your dog has had enough food for now.' : action === 'water' ? 'Your dog is well hydrated.' : 'Your dog is already rested.' : null;
}
export function finishCare(j: Journey, action: CareAction): Journey {
  if (careBlocked(j, action)) return j;
  const r = j.routine;
  return { ...j, routine: { ...r, ...(action === 'meal' ? { food: Math.min(100, r.food + 45), meals: r.meals - 1, fed: true } : action === 'water' ? { water: 100, watered: true } : { energy: Math.min(100, r.energy + 35) }) } };
}
export function trainingBlocked(j: Journey): string | null {
  if (!j.dog || !j.settled || !j.firstRecall) return 'Settle in and try your first recall before this lesson.';
  if (!j.routine.fed || !j.routine.watered) return 'Offer a meal and fresh water at the run before training.';
  if (j.routine.food < 40) return 'Your dog needs a meal before another lesson.';
  if (j.routine.water < 40) return 'Offer fresh water before another lesson.';
  if (j.routine.energy < 30) return 'Give your dog a quiet rest before another lesson.';
  return null;
}
export function trainingGain(quality: number) { return 3 + Math.round(Math.max(0, Math.min(100, quality)) / 20); }
export function finishFocusWalk(j: Journey, quality: number): Journey {
  if (trainingBlocked(j) || !Number.isFinite(quality)) return j;
  const r = j.routine, score = Math.round(Math.max(0, Math.min(100, quality)));
  return { ...j, routine: { ...r, food: Math.max(0, r.food - 8), water: Math.max(0, r.water - 12), energy: Math.max(0, r.energy - 18), focus: Math.min(100, r.focus + trainingGain(score)), keeperXp: r.keeperXp + 5 + Math.round(score / 20), sessions: r.sessions + 1, bestQuality: Math.max(r.bestQuality, score), lastQuality: score } };
}
