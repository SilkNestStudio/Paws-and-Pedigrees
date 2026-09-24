import type { Dog } from '../types';
import { calculateAgeInWeeks, getLifeStage } from './timeScaling';

// All aging uses the same game clock. Never rejuvenate an existing saved dog.
export function shouldAgeDog(dog: Dog): boolean {
  return !dog.is_dead && calculateAgeInWeeks(dog.birth_date) > dog.age_weeks;
}
export function ageDog(dog: Dog): Partial<Dog> {
  if (!shouldAgeDog(dog)) return {};
  const age_weeks = calculateAgeInWeeks(dog.birth_date);
  return { age_weeks, life_stage: getLifeStage(age_weeks) };
}
