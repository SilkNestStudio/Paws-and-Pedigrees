import { create } from 'zustand';
import { distance, type Vec2 } from '../core/math';
import type { DogMode } from '../sim/agents';
import {
  LESSONS,
  type Feedback,
  type Lesson,
  type TrainingSession,
  coaching,
} from '../sim/training';
import type { ItemKind, ItemState, RetrieveSession, SessionEvent } from '../sim/retrieve';
import type { SearchSession } from '../sim/search';
import { HOME_SPOTS, type HomeSession, type SpotId } from '../sim/home';
import { windAt } from '../sim/scent';
import { cameraState } from './input';
import { PUP_ACTIVITIES, pupHint } from '../sim/puppies';
import { OBSTACLE_NAMES, standardTime, type AgilitySession } from '../sim/agility';
import { advise, timeLimit, type HerdCommand, type HerdingSession } from '../sim/herding';
import { live, useApp } from './store';
import { MARA_POS } from './flow';
import { visitorToday } from '../game/visitors';

/** A light snapshot of whatever is live, refreshed about ten times a second for the interface. */
export interface HudSnapshot {
  kind: 'home' | 'retrieve' | 'search' | 'lesson' | 'shelter' | 'puppies' | 'agility' | 'herding';
  /** A run on sheep. */
  herding?: {
    phase: HerdingSession['phase'];
    task: number;
    tasks: { label: string; through: number }[];
    flock: number;
    penned: number;
    seconds: number;
    standard: number;
    limit: number;
    harried: number;
    keeper: Vec2;
    dog: Vec2;
    sheep: Vec2[];
    /** What a good handler would ask for now. */
    suggest: HerdCommand | null;
  };
  /** A round of agility. */
  agility?: {
    phase: AgilitySession['phase'];
    next: number;
    total: number;
    seconds: number;
    standard: number;
    faults: number;
    keeper: Vec2;
    dog: Vec2;
  };
  /** A puppy session in the paddock. */
  puppies?: {
    mode: 'raise' | 'evaluate';
    title: string;
    summary: string;
    pupId: string | null;
    done: number;
    total: number;
    hintKind: 'now' | 'help' | 'wait' | null;
    feedback: { text: string; tone: 'good' | 'info' | 'warn'; time: number } | null;
    time: number;
    phase: 'between' | 'round' | 'done';
  };
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
    coach: 'now' | 'shape' | 'no' | null;
  } | null;
}

export const useHud = create<{ snap: HudSnapshot | null }>(() => ({ snap: null }));

const SPOT_ACTIONS: Record<SpotId, string> = {
  office: 'Go into the farmhouse',
  house: 'Go inside (bed)',
  runs: 'Fill the food bowl',
  bowl: 'Fill the food bowl',
  pantry: 'Look in the pantry',
  gateSign: 'Read the gate sign',
  van: 'Get in the van',
  noticeboard: 'Read the noticeboard',
  fieldGate: 'Go training',
  scentGarden: 'Look at the overgrown corner',
  paddock: 'The puppy paddock',
};

