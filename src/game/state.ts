import { createRng, int, type Rng } from '../core/rng';
import { CUES, generateShelterTrio, type Cue, type Dog } from '../core/dog/dog';
import type { DogKnowledge } from '../core/dog/knowledge';
import type { Job } from './jobs';
import type { EventRecord } from './events';
import type { Litter, PedigreeEntry, Pregnancy } from './breeding';

/**
 * The saved game. Everything the player has done lives here; it is plain
 * data so it can be stored locally now and on a server later.
 */
export type Block = 'morning' | 'afternoon' | 'evening' | 'night';
export const BLOCKS: Block[] = ['morning', 'afternoon', 'evening', 'night'];
export const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
export const FUN_DAY = 7;

export type StoryStep =
  | 'letter' // Grandpa's letter
  | 'explore' // walk round the kennel
  | 'toShelter' // drive to the rescue
  | 'settle' // first evening with the new dog
  | 'firstLesson' // learn marker training
  | 'firstNight' // go to bed
  | 'meetMara' // Mara visits on day 2
  | 'firstJob' // Mara's lost keys: the search tutorial
  | 'firstMark' // the first retrieve in Grandpa's field
  | 'freeWeek' // prepare for the Fun Day
  | 'funDay' // Sunday: the Village Fun Day
  | 'afterFunDay'; // the week is done; play continues

export interface ResultRecord {
  day: number;
  dogId: string;
  activity: string;
  title: string;
  score: number;
  grade: string;
}

export interface FunDayEntry {
  kennel: string;
  dog: string;
  rounds: number[];
  total: number;
  player: boolean;
}

export interface FunDayRecord {
  entries: FunDayEntry[];
  bestRound: string;
}

/** Where things stood when the current season began, for the season recap. */
export interface SeasonMark {
  startDay: number;
  money: number;
  jobsDone: number;
  skills: Record<string, Record<Cue, number>>;
}

/** What happened last season, shown once when the new season starts. */
export interface SeasonRecap {
  season: string;
  next: string;
  activities: number;
  best: { title: string; score: number }[];
  moneyChange: number;
  jobs: number;
  skillGains: { dog: string; cue: Cue; before: number; after: number }[];
  trials: { name: string; placing: number; entries: number; qualified: boolean }[];
  ages: { dog: string; months: number }[];
  /** Litters born this season. */
  litters?: { dam: string; sire: string; count: number }[];
}

export interface GameState {
  version: 3;
  seed: number;
  kennelName: string;
  money: number;
  /** Meals in the pantry. */
  food: number;
  bowlFilled: boolean;
  day: number;
  block: Block;
  dogs: Dog[];
  activeDogId: string | null;
  /** Dogs waiting at the rescue until one is adopted. */
  shelter: Dog[];
  story: StoryStep;
  /** One-off facts: places seen, tutorials done, items owned. */
  flags: string[];
  knowledge: Record<string, DogKnowledge>;
  jobs: Job[];
  jobsDone: string[];
  results: ResultRecord[];
  funDay: FunDayRecord | null;
  /** Grandpa's ledger: a short diary of the kennel's new life. */
  diary: { day: number; text: string }[];
  /** Petting counts once per part of the day. */
  pettedAt: string | null;
  brushedDay: number | null;
  /** Larkspur trials entered. */
  trials: EventRecord[];
  season: SeasonMark;
  /** Last season's recap, until the player has seen it. */
  recap: SeasonRecap | null;
  /** Jobs done this season; they come back on the board next season. */
  recentJobs: string[];
  /** Dams in whelp. */
  pregnancies: Pregnancy[];
  /** Every litter bred here, with the puppies still at home. */
  litters: Litter[];
  /** Every dog the kennel has known, for pedigrees and relatedness. */
  pedigree: Record<string, PedigreeEntry>;
}

export const STARTING_MONEY = 40;
export const STARTING_FOOD = 4;

