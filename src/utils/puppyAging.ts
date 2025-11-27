import { Dog } from '../types';
import { BREEDING_CONSTANTS } from '../data/breedingConstants';

/**
 * Check if a dog should age (1 week per day)
 */
export function shouldAgeDog(dog: Dog): boolean {
  // Only age dogs that are under adult age
  if (dog.age_weeks >= BREEDING_CONSTANTS.ADULT_AGE) {
    return false;
  }

  // Check if a day has passed since birth
  const birthDate = new Date(dog.birth_date);
  const now = new Date();
  const msDiff = now.getTime() - birthDate.getTime();
  const daysSinceBirth = msDiff / (1000 * 60 * 60 * 24);

  // Expected age based on birth date
  const expectedWeeks = Math.floor(daysSinceBirth * BREEDING_CONSTANTS.WEEKS_PER_DAY);

  // Should age if current age is less than expected age
  return dog.age_weeks < expectedWeeks;
}

/**
 * Calculate age updates for a dog
 */
export function ageDog(dog: Dog): Partial<Dog> {
  if (!shouldAgeDog(dog)) {
    return {};
  }

  const birthDate = new Date(dog.birth_date);
  const now = new Date();
  const msDiff = now.getTime() - birthDate.getTime();
  const daysSinceBirth = msDiff / (1000 * 60 * 60 * 24);

  // Calculate expected age
  const expectedWeeks = Math.floor(daysSinceBirth * BREEDING_CONSTANTS.WEEKS_PER_DAY);

  // Cap at adult age
  const newAge = Math.min(expectedWeeks, BREEDING_CONSTANTS.ADULT_AGE);

  return {
    age_weeks: newAge,
  };
}
