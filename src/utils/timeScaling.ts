/**
 * Time Scaling System
 *
 * Core rule: 2 real hours = 1 game week
 * This gives realistic but playable progression
 */

// Time constants
export const HOURS_PER_WEEK = 2; // 2 real hours = 1 game week
export const WEEKS_PER_YEAR = 52;
export const HOURS_PER_YEAR = HOURS_PER_WEEK * WEEKS_PER_YEAR; // 104 hours = 1 dog year

// Milliseconds
export const MS_PER_HOUR = 60 * 60 * 1000;
export const MS_PER_WEEK = HOURS_PER_WEEK * MS_PER_HOUR;
export const MS_PER_YEAR = HOURS_PER_YEAR * MS_PER_HOUR;

// Life stages in weeks
export const PUPPY_WEEKS = 52; // 0-1 year = puppy
export const ADULT_YEARS = 7; // 1-7 years = adult
export const SENIOR_START_WEEKS = PUPPY_WEEKS + (ADULT_YEARS * WEEKS_PER_YEAR); // 7+ years = senior

// Life stages in hours (real time)
export const PUPPY_HOURS = PUPPY_WEEKS * HOURS_PER_WEEK; // 104 hours = 4.3 days
export const ADULT_HOURS = ADULT_YEARS * HOURS_PER_YEAR; // 728 hours = 30.3 days
export const MAX_LIFESPAN_YEARS = 15;
export const MAX_LIFESPAN_HOURS = MAX_LIFESPAN_YEARS * HOURS_PER_YEAR; // 1560 hours = 65 days

// Breeding timings
export const PREGNANCY_HOURS = 24; // Simplified from 18 (9 weeks)
export const BREEDING_RECOVERY_HOURS = 16; // 8 weeks
export const MIN_BREEDING_AGE_WEEKS = 52; // Must be adult (1 year)
export const MAX_BREEDING_AGE_WEEKS = 520; // Can't breed after 10 years

/**
 * Calculate dog's age in weeks from birth date
 */
export function calculateAgeInWeeks(birthDate: string): number {
  const birth = new Date(birthDate).getTime();
  const now = Date.now();
  const hoursPassed = (now - birth) / MS_PER_HOUR;
  return Math.floor(hoursPassed / HOURS_PER_WEEK);
}

/**
 * Calculate dog's age in years from birth date
 */
export function calculateAgeInYears(birthDate: string): number {
  const weeks = calculateAgeInWeeks(birthDate);
  return Math.floor(weeks / WEEKS_PER_YEAR);
}

/**
 * Get life stage based on age in weeks
 */
export function getLifeStage(ageWeeks: number): 'puppy' | 'adult' | 'senior' {
  if (ageWeeks < PUPPY_WEEKS) return 'puppy';
  if (ageWeeks < SENIOR_START_WEEKS) return 'adult';
  return 'senior';
}

/**
 * Check if dog can breed based on age
 */
export function canBreed(ageWeeks: number): boolean {
  return ageWeeks >= MIN_BREEDING_AGE_WEEKS && ageWeeks <= MAX_BREEDING_AGE_WEEKS;
}

/**
 * Check if dog has reached max lifespan
 */
export function hasReachedMaxAge(birthDate: string): boolean {
  const birth = new Date(birthDate).getTime();
  const now = Date.now();
  const hoursPassed = (now - birth) / MS_PER_HOUR;
  return hoursPassed >= MAX_LIFESPAN_HOURS;
}

/**
 * Get formatted age string (e.g., "2 years, 3 weeks")
 */
export function getFormattedAge(ageWeeks: number): string {
  const years = Math.floor(ageWeeks / WEEKS_PER_YEAR);
  const remainingWeeks = ageWeeks % WEEKS_PER_YEAR;

  if (years === 0) {
    return `${ageWeeks} week${ageWeeks !== 1 ? 's' : ''}`;
  }

  if (remainingWeeks === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`;
  }

  return `${years} year${years !== 1 ? 's' : ''}, ${remainingWeeks} week${remainingWeeks !== 1 ? 's' : ''}`;
}

/**
 * Calculate when pregnancy will complete
 */
export function calculatePregnancyDue(): string {
  const dueTime = Date.now() + (PREGNANCY_HOURS * MS_PER_HOUR);
  return new Date(dueTime).toISOString();
}

/**
 * Check if pregnancy is complete
 */
export function isPregnancyComplete(pregnancyDue: string): boolean {
  return Date.now() >= new Date(pregnancyDue).getTime();
}

/**
 * Calculate when dog can breed again after giving birth
 */
export function calculateNextBreedingTime(birthDate: string): string {
  const nextTime = new Date(birthDate).getTime() + (BREEDING_RECOVERY_HOURS * MS_PER_HOUR);
  return new Date(nextTime).toISOString();
}

/**
 * Check if dog has recovered from breeding
 */
export function canBreedAgain(lastBredDate: string): boolean {
  if (!lastBredDate) return true;
  const lastBred = new Date(lastBredDate).getTime();
  const recoveryComplete = lastBred + (BREEDING_RECOVERY_HOURS * MS_PER_HOUR);
  return Date.now() >= recoveryComplete;
}