export function newGame(seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0): GameState {
  const rng = createRng(seed);
  const shelter = generateShelterTrio(rng);
  return {
    version: 3,
    seed,
    kennelName: '',
    money: STARTING_MONEY,
    food: STARTING_FOOD,
    bowlFilled: false,
    day: 1,
    block: 'afternoon',
    dogs: [],
    activeDogId: null,
    shelter,
    story: 'letter',
    flags: [],
    knowledge: {},
    jobs: [],
    jobsDone: [],
    results: [],
    funDay: null,
    diary: [],
    pettedAt: null,
    brushedDay: null,
    trials: [],
    season: { startDay: 1, money: STARTING_MONEY, jobsDone: 0, skills: {} },
    recap: null,
    recentJobs: [],
    pregnancies: [],
    litters: [],
    pedigree: {},
  };
}

/** Snapshot of every dog's skills, for measuring progress over a season. */
export function skillSnapshot(dogs: Dog[]): Record<string, Record<Cue, number>> {
  const out: Record<string, Record<Cue, number>> = {};
  for (const d of dogs) out[d.id] = { ...d.skills };
  return out;
}

/**
 * Brings an older save up to date. Version 1 saves (the first week) gain the
 * calendar, trial and title fields with sensible defaults; nothing is lost.
 */
export function migrate(raw: unknown): GameState | null {
  const s = raw as Omit<Partial<GameState>, 'version'> & { version?: number };
  if (!s || !Array.isArray(s.dogs) || typeof s.day !== 'number' || typeof s.story !== 'string')
    return null;
  if (s.version !== 1 && s.version !== 2 && s.version !== 3) return null;
  const state = s as unknown as GameState;
  for (const dog of [...state.dogs, ...(state.shelter ?? [])]) {
    dog.titles ??= [];
    dog.qualifiers ??= {};
    dog.dnaTested ??= false;
    for (const cue of CUES) dog.skills[cue] ??= 0;
  }
  state.trials ??= [];
  state.recap ??= null;
  state.recentJobs ??= [...(state.jobsDone ?? [])];
  state.season ??= {
    startDay: Math.floor((state.day - 1) / 7) * 7 + 1,
    money: state.money,
    jobsDone: state.jobsDone?.length ?? 0,
    skills: skillSnapshot(state.dogs),
  };
  state.pregnancies ??= [];
  state.litters ??= [];
  if (!state.pedigree) {
    state.pedigree = {};
    for (const dog of state.dogs)
      state.pedigree[dog.id] = {
        id: dog.id,
        name: dog.name,
        sex: dog.sex,
        kennel: 'Larchwood Rescue',
        coat: '',
        breed: '',
        titles: [...dog.titles],
        inbreeding: dog.genome.inbreeding,
      };
  }
  state.version = 3;
  return state;
}

/** A fresh Rng for an event, derived from the save so results are repeatable. */
export function eventRng(state: GameState, salt: string): Rng {
  let h = state.seed ^ (state.day * 2654435761);
  for (let i = 0; i < salt.length; i++) h = Math.imul(h ^ salt.charCodeAt(i), 16777619);
  return createRng(h >>> 0);
}

export function eventSeed(state: GameState, salt: string): number {
  return int(eventRng(state, salt), 1, 2 ** 30);
}

export const activeDog = (state: GameState): Dog | null =>
  state.dogs.find((d) => d.id === state.activeDogId) ?? null;

export const hasFlag = (state: GameState, flag: string): boolean => state.flags.includes(flag);

export function addFlag(state: GameState, flag: string): void {
  if (!state.flags.includes(flag)) state.flags.push(flag);
}

export function note(state: GameState, text: string): void {
  state.diary.push({ day: state.day, text });
}

export const dayName = (day: number): string => DAY_NAMES[(day - 1) % 7]!;

/** Applies a change to a deep copy, so callers never mutate the stored state. */
export function update(state: GameState, change: (draft: GameState) => void): GameState {
  const draft = structuredClone(state);
  change(draft);
  return draft;
}
