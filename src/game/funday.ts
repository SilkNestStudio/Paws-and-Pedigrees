import { createRng, int, type Rng } from '../core/rng';
import { generateRescue, type Dog } from '../core/dog/dog';
import { createFounderGenome } from '../core/genetics/genome';
import { createVillageGreen } from '../sim/field';
import { FUN_DAY_BLIND, FUN_DAY_MARK } from '../sim/exercises';
import { createRetrieveSession } from '../sim/retrieve';
import { buildReport } from '../sim/report';
import { buildSearchReport, createSearchSession, type SearchSetup } from '../sim/search';
import { playRetrieve, playSearch } from '../sim/bots';
import type { FunDayEntry, FunDayRecord } from './state';

/**
 * The Village Fun Day: three rounds, each scored 0-100. Rivals play through
 * the same simulation with their own dogs and handling skill.
 */
export type RoundId = 'mark' | 'search' | 'blind';

export const ROUNDS: { id: RoundId; title: string; skill: string }[] = [
  { id: 'mark', title: 'Round 1: The mark', skill: 'marking' },
  { id: 'search', title: 'Round 2: The search', skill: 'scent work' },
  { id: 'blind', title: 'Round 3: The blind', skill: 'handling' },
];

export const funDaySearch = (seed: number): SearchSetup => ({
  title: 'Round 2: The search',
  itemName: "the judge's glove",
  hintCenter: { x: -12, z: -38 },
  hintRadius: 18,
  windDeg: 10 + (seed % 60),
  windStrength: 0.4,
});

export interface Rival {
  kennel: string;
  handler: string;
  dog: Dog;
  skill: number;
}

function withFounder(rng: Rng, name: string, breed: 'labrador' | 'beagle', boost: number): Dog {
  const dog = generateRescue(rng, name);
  dog.genome = createFounderGenome(rng, breed);
  for (const key of ['speed', 'nose', 'drive', 'focus', 'biddability', 'mouth'] as const) {
    dog.genome.traits[key].g += boost;
  }
  dog.breedMix = { [breed]: 1 };
  return dog;
}

export function createRivals(seed: number): Rival[] {
  const rng = createRng(seed ^ 0x5eed);
  const duchess = withFounder(rng, 'Duchess', 'labrador', 0.45);
  duchess.origin = 'purchased';
  duchess.sex = 'female';
  duchess.skills = {
    sit: 0.95,
    stay: 0.9,
    recall: 0.9,
    stop: 0.85,
    cast: 0.8,
    deliver: 0.9,
    indicate: 0.7,
  };
  duchess.bond = 70;
  const pickles = withFounder(rng, 'Pickles', 'beagle', -0.2);
  pickles.sex = 'male';
  pickles.skills = {
    sit: 0.6,
    stay: 0.25,
    recall: 0.45,
    stop: 0.15,
    cast: 0.1,
    deliver: 0.4,
    indicate: 0.1,
  };
  pickles.bond = 60;
  return [
    { kennel: 'Sterling Kennels', handler: 'Victor Sterling', dog: duchess, skill: 0.85 },
    { kennel: 'Ashby family', handler: 'Billy Ashby', dog: pickles, skill: 0.3 },
  ];
}

/** A rival's score in one round, played out in full by a computer handler. */
export function rivalRound(rival: Rival, round: RoundId, seed: number): number {
  const rng = createRng(seed ^ int(createRng(seed), 1, 1e6));
  if (round === 'search') {
    const s = createSearchSession(rival.dog, funDaySearch(seed), createVillageGreen(), seed + 11);
    return buildSearchReport(playSearch(s, rival.skill, rng)).score;
  }
  const setup = round === 'mark' ? FUN_DAY_MARK : FUN_DAY_BLIND;
  const s = createRetrieveSession(rival.dog, setup, seed + 23, createVillageGreen());
  return buildReport(playRetrieve(s, rival.skill, rng)).score;
}

/** Final standings once the player has their three round scores. */
export function standings(
  kennelName: string,
  dog: Dog,
  playerRounds: number[],
  rivals: Rival[],
  rivalRounds: number[][],
): FunDayRecord {
  const entries: FunDayEntry[] = [
    {
      kennel: kennelName,
      dog: dog.name,
      rounds: playerRounds,
      total: sum(playerRounds),
      player: true,
    },
    ...rivals.map((r, i) => ({
      kennel: r.kennel,
      dog: r.dog.name,
      rounds: rivalRounds[i]!,
      total: sum(rivalRounds[i]!),
      player: false,
    })),
  ].sort((a, b) => b.total - a.total);
  // The round where the player did best compared with the field.
  let best = 0;
  let bestMargin = -Infinity;
  ROUNDS.forEach((_, i) => {
    const others = rivalRounds.map((r) => r[i]!);
    const margin = playerRounds[i]! - Math.max(...others);
    if (margin > bestMargin) {
      bestMargin = margin;
      best = i;
    }
  });
  return { entries, bestRound: ROUNDS[best]!.id };
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
