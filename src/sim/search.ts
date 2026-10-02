import {
  add,
  clamp01,
  distance,
  fromHeading,
  headingOf,
  scale,
  sub,
  type Vec2,
} from '../core/math';
import { chance, createRng, gaussian, random, type Rng } from '../core/rng';
import { aptitude, type Dog } from '../core/dog/dog';
import {
  brake,
  createDog,
  createKeeper,
  keeperAct,
  setMode,
  steerDog,
  steerToward,
  stepKeeper,
  type DogAgent,
  type KeeperAgent,
} from './agents';
import { dogParams, type DogParams } from './dogParams';
import { coverAt, type Field } from './field';
import { scentStrength, speedPoints, windAt, type Wind } from './scent';
import type { SessionEvent } from './retrieve';

/**
 * Scent search: something is lost in an area. You choose where your dog
 * searches, read its body language as it catches scent, and decide whether
 * to trust what it shows you. Rabbit scrapes and picnic spots smell
 * interesting too, and a green dog will sometimes "find" those instead.
 *
 * Different from a retrieve: here you read the wind and the dog, and make
 * judgement calls; you don't handle it on a line.
 */
export interface Hide {
  id: number;
  pos: Vec2;
  kind: 'target' | 'distraction';
  label: string;
  /** The dog has looked at this and lost interest. */
  checked: boolean;
}

export interface SearchSetup {
  title: string;
  itemName: string;
  /** Where the owner thinks it was lost. */
  hintCenter: Vec2;
  hintRadius: number;
  windDeg: number;
  windStrength: number;
}

export type SearchPhase = 'ready' | 'searching' | 'alert' | 'returning' | 'complete';

export interface SearchSession {
  time: number;
  rng: Rng;
  field: Field;
  wind: Wind;
  setup: SearchSetup;
  dogName: string;
  pronoun: 'he' | 'she';
  params: DogParams;
  /** How clearly this dog shows a find, 0-1 (training plus focus). */
  clarity: number;
  /** How easily this dog is fooled by interesting smells, 0-1. */
  gullibility: number;
  dog: DogAgent;
  keeper: KeeperAgent;
  hides: Hide[];
  searchCenter: Vec2 | null;
  phase: SearchPhase;
  alert: { hide: number; clear: boolean; since: number } | null;
  stats: {
    falseTrusted: number;
    leftTrue: number;
    directions: number;
    scentDistances: number[];
    startedAt: number | null;
    finishedAt: number | null;
    trace: Vec2[];
  };
  events: SessionEvent[];
  traceTimer: number;
  start: Vec2;
}

/** How far from you (m) your dog will keep searching before drifting back. */
export const LEASH = 50;

const DISTRACTIONS = [
  'rabbit scrape',
  'picnic spot',
  'fox trail',
  'pheasant feathers',
  'mole hill',
];

