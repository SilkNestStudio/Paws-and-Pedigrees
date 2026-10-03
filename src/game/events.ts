import { chance, createRng, hashString, int, pick, range, shuffle, type Rng } from '../core/rng';
import { generateRescue, TRIAL_LEVELS, type Cue, type Dog, type TrialLevel } from '../core/dog/dog';
import { createFounderGenome } from '../core/genetics/genome';
import type { BreedId } from '../core/genetics/breeds';
import { clamp } from '../core/math';
import { createTrialGround, createVillageGreen, type Field } from '../sim/field';
import { FUN_DAY_BLIND, FUN_DAY_MARK, type RetrieveSetup } from '../sim/exercises';
import { createRetrieveSession } from '../sim/retrieve';
import { buildReport } from '../sim/report';
import { buildSearchReport, createSearchSession, type SearchSetup } from '../sim/search';
import { playRetrieve, playSearch } from '../sim/bots';
import { activeDog, note, type GameState } from './state';

export type { TrialLevel } from '../core/dog/dog';

/**
 * Competitions: the Village Fun Day in the first week, then a field trial at
 * Larkspur every Sunday. Each has three rounds scored 0-100. Rivals play the
 * same rounds through the same simulation with their own dogs and handling
 * skill, so their scores come from play, not from a dice roll.
 */
export type RoundKind = 'mark' | 'search' | 'blind';
export type EventPlace = 'green' | 'trial';
export type RivalLook = 'victor' | 'billy' | 'ruth' | 'sam' | 'grace' | 'hamish' | 'dora';

export interface EventRound {
  kind: RoundKind;
  title: string;
  /** Column heading in the standings. */
  short: string;
  /** What this round shows off, for "your dog was best at …". */
  skill: string;
  retrieve?: RetrieveSetup;
  search?: SearchSetup;
}

export interface Rival {
  id: string;
  kennel: string;
  handler: string;
  look: RivalLook;
  dog: Dog;
  /** Handling skill of the computer handler, 0-1. */
  skill: number;
}

export interface EventDef {
  id: string;
  kind: 'funday' | 'trial';
  name: string;
  place: EventPlace;
  level: TrialLevel | null;
  rounds: EventRound[];
  rivals: Rival[];
  entryFee: number;
  /** Prize money for 1st, 2nd, 3rd. */
  prizes: number[];
  seed: number;
}

export interface EventEntry {
  kennel: string;
  dog: string;
  rounds: number[];
  total: number;
  player: boolean;
}

export interface EventRecord {
  id: string;
  kind: 'funday' | 'trial';
  name: string;
  day: number;
  level: TrialLevel | null;
  dogId: string;
  entries: EventEntry[];
  /** Index of the round where the player did best against the field. */
  bestRound: number;
  placing: number;
  qualified: boolean;
  prize: number;
}

// ---------------------------------------------------------------------------
// Rules for trials (all balance numbers in one place; proposals, adjustable)
// ---------------------------------------------------------------------------

export const TRIAL_RULES: Record<
  TrialLevel,
  { name: string; entryFee: number; prizes: number[]; blurb: string }
> = {
  novice: {
    name: 'Novice',
    entryFee: 10,
    prizes: [50, 30, 15],
    blurb: 'A single mark, a search and a short blind.',
  },
  open: {
    name: 'Open',
    entryFee: 20,
    prizes: [100, 60, 30],
    blurb: 'A double mark, a windy search and a long blind in a crosswind.',
  },
  excellent: {
    name: 'Excellent',
    entryFee: 30,
    prizes: [160, 90, 45],
    blurb: 'A double into cover, a big search, and a blind past an old fall.',
  },
};

/** A qualifying run: every round at least `minRound` and a total of at least `minTotal`. */
export const QUALIFY = { minRound: 50, minTotal: 165, toTitle: 2 };

export const qualifies = (rounds: number[]): boolean =>
  rounds.every((r) => r >= QUALIFY.minRound) &&
  rounds.reduce((a, b) => a + b, 0) >= QUALIFY.minTotal;

/** The level a dog enters next: the first one it has no title for. */
export function trialLevel(dog: Dog): TrialLevel {
  return TRIAL_LEVELS.find((l) => !dog.titles.includes(l)) ?? 'excellent';
}

export const titleName = (level: TrialLevel): string => `${TRIAL_RULES[level].name} title`;

