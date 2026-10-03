/**
 * The kennel calendar. Days pass only when the keeper goes to bed. Seven days
 * make a season, four seasons make a year, and every dog ages three months at
 * each change of season (so dogs grow up and grow old at a pace that fits a
 * game, without needing hours of play for each birthday).
 */
export const DAYS_PER_SEASON = 7;
export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'] as const;
export type Season = (typeof SEASONS)[number];
export const MONTHS_PER_SEASON = 3;

/** The first Sunday with a trial at Larkspur (the first Sunday is the Fun Day). */
export const FIRST_TRIAL_DAY = 14;

const index = (day: number) => Math.floor((day - 1) / DAYS_PER_SEASON);

export const seasonOf = (day: number): Season => SEASONS[index(day) % SEASONS.length]!;
export const yearOf = (day: number): number => Math.floor(index(day) / SEASONS.length) + 1;
/** 0 = Monday … 6 = Sunday. */
export const weekday = (day: number): number => (day - 1) % DAYS_PER_SEASON;
export const seasonStartDay = (day: number): number => index(day) * DAYS_PER_SEASON + 1;
export const isSeasonStart = (day: number): boolean => day > 1 && weekday(day) === 0;
export const daysUntilSunday = (day: number): number => 6 - weekday(day);

export const isTrialDay = (day: number): boolean => day >= FIRST_TRIAL_DAY && weekday(day) === 6;

/** The next day with a trial, from this day on. */
export function nextTrialDay(day: number): number {
  const sunday = day + daysUntilSunday(day);
  return Math.max(sunday, FIRST_TRIAL_DAY);
}

export const seasonLabel = (day: number): string => `${seasonOf(day)}, year ${yearOf(day)}`;

/** "about 2 years" / "1 year 3 months" / "9 months". */
export function ageText(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} months`;
  const y = `${years} year${years > 1 ? 's' : ''}`;
  return rest ? `${y} ${rest} months` : y;
}