export function createSearchSession(
  dog: Dog,
  setup: SearchSetup,
  field: Field,
  seed: number,
): SearchSession {
  const rng = createRng(seed);
  const params = dogParams(dog);
  const keeper = createKeeper(field.line);
  const agent = createDog(add(field.line, { x: -0.9, z: 0.2 }), params);
  agent.mode = 'heel';

  // The lost item is somewhere in the area the owner described; distractions nearby.
  const placeIn = (center: Vec2, radius: number): Vec2 => {
    for (let i = 0; i < 40; i++) {
      const a = random(rng) * Math.PI * 2;
      const r = Math.sqrt(random(rng)) * radius;
      const p = { x: center.x + Math.cos(a) * r, z: center.z + Math.sin(a) * r };
      if (field.trees.every((t) => distance(t.pos, p) > t.radius + 1.5) && p.z < field.line.z - 8)
        return p;
    }
    return { ...center };
  };
  const hides: Hide[] = [
    {
      id: 0,
      pos: placeIn(setup.hintCenter, setup.hintRadius * 0.85),
      kind: 'target',
      label: setup.itemName,
      checked: false,
    },
  ];
  const count = 4;
  for (let i = 0; i < count; i++) {
    hides.push({
      id: hides.length,
      pos: placeIn(setup.hintCenter, setup.hintRadius * 1.5),
      kind: 'distraction',
      label: DISTRACTIONS[Math.floor(random(rng) * DISTRACTIONS.length)]!,
      checked: false,
    });
  }

  const focus = aptitude(dog, 'focus') / 100;
  return {
    time: 0,
    rng,
    field,
    wind: {
      heading: (setup.windDeg * Math.PI) / 180,
      strength: setup.windStrength,
      phase: random(rng) * 10,
    },
    setup,
    dogName: dog.name,
    pronoun: dog.sex === 'female' ? 'she' : 'he',
    params,
    clarity: clamp01(dog.skills.indicate * 0.65 + focus * 0.35),
    gullibility: clamp01((1.1 - focus) * 0.75 * (1 - dog.skills.indicate * 0.8)),
    dog: agent,
    keeper,
    hides,
    searchCenter: null,
    phase: 'ready',
    alert: null,
    stats: {
      falseTrusted: 0,
      leftTrue: 0,
      directions: 0,
      scentDistances: [],
      startedAt: null,
      finishedAt: null,
      trace: [],
    },
    events: [],
    traceTimer: 0,
    start: { ...field.line },
  };
}

function log(s: SearchSession, text: string, tone: SessionEvent['tone'] = 'info'): void {
  s.events.push({ time: s.time, text, tone });
  if (s.events.length > 40) s.events.shift();
}

// ---------------------------------------------------------------------------
// Player commands
// ---------------------------------------------------------------------------

/** "Search here!" Sends the dog to work the area around a point. */
export function searchHere(s: SearchSession, point: Vec2): void {
  if (s.phase === 'complete' || s.phase === 'returning') return;
  if (s.phase === 'alert') resumeSearch(s);
  if (s.stats.startedAt === null) s.stats.startedAt = s.time;
  s.phase = 'searching';
  s.searchCenter = { ...point };
  s.stats.directions++;
  keeperAct(s.keeper, 'send', headingOf(sub(point, s.keeper.pos)));
  s.dog.target = { ...point };
  setMode(s.dog, 'run');
}

/** "Show me!" Trust the dog's indication and look. */
export function trustAlert(s: SearchSession): void {
  if (s.phase !== 'alert' || !s.alert) return;
  const hide = s.hides[s.alert.hide]!;
  keeperAct(s.keeper, 'mark');
  if (hide.kind === 'target') {
    log(s, `${s.dogName} found ${s.setup.itemName}!`, 'good');
    s.phase = 'returning';
    s.dog.carrying = hide.id;
    setMode(s.dog, 'return');
  } else {
    s.stats.falseTrusted++;
    hide.checked = true;
    log(s, `Just a ${hide.label}. Worth noticing what that looked like.`, 'warn');
    resumeSearch(s);
  }
  s.alert = null;
}

/** "Leave it, search on." Doubt the indication and keep looking. */
export function doubtAlert(s: SearchSession): void {
  if (s.phase !== 'alert' || !s.alert) return;
  const hide = s.hides[s.alert.hide]!;
  keeperAct(s.keeper, 'call');
  if (hide.kind === 'target') {
    s.stats.leftTrue++;
    log(s, `${s.dogName} looks at you, puzzled, and moves on.`, 'info');
  } else {
    hide.checked = true;
    log(s, `Good call: it was only a ${hide.label}.`, 'good');
  }
  s.alert = null;
  resumeSearch(s);
}

/** "Here!" Brings the dog back to you. */
export function callBack(s: SearchSession): void {
  if (s.phase === 'complete' || s.phase === 'returning') return;
  keeperAct(s.keeper, 'call');
  s.alert = null;
  s.searchCenter = null;
  s.phase = s.stats.startedAt === null ? 'ready' : 'searching';
  setMode(s.dog, 'heel');
}

