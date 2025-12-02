/**
 * Championship Calculations
 * Handles point awards, title progression, and championship requirements
 * Based on AKC championship system
 */

import type {
  TitleType,
  TitleRequirement,
  ChampionshipProgress,
  CompetitionEvent,
  PointCalculation,
  TitleCheckResult,
  CompetitionDiscipline,
} from '../types/competition';
import type { Dog } from '../types';

// ============================================================================
// Title Requirements (AKC Model)
// ============================================================================

export const TITLE_REQUIREMENTS: Record<TitleType, TitleRequirement> = {
  none: {
    title: 'none',
    totalPoints: 0,
    majorWinsRequired: 0,
    judgesRequired: 0,
    displayName: 'No Title',
    description: 'Begin your championship journey',
    icon: '🐕',
  },
  junior_handler: {
    title: 'junior_handler',
    totalPoints: 5,
    majorWinsRequired: 0,
    judgesRequired: 1,
    displayName: 'Junior Handler',
    description: 'First milestone - 5 championship points',
    icon: '🎖️',
  },
  champion: {
    title: 'champion',
    totalPoints: 15,
    majorWinsRequired: 2,
    judgesRequired: 3,
    displayName: 'Champion',
    description: '15 points + 2 majors + 3 judges',
    icon: '🏆',
  },
  grand_champion: {
    title: 'grand_champion',
    totalPoints: 40, // 15 + 25 more
    majorWinsRequired: 5, // 2 + 3 more
    judgesRequired: 5,
    displayName: 'Grand Champion',
    description: '40 total points + 5 majors',
    icon: '👑',
  },
  silver_grand: {
    title: 'silver_grand',
    totalPoints: 140, // 40 + 100 more
    majorWinsRequired: 8,
    judgesRequired: 8,
    displayName: 'Silver Grand Champion',
    description: '140 total points + 8 majors',
    icon: '🥈',
  },
  gold_grand: {
    title: 'gold_grand',
    totalPoints: 340, // 140 + 200 more
    majorWinsRequired: 12,
    judgesRequired: 12,
    displayName: 'Gold Grand Champion',
    description: '340 total points + 12 majors',
    icon: '🥇',
  },
  platinum_grand: {
    title: 'platinum_grand',
    totalPoints: 740, // 340 + 400 more
    majorWinsRequired: 20,
    judgesRequired: 20,
    displayName: 'Platinum Grand Champion',
    description: '740 total points + 20 majors',
    icon: '💎',
  },
};

// Title progression order
const TITLE_ORDER: TitleType[] = [
  'none',
  'junior_handler',
  'champion',
  'grand_champion',
  'silver_grand',
  'gold_grand',
  'platinum_grand',
];

// ============================================================================
// Point Calculations
// ============================================================================

/**
 * Calculate championship points awarded based on placement and event details
 */
export function calculateChampionshipPoints(
  event: CompetitionEvent,
  placement: number,
  totalCompetitors: number
): PointCalculation {
  // Base points from event definition
  const placementPoints = [
    event.pointsAwarded.first,
    event.pointsAwarded.second,
    event.pointsAwarded.third,
    event.pointsAwarded.fourth,
  ];

  let basePoints = placement >= 1 && placement <= 4 ? placementPoints[placement - 1] : 0;

  // Field size bonus (like real AKC)
  let fieldSizeBonus = 0;
  if (totalCompetitors > 20 && placement === 1) {
    fieldSizeBonus += 1;
  }
  if (totalCompetitors > 50 && placement === 1) {
    fieldSizeBonus += 1;
  }

  const finalPoints = Math.min(5, basePoints + fieldSizeBonus); // AKC caps at 5
  const isMajor = finalPoints >= 3;

  return {
    basePoints,
    fieldSizeBonus,
    finalPoints,
    isMajor,
  };
}

// ============================================================================
// Title Progression
// ============================================================================

/**
 * Get the next title in progression
 */
export function getNextTitle(currentTitle: TitleType): TitleType | null {
  const currentIndex = TITLE_ORDER.indexOf(currentTitle);
  if (currentIndex === -1 || currentIndex === TITLE_ORDER.length - 1) {
    return null;
  }
  return TITLE_ORDER[currentIndex + 1];
}

/**
 * Check if a dog has earned a new title
 */
