import { create } from 'zustand';
import type { Vec2 } from '../core/math';
import type { DogMode } from '../sim/agents';
import { LESSONS, type Feedback, type Lesson } from '../sim/training';
import type { ItemKind, ItemState, RetrieveSession, SessionEvent } from '../sim/retrieve';
import type { TrainingSession } from '../sim/training';
import { windAt } from '../sim/scent';
import { cameraState } from './input';

/** A light snapshot of the live session for the interface, refreshed ~10 times a second. */
export interface HudSnapshot {
  kind: 'field' | 'lesson';
  dogName: string;
  tell: string;
  dogMode: DogMode | null;
  hint: string;
  cameraYaw: number;
  wind: { heading: number; strength: number } | null;
  events: SessionEvent[];
  field: {
    free: boolean;
    phase: RetrieveSession['phase'];
    canThrow: boolean;
    dogAway: boolean;
    keeper: Vec2;
    dog: Vec2;
    trace: Vec2[];
    items: { pos: Vec2; kind: ItemKind; state: ItemState }[];
    remaining: number;
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
    reps: number;
  } | null;
}

export const useHud = create<{ snap: HudSnapshot | null }>(() => ({ snap: null }));

function fieldHint(s: RetrieveSession): string {
  const name = s.dogName;
  const d = s.dog;
  if (s.setup.free) {
    if (d.mode === 'sit' || d.mode === 'heel')
      return `Tap the ground to throw the ball for ${name}.`;
    if (d.mode === 'stopped' || d.mode === 'popped')
      return `${name} is waiting. Tap a direction to send, or call "Here!".`;
    return `Keep moving if you like. ${name} will bring it back to you.`;
  }
  if (s.phase === 'ready') {
    return s.setup.marks.length > 0
      ? 'Press "Throw!" when you are ready. Watch where it lands.'
      : `Line ${name} up: tap the ground toward the orange stake to send.`;
  }
  if (s.phase === 'throwing')
    return d.breakPressure > 0.55
      ? `${name} is itching to go. Say "Sit" to steady!`
      : 'Watch the fall…';
  if (s.phase === 'complete') return 'Done!';
  switch (d.mode) {
    case 'sit':
    case 'heel': {
      const marks = s.items.some((i) => i.kind === 'mark' && i.state === 'lying');
      const blinds = s.items.some((i) => i.kind === 'blind' && i.state === 'lying');
      if (marks) return `Tap where it fell to send ${name}.`;
      if (blinds) return `Tap toward the orange stake to send ${name} on a line.`;
      return 'Nice work.';
    }
    case 'run':
    case 'line':
      return `Blow the whistle if ${name} is going wrong. Watch the wind.`;
    case 'hunt':
      return `${name} is hunting. Stop and redirect if it's the wrong place.`;
    case 'scent':
      return 'Leave it to the nose!';
    case 'stopped':
    case 'popped':
      return `Tap the ground in the direction you want ${name} to go.`;
    case 'return':
    case 'deliver':
      return d.carrying !== null ? `${name} is bringing it back.` : `${name} is coming back.`;
    default:
      return '';
  }
}

function lessonHint(t: TrainingSession): string {
  const info = LESSONS[t.lesson];
  if (t.phase === 'done') return 'Session over.';
  if (t.phase === 'idle') {
    if (t.lesson === 'cast') return 'Tap a pile (or press 1, 2, 3) to send your dog to it.';
    if (t.lesson === 'stop')
      return 'Press "Throw" to send the ball out, then whistle while your dog runs.';
    if (t.lesson === 'stay') return 'Choose a gentle toss or a big throw.';
    return `Press "${info.cueLabel}" to ask.`;
  }
  if (t.lesson === 'stop' && t.phase === 'waiting' && !t.current && !t.pendingResponse)
    return 'Whistle now!';
  if (t.phase === 'resetting') return 'Reward given. Setting up the next one…';
  return 'Watch closely… press Yes! at exactly the right moment.';
}

export function publishField(s: RetrieveSession): void {
  const wind = windAt(s.wind, s.time);
  useHud.setState({
    snap: {
      kind: 'field',
      dogName: s.dogName,
      tell: s.dog.tell.text,
      dogMode: s.dog.mode,
      hint: fieldHint(s),
      cameraYaw: cameraState.yaw,
      wind: { heading: wind.heading, strength: s.wind.strength },
      events: s.events.slice(-3),
      field: {
        free: !!s.setup.free,
        phase: s.phase,
        canThrow: s.phase === 'ready' && s.setup.marks.length > 0,
        dogAway: !(s.dog.mode === 'sit' || s.dog.mode === 'heel'),
        keeper: { ...s.keeper.pos },
        dog: { ...s.dog.pos },
        trace: s.stats.trace.filter((_, i) => i % 2 === 0),
        items: s.items
          .filter((i) => i.kind !== 'ball' || i.state !== 'delivered')
          .map((i) => ({ pos: { ...i.pos }, kind: i.kind, state: i.state })),
        remaining: s.items.filter((i) => i.kind !== 'ball' && i.state !== 'delivered').length,
      },
      lesson: null,
    },
  });
}

export function publishLesson(t: TrainingSession): void {
  useHud.setState({
    snap: {
      kind: 'lesson',
      dogName: t.dogName,
      tell: t.dog.tell.text,
      dogMode: null,
      hint: lessonHint(t),
      cameraYaw: cameraState.yaw,
      wind: null,
      events: [],
      field: null,
      lesson: {
        lesson: t.lesson,
        phase: t.phase,
        skill: t.skill,
        before: t.skillBefore,
        treats: t.treats,
        interest: t.interest,
        feedback: t.feedback,
        time: t.time,
        reps: t.reps,
      },
    },
  });
}