function resumeSearch(s: SearchSession): void {
  s.phase = 'searching';
  const center = s.searchCenter ?? s.dog.pos;
  s.dog.huntCenter = { ...center };
  s.dog.huntRadius = Math.max(6, s.dog.huntRadius);
  setMode(s.dog, 'hunt');
}

export function setSearchKeeperInput(s: SearchSession, input: Vec2, running: boolean): void {
  s.keeper.input = input;
  s.keeper.running = running;
}

// ---------------------------------------------------------------------------
// Step
// ---------------------------------------------------------------------------

export function stepSearch(s: SearchSession, dt: number): void {
  if (s.phase === 'complete') return;
  s.time += dt;
  const { dog, params, field, keeper } = s;
  dog.modeTime += dt;
  stepKeeper(keeper, field, dt);
  dog.lookAt = null;

  switch (dog.mode) {
    case 'heel':
    case 'sit': {
      const side = add(keeper.pos, fromHeading(keeper.heading - Math.PI / 2, 0.9));
      if (distance(dog.pos, side) > 0.4 || keeper.speed > 0.3) {
        steerToward(dog, params, field, side, Math.max(keeper.speed * 1.1, params.trot), dt, 0.3);
        dog.pose = 'stand';
      } else {
        brake(dog, params, dt);
        dog.pose = keeper.stillTime > 0.6 ? 'sit' : 'stand';
      }
      dog.tell = {
        ears: 'neutral',
        tail: 'wag',
        noseDown: false,
        text: 'Beside you, waiting for "Search!"',
      };
      break;
    }
    case 'run':
      dog.pose = 'stand';
      if (dog.target && steerToward(dog, params, field, dog.target, params.trot * 1.6, dt, 2)) {
        dog.huntCenter = { ...dog.target };
        dog.huntRadius = 6;
        dog.huntTime = 0;
        dog.huntLeg = 0;
        setMode(dog, 'hunt');
      }
      dog.tell = { ears: 'back', tail: 'neutral', noseDown: false, text: 'Heading out to search' };
      sniff(s);
      break;
    case 'hunt':
      quarter(s, dt);
      sniff(s);
      break;
    case 'scent':
      workScent(s, dt);
      break;
    case 'indicate':
      brake(dog, params, dt);
      if (s.alert) indicate(s);
      break;
    case 'return':
      dog.pose = 'stand';
      dog.tell = {
        ears: 'neutral',
        tail: 'wag',
        noseDown: false,
        text: `Bringing back ${s.setup.itemName}`,
      };
      if (steerToward(dog, params, field, keeper.pos, params.trot * 1.5, dt, 1.4)) {
        s.phase = 'complete';
        s.stats.finishedAt = s.time;
        dog.speed = 0;
        setMode(dog, 'sit');
        dog.pose = 'sit';
      }
      break;
  }

  // Dogs don't wander off for ever: far from you, they drift back your way.
  if (dog.mode === 'hunt' && distance(dog.huntCenter, keeper.pos) > LEASH) {
    dog.huntCenter = add(dog.huntCenter, scale(sub(keeper.pos, dog.huntCenter), dt * 0.15));
  }

  s.traceTimer += dt;
  if (s.traceTimer > 0.3 && s.stats.startedAt !== null) {
    s.traceTimer = 0;
    s.stats.trace.push({ ...dog.pos });
    if (s.stats.trace.length > 2000) s.stats.trace.shift();
  }
}

/** Quarter across the wind around the search centre, widening slowly. */
function quarter(s: SearchSession, dt: number): void {
  const { dog, params, field } = s;
  dog.huntTime += dt;
  dog.huntRadius = Math.min(16, dog.huntRadius + dt * 0.18);
  const { dir } = windAt(s.wind, s.time);
  const upwind = scale(dir, -1);
  const across = { x: -dir.z, z: dir.x };
  const side = dog.huntLeg % 2 === 0 ? 1 : -1;
  const progress = ((dog.huntLeg % 6) / 5) * 2 - 1;
  const waypoint = add(
    dog.huntCenter,
    add(
      scale(across, side * dog.huntRadius * 0.85),
      scale(upwind, progress * dog.huntRadius * 0.7),
    ),
  );
  if (steerToward(dog, params, field, waypoint, params.trot * 1.15, dt, 1.2)) dog.huntLeg++;
  dog.pose = 'stand';
  const longTime = dog.huntTime > params.huntPatience * 2.5;
  dog.tell = {
    ears: 'neutral',
    tail: longTime ? 'low' : 'wag',
    noseDown: true,
    text: longTime
      ? 'Searching, but nothing here. Try another area?'
      : 'Quartering the area, nose down',
  };
}

