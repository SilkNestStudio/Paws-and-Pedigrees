import type { Dog } from '../types';
import { getHealthStatus } from './healthDecay';

export type Aptitude = 'speed' | 'agility' | 'strength' | 'endurance' | 'intelligence' | 'trainability';
export const APTITUDES: { key: Aptitude; label: string; activity: string }[] = [
  { key: 'speed', label: 'Speed', activity: 'sprint training' },
  { key: 'agility', label: 'Agility', activity: 'the obstacle course' },
  { key: 'strength', label: 'Strength', activity: 'strength training' },
  { key: 'endurance', label: 'Endurance', activity: 'distance training' },
  { key: 'intelligence', label: 'Focus', activity: 'command drills' },
  { key: 'trainability', label: 'Learning', activity: 'command drills' },
];
export function trainedAbility(dog: Dog, key: Aptitude): number {
  if (key === 'intelligence' || key === 'trainability') return dog.obedience_trained || 0;
  return dog[`${key}_trained`] || 0;
}
export function isAptitudeKnown(dog: Dog, key: Aptitude): boolean {
  return !dog.is_rescue || dog.bond_level >= 3 || (dog.bond_level >= 1 && trainedAbility(dog, key) >= 1);
}
export function aptitudeDescription(dog: Dog, key: Aptitude): string {
  if (isAptitudeKnown(dog, key)) return String(Math.round(dog[key]));
  if (dog.bond_level < 1) return 'Still getting to know you';
  return dog[key] >= 70 ? 'Showing real promise' : dog[key] >= 40 ? 'Finding their feet' : 'A patient learner';
}
export function activityRestriction(dog: Dog): string | null {
  if (dog.is_dead) return 'This dog is part of your kennel’s memorial.';
  if (dog.is_pregnant) return 'Let this expectant mother rest until her litter arrives.';
  if (dog.active_puppy_training) return 'Finish the current puppy training program first.';
  if (dog.current_ailment || (dog.recovering_from && (!dog.recovery_due || Date.parse(dog.recovery_due) > Date.now()))) return 'Finish veterinary treatment and recovery first.';
  const health = getHealthStatus(dog);
  if (health.needsVet || health.needsEmergencyVet || health.isDead || health.healthPercentage < 40) return 'Visit the vet before returning to training or competition.';
  if (dog.hunger < 20 || dog.thirst < 20) return 'Feed and water your dog before strenuous activity.';
  if (dog.energy_stat < 20) return 'Your dog needs some rest first.';
  return null;
}
