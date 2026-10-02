import { create } from 'zustand';
import { distance, type Vec2 } from '../core/math';
import type { DogMode } from '../sim/agents';
import { LESSONS, type Feedback, type Lesson, type TrainingSession } from '../sim/training';
import type { ItemKind, ItemState, RetrieveSession, SessionEvent } from '../sim/retrieve';
import type { SearchSession } from '../sim/search';
import { HOME_SPOTS, type HomeSession, type SpotId } from '../sim/home';
import { windAt } from '../sim/scent';
import { cameraState } from './input';
import { live, useApp } from './store';
import { MARA_POS } from './flow';

/** A light snapshot of whatever is live, refreshed about ten times a second for the interface. */
export interface HudSnapshot {
  kind: 'home' | 'retrieve' | 'search' | 'lesson' | 'shelter';
  dogName: string | null;
  tell: string;
  dogMode: DogMode | null;
  hint: string;
  cameraYaw: number;
  wind: { heading: number; strength: number } | null;
  events: SessionEvent[];
  home: {
    near: { id: SpotId | 'mara' | 'dog'; label: string } | null;
    nearDog: boolean;
    keeper: Vec2;
  } | null;
  field: {
    free: boolean;
    phase: RetrieveSession['phase'];
    canThrow: boolean;
    dogAway: boolean;
    keeper: Vec2;
    dog: Vec2;
    trace: Vec2[];
    items: { pos: Vec2; kind: ItemKind; state: ItemState }[];
  } | null;
  search: {
    phase: SearchSession['phase'];
    alertClear: boolean | null;
    keeper: Vec2;
    dog: Vec2;
    trace: Vec2[];
    hint: { center: Vec2; radius: number };
    itemName: string;
  } | null;
  lesson: {
    lesson: Lesson;
    phase: TrainingSession['phase'];
    skill: number;
    before: number;
    treats: number;
    interest: number;
    feedback: Feedback | null;
    time: number;
  } | null;
}

export const useHud = create<{ snap: HudSnapshot | null }>(() => ({ snap: null }));

const SPOT_ACTIONS: Record<SpotId, string> = {
  office: 'Open the office',
  house: 'Go inside (bed)',
  runs: 'Fill the food bowl',
  bowl: 'Fill the food bowl',
  pantry: 'Look in the pantry',
  gateSign: 'Read the gate sign',
  van: 'Get in the van',
  noticeboard: 'Read the noticeboard',
  fieldGate: 'Go training',
  scentGarden: 'Look at the overgrown corner',
};

function homeSnapshot(h: HomeSession): HudSnapshot {
  const g = useApp.getState().game;
  let near: NonNullable<HudSnapshot['home']>['near'] = null;
  if (g?.story === 'meetMara' && distance(h.keeper.pos, MARA_POS) < 2.8)
    near = { id: 'mara', label: 'Talk to Mara' };
  else if (h.nearSpot) near = { id: h.nearSpot, label: SPOT_ACTIONS[h.nearSpot] };
  else if (h.nearDog) near = { id: 'dog', label: 'Give a pat' };
  const name = g?.dogs.find((d) => d.id === g.activeDogId)?.name ?? null;
  return {
    kind: 'home',
    dogName: name,
    tell: h.dog?.tell.text ?? '',
    dogMode: h.dog?.mode ?? null,
    hint: near ? '' : 'Follow the orange arrow, or explore. Walk up to things to use them.',
    cameraYaw: cameraState.yaw,
    wind: null,
    events: [],
    home: { near, nearDog: h.nearDog && !!name, keeper: { ...h.keeper.pos } },
    field: null,
    search: null,
    lesson: null,
  };
}

function fieldHint(s: RetrieveSession, shelter: boolean): string {
  const name = s.dogName;
  const d = s.dog;
  if (shelter || s.setup.free) {
    if (d.mode === 'sit' || d.mode === 'heel')
      return `Click or tap the grass to throw the ball for ${name}.`;
    return `Watch how ${name} plays. Fast? Careful? Easily distracted?`;
  }
  if (s.phase === 'ready') {
    return s.items.some((i) => i.state === 'waiting')
      ? 'Press "Throw!" and watch where it lands.'
      : `Click or tap toward the orange stake to send ${name}.`;
  }
  if (s.phase === 'throwing')
    return d.breakPressure > 0.55
      ? `${name} is quivering. Press "Sit" to steady!`
      : 'Watch the fall…';
  if (s.phase === 'complete') return 'Done!';
  switch (d.mode) {
    case 'sit':
    case 'heel': {
      if (s.items.some((i) => i.kind === 'mark' && i.state === 'lying'))
        return `Click or tap on the flag where it fell to send ${name}.`;
      if (s.items.some((i) => i.kind === 'blind' && i.state === 'lying'))
        return `Click or tap toward the orange stake to send ${name}.`;
      return '';
    }
    case 'run':
    case 'line':
      return `If ${name} goes the wrong way, blow the whistle (Space).`;
    case 'hunt':
      return `${name} is hunting. Wrong place? Whistle, then click where to go.`;
    case 'scent':
      return 'Leave it to the nose!';
    case 'stopped':
    case 'popped':
      return `Click or tap where you want ${name} to go next.`;
    case 'return':
    case 'deliver':
      return d.carrying !== null ? `${name} is bringing it back.` : `${name} is coming back.`;
    default:
      return '';
  }
}