// ---------------------------------------------------------------------------
// The Fun Day (first Sunday)
// ---------------------------------------------------------------------------

export const funDaySearch = (seed: number): SearchSetup => ({
  title: 'Round 2: The search',
  itemName: "the judge's glove",
  hintCenter: { x: -12, z: -38 },
  hintRadius: 18,
  windDeg: 10 + (seed % 60),
  windStrength: 0.4,
});

function withFounder(rng: Rng, name: string, breed: BreedId, boost: number): Dog {
  const dog = generateRescue(rng, name);
  dog.genome = createFounderGenome(rng, breed);
  for (const key of ['speed', 'nose', 'drive', 'focus', 'biddability', 'mouth'] as const) {
    dog.genome.traits[key].g += boost;
  }
  dog.breedMix = { [breed]: 1 };
  return dog;
}

/** Victor Sterling and young Billy Ashby, the Fun Day field. */
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
    {
      id: 'victor',
      kennel: 'Sterling Kennels',
      handler: 'Victor Sterling',
      look: 'victor',
      dog: duchess,
      skill: 0.85,
    },
    {
      id: 'billy',
      kennel: 'Ashby family',
      handler: 'Billy Ashby',
      look: 'billy',
      dog: pickles,
      skill: 0.3,
    },
  ];
}

export function funDayEvent(seed: number): EventDef {
  return {
    id: 'funday',
    kind: 'funday',
    name: 'Village Fun Day',
    place: 'green',
    level: null,
    rounds: [
      {
        kind: 'mark',
        title: 'Round 1: The mark',
        short: 'Mark',
        skill: 'marking',
        retrieve: FUN_DAY_MARK,
      },
      {
        kind: 'search',
        title: 'Round 2: The search',
        short: 'Search',
        skill: 'scent work',
        search: funDaySearch(seed % 997),
      },
      {
        kind: 'blind',
        title: 'Round 3: The blind',
        short: 'Blind',
        skill: 'handling',
        retrieve: FUN_DAY_BLIND,
      },
    ],
    rivals: createRivals(seed),
    entryFee: 0,
    prizes: [0, 0, 0],
    seed: seed % 9973,
  };
}

// ---------------------------------------------------------------------------
// Larkspur trials (every Sunday from the second week)
// ---------------------------------------------------------------------------

interface RivalSpec {
  id: string;
  kennel: string;
  handler: string;
  look: RivalLook;
  dogName: string;
  sex: Dog['sex'];
  breed: BreedId;
  /** Added to the founder's genetic values for working traits. */
  boost: number;
  skill: number;
  levels: TrialLevel[];
}

/** The regulars at Larkspur. The same people and dogs come back week after week. */
const RIVAL_POOL: RivalSpec[] = [
  {
    id: 'billy',
    kennel: 'Ashby family',
    handler: 'Billy Ashby',
    look: 'billy',
    dogName: 'Pickles',
    sex: 'male',
    breed: 'beagle',
    boost: -0.15,
    skill: 0.3,
    levels: ['novice'],
  },
  {
    id: 'sam',
    kennel: 'Pennock Farm',
    handler: 'Sam Pennock',
    look: 'sam',
    dogName: 'Rook',
    sex: 'male',
    breed: 'borderCollie',
    boost: 0,
    skill: 0.4,
    levels: ['novice'],
  },
  {
    id: 'dora',
    kennel: 'Finch Cottage',
    handler: 'Dora Finch',
    look: 'dora',
    dogName: 'Tilly',
    sex: 'female',
    breed: 'poodle',
    boost: 0.05,
    skill: 0.45,
    levels: ['novice', 'open'],
  },
  {
    id: 'ruth',
    kennel: 'Hartley Gundogs',
    handler: 'Ruth Hartley',
    look: 'ruth',
    dogName: 'Juno',
    sex: 'female',
    breed: 'golden',
    boost: 0.15,
    skill: 0.6,
    levels: ['novice', 'open'],
  },
  {
    id: 'hamish',
    kennel: 'Glenreid',
    handler: 'Hamish Reid',
    look: 'hamish',
    dogName: 'Bracken',
    sex: 'male',
    breed: 'golden',
    boost: 0.3,
    skill: 0.7,
    levels: ['open', 'excellent'],
  },
  {
    id: 'grace',
    kennel: 'Okafor Retrievers',
    handler: 'Grace Okafor',
    look: 'grace',
    dogName: 'Saffron',
    sex: 'female',
    breed: 'labrador',
    boost: 0.35,
    skill: 0.75,
    levels: ['open', 'excellent'],
  },
  {
    id: 'victor',
    kennel: 'Sterling Kennels',
    handler: 'Victor Sterling',
    look: 'victor',
    dogName: 'Duchess',
    sex: 'female',
    breed: 'labrador',
    boost: 0.45,
    skill: 0.85,
    levels: ['open', 'excellent'],
  },
];

