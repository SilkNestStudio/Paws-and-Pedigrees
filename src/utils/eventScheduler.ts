/**
 * Event Scheduler - Generates and manages competition events
 * Based on AKC dog show scheduling patterns
 */

import type {
  CompetitionEvent,
  EventType,
  CompetitionDiscipline,
  EventStatus,
  EventTemplate,
} from '../types/competition';
import { DogGroup } from '../types/competition';

// ============================================================================
// Constants
// ============================================================================

const JUDGE_POOL = [
  'judge_001', 'judge_002', 'judge_003', 'judge_004', 'judge_005',
  'judge_006', 'judge_007', 'judge_008', 'judge_009', 'judge_010',
];

const BREED_GROUPS: DogGroup[] = [
  DogGroup.SPORTING,
  DogGroup.HOUND,
  DogGroup.WORKING,
  DogGroup.TERRIER,
  DogGroup.TOY,
  DogGroup.NON_SPORTING,
  DogGroup.HERDING,
];

// ============================================================================
// Event Templates
// ============================================================================

/**
 * Fixed weekly event templates
 */
const WEEKLY_EVENTS: EventTemplate[] = [
  {
    namePattern: 'Monday Obedience Match',
    eventType: 'match_show',
    discipline: 'obedience',
    entryFee: 15,
    minLevel: 1,
    minAge: 12,
    maxEntries: 50,
    schedule: {
      type: 'weekly',
      dayOfWeek: 1, // Monday
      registrationWindowHours: 24,
      eventDurationHours: 12,
    },
  },
  {
    namePattern: 'Wednesday Agility Point Show',
    eventType: 'point_show',
    discipline: 'agility',
    entryFee: 75,
    minLevel: 2,
    minAge: 16,
    maxEntries: 60,
    schedule: {
      type: 'weekly',
      dayOfWeek: 3, // Wednesday
      registrationWindowHours: 72,
      eventDurationHours: 18,
    },
  },
  {
    namePattern: 'Friday Racing Match',
    eventType: 'match_show',
    discipline: 'racing',
    entryFee: 20,
    minLevel: 1,
    minAge: 12,
    maxEntries: 40,
    schedule: {
      type: 'weekly',
      dayOfWeek: 5, // Friday
      registrationWindowHours: 24,
      eventDurationHours: 12,
    },
  },
  {
    namePattern: 'Saturday Conformation Show',
    eventType: 'point_show',
    discipline: 'conformation',
    entryFee: 100,
    minLevel: 2,
    minAge: 20,
    maxEntries: 80,
    schedule: {
      type: 'weekly',
      dayOfWeek: 6, // Saturday
      registrationWindowHours: 72,
      eventDurationHours: 24,
    },
  },
];

/**
 * Seasonal championship templates
 */
const SEASONAL_CHAMPIONSHIPS = [
  { name: 'Spring Classic Championship', month: 3 },
  { name: 'Summer Nationals Championship', month: 6 },
  { name: 'Autumn Invitational Championship', month: 9 },
  { name: 'Winter Grand Prix Championship', month: 12 },
];

// ============================================================================
// Event Generation
// ============================================================================

/**
 * Generate a unique event ID
 */
function generateEventId(type: EventType, date: Date): string {
  const timestamp = date.getTime();
  const random = Math.floor(Math.random() * 1000);
  return `${type}_${timestamp}_${random}`;
}

/**
 * Calculate points awarded based on event type and placement
 */
function calculatePointsAwarded(eventType: EventType): {
  first: number;
  second: number;
  third: number;
  fourth: number;
} {
  const pointTables = {
    match_show: { first: 0, second: 0, third: 0, fourth: 0 },
    point_show: { first: 2, second: 1, third: 1, fourth: 0 },
    specialty_show: { first: 4, second: 2, third: 1, fourth: 1 },
    group_show: { first: 3, second: 2, third: 1, fourth: 0 },
    all_breed: { first: 5, second: 3, third: 2, fourth: 1 },
    invitational: { first: 4, second: 3, third: 2, fourth: 1 },
    championship: { first: 5, second: 4, third: 3, fourth: 2 },
  };

  return pointTables[eventType];
}

/**
 * Calculate prize money based on entry fee and placement
 */
function calculatePrizes(entryFee: number, eventType: EventType): {
  first: number;
  second: number;
  third: number;
  participation: number;
} {
  const multipliers = {
    match_show: { first: 5, second: 3, third: 1.5, participation: 0.5 },
    point_show: { first: 10, second: 6, third: 3, participation: 0.8 },
    specialty_show: { first: 12, second: 7, third: 4, participation: 1 },
    group_show: { first: 10, second: 6, third: 3, participation: 0.8 },
    all_breed: { first: 15, second: 9, third: 5, participation: 1.5 },
    invitational: { first: 12, second: 8, third: 4, participation: 1 },
    championship: { first: 20, second: 12, third: 6, participation: 2 },
  };

  const mult = multipliers[eventType];
  return {
    first: Math.floor(entryFee * mult.first),
    second: Math.floor(entryFee * mult.second),
    third: Math.floor(entryFee * mult.third),
    participation: Math.floor(entryFee * mult.participation),
  };
}