function homeSnapshot(h: HomeSession): HudSnapshot {
  const g = useApp.getState().game;
  let near: NonNullable<HudSnapshot['home']>['near'] = null;
  const visitor = g ? visitorToday(g) : null;
  if (g?.story === 'meetMara' && distance(h.keeper.pos, MARA_POS) < 2.8)
    near = { id: 'mara', label: 'Talk to Mara' };
  else if (visitor && distance(h.keeper.pos, MARA_POS) < 2.8)
    near = { id: 'mara', label: `Talk to ${visitor.name}` };
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
  if (d.detour)
    return `${name} is running round the bank! Whistle (Space) now, then click across the water.`;
  if (d.balk > 0) return `${name} is hesitating at the water. Give it a moment.`;
  if (d.swimming && (d.mode === 'stopped' || d.mode === 'popped'))
    return `${name} is treading water. Click where to swim next.`;
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
  const coach = coaching(t);
  if (coach) return coach.text;
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

function agilityHint(s: AgilitySession): string {
  const name = s.dogName;
  if (s.phase === 'ready')
    return `Look over the numbers, then press "Go!" (Space). ${name} takes whatever you run toward.`;
  if (s.phase === 'complete') return 'Home!';
  const next = s.course.obstacles[s.next]!;
  const n = s.next + 1;
  if (s.target && s.target.index !== s.next && s.state === 'seek')
    return `${name} is eyeing number ${s.target.index + 1}! Call "Here" (R).`;
  if (s.state === 'commit' && s.target?.index === s.next) {
    if (next.kind === 'frame')
      return 'Say "Easy" (F) so the yellow contact is touched on the way down.';
    return s.course.obstacles[s.next + 1]
      ? `Good. Now get ahead toward number ${n + 1}.`
      : 'Last one!';
  }
  if (!s.target)
    return `Run toward number ${n} (the ${OBSTACLE_NAMES[next.kind]}) and face it: ${name} follows your line.`;
  return `${name} is heading for number ${n}.`;
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
        coach: coaching(t)?.kind ?? null,
      },
    };
  }
  if (live.agility) {
    const s = live.agility;
    const st = s.stats;
    snap = {
      kind: 'agility',
      dogName: s.dogName,
      tell: s.dog.tell.text,
      dogMode: null,
      hint: agilityHint(s),
      cameraYaw: cameraState.yaw,
      wind: null,
      events: s.events.slice(-2),
      home: null,
      field: null,
      search: null,
      lesson: null,
      agility: {
        phase: s.phase,
        next: s.next,
        total: s.course.obstacles.length,
        seconds: st.startedAt === null ? 0 : (st.finishedAt ?? s.time) - st.startedAt,
        standard: standardTime(s.course),
        faults: 5 * (st.bars + st.refusals + st.contacts + st.weaves) + 20 * st.offCourse,
        keeper: { ...s.keeper.pos },
        dog: { ...s.dog.pos },
      },
    };
  }
  if (live.herding) {
    const s = live.herding;
    const st = s.stats;
    const advice = advise(s);
    snap = {
      kind: 'herding',
      dogName: s.dogName,
      tell: s.dog.tell.text,
      dogMode: null,
      hint: advice.text,
      cameraYaw: cameraState.yaw,
      wind: null,
      events: s.events.slice(-2),
      home: null,
      field: null,
      search: null,
      lesson: null,
      herding: {
        phase: s.phase,
        task: s.task,
        tasks: s.setup.gates.map((g, i) => ({ label: g.label, through: st.through[i]! })),
        flock: s.sheep.length,
        penned: st.penned,
        seconds: st.startedAt === null ? 0 : (st.finishedAt ?? s.time) - st.startedAt,
        standard: s.setup.standard,
        limit: timeLimit(s.setup),
        harried: st.harried,
        keeper: { ...s.keeper.pos },
        dog: { ...s.dog.pos },
        sheep: s.sheep.map((sh) => ({ ...sh.pos })),
        suggest: advice.command,
      },
    };
  }
  if (live.puppies) {
    const s = live.puppies;
    const g = useApp.getState().game;
    // Coaching spells out what each puppy's body is saying until you've run a few sessions.
    const coached = !g || !g.flags.includes('raised:3');
    const hint = pupHint(s);
    const pup = s.round ? s.pups[s.round.pup]! : null;
    snap = {
      kind: 'puppies',
      dogName: pup?.name ?? null,
      tell: s.tell,
      dogMode: null,
      hint: coached || s.mode === 'evaluate' || hint.kind === null ? hint.text : s.tell,
      cameraYaw: cameraState.yaw,
      wind: null,
      events: [],
      home: null,
      field: null,
      search: null,
      lesson: null,
      puppies: {
        mode: s.mode,
        title: s.mode === 'evaluate' ? 'Evaluation day' : PUP_ACTIVITIES[s.activity].title,
        summary:
          s.mode === 'evaluate'
            ? `Test: ${PUP_ACTIVITIES[s.activity].title.toLowerCase()}. Watch, then say what you saw.`
            : PUP_ACTIVITIES[s.activity].summary,
        pupId: pup?.id ?? null,
        done: s.results.length,
        total: s.results.length + s.queue.length + (s.phase === 'round' ? 1 : 0),
        hintKind: coached ? hint.kind : null,
        feedback: s.feedback,
        time: s.time,
        phase: s.phase,
      },
    };
  }
  useHud.setState({ snap });
}

export const spotLabel = (id: SpotId) => HOME_SPOTS.find((s) => s.id === id)?.label ?? id;