/** How well trained rivals' dogs are at each level. */
const LEVEL_SKILLS: Record<TrialLevel, Record<Cue, number>> = {
  novice: {
    sit: 0.6,
    stay: 0.35,
    recall: 0.55,
    stop: 0.2,
    cast: 0.1,
    deliver: 0.5,
    indicate: 0.15,
  },
  open: { sit: 0.85, stay: 0.75, recall: 0.8, stop: 0.65, cast: 0.55, deliver: 0.8, indicate: 0.5 },
  excellent: {
    sit: 0.95,
    stay: 0.9,
    recall: 0.9,
    stop: 0.85,
    cast: 0.8,
    deliver: 0.9,
    indicate: 0.7,
  },
};

function rivalFromSpec(spec: RivalSpec, level: TrialLevel): Rival {
  // Seeded by the rival's name, so Juno is the same dog every week.
  const rng = createRng(hashString(`rival-${spec.id}`));
  const dog = withFounder(rng, spec.dogName, spec.breed, spec.boost);
  dog.sex = spec.sex;
  dog.origin = spec.id === 'victor' ? 'purchased' : 'bred';
  dog.skills = { ...LEVEL_SKILLS[level] };
  dog.bond = 65;
  return {
    id: spec.id,
    kennel: spec.kennel,
    handler: spec.handler,
    look: spec.look,
    dog,
    skill: spec.skill,
  };
}

const SEARCH_ITEMS = ["the judge's glove", 'a canvas dummy', 'a set of keys', 'a dog whistle'];

function jitter(rng: Rng, amount: number): number {
  return range(rng, -amount, amount);
}

