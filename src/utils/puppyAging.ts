import type { Dog } from '../types';
import { getLifeStage, MS_PER_WEEK } from './timeScaling';

// All aging uses the same game clock. Never rejuvenate an existing saved dog.
export function shouldAgeDog(dog: Dog, now = Date.now()): boolean {
  return !dog.is_dead && Math.floor((now - Date.parse(dog.birth_date)) / MS_PER_WEEK) > dog.age_weeks;
}
export function ageDog(dog: Dog, now = Date.now()): Partial<Dog> {
  if (!shouldAgeDog(dog, now)) return {};
  const age_weeks = Math.floor((now - Date.parse(dog.birth_date)) / MS_PER_WEEK);
  return { age_weeks, age_years: Math.floor(age_weeks / 52), life_stage: getLifeStage(age_weeks) };
}