function sniff(s: SearchSession): void {
  const { dog, params } = s;
  const nose = add(dog.pos, fromHeading(dog.heading, 0.5));
  const speedPenalty = 1 + 0.4 * Math.min(1, dog.speed / params.gallop);
  for (const hide of s.hides) {
    if (hide.checked) continue;
    // A lost item gives off only a faint scent; animal smells are fresh and strong.
    const faint = hide.kind === 'target' ? 0.6 : 1;
    const strength =
      scentStrength(nose, hide.pos, s.wind, s.time) *
      faint *
      (1 - coverAt(s.field, hide.pos) * 0.15);
    const threshold = params.scentThreshold * speedPenalty;
    // Right on top of it, any dog notices.
    const underNose = distance(nose, hide.pos) < 1.4;
    if (strength > threshold || underNose) {
      dog.scentItem = hide.id;
      dog.scentLost = 0;
      setMode(dog, 'scent');
      const d = distance(nose, hide.pos);
      if (hide.kind === 'target') s.stats.scentDistances.push(d);
      return;
    }
  }
}

function workScent(s: SearchSession, dt: number): void {
  const { dog, params, field } = s;
  const hide = dog.scentItem !== null ? s.hides[dog.scentItem] : undefined;
  if (!hide) {
    resumeSearch(s);
    return;
  }
  const d = distance(dog.pos, hide.pos);
  const weave = Math.sin(dog.modeTime * 3.4) * Math.min(0.55, d / 20);
  // A real find is worked carefully; an exciting smell makes the dog quick and bouncy.
  const eager = hide.kind === 'distraction';
  steerDog(
    dog,
    params,
    field,
    headingOf(sub(hide.pos, dog.pos)) + weave,
    params.trot * (eager ? 1.4 : 0.95),
    dt,
  );
  dog.pose = 'stand';
  dog.tell = eager
    ? {
        ears: 'forward',
        tail: 'high',
        noseDown: true,
        text: 'Nose down, tail whirling: excited by something',
      }
    : {
        ears: 'forward',
        tail: 'neutral',
        noseDown: true,
        text: 'Nose down, slow and focused: working a scent',
      };

  const nose = add(dog.pos, fromHeading(dog.heading, 0.5));
  if (scentStrength(nose, hide.pos, s.wind, s.time) < params.scentThreshold * 0.55 && d > 2.5)
    dog.scentLost += dt;
  else dog.scentLost = 0;
  if (dog.scentLost > 1.6) {
    log(s, `${s.dogName} lost the scent as the breeze shifted.`, 'info');
    resumeSearch(s);
    return;
  }
  if (d < 0.9) arrive(s, hide);
}

/** At the source of a scent: show it, or decide it's nothing. */
function arrive(s: SearchSession, hide: Hide): void {
  const { dog } = s;
  const roll = random(s.rng);
  if (hide.kind === 'target') {
    s.alert = { hide: hide.id, clear: roll < 0.35 + s.clarity * 0.65, since: s.time };
  } else if (roll < s.gullibility) {
    // False indications can look convincing; the tell is in how the dog got there.
    s.alert = { hide: hide.id, clear: chance(s.rng, 0.6), since: s.time };
  } else {
    hide.checked = true;
    log(s, `${s.dogName} sniffs something, then moves on.`, 'info');
    resumeSearch(s);
    return;
  }
  s.phase = 'alert';
  dog.speed = 0;
  setMode(dog, 'indicate');
  log(
    s,
    s.alert.clear
      ? `${s.dogName} sits and stares at a spot. An indication!`
      : `${s.dogName} paws at a spot, unsure. Maybe something?`,
    'good',
  );
}