function trialRounds(rng: Rng, level: TrialLevel): EventRound[] {
  const side = chance(rng, 0.5) ? -1 : 1;
  const wind = () => Math.round(range(rng, 0, 360));
  if (level === 'novice') {
    const lx = side * range(rng, 4, 10);
    const lz = range(rng, -30, -22);
    return [
      {
        kind: 'mark',
        title: 'Round 1: The mark',
        short: 'Mark',
        skill: 'marking',
        retrieve: {
          id: 'trial-novice-mark',
          title: 'Round 1: The mark',
          summary: 'A single mark across the field.',
          focus: 'Marking and steadiness',
          marks: [{ from: { x: lx + side * 11, z: lz + 7 }, landing: { x: lx, z: lz } }],
          blinds: [],
          windDeg: wind(),
          windStrength: range(rng, 0.3, 0.45),
        },
      },
      {
        kind: 'search',
        title: 'Round 2: The search',
        short: 'Search',
        skill: 'scent work',
        search: {
          title: 'Round 2: The search',
          itemName: pick(rng, SEARCH_ITEMS),
          hintCenter: { x: -side * range(rng, 8, 18), z: range(rng, -46, -34) },
          hintRadius: 16,
          windDeg: wind(),
          windStrength: range(rng, 0.35, 0.5),
        },
      },
      {
        kind: 'blind',
        title: 'Round 3: The blind',
        short: 'Blind',
        skill: 'handling',
        retrieve: {
          id: 'trial-novice-blind',
          title: 'Round 3: The blind',
          summary: 'A hidden dummy by the orange stake.',
          focus: 'Handling',
          marks: [],
          blinds: [{ x: jitter(rng, 14), z: range(rng, -44, -34) }],
          windDeg: wind(),
          windStrength: range(rng, 0.35, 0.5),
        },
      },
    ];
  }
  if (level === 'open') {
    const near = { x: -side * range(rng, 8, 14), z: range(rng, -24, -18) };
    const far = { x: side * range(rng, 10, 18), z: range(rng, -52, -42) };
    const cross = chance(rng, 0.5) ? range(rng, 70, 110) : range(rng, 250, 290);
    return [
      {
        kind: 'mark',
        title: 'Round 1: The double',
        short: 'Double',
        skill: 'marking',
        retrieve: {
          id: 'trial-open-double',
          title: 'Round 1: The double',
          summary: 'Two marks. Your dog must remember both.',
          focus: 'Memory under pressure',
          marks: [
            { from: { x: near.x - side * 12, z: near.z + 5 }, landing: near },
            { from: { x: far.x + side * 12, z: far.z + 6 }, landing: far },
          ],
          blinds: [],
          windDeg: wind(),
          windStrength: range(rng, 0.35, 0.5),
        },
      },
      {
        kind: 'search',
        title: 'Round 2: The windy search',
        short: 'Search',
        skill: 'scent work',
        search: {
          title: 'Round 2: The windy search',
          itemName: pick(rng, SEARCH_ITEMS),
          hintCenter: { x: side * range(rng, 6, 20), z: range(rng, -58, -42) },
          hintRadius: 20,
          windDeg: wind(),
          windStrength: range(rng, 0.5, 0.7),
        },
      },
      {
        kind: 'blind',
        title: 'Round 3: The long blind',
        short: 'Blind',
        skill: 'handling',
        retrieve: {
          id: 'trial-open-blind',
          title: 'Round 3: The long blind',
          summary: 'A long blind with the wind blowing across the line.',
          focus: 'Handling at distance',
          marks: [],
          blinds: [{ x: jitter(rng, 18), z: range(rng, -70, -60) }],
          windDeg: Math.round(cross),
          windStrength: range(rng, 0.55, 0.7),
        },
      },
    ];
  }
  const coverA = { x: 18 + jitter(rng, 3), z: -30 + jitter(rng, 3) };
  const coverB = { x: -8 + jitter(rng, 3), z: -50 + jitter(rng, 3) };
  const old = { x: side * range(rng, 6, 12), z: range(rng, -26, -20) };
  return [
    {
      kind: 'mark',
      title: 'Round 1: The double into cover',
      short: 'Double',
      skill: 'marking',
      retrieve: {
        id: 'trial-excellent-double',
        title: 'Round 1: The double into cover',
        summary: 'Two marks, both into rough cover.',
        focus: 'Memory and nose',
        marks: [
          { from: { x: coverA.x + 12, z: coverA.z + 6 }, landing: coverA },
          { from: { x: coverB.x - 12, z: coverB.z + 6 }, landing: coverB },
        ],
        blinds: [],
        windDeg: wind(),
        windStrength: range(rng, 0.4, 0.6),
      },
    },
    {
      kind: 'search',
      title: 'Round 2: The big search',
      short: 'Search',
      skill: 'scent work',
      search: {
        title: 'Round 2: The big search',
        itemName: pick(rng, SEARCH_ITEMS),
        hintCenter: { x: jitter(rng, 20), z: range(rng, -66, -48) },
        hintRadius: 24,
        windDeg: wind(),
        windStrength: range(rng, 0.45, 0.7),
      },
    },
    {
      kind: 'blind',
      title: 'Round 3: Blind past the old fall',
      short: 'Blind',
      skill: 'handling',
      retrieve: {
        id: 'trial-excellent-blind',
        title: 'Round 3: Blind past the old fall',
        summary: 'A mark first, then a blind on a line just past it.',
        focus: 'Handling against temptation',
        marks: [{ from: { x: old.x + side * 10, z: old.z + 5 }, landing: old }],
        blinds: [{ x: old.x + jitter(rng, 4), z: range(rng, -62, -52) }],
        windDeg: wind(),
        windStrength: range(rng, 0.45, 0.65),
      },
    },
  ];
}

/** The trial on a given Sunday at a given level, the same every time it's built. */
export function trialEvent(gameSeed: number, day: number, level: TrialLevel): EventDef {
  const seed = (gameSeed ^ Math.imul(day, 7919)) >>> 0;
  const rng = createRng(seed);
  const pool = RIVAL_POOL.filter((r) => r.levels.includes(level));
  const rivals = shuffle(rng, pool)
    .slice(0, 3)
    .map((spec) => rivalFromSpec(spec, level));
  const rules = TRIAL_RULES[level];
  return {
    id: `trial-${day}`,
    kind: 'trial',
    name: `Larkspur ${rules.name} Trial`,
    place: 'trial',
    level,
    rounds: trialRounds(rng, level),
    rivals,
    entryFee: rules.entryFee,
    prizes: rules.prizes,
    seed: seed % 99991,
  };
}

// ---------------------------------------------------------------------------
// Playing rivals, standings and recording the result
// ---------------------------------------------------------------------------