/**
 * Select a random judge from the pool
 */
function selectJudge(): string {
  return JUDGE_POOL[Math.floor(Math.random() * JUDGE_POOL.length)];
}

/**
 * Generate a weekly event
 */
export function generateWeeklyEvent(
  template: EventTemplate,
  baseDate: Date
): CompetitionEvent {
  const eventDate = new Date(baseDate);

  // Find the next occurrence of the target day of week
  const currentDay = eventDate.getDay();
  const targetDay = template.schedule.dayOfWeek!;
  const daysUntilTarget = (targetDay - currentDay + 7) % 7;
  eventDate.setDate(eventDate.getDate() + daysUntilTarget);

  // Set event time to 10:00 AM
  eventDate.setHours(10, 0, 0, 0);

  const registrationCloses = new Date(eventDate);
  registrationCloses.setHours(
    registrationCloses.getHours() - template.schedule.registrationWindowHours
  );

  const registrationOpens = new Date(registrationCloses);
  registrationOpens.setDate(registrationOpens.getDate() - 7); // Open 7 days before close

  const points = calculatePointsAwarded(template.eventType);
  const prizes = calculatePrizes(template.entryFee, template.eventType);

  return {
    id: generateEventId(template.eventType, eventDate),
    name: template.namePattern,
    eventType: template.eventType,
    discipline: template.discipline,
    registrationOpens: registrationOpens.toISOString(),
    registrationCloses: registrationCloses.toISOString(),
    eventDate: eventDate.toISOString(),
    eventDuration: template.schedule.eventDurationHours,
    status: determineEventStatus(registrationOpens, registrationCloses, eventDate),
    entryFee: template.entryFee,
    minLevel: template.minLevel,
    minAge: template.minAge,
    pointsAwarded: points,
    isMajor: points.first >= 3,
    prizes,
    maxEntries: template.maxEntries,
    currentEntries: 0,
    judgeId: selectJudge(),
    leaderboard: [],
  };
}

/**
 * Generate a specialty show (breed-specific)
 */
export function generateSpecialtyShow(date: Date, breedId?: number): CompetitionEvent {
  const eventDate = new Date(date);
  eventDate.setHours(14, 0, 0, 0);

  const registrationCloses = new Date(eventDate);
  registrationCloses.setDate(registrationCloses.getDate() - 1);

  const registrationOpens = new Date(registrationCloses);
  registrationOpens.setDate(registrationOpens.getDate() - 5);

  const points = calculatePointsAwarded('specialty_show');
  const entryFee = 150;

  return {
    id: generateEventId('specialty_show', eventDate),
    name: breedId
      ? `Breed ${breedId} Specialty Championship`
      : 'Specialty Championship Show',
    eventType: 'specialty_show',
    discipline: 'conformation',
    registrationOpens: registrationOpens.toISOString(),
    registrationCloses: registrationCloses.toISOString(),
    eventDate: eventDate.toISOString(),
    eventDuration: 18,
    status: determineEventStatus(registrationOpens, registrationCloses, eventDate),
    entryFee,
    minLevel: 3,
    minAge: 24,
    breedRestriction: breedId ? [breedId] : undefined,
    pointsAwarded: points,
    isMajor: true,
    prizes: calculatePrizes(entryFee, 'specialty_show'),
    maxEntries: 60,
    currentEntries: 0,
    judgeId: selectJudge(),
    leaderboard: [],
  };
}

/**
 * Generate a group show
 */
export function generateGroupShow(date: Date, group: DogGroup): CompetitionEvent {
  const eventDate = new Date(date);
  eventDate.setHours(13, 0, 0, 0);

  const registrationCloses = new Date(eventDate);
  registrationCloses.setDate(registrationCloses.getDate() - 1);

  const registrationOpens = new Date(registrationCloses);
  registrationOpens.setDate(registrationOpens.getDate() - 5);

  const points = calculatePointsAwarded('group_show');
  const entryFee = 125;

  const groupNames: Record<DogGroup, string> = {
    [DogGroup.SPORTING]: 'Sporting',
    [DogGroup.HOUND]: 'Hound',
    [DogGroup.WORKING]: 'Working',
    [DogGroup.TERRIER]: 'Terrier',
    [DogGroup.TOY]: 'Toy',
    [DogGroup.NON_SPORTING]: 'Non-Sporting',
    [DogGroup.HERDING]: 'Herding',
    [DogGroup.MISCELLANEOUS]: 'Miscellaneous',
  };

  return {
    id: generateEventId('group_show', eventDate),
    name: `${groupNames[group]} Group Championship`,
    eventType: 'group_show',
    discipline: 'conformation',
    registrationOpens: registrationOpens.toISOString(),
    registrationCloses: registrationCloses.toISOString(),
    eventDate: eventDate.toISOString(),
    eventDuration: 16,
    status: determineEventStatus(registrationOpens, registrationCloses, eventDate),
    entryFee,
    minLevel: 3,
    minAge: 20,
    groupRestriction: group,
    pointsAwarded: points,
    isMajor: true,
    prizes: calculatePrizes(entryFee, 'group_show'),
    maxEntries: 70,
    currentEntries: 0,
    judgeId: selectJudge(),
    leaderboard: [],
  };
}