export function checkTitleEarned(
  currentTitle: TitleType,
  totalPoints: number,
  majorWins: number,
  uniqueJudges: number
): TitleCheckResult {
  const nextTitle = getNextTitle(currentTitle);

  if (!nextTitle) {
    return {
      earnedTitle: false,
      requirements: {
        pointsMet: true,
        majorsMet: true,
        judgesMet: true,
      },
    };
  }

  const requirements = TITLE_REQUIREMENTS[nextTitle];

  const pointsMet = totalPoints >= requirements.totalPoints;
  const majorsMet = majorWins >= requirements.majorWinsRequired;
  const judgesMet = uniqueJudges >= requirements.judgesRequired;

  const earnedTitle = pointsMet && majorsMet && judgesMet;

  return {
    earnedTitle,
    newTitle: earnedTitle ? nextTitle : undefined,
    requirements: {
      pointsMet,
      majorsMet,
      judgesMet,
    },
  };
}

/**
 * Get points needed for next title
 */
export function getPointsToNextTitle(currentTitle: TitleType, currentPoints: number): number {
  const nextTitle = getNextTitle(currentTitle);
  if (!nextTitle) return 0;

  const requirements = TITLE_REQUIREMENTS[nextTitle];
  return Math.max(0, requirements.totalPoints - currentPoints);
}

/**
 * Get majors needed for next title
 */
export function getMajorsToNextTitle(currentTitle: TitleType, currentMajors: number): number {
  const nextTitle = getNextTitle(currentTitle);
  if (!nextTitle) return 0;

  const requirements = TITLE_REQUIREMENTS[nextTitle];
  return Math.max(0, requirements.majorWinsRequired - currentMajors);
}

/**
 * Get judges needed for next title
 */
export function getJudgesToNextTitle(currentTitle: TitleType, currentJudges: number): number {
  const nextTitle = getNextTitle(currentTitle);
  if (!nextTitle) return 0;

  const requirements = TITLE_REQUIREMENTS[nextTitle];
  return Math.max(0, requirements.judgesRequired - currentJudges);
}

// ============================================================================
// Championship Progress Tracking
// ============================================================================

/**
 * Initialize championship progress for a new dog
 */
export function initializeChampionshipProgress(dogId: string): ChampionshipProgress {
  return {
    dogId,
    totalPoints: 0,
    currentTitle: 'none',
    nextTitle: 'junior_handler',
    pointsToNext: 5,
    majorWins: 0,
    majorsNeeded: 0,
    judgesWonUnder: [],
    judgesNeeded: 1,
    disciplinePoints: {
      conformation: 0,
      agility: 0,
      obedience: 0,
      rally: 0,
      racing: 0,
      weight_pull: 0,
      tracking: 0,
      herding: 0,
    },
    specialtyWins: 0,
    groupWins: 0,
    allBreedWins: 0,
    bestInShowWins: 0,
    qualifiedFor: [],
  };
}

/**
 * Calculate championship progress from dog data
 */
export function calculateChampionshipProgress(dog: Dog): ChampionshipProgress {
  const currentTitle = (dog.championship_title as TitleType) || 'none';
  const totalPoints = dog.championship_points || 0;
  const majorWins = dog.major_wins || 0;
  const judgesWonUnder = dog.judges_won_under || [];
  const uniqueJudges = judgesWonUnder.length;

  const nextTitle = getNextTitle(currentTitle);
  const pointsToNext = nextTitle ? getPointsToNextTitle(currentTitle, totalPoints) : 0;
  const majorsNeeded = nextTitle ? getMajorsToNextTitle(currentTitle, majorWins) : 0;
  const judgesNeeded = nextTitle ? getJudgesToNextTitle(currentTitle, uniqueJudges) : 0;

  // Parse discipline points from dog data, ensuring all properties are defined
  const disciplinePoints = {
    conformation: dog.discipline_points?.conformation || 0,
    agility: dog.discipline_points?.agility || 0,
    obedience: dog.discipline_points?.obedience || 0,
    rally: dog.discipline_points?.rally || 0,
    racing: dog.discipline_points?.racing || 0,
    weight_pull: dog.discipline_points?.weight_pull || 0,
    tracking: dog.discipline_points?.tracking || 0,
    herding: dog.discipline_points?.herding || 0,
  };

  return {
    dogId: dog.id,
    totalPoints,
    currentTitle,
    nextTitle: nextTitle || currentTitle,
    pointsToNext,
    majorWins,
    majorsNeeded,
    judgesWonUnder,
    judgesNeeded,
    disciplinePoints,
    specialtyWins: dog.specialty_wins || 0,
    groupWins: dog.group_wins || 0,
    allBreedWins: dog.all_breed_wins || 0,
    bestInShowWins: dog.best_in_show_wins || 0,
    qualifiedFor: dog.qualified_events || [],
  };
}

