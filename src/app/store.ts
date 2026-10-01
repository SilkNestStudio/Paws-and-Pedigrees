import { create } from 'zustand';
import { createRng, int } from '../core/rng';
import { generateShelterTrio, type Cue, type Dog } from '../core/dog/dog';
import { createRetrieveSession, type RetrieveSession } from '../sim/retrieve';
import {
  createTrainingSession,
  lessonSummary,
  type Lesson,
  type TrainingSession,
} from '../sim/training';
import { setupById } from '../sim/exercises';
import { buildReport, type RetrieveReport } from '../sim/report';

/**
 * App state for the Phase 1 field test. Live simulations are kept outside
 * React state (in `live`) and stepped every frame; the store only holds what
 * the interface shows, refreshed about ten times a second.
 */
export type Screen = { kind: 'field'; setupId: string } | { kind: 'lesson'; lesson: Lesson };
export type Panel = 'none' | 'welcome' | 'book' | 'result';

export interface HistoryEntry {
  setupId: string;
  dogId: string;
  score: number;
  grade: RetrieveReport['grade'];
}

export interface LessonResult {
  lesson: Lesson;
  dogName: string;
  before: number;
  after: number;
  reps: number;
  counts: ReturnType<typeof lessonSummary>['counts'];
  averageOffset: number | null;
}

export const live: { field: RetrieveSession | null; lesson: TrainingSession | null } = {
  field: null,
  lesson: null,
};

interface SaveData {
  version: 1;
  seed: number;
  dogs: Dog[];
  activeDogId: string;
  history: HistoryEntry[];
  welcomed: boolean;
}

const SAVE_KEY = 'paws-rebuild-field-test';

function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    return data.version === 1 && Array.isArray(data.dogs) && data.dogs.length > 0 ? data : null;
  } catch {
    return null;
  }
}

function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Private mode or storage full: the test still works, it just won't remember.
  }
}

function freshSave(): SaveData {
  const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  const dogs = generateShelterTrio(createRng(seed));
  return { version: 1, seed, dogs, activeDogId: dogs[0].id, history: [], welcomed: false };
}

export interface GameState {
  seed: number;
  dogs: Dog[];
  activeDogId: string;
  history: HistoryEntry[];
  welcomed: boolean;
  screen: Screen;
  panel: Panel;
  runId: number;
  report: RetrieveReport | null;
  lessonResult: LessonResult | null;
  bookTab: 'work' | 'lessons' | 'dogs';

  activeDog: () => Dog;
  startField: (setupId: string) => void;
  startLesson: (lesson: Lesson) => void;
  restart: () => void;
  selectDog: (id: string) => void;
  setPanel: (panel: Panel) => void;
  setBookTab: (tab: GameState['bookTab']) => void;
  finishField: () => void;
  finishLesson: () => void;
  dismissWelcome: () => void;
  newRescues: () => void;
  devSetSkill: (cue: Cue, value: number) => void;
}

const initial = loadSave() ?? freshSave();

function persist(state: GameState): void {
  writeSave({
    version: 1,
    seed: state.seed,
    dogs: state.dogs,
    activeDogId: state.activeDogId,
    history: state.history,
    welcomed: state.welcomed,
  });
}

function sessionSeed(state: { seed: number; runId: number }): number {
  return int(createRng(state.seed + state.runId * 7919), 1, 2 ** 30);
}

export const useGame = create<GameState>((set, get) => ({
  seed: initial.seed,
  dogs: initial.dogs,
  activeDogId: initial.activeDogId,
  history: initial.history,
  welcomed: initial.welcomed,
  screen: { kind: 'field', setupId: 'free' },
  panel: initial.welcomed ? 'none' : 'welcome',
  runId: 0,
  report: null,
  lessonResult: null,
  bookTab: 'work',

  activeDog: () => get().dogs.find((d) => d.id === get().activeDogId) ?? get().dogs[0]!,

  startField: (setupId) => {
    const runId = get().runId + 1;
    live.lesson = null;
    live.field = createRetrieveSession(
      get().activeDog(),
      setupById(setupId),
      sessionSeed({ seed: get().seed, runId }),
    );
    set({ screen: { kind: 'field', setupId }, runId, panel: 'none', report: null });
  },

  startLesson: (lesson) => {
    const runId = get().runId + 1;
    live.field = null;
    live.lesson = createTrainingSession(
      get().activeDog(),
      lesson,
      sessionSeed({ seed: get().seed, runId }),
    );
    set({ screen: { kind: 'lesson', lesson }, runId, panel: 'none', lessonResult: null });
  },

  restart: () => {
    const screen = get().screen;
    if (screen.kind === 'field') get().startField(screen.setupId);
    else get().startLesson(screen.lesson);
  },

  selectDog: (id) => {
    set({ activeDogId: id });
    persist(get());
    get().restart();
  },

  setPanel: (panel) => set({ panel }),
  setBookTab: (bookTab) => set({ bookTab }),

  finishField: () => {
    const s = live.field;
    const screen = get().screen;
    if (!s || screen.kind !== 'field') return;
    const report = buildReport(s);
    const history = [
      ...get().history,
      {
        setupId: screen.setupId,
        dogId: get().activeDogId,
        score: report.score,
        grade: report.grade,
      },
    ].slice(-200);
    set({ report, history, panel: 'result' });
    persist(get());
  },

  finishLesson: () => {
    const t = live.lesson;
    if (!t) return;
    const summary = lessonSummary(t);
    const dogs = get().dogs.map((d) =>
      d.id === get().activeDogId ? { ...d, skills: { ...d.skills, [t.lesson]: t.skill } } : d,
    );
    set({
      dogs,
      panel: 'result',
      lessonResult: { lesson: t.lesson, dogName: t.dogName, ...summary },
    });
    persist(get());
  },

  dismissWelcome: () => {
    set({ welcomed: true, panel: 'none' });
    persist(get());
  },

  newRescues: () => {
    const fresh = freshSave();
    set({ seed: fresh.seed, dogs: fresh.dogs, activeDogId: fresh.activeDogId, history: [] });
    persist(get());
    get().startField('free');
  },

  devSetSkill: (cue, value) => {
    const dogs = get().dogs.map((d) =>
      d.id === get().activeDogId ? { ...d, skills: { ...d.skills, [cue]: value } } : d,
    );
    set({ dogs });
    persist(get());
    get().restart();
  },
}));

/** Start the first session immediately so the field is never empty. */
live.field = createRetrieveSession(
  useGame.getState().activeDog(),
  setupById('free'),
  sessionSeed({ seed: initial.seed, runId: 0 }),
);

// Development builds expose the live state so browser test scripts can watch it.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __game: unknown }).__game = { live, useGame };
}