/**
 * Generate an all-breed show
 */
export function generateAllBreedShow(date: Date): CompetitionEvent {
  const eventDate = new Date(date);
  eventDate.setHours(9, 0, 0, 0);

  const registrationCloses = new Date(eventDate);
  registrationCloses.setDate(registrationCloses.getDate() - 1);

  const registrationOpens = new Date(registrationCloses);
  registrationOpens.setDate(registrationOpens.getDate() - 7);

  const points = calculatePointsAwarded('all_breed');
  const entryFee = 200;

  return {
    id: generateEventId('all_breed', eventDate),
    name: 'All-Breed Championship Show',
    eventType: 'all_breed',
    discipline: 'conformation',
    registrationOpens: registrationOpens.toISOString(),
    registrationCloses: registrationCloses.toISOString(),
    eventDate: eventDate.toISOString(),
    eventDuration: 36,
    status: determineEventStatus(registrationOpens, registrationCloses, eventDate),
    entryFee,
    minLevel: 4,
    minAge: 24,
    pointsAwarded: points,
    isMajor: true,
    prizes: calculatePrizes(entryFee, 'all_breed'),
    maxEntries: 150,
    currentEntries: 0,
    judgeId: selectJudge(),
    leaderboard: [],
  };
}

/**
 * Generate an invitational event
 */
export function generateInvitational(
  date: Date,
  discipline: CompetitionDiscipline
): CompetitionEvent {
  const eventDate = new Date(date);
  eventDate.setHours(15, 0, 0, 0);

  const registrationCloses = new Date(eventDate);
  registrationCloses.setDate(registrationCloses.getDate() - 3);

  const registrationOpens = new Date(registrationCloses);
  registrationOpens.setDate(registrationOpens.getDate() - 14);

  const points = calculatePointsAwarded('invitational');
  const entryFee = 300;

  const disciplineNames: Record<CompetitionDiscipline, string> = {
    conformation: 'Conformation',
    agility: 'Agility',
    obedience: 'Obedience',
    rally: 'Rally',
    racing: 'Racing',
    weight_pull: 'Weight Pull',
    tracking: 'Tracking',
    herding: 'Herding',
  };

  return {
    id: generateEventId('invitational', eventDate),
    name: `${disciplineNames[discipline]} Invitational`,
    eventType: 'invitational',
    discipline,
    registrationOpens: registrationOpens.toISOString(),
    registrationCloses: registrationCloses.toISOString(),
    eventDate: eventDate.toISOString(),
    eventDuration: 24,
    status: determineEventStatus(registrationOpens, registrationCloses, eventDate),
    entryFee,
    minLevel: 5,
    minAge: 24,
    requiredTitle: 'junior_handler',
    pointsAwarded: points,
    isMajor: true,
    prizes: calculatePrizes(entryFee, 'invitational'),
    maxEntries: 40,
    currentEntries: 0,
    judgeId: selectJudge(),
    leaderboard: [],
  };
}

/**
 * Generate a seasonal championship
 */
export function generateSeasonalChampionship(
  year: number,
  season: { name: string; month: number }
): CompetitionEvent {
  const eventDate = new Date(year, season.month - 1, 15, 10, 0, 0);

  const registrationCloses = new Date(eventDate);
  registrationCloses.setDate(registrationCloses.getDate() - 3);

  const registrationOpens = new Date(registrationCloses);
  registrationOpens.setDate(registrationOpens.getDate() - 14);

  const points = calculatePointsAwarded('championship');
  const entryFee = 500;

  return {
    id: generateEventId('championship', eventDate),
    name: season.name,
    eventType: 'championship',
    discipline: 'conformation',
    registrationOpens: registrationOpens.toISOString(),
    registrationCloses: registrationCloses.toISOString(),
    eventDate: eventDate.toISOString(),
    eventDuration: 48,
    status: determineEventStatus(registrationOpens, registrationCloses, eventDate),
    entryFee,
    minLevel: 6,
    minAge: 24,
    requiredTitle: 'champion',
    pointsAwarded: points,
    isMajor: true,
    prizes: calculatePrizes(entryFee, 'championship'),
    maxEntries: 100,
    currentEntries: 0,
    judgeId: selectJudge(),
    leaderboard: [],
  };
}

