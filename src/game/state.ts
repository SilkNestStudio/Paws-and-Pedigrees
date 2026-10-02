import { createRng, int, type Rng } from '../core/rng';
import { generateShelterTrio, type Dog } from '../core/dog/dog';
import type { DogKnowledge } from '../core/dog/knowledge';
import type { Job } from './jobs';

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

export interface GameState {
  version: 1;
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
}

export const STARTING_MONEY = 40;
export const STARTING_FOOD = 4;

export function newGame(seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0): GameState {
  const rng = createRng(seed);
  const shelter = generateShelterTrio(rng);
  return {
    version: 1,
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
  };
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