export const fieldForEvent = (place: EventPlace): Field =>
  place === 'green' ? createVillageGreen() : createTrialGround();

/** A rival's score in one round, played out in full by a computer handler. */
export function rivalScore(def: EventDef, rival: Rival, roundIndex: number): number {
  const round = def.rounds[roundIndex]!;
  const seed = def.seed + roundIndex * 101 + (hashString(rival.id) % 1000);
  const rng = createRng(seed ^ int(createRng(seed), 1, 1e6));
  const field = fieldForEvent(def.place);
  if (round.kind === 'search') {
    const s = createSearchSession(rival.dog, round.search!, field, seed + 11);
    return buildSearchReport(playSearch(s, rival.skill, rng)).score;
  }
  const s = createRetrieveSession(rival.dog, round.retrieve!, seed + 23, field);
  return buildReport(playRetrieve(s, rival.skill, rng)).score;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Final standings once the player has their round scores. */
export function standings(
  def: EventDef,
  kennelName: string,
  dogName: string,
  playerRounds: number[],
  rivalRounds: number[][],
): { entries: EventEntry[]; bestRound: number } {
  const entries: EventEntry[] = [
    {
      kennel: kennelName,
      dog: dogName,
      rounds: playerRounds,
      total: sum(playerRounds),
      player: true,
    },
    ...def.rivals.map((r, i) => ({
      kennel: r.kennel,
      dog: r.dog.name,
      rounds: rivalRounds[i]!,
      total: sum(rivalRounds[i]!),
      player: false,
    })),
  ].sort((a, b) => b.total - a.total || (a.player ? -1 : 1));
  // The round where the player did best compared with the field.
  let bestRound = 0;
  let bestMargin = -Infinity;
  def.rounds.forEach((_, i) => {
    const margin = playerRounds[i]! - Math.max(...rivalRounds.map((r) => r[i]!));
    if (margin > bestMargin) {
      bestMargin = margin;
      bestRound = i;
    }
  });
  return { entries, bestRound };
}

/** Pays the entry fee. Returns false if the player can't afford it. */
export function enterEvent(state: GameState, def: EventDef): boolean {
  if (state.money < def.entryFee) return false;
  state.money -= def.entryFee;
  return true;
}

export interface EventOutcome {
  record: EventRecord;
  /** A title earned with this run, if any. */
  title: TrialLevel | null;
}

/** Writes a finished event into the save: standings, prize, qualifiers and titles. */
export function recordEvent(
  state: GameState,
  def: EventDef,
  playerRounds: number[],
  rivalRounds: number[][],
): EventOutcome | null {
  const dog = activeDog(state);
  if (!dog) return null;
  const table = standings(
    def,
    state.kennelName || 'Your kennel',
    dog.name,
    playerRounds,
    rivalRounds,
  );
  const placing = table.entries.findIndex((e) => e.player) + 1;
  const prize = def.prizes[placing - 1] ?? 0;
  const qualified = def.kind === 'trial' && qualifies(playerRounds);
  const record: EventRecord = {
    id: def.id,
    kind: def.kind,
    name: def.name,
    day: state.day,
    level: def.level,
    dogId: dog.id,
    entries: table.entries,
    bestRound: table.bestRound,
    placing,
    qualified,
    prize,
  };
  state.money += prize;
  state.block = 'evening';
  dog.energy = clamp(dog.energy - 30, 0, 100);
  let title: TrialLevel | null = null;
  if (def.kind === 'funday') {
    state.funDay = { entries: table.entries, bestRound: def.rounds[table.bestRound]!.kind };
  } else {
    state.trials.push(record);
    if (qualified && def.level) {
      const count = (dog.qualifiers[def.level] ?? 0) + 1;
      dog.qualifiers[def.level] = count;
      if (count >= QUALIFY.toTitle && !dog.titles.includes(def.level)) {
        dog.titles.push(def.level);
        title = def.level;
      }
    }
  }
  const best = def.rounds[table.bestRound]!;
  note(
    state,
    `${def.name}: ${ordinal(placing)} of ${table.entries.length}${prize ? ` ($${prize})` : ''}.` +
      `${qualified ? ' A qualifying run!' : ''} ${dog.name} was best at ${best.skill}.` +
      (title ? ` ${dog.name} earned the ${titleName(title)}.` : ''),
  );
  return { record, title };
}

export const ordinal = (n: number) =>
  n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