/**
 * Determine event status based on dates
 */
function determineEventStatus(
  registrationOpens: Date,
  registrationCloses: Date,
  eventDate: Date
): EventStatus {
  const now = new Date();

  if (now < registrationOpens) {
    return 'upcoming';
  } else if (now >= registrationOpens && now < registrationCloses) {
    return 'registration';
  } else if (now >= registrationCloses && now < eventDate) {
    return 'entries_closed';
  } else if (now >= eventDate) {
    const eventEnd = new Date(eventDate);
    eventEnd.setHours(eventEnd.getHours() + 24);
    return now < eventEnd ? 'in_progress' : 'completed';
  }

  return 'upcoming';
}

/**
 * Update event statuses based on current time
 */
export function updateEventStatuses(events: CompetitionEvent[]): CompetitionEvent[] {
  return events.map((event) => {
    const status = determineEventStatus(
      new Date(event.registrationOpens),
      new Date(event.registrationCloses),
      new Date(event.eventDate)
    );
    return { ...event, status };
  });
}

/**
 * Generate all events for the next N weeks
 */
export function generateEventsForPeriod(
  startDate: Date,
  weeks: number = 4
): CompetitionEvent[] {
  const events: CompetitionEvent[] = [];
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + weeks * 7);

  // Generate weekly events
  for (const template of WEEKLY_EVENTS) {
    let currentDate = new Date(startDate);
    while (currentDate < endDate) {
      const event = generateWeeklyEvent(template, currentDate);
      if (new Date(event.eventDate) < endDate) {
        events.push(event);
      }
      currentDate.setDate(currentDate.getDate() + 7);
    }
  }

  // Generate monthly events (1 per week)
  let currentDate = new Date(startDate);
  while (currentDate < endDate) {
    // Week 1: Specialty Show
    const specialtyDate = new Date(currentDate);
    specialtyDate.setDate(specialtyDate.getDate() + 7);
    if (specialtyDate < endDate) {
      events.push(generateSpecialtyShow(specialtyDate));
    }

    // Week 2: Group Show
    const groupDate = new Date(currentDate);
    groupDate.setDate(groupDate.getDate() + 14);
    if (groupDate < endDate) {
      const randomGroup = BREED_GROUPS[Math.floor(Math.random() * BREED_GROUPS.length)];
      events.push(generateGroupShow(groupDate, randomGroup));
    }

    // Week 3: All-Breed Show
    const allBreedDate = new Date(currentDate);
    allBreedDate.setDate(allBreedDate.getDate() + 21);
    if (allBreedDate < endDate) {
      events.push(generateAllBreedShow(allBreedDate));
    }

    // Week 4: Invitational
    const invitationalDate = new Date(currentDate);
    invitationalDate.setDate(invitationalDate.getDate() + 28);
    if (invitationalDate < endDate) {
      const disciplines: CompetitionDiscipline[] = ['agility', 'obedience', 'racing'];
      const randomDiscipline = disciplines[Math.floor(Math.random() * disciplines.length)];
      events.push(generateInvitational(invitationalDate, randomDiscipline));
    }

    currentDate.setDate(currentDate.getDate() + 28);
  }

  // Generate seasonal championships if they fall within the period
  const year = startDate.getFullYear();
  for (const season of SEASONAL_CHAMPIONSHIPS) {
    const championship = generateSeasonalChampionship(year, season);
    const championshipDate = new Date(championship.eventDate);
    if (championshipDate >= startDate && championshipDate < endDate) {
      events.push(championship);
    }
  }

  // Sort events by date
  events.sort(
    (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  );

  return events;
}

/**
 * Filter events by status
 */
export function filterEventsByStatus(
  events: CompetitionEvent[],
  status: EventStatus[]
): CompetitionEvent[] {
  return events.filter((event) => status.includes(event.status));
}

/**
 * Get available events (registration open)
 */
export function getAvailableEvents(events: CompetitionEvent[]): CompetitionEvent[] {
  return filterEventsByStatus(events, ['registration']);
}

/**
 * Get upcoming events (not yet open for registration)
 */
export function getUpcomingEvents(events: CompetitionEvent[]): CompetitionEvent[] {
  return filterEventsByStatus(events, ['upcoming']);
}

/**
 * Remove completed events older than N days
 */
export function pruneOldEvents(events: CompetitionEvent[], daysToKeep: number = 7): CompetitionEvent[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  return events.filter((event) => {
    if (event.status === 'completed') {
      return new Date(event.eventDate) >= cutoffDate;
    }
    return true;
  });
}
