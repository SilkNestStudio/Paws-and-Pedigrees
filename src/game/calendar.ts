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

/**
 * What each season does to the work (first proposals): `scent` scales how
 * strong a scent must be before a dog notices it (below 1 is easier), and
 * `stamina` how long a dog can gallop.
 */
export const SEASON_EFFECTS: Record<Season, { scent: number; stamina: number; note: string }> = {
  Spring: {
    scent: 1,
    stamina: 1,
    note: "Spring: mild days and good going. The breeders' market is in the village on Monday and Tuesday.",
  },
  Summer: {
    scent: 1.06,
    stamina: 0.9,
    note: 'Summer: dry air carries less scent, and the heat tires a dog sooner. A fine season for the beach.',
  },
  Autumn: {
    scent: 0.93,
    stamina: 1,
    note: 'Autumn: damp air holds scent well, so searches and blinds are a little easier.',
  },
  Winter: {
    scent: 0.97,
    stamina: 1.06,
    note: 'Winter: cold, clear days, and dogs keep going longer. The Hollowmere Cup is run on the last Sunday.',
  },
};

/** Saturdays are show days: agility on the village green, sheep up at Fell Top. */
export const FIRST_SHOW_DAY = 13;
export const isShowDay = (day: number): boolean => day >= FIRST_SHOW_DAY && weekday(day) === 5;
export const nextShowDay = (day: number): number =>
  Math.max(day + ((5 - weekday(day) + 7) % 7), FIRST_SHOW_DAY);

/** The Hollowmere Cup closes each year: the last Sunday of winter. */
export const DAYS_PER_YEAR = DAYS_PER_SEASON * SEASONS.length;
export const isCupDay = (day: number): boolean => day > 0 && day % DAYS_PER_YEAR === 0;
export const nextCupDay = (day: number): number => Math.ceil(day / DAYS_PER_YEAR) * DAYS_PER_YEAR;

export const seasonLabel = (day: number): string => `${seasonOf(day)}, year ${yearOf(day)}`;

/** "about 2 years" / "1 year 3 months" / "9 months". */
export function ageText(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} months`;
  const y = `${years} year${years > 1 ? 's' : ''}`;
  return rest ? `${y} ${rest} months` : y;
}
