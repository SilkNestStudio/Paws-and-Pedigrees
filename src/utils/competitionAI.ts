/**
 * AI Competitor Generation for Competition Events
 * Generates realistic AI dogs and scores based on event tier and discipline
 */

import type { CompetitionDiscipline } from '../types/competition';
import { rescueBreeds } from '../data/rescueBreeds';

export interface AICompetitor {
  name: string;
  breed: string;
  score: number;
}

/**
 * Generate AI competitor names (realistic dog show names)
 */
const KENNEL_PREFIXES = [
  'Willowbrook', 'Silverstone', 'Golden Oak', 'Riverrun', 'Shadowmere',
  'Thornfield', 'Blackwater', 'Meadowlark', 'Stormwatch', 'Ironwood',
  'Rosewood', 'Ashbury', 'Foxhaven', 'Windermere', 'Clearwater',
  'Brookside', 'Stonegate', 'Maplewood', 'Oakshire', 'Pineridge',
];

const DOG_NAMES = [
  'Thunder', 'Belle', 'Duke', 'Luna', 'Max', 'Stella', 'Rocky', 'Daisy',
  'Bear', 'Molly', 'Zeus', 'Sadie', 'Cooper', 'Bailey', 'Ace', 'Sophie',
  'Ranger', 'Lily', 'Titan', 'Chloe', 'Atlas', 'Ruby', 'Maverick', 'Penny',
  'Scout', 'Willow', 'Rex', 'Rosie', 'Bandit', 'Lucy', 'Hunter', 'Bella',
];

/**
 * Generate a show name (Kennel + Dog Name)
 */
function generateShowName(): string {
  const kennel = KENNEL_PREFIXES[Math.floor(Math.random() * KENNEL_PREFIXES.length)];
  const name = DOG_NAMES[Math.floor(Math.random() * DOG_NAMES.length)];
  return `${kennel}'s ${name}`;
}

/**
 * Select appropriate breed for discipline
 */
function selectBreedForDiscipline(discipline: CompetitionDiscipline): string {
  const breedPool = rescueBreeds.filter(breed => {
    // Calculate average stats from min/max values
    const avgAgility = (breed.agility_min + breed.agility_max) / 2;
    const avgTrainability = (breed.trainability_min + breed.trainability_max) / 2;
    const avgSpeed = (breed.speed_min + breed.speed_max) / 2;
    const avgStrength = (breed.strength_min + breed.strength_max) / 2;
    const avgIntelligence = (breed.intelligence_min + breed.intelligence_max) / 2;

    switch (discipline) {
      case 'agility':
        return avgAgility >= 70;
      case 'obedience':
        return avgTrainability >= 70;
      case 'racing':
        return avgSpeed >= 70;
      case 'weight_pull':
        return avgStrength >= 70;
      case 'conformation':
        return true; // All breeds can compete in conformation
      case 'rally':
        return avgTrainability >= 60 && avgAgility >= 60;
      case 'tracking':
        return avgIntelligence >= 70;
      case 'herding':
        // Note: breed.group doesn't exist in Breed type, commenting out
        return avgIntelligence >= 70; // breed.group === 'Herding' ||
      default:
        return true;
    }
  });

  if (breedPool.length === 0) {
    // Fallback to all breeds if no matches
    return rescueBreeds[Math.floor(Math.random() * rescueBreeds.length)].name;
  }

  return breedPool[Math.floor(Math.random() * breedPool.length)].name;
}

/**
 * Generate a score for an AI competitor based on discipline and tier
 * @param discipline - The competition discipline
 * @param minScore - Minimum score (based on event tier/difficulty)
 * @param maxScore - Maximum score (based on event tier/difficulty)
 * @returns A score between minScore and maxScore with realistic distribution
 */
function generateAIScore(minScore: number, maxScore: number): number {
  // Use a bell curve distribution (normal distribution)
  // This makes middle scores more common than extreme scores
  const mean = (minScore + maxScore) / 2;
  const stdDev = (maxScore - minScore) / 6; // 99.7% of scores within range

  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  let score = mean + z * stdDev;

  // Clamp to range
  score = Math.max(minScore, Math.min(maxScore, score));

  return Math.floor(score);
}

/**
 * Get score range based on event type
 */
export function getScoreRange(eventType: string): { min: number; max: number } {
  const ranges: Record<string, { min: number; max: number }> = {
    match_show: { min: 200, max: 600 },
    point_show: { min: 400, max: 800 },
    specialty_show: { min: 500, max: 900 },
    group_show: { min: 500, max: 900 },
    all_breed: { min: 600, max: 1000 },
    invitational: { min: 700, max: 1100 },
    championship: { min: 800, max: 1200 },
  };

  return ranges[eventType] || { min: 400, max: 800 };
}

/**
 * Generate AI competitors for an event
 * @param discipline - The competition discipline
 * @param eventType - The event type (determines difficulty)
 * @param count - Number of AI competitors to generate
 * @param humanEntries - Number of human entries (to fill remaining slots)
 * @returns Array of AI competitors with names, breeds, and scores
 */
export function generateAICompetitors(
  discipline: CompetitionDiscipline,
  eventType: string,
  count: number,
  humanEntries: number = 1
): AICompetitor[] {
  const scoreRange = getScoreRange(eventType);
  const competitors: AICompetitor[] = [];
  const usedNames = new Set<string>();

  // Generate AI competitors to fill event
  const aiCount = Math.max(1, count - humanEntries);

  for (let i = 0; i < aiCount; i++) {
    // Generate unique name
    let name = generateShowName();
    let attempts = 0;
    while (usedNames.has(name) && attempts < 20) {
      name = generateShowName();
      attempts++;
    }
    usedNames.add(name);

    // Select breed appropriate for discipline
    const breed = selectBreedForDiscipline(discipline);

    // Generate score
    const score = generateAIScore(scoreRange.min, scoreRange.max);

    competitors.push({ name, breed, score });
  }

  return competitors;
}

/**
 * Determine placement based on scores
 */
export function determineWinners(
  scores: Array<{ name: string; score: number }>
): Array<{ name: string; score: number; placement: number }> {
  // Sort by score descending
  const sorted = [...scores].sort((a, b) => b.score - a.score);

  // Assign placements
  return sorted.map((entry, index) => ({
    ...entry,
    placement: index + 1,
  }));
}