function indicate(s: SearchSession): void {
  const { dog } = s;
  const alert = s.alert!;
  const hide = s.hides[alert.hide]!;
  dog.lookAt = hide.pos;
  dog.heading = headingOf(sub(hide.pos, dog.pos)) || dog.heading;
  if (alert.clear) {
    dog.pose = 'sit';
    dog.tell = {
      ears: 'forward',
      tail: 'neutral',
      noseDown: false,
      text: 'Sitting, staring at one spot. "It\'s here."',
    };
  } else {
    dog.pose = 'crouch';
    dog.tell = {
      ears: 'neutral',
      tail: 'wag',
      noseDown: true,
      text: 'Pawing and sniffing at a spot, glancing at you',
    };
    // A weak indication doesn't last: the dog drifts off if you don't respond.
    if (s.time - alert.since > 5) {
      log(s, `${s.dogName} gave up on that spot.`, 'info');
      if (hide.kind === 'target') s.stats.leftTrue++;
      else hide.checked = true;
      s.alert = null;
      resumeSearch(s);
    }
  }
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export interface SearchReport {
  score: number;
  grade: 'Excellent' | 'Very good' | 'Good' | 'Pass' | 'Not completed';
  seconds: number;
  notes: { text: string; tone: 'good' | 'info' | 'warn' }[];
}

export function buildSearchReport(s: SearchSession): SearchReport {
  const notes: SearchReport['notes'] = [];
  const done = s.phase === 'complete';
  const seconds = done && s.stats.startedAt !== null ? s.stats.finishedAt! - s.stats.startedAt : 0;
  const target = s.hides[0]!;
  const par = 12 + distance(s.start, target.pos) * 0.32;
  let score = 70 + speedPoints(seconds, par) - s.stats.falseTrusted * 15 - s.stats.leftTrue * 6;
  if (s.stats.falseTrusted > 0) {
    notes.push({
      text: `You trusted ${s.stats.falseTrusted} false indication${s.stats.falseTrusted > 1 ? 's' : ''}. Excited, bouncy work usually means a distraction; slow, careful work means a real scent.`,
      tone: 'warn',
    });
  }
  if (s.stats.leftTrue > 0)
    notes.push({
      text: `${s.dogName} was right ${s.stats.leftTrue} time${s.stats.leftTrue > 1 ? 's' : ''} you walked away.`,
      tone: 'info',
    });
  const best = s.stats.scentDistances.length ? Math.max(...s.stats.scentDistances) : 0;
  if (best >= 12)
    notes.push({
      text: `Picked up the scent from ${Math.round(best)} m downwind. A good nose.`,
      tone: 'good',
    });
  else if (best > 0)
    notes.push({
      text: `Only caught the scent close in (${Math.round(best)} m). Search downwind of where it might be.`,
      tone: 'info',
    });
  if (s.stats.directions <= 2 && done)
    notes.push({ text: 'Found with very little direction. A confident search.', tone: 'good' });
  score = done ? Math.max(0, Math.round(score)) : 0;
  const grade = !done
    ? 'Not completed'
    : score >= 85
      ? 'Excellent'
      : score >= 70
        ? 'Very good'
        : score >= 55
          ? 'Good'
          : 'Pass';
  return { score, grade, seconds, notes };
}

/** Random search setup inside an area, for jobs. */
export function randomSearchSetup(
  rng: Rng,
  title: string,
  itemName: string,
  area: { center: Vec2; radius: number },
): SearchSetup {
  return {
    title,
    itemName,
    hintCenter: { x: area.center.x + gaussian(rng) * 4, z: area.center.z + gaussian(rng) * 4 },
    hintRadius: area.radius,
    windDeg: Math.round(random(rng) * 360),
    windStrength: 0.3 + random(rng) * 0.4,
  };
}
