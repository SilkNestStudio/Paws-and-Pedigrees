import { create } from 'zustand';
import type { Discovery } from '../core/dog/knowledge';
import type { Line } from '../game/story';
import type { GameState } from '../game/state';
import type { Job } from '../game/jobs';
import type { EventDef } from '../game/events';
import type { HomeSession, SpotId } from '../sim/home';
import type { RetrieveSession } from '../sim/retrieve';
import type { SearchSession, SearchSetup } from '../sim/search';
import type { RetrieveSetup } from '../sim/exercises';
import type { Lesson, TrainingSession } from '../sim/training';

/**
 * Interface state. The saved game lives in `game`; live simulations live in
 * `live` (outside React, stepped every frame). Game rules never live here:
 * flow.ts calls the pure rules in src/game and stores the result.
 */
export type Place = 'home' | 'orchard' | 'green' | 'shelter' | 'trial';

export type Screen =
  | { kind: 'loading' }
  | { kind: 'title' }
  | { kind: 'letter'; page: number }
  | { kind: 'home' }
  | { kind: 'shelter' }
  | { kind: 'retrieve'; place: Place; setup: RetrieveSetup; job?: Job; round?: number }
  | { kind: 'search'; place: Place; setup: SearchSetup; job?: Job; round?: number }
  | { kind: 'lesson'; lesson: Lesson };

export type Panel =
  | null
  | 'office'
  | 'noticeboard'
  | 'van'
  | 'shop'
  | 'gateSign'
  | 'fieldGate'
  | 'scentGarden'
  | 'bed'
  | 'result'
  | 'intro'
  | 'standings'
  | 'season'
  | 'adopt'
  | 'kennel'
  | 'breeding'
  | 'whelping'
  | 'menu';

export interface ResultView {
  title: string;
  grade: string;
  score: number;
  seconds: number;
  notes: { text: string; tone: 'good' | 'info' | 'warn' }[];
  discoveries: Discovery[];
  pay: number;
  /** Lesson results show skill before and after. */
  skill?: { name: string; before: number; after: number };
  suggestion?: string;
  next: 'home' | 'eventNext' | 'eventDone' | 'shelter';
}

export interface IntroCard {
  title: string;
  lines: string[];
  key: string;
}

/** A competition in progress: which round, and the scores so far. */
export interface EventProgress {
  def: EventDef;
  round: number;
  player: number[];
  rivals: number[][];
}

export interface Toast {
  id: number;
  text: string;
  tone: 'good' | 'info' | 'warn';
}

export const live: {
  home: HomeSession | null;
  field: RetrieveSession | null;
  search: SearchSession | null;
  lesson: TrainingSession | null;
} = { home: null, field: null, search: null, lesson: null };

export interface AppState {
  game: GameState | null;
  screen: Screen;
  panel: Panel;
  dialog: { lines: Line[]; index: number; then?: () => void } | null;
  intro: IntroCard | null;
  result: ResultView | null;
  event: EventProgress | null;
  toasts: Toast[];
  /** Bumped whenever a new live session starts, so the 3D scene remounts. */
  runId: number;
  /** Where the keeper appears when returning home. */
  homeSpawn: SpotId | 'arrive';
  shelterPick: number;
  /** A short travel fade shown while the next place loads. */
  cover: string | null;
  /** Which part of the breeding screen is open. */
  breedingTab: 'plan' | 'litters' | 'studs';
  /** A panel to open once the how-to-play card is closed. */
  introNext: Panel;
}

export const useApp = create<AppState>(() => ({
  game: null,
  screen: { kind: 'loading' },
  panel: null,
  dialog: null,
  intro: null,
  result: null,
  event: null,
  toasts: [],
  runId: 0,
  homeSpawn: 'arrive',
  shelterPick: 0,
  cover: null,
  breedingTab: 'plan',
  introNext: null,
}));

let toastId = 0;
export function toast(text: string, tone: Toast['tone'] = 'info'): void {
  const id = ++toastId;
  useApp.setState((s) => ({ toasts: [...s.toasts.slice(-3), { id, text, tone }] }));
  setTimeout(() => useApp.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4500);
}

// Development builds expose the live state so browser test scripts can watch it.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __game: unknown }).__game = { live, useApp };
}