/**
 * Update championship progress after a competition
 */
export function updateChampionshipProgressAfterCompetition(
  currentProgress: ChampionshipProgress,
  event: CompetitionEvent,
  placement: number,
  pointsAwarded: number,
  isMajor: boolean,
  judgeId: string
): ChampionshipProgress {
  const newProgress = { ...currentProgress };

  // Add points
  newProgress.totalPoints += pointsAwarded;

  // Add discipline points
  const discipline = event.discipline as CompetitionDiscipline;
  if (discipline in newProgress.disciplinePoints) {
    newProgress.disciplinePoints[discipline] += pointsAwarded;
  }

  // Track major wins (only 1st place in major shows)
  if (isMajor && placement === 1) {
    newProgress.majorWins += 1;
  }

  // Track unique judges
  if (placement <= 2 && !newProgress.judgesWonUnder.includes(judgeId)) {
    newProgress.judgesWonUnder = [...newProgress.judgesWonUnder, judgeId];
  }

  // Track event type wins (only 1st place)
  if (placement === 1) {
    if (event.eventType === 'specialty_show') {
      newProgress.specialtyWins += 1;
    } else if (event.eventType === 'group_show') {
      newProgress.groupWins += 1;
    } else if (event.eventType === 'all_breed') {
      newProgress.allBreedWins += 1;
    }
  }

  // Check for title advancement
  const titleCheck = checkTitleEarned(
    newProgress.currentTitle,
    newProgress.totalPoints,
    newProgress.majorWins,
    newProgress.judgesWonUnder.length
  );

  if (titleCheck.earnedTitle && titleCheck.newTitle) {
    newProgress.currentTitle = titleCheck.newTitle;
    newProgress.nextTitle = getNextTitle(titleCheck.newTitle) || titleCheck.newTitle;
  }

  // Recalculate requirements for next title
  newProgress.pointsToNext = getPointsToNextTitle(newProgress.currentTitle, newProgress.totalPoints);
  newProgress.majorsNeeded = getMajorsToNextTitle(newProgress.currentTitle, newProgress.majorWins);
  newProgress.judgesNeeded = getJudgesToNextTitle(
    newProgress.currentTitle,
    newProgress.judgesWonUnder.length
  );

  return newProgress;
}

// ============================================================================
// Qualification Checks
// ============================================================================

/**
 * Check if a dog qualifies for an event based on title requirements
 */
export function checkEventQualification(
  dog: Dog,
  event: CompetitionEvent
): { qualified: boolean; reason?: string } {
  // Check title requirement
  if (event.requiredTitle) {
    const dogTitle = (dog.championship_title as TitleType) || 'none';
    const requiredTitleIndex = TITLE_ORDER.indexOf(event.requiredTitle);
    const dogTitleIndex = TITLE_ORDER.indexOf(dogTitle);

    if (dogTitleIndex < requiredTitleIndex) {
      return {
        qualified: false,
        reason: `Requires ${TITLE_REQUIREMENTS[event.requiredTitle].displayName} title`,
      };
    }
  }

  return { qualified: true };
}

/**
 * Get display info for a title
 */
export function getTitleDisplayInfo(title: TitleType): TitleRequirement {
  return TITLE_REQUIREMENTS[title];
}

/**
 * Calculate progress percentage toward next title
 */
export function getTitleProgressPercentage(progress: ChampionshipProgress): number {
  const nextTitleReq = TITLE_REQUIREMENTS[progress.nextTitle];
  const currentTitleReq = TITLE_REQUIREMENTS[progress.currentTitle];

  const pointsNeeded = nextTitleReq.totalPoints - currentTitleReq.totalPoints;
  const pointsEarned = progress.totalPoints - currentTitleReq.totalPoints;

  if (pointsNeeded === 0) return 100;

  return Math.min(100, Math.max(0, (pointsEarned / pointsNeeded) * 100));
}

/**
 * Get highest earning discipline for a dog
 */
export function getTopDiscipline(
  disciplinePoints: ChampionshipProgress['disciplinePoints']
): { discipline: CompetitionDiscipline; points: number } | null {
  const entries = Object.entries(disciplinePoints) as [CompetitionDiscipline, number][];
  if (entries.length === 0) return null;

  const sorted = entries.sort((a, b) => b[1] - a[1]);
  const [discipline, points] = sorted[0];

  return points > 0 ? { discipline, points } : null;
}

/**
 * Format title for display with icon
 */
export function formatTitleDisplay(title: TitleType): string {
  const info = TITLE_REQUIREMENTS[title];
  return `${info.icon} ${info.displayName}`;
}