function searchHint(s: SearchSession): string {
  const name = s.dogName;
  switch (s.phase) {
    case 'ready':
      return `Walk toward the circle, then click or tap where ${name} should search.`;
    case 'alert':
      return `${name} is indicating. Trust it ("Show me!") or not ("Search on")?`;
    case 'returning':
      return `${name} is bringing it back!`;
    case 'complete':
      return 'Found!';
    default:
      if (s.stats.startedAt !== null && s.time - s.stats.startedAt > 60 && s.time % 20 < 10) {
        return 'Tip: scent drifts downwind, the way the wind arrow points. Search on that side of the circle.';
      }
      return s.dog.huntTime > s.params.huntPatience * 2.5
        ? 'Nothing here. Tap or click somewhere else in the circle.'
        : `Watch ${name}'s tail and nose. Tap or click elsewhere to move the search.`;
  }
}

function lessonHint(t: TrainingSession): string {
  if (t.phase === 'done') return 'Session over.';
  if (t.phase === 'idle') {
    if (t.lesson === 'cast') return 'Click a pile (or press 1, 2, 3) to send your dog to it.';
    if (t.lesson === 'stop') return 'Press "Throw", then whistle while your dog runs.';
    if (t.lesson === 'stay') return 'Choose a gentle toss or a big throw.';
    return `Press "${LESSONS[t.lesson].cueLabel}".`;
  }
  if (t.lesson === 'stop' && t.phase === 'waiting' && !t.current && !t.pendingResponse)
    return 'Whistle now!';
  if (t.phase === 'resetting') return 'Setting up the next one…';
  return 'Watch closely… press Yes! (Space) at the right moment.';
}

export function publish(): void {
  const screen = useApp.getState().screen;
  let snap: HudSnapshot | null = null;
  if (live.home) snap = homeSnapshot(live.home);
  else if (live.field) {
    const s = live.field;
    const wind = windAt(s.wind, s.time);
    const shelter = screen.kind === 'shelter';
    snap = {
      kind: shelter ? 'shelter' : 'retrieve',
      dogName: s.dogName,
      tell: s.dog.tell.text,
      dogMode: s.dog.mode,
      hint: fieldHint(s, shelter),
      cameraYaw: cameraState.yaw,
      wind: s.setup.free ? null : { heading: wind.heading, strength: s.wind.strength },
      events: s.events.slice(-3),
      home: null,
      field: {
        free: !!s.setup.free,
        phase: s.phase,
        canThrow: s.phase === 'ready' && s.items.some((i) => i.state === 'waiting'),
        dogAway: !(s.dog.mode === 'sit' || s.dog.mode === 'heel'),
        keeper: { ...s.keeper.pos },
        dog: { ...s.dog.pos },
        trace: s.stats.trace.filter((_, i) => i % 2 === 0),
        items: s.items
          .filter((i) => i.kind !== 'ball')
          .map((i) => ({ pos: { ...i.pos }, kind: i.kind, state: i.state })),
      },
      search: null,
      lesson: null,
    };
  } else if (live.search) {
    const s = live.search;
    const wind = windAt(s.wind, s.time);
    snap = {
      kind: 'search',
      dogName: s.dogName,
      tell: s.dog.tell.text,
      dogMode: s.dog.mode,
      hint: searchHint(s),
      cameraYaw: cameraState.yaw,
      wind: { heading: wind.heading, strength: s.wind.strength },
      events: s.events.slice(-3),
      home: null,
      field: null,
      search: {
        phase: s.phase,
        alertClear: s.alert ? s.alert.clear : null,
        keeper: { ...s.keeper.pos },
        dog: { ...s.dog.pos },
        trace: s.stats.trace.filter((_, i) => i % 2 === 0),
        hint: { center: s.setup.hintCenter, radius: s.setup.hintRadius },
        itemName: s.setup.itemName,
      },
      lesson: null,
    };
  } else if (live.lesson) {
    const t = live.lesson;
    snap = {
      kind: 'lesson',
      dogName: t.dogName,
      tell: t.dog.tell.text,
      dogMode: null,
      hint: lessonHint(t),
      cameraYaw: cameraState.yaw,
      wind: null,
      events: [],
      home: null,
      field: null,
      search: null,
      lesson: {
        lesson: t.lesson,
        phase: t.phase,
        skill: t.skill,
        before: t.skillBefore,
        treats: t.treats,
        interest: t.interest,
        feedback: t.feedback,
        time: t.time,
      },
    };
  }
  useHud.setState({ snap });
}

export const spotLabel = (id: SpotId) => HOME_SPOTS.find((s) => s.id === id)?.label ?? id;
