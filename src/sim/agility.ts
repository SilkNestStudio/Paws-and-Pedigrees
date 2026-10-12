import {
  add,
  clamp,
  clamp01,
  distance,
  dot,
  fromHeading,
  headingOf,
  normalize,
  scale,
  sub,
  turnToward,
  wrapAngle,
  type Vec2,
} from '../core/math';
import { createRng, random, type Rng } from '../core/rng';
import type { Dog } from '../core/dog/dog';
import { aptitude } from '../core/dog/dog';
import { createKeeper, keeperAct, stepKeeper, type KeeperAgent, type Tell } from './agents';
import { dogParams, type DogParams } from './dogParams';
import type { Field } from './field';

/**
 * Agility. The dog runs a numbered course of obstacles as fast and as cleanly
 * as it can, and it takes its line from the handler: it heads for the
 * obstacle the handler is running toward. Run the right line and the dog
 * flows round; lag behind, cut the wrong way or crowd a turn and it runs
 * past, takes the wrong obstacle, or knocks a bar.
 *
 * Cues: "Go on" sends the dog ahead to the obstacle in front of it, "Here"
 * calls it off toward you, and "Easy" steadies it for a tight turn or the
 * A-frame's contact (safe, but slower).
 */
export type ObstacleKind = 'jump' | 'tunnel' | 'weave' | 'frame';

export interface Obstacle {
  kind: ObstacleKind;
  pos: Vec2;
  /** Direction of travel through it, radians. Jumps may be taken either way. */
  heading: number;
}

export interface AgilityCourse {
  id: string;
  title: string;
  summary: string;
  focus: string;
  obstacles: Obstacle[];
  /** Where the handler and dog start. */
  start: Vec2;
  /** Practising this course builds the skill no higher than this. */
  teachesTo?: number;
}

/** Length of each obstacle along its direction of travel, metres. */
export const OBSTACLE_LENGTH: Record<ObstacleKind, number> = {
  jump: 0.5,
  tunnel: 4.5,
  weave: 5.4,
  frame: 4.2,
};

export const OBSTACLE_NAMES: Record<ObstacleKind, string> = {
  jump: 'jump',
  tunnel: 'tunnel',
  weave: 'weave poles',
  frame: 'A-frame',
};

const RUNWAY = 1.1;

export const entryOf = (o: Obstacle, reverse = false): Vec2 =>
  add(o.pos, fromHeading(o.heading, (reverse ? 1 : -1) * (OBSTACLE_LENGTH[o.kind] / 2 + RUNWAY)));
export const exitOf = (o: Obstacle, reverse = false): Vec2 =>
  add(o.pos, fromHeading(o.heading, (reverse ? -1 : 1) * (OBSTACLE_LENGTH[o.kind] / 2 + RUNWAY)));

/** A fair time for a course: its running length at a steady pace, plus a little per obstacle. */
export function standardTime(course: AgilityCourse): number {
  let length = 0;
  let at = course.start;
  for (const o of course.obstacles) {
    length += distance(at, entryOf(o)) + OBSTACLE_LENGTH[o.kind] + RUNWAY * 2;
    at = exitOf(o);
  }
  return Math.round(length / 5.4 + course.obstacles.length * 0.5);
}

export interface AgilityDog {
  pos: Vec2;
  heading: number;
  speed: number;
  pose: 'stand' | 'sit';
  tell: Tell;
  /** Hidden inside a tunnel. */
  hidden: boolean;
  /** Height off the ground, for jumps and the A-frame. */
  lift: number;
}

type DogState = 'wait' | 'seek' | 'commit' | 'done';

export interface AgilityStats {
  bars: number;
  refusals: number;
  offCourse: number;
  contacts: number;
  weaves: number;
  startedAt: number | null;
  finishedAt: number | null;
  cleared: number;
}

export interface AgilitySession {
  time: number;
  rng: Rng;
  field: Field;
  course: AgilityCourse;
  dogName: string;
  params: DogParams;
  /** The trained "obstacles" skill, 0-1. */
  skill: number;
  nimble: number;
  drive: number;
  confidence: number;
  dog: AgilityDog;
  keeper: KeeperAgent;
  state: DogState;
  /** Index of the next obstacle to take. */
  next: number;
  /** The obstacle the dog is heading for or taking, and from which end. */
  target: { index: number; reverse: boolean; inside: boolean; faulted: boolean } | null;
  /** Obstacles whose bars are down. */
  knocked: number[];
  easy: number;
  callOff: number;
  sendAhead: number;
  closest: number;
  phase: 'ready' | 'running' | 'complete';
  stats: AgilityStats;
  events: { time: number; text: string; tone: 'good' | 'info' | 'warn' }[];
}

export function createAgilitySession(
  dog: Dog,
  course: AgilityCourse,
  field: Field,
  seed: number,
): AgilitySession {
  const params = dogParams(dog);
  const keeper = createKeeper(course.start);
  const first = course.obstacles[0]!;
  keeper.heading = headingOf(sub(first.pos, course.start));
  return {
    time: 0,
    rng: createRng(seed),
    field,
    course,
    dogName: dog.name,
    params,
    skill: dog.skills.agility ?? 0,
    nimble: aptitude(dog, 'agility') / 100,
    drive: aptitude(dog, 'drive') / 100,
    confidence: params.confidence,
    dog: {
      pos: add(course.start, fromHeading(keeper.heading - Math.PI / 2, 0.9)),
      heading: keeper.heading,
      speed: 0,
      pose: 'sit',
      tell: { ears: 'forward', tail: 'wag', noseDown: false, text: 'Waiting at the start' },
      hidden: false,
      lift: 0,
    },
    keeper,
    state: 'wait',
    next: 0,
    target: null,
    knocked: [],
    easy: 0,
    callOff: 0,
    sendAhead: 0,
    closest: Infinity,
    phase: 'ready',
    stats: {
      bars: 0,
      refusals: 0,
      offCourse: 0,
      contacts: 0,
      weaves: 0,
      startedAt: null,
      finishedAt: null,
      cleared: 0,
    },
    events: [],
  };
}

function log(s: AgilitySession, text: string, tone: 'good' | 'info' | 'warn' = 'info'): void {
  s.events.push({ time: s.time, text, tone });
  if (s.events.length > 30) s.events.shift();
}

// ---------------------------------------------------------------------------
// The handler's cues
// ---------------------------------------------------------------------------

/** "Go!" at the start; afterwards "Go on!" sends the dog to the obstacle ahead of it. */
export function goOn(s: AgilitySession): void {
  if (s.phase === 'complete') return;
  keeperAct(s.keeper, 'send', s.keeper.heading);
  if (s.phase === 'ready') {
    s.phase = 'running';
    s.state = 'seek';
    s.stats.startedAt = s.time;
    s.dog.pose = 'stand';
    return;
  }
  s.sendAhead = 1.2;
  s.callOff = 0;
}

/** "Here!" calls the dog toward you and off whatever it was eyeing. */
export function callHere(s: AgilitySession): void {
  if (s.phase !== 'running') return;
  keeperAct(s.keeper, 'call');
  // Once committed, only a well-trained dog can be called off, and only early.
  if (s.state === 'commit' && s.target) {
    const o = s.course.obstacles[s.target.index]!;
    const far = distance(s.dog.pos, entryOf(o, s.target.reverse)) > 2;
    if (s.target.inside || !far || s.skill < 0.55) return;
    s.state = 'seek';
  }
  s.target = null;
  s.callOff = 1.1;
  s.sendAhead = 0;
}

/** "Easy": steadies the dog for a moment. Safer over bars and contacts, but slower. */
export function easy(s: AgilitySession): void {
  if (s.phase !== 'running') return;
  keeperAct(s.keeper, 'steady');
  s.easy = 1.7;
}

// ---------------------------------------------------------------------------
// Simulation step
// ---------------------------------------------------------------------------

export const FIXED_DT = 1 / 60;

function steer(s: AgilitySession, to: Vec2, speed: number, dt: number, turnBoost = 1): void {
  const d = s.dog;
  const want = headingOf(sub(to, d.pos));
  const off = Math.abs(wrapAngle(want - d.heading));
  // Dogs slow into a turn; nimble ones less so.
  const cornering = 1 - clamp01(off / 2.4) * (0.75 - s.nimble * 0.35);
  const wanted = speed * cornering * (s.easy > 0 ? 0.62 : 1);
  d.speed += clamp(wanted - d.speed, -s.params.accel * 2 * dt, s.params.accel * dt);
  const rate = (s.params.turnRate * 1.25 + (1 - d.speed / 9) * 3) * turnBoost;
  d.heading = turnToward(d.heading, want, rate * dt);
  d.pos = add(d.pos, fromHeading(d.heading, d.speed * dt));
}

/** How fast this dog runs a course. */
const courseSpeed = (s: AgilitySession) => Math.min(s.params.gallop, 5.2 + s.params.gallop * 0.28);

/** The obstacle the dog reads from its handler right now, if any. */
function readHandler(s: AgilitySession): { index: number; reverse: boolean } | null {
  const k = s.keeper;
  const obstacles = s.course.obstacles;
  // Sent ahead: the obstacle most nearly in front of the dog.
  if (s.sendAhead > 0) {
    let best: { index: number; reverse: boolean; cost: number } | null = null;
    obstacles.forEach((o, index) => {
      for (const reverse of o.kind === 'jump' ? [false, true] : [false]) {
        const to = sub(entryOf(o, reverse), s.dog.pos);
        const d = Math.hypot(to.x, to.z);
        const off = Math.abs(wrapAngle(headingOf(to) - s.dog.heading));
        if (d < 1 || d > 13 + s.skill * 5 || off > 0.75) continue;
        const cost = d + off * 8 - (index === s.next ? 2 : 0);
        if (!best || cost < best.cost) best = { index, reverse, cost };
      }
    });
    return best;
  }
  // Otherwise the dog runs toward where its handler is going (a spot a little
  // ahead of them) and takes the first obstacle that lies on that path.
  const lead = 1.5 + s.skill * 2.5 + k.speed * 0.6;
  const point = add(k.pos, fromHeading(k.heading, lead));
  let path = sub(point, s.dog.pos);
  let length = Math.hypot(path.x, path.z);
  // Standing together: the dog takes what the handler is facing.
  if (length < 2.2) {
    length = 4 + s.skill * 2;
    path = fromHeading(k.heading, length);
  }
  const along = scale(path, 1 / length);
  const corridor = 2.6 + s.skill * 1.2;
  let best: { index: number; reverse: boolean; cost: number } | null = null;
  obstacles.forEach((o, index) => {
    for (const reverse of o.kind === 'jump' ? [false, true] : [false]) {
      const through = fromHeading(o.heading, reverse ? -1 : 1);
      // It has to face roughly the way the dog is travelling; the obstacle
      // that comes next may be wrapped into from the side.
      const facing = dot(through, along);
      if (facing < (index === s.next ? -0.35 : 0.25)) continue;
      const rel = sub(entryOf(o, reverse), s.dog.pos);
      const t = dot(rel, along);
      const off = Math.abs(rel.x * along.z - rel.z * along.x);
      if (t < (index === s.next ? -1 : 0.2) || t > length + 1.5 || off > corridor) continue;
      // Dogs that know the game lean toward the obstacle that comes next.
      const bias = index === s.next ? 1 + s.skill * 2.5 : 0;
      const cost = t + off * 1.6 + (1 - facing) * 1.5 - bias;
      if (!best || cost < best.cost) best = { index, reverse, cost };
    }
  });
  return best;
}

function finishObstacle(s: AgilitySession): void {
  const t = s.target!;
  const o = s.course.obstacles[t.index]!;
  const name = s.dogName;
  if (t.index === s.next && !(o.kind !== 'jump' && t.reverse)) {
    s.next++;
    s.stats.cleared = s.next;
    if (s.next >= s.course.obstacles.length) {
      s.phase = 'complete';
      s.state = 'done';
      s.stats.finishedAt = s.time;
      log(s, `${name} is home! Course complete.`, 'good');
    }
  } else {
    s.stats.offCourse++;
    log(
      s,
      `Off course: ${name} took number ${t.index + 1}. You need number ${s.next + 1}.`,
      'warn',
    );
  }
  s.target = null;
  if (s.state !== 'done') s.state = 'seek';
  s.dog.hidden = false;
  s.dog.lift = 0;
  s.closest = Infinity;
}

export function stepAgility(s: AgilitySession, dt: number): void {
  s.time += dt;
  stepKeeper(s.keeper, s.field, dt);
  s.easy = Math.max(0, s.easy - dt);
  s.callOff = Math.max(0, s.callOff - dt);
  s.sendAhead = Math.max(0, s.sendAhead - dt);
  const d = s.dog;
  const k = s.keeper;
  const name = s.dogName;

  if (s.state === 'wait') {
    d.pose = 'sit';
    d.speed = 0;
    return;
  }
  if (s.state === 'done') {
    // Trot back to the handler.
    const side = add(k.pos, fromHeading(k.heading - Math.PI / 2, 0.9));
    if (distance(d.pos, side) > 1) steer(s, side, 3, dt, 1.5);
    else {
      d.speed = Math.max(0, d.speed - 12 * dt);
      d.pose = 'sit';
    }
    d.tell = { ears: 'forward', tail: 'wag', noseDown: false, text: 'Pleased with that' };
    return;
  }
  d.pose = 'stand';
  const run = courseSpeed(s);

  if (s.state === 'seek') {
    if (s.callOff <= 0) {
      const read = readHandler(s);
      if (
        read &&
        (!s.target || read.index !== s.target.index || read.reverse !== s.target.reverse)
      ) {
        s.target = { ...read, inside: false, faulted: false };
        s.closest = Infinity;
      } else if (!read) s.target = null;
    }
    if (!s.target) {
      // Nothing to take: run with the handler.
      const side = add(k.pos, fromHeading(k.heading, 1.6));
      const far = distance(d.pos, side);
      if (far > 1.2) steer(s, side, Math.min(run, Math.max(2.5, k.speed + far)), dt, 1.6);
      else d.speed = Math.max(k.speed * 0.9, d.speed - 8 * dt);
      d.tell = {
        ears: 'neutral',
        tail: 'wag',
        noseDown: false,
        text: s.callOff > 0 ? 'Coming to your call' : 'Running with you, looking for a signal',
      };
      return;
    }
    const o = s.course.obstacles[s.target.index]!;
    const entry = entryOf(o, s.target.reverse);
    const through = fromHeading(o.heading, s.target.reverse ? -1 : 1);
    const toEntry = distance(d.pos, entry);
    // Coming in from the side, the dog swings wide to meet the obstacle straight on.
    const rel = sub(d.pos, entry);
    const wide = Math.abs(rel.x * through.z - rel.z * through.x);
    const behind = dot(rel, through) > -0.4;
    const swing = clamp(wide * 0.8 + (behind && wide > 0.6 ? 1.2 : 0), 0, 2.8);
    steer(s, add(entry, scale(through, -swing)), run, dt, 1.3);
    d.tell = {
      ears: 'forward',
      tail: 'neutral',
      noseDown: false,
      text: `Heading for number ${s.target.index + 1}`,
    };
    const aligned = dot(fromHeading(d.heading), through);
    // Close and lined up: committed. Close but crossways: a run-out.
    if (toEntry < 1.3 && aligned > 0.35 && wide < 0.9) {
      s.state = 'commit';
      // A tunnel can worry an unsure dog the first few times.
      if (o.kind === 'tunnel' && s.confidence < 0.4 && s.skill < 0.35 && random(s.rng) < 0.5) {
        s.stats.refusals++;
        log(s, `${name} baulked at the tunnel mouth. Refusal.`, 'warn');
        s.state = 'seek';
        s.target = null;
        s.callOff = 0.9;
      }
      return;
    }
    if (toEntry < s.closest) s.closest = toEntry;
    else if (s.closest < 2.2 && toEntry > s.closest + 1.2) {
      s.stats.refusals++;
      log(s, `${name} ran past number ${s.target.index + 1}. Refusal.`, 'warn');
      s.target = null;
      s.callOff = 0.8;
      s.closest = Infinity;
    }
    return;
  }

  // Committed: through the obstacle to its far side.
  const t = s.target!;
  const o = s.course.obstacles[t.index]!;
  const through = fromHeading(o.heading, t.reverse ? -1 : 1);
  const exit = exitOf(o, t.reverse);
  const along = dot(sub(d.pos, o.pos), through);
  const half = OBSTACLE_LENGTH[o.kind] / 2;
  const within = Math.abs(along) <= half;
  t.inside = within;
  const pace =
    o.kind === 'weave'
      ? 2.3 + s.skill * 1.6
      : o.kind === 'frame'
        ? 3.6
        : o.kind === 'tunnel'
          ? 5
          : run;
  // Keep to the obstacle's own line while on it.
  const line = add(o.pos, scale(through, clamp(along + 1.6, -half - RUNWAY, half + RUNWAY)));
  steer(s, within ? line : exit, pace, dt, 2);
  d.hidden = o.kind === 'tunnel' && within;
  d.lift =
    o.kind === 'jump'
      ? Math.max(0, 0.55 * (1 - (along / 0.9) ** 2))
      : o.kind === 'frame' && within
        ? 1.5 * (1 - Math.abs(along) / half)
        : 0;
  d.tell = {
    ears: 'back',
    tail: 'neutral',
    noseDown: false,
    text:
      o.kind === 'weave'
        ? 'Weaving'
        : o.kind === 'tunnel'
          ? 'In the tunnel'
          : o.kind === 'frame'
            ? 'Over the A-frame'
            : 'Jumping',
  };

  // Faults are decided once, as the dog reaches the middle.
  if (!t.faulted && along > -0.15) {
    t.faulted = true;
    const steady = s.easy > 0;
    if (o.kind === 'jump') {
      const angle = Math.acos(clamp(dot(fromHeading(d.heading), through), -1, 1));
      const risk =
        0.04 +
        (1 - s.skill) * 0.05 +
        Math.max(0, d.speed - (5.6 + s.nimble * 1.6)) * 0.09 +
        Math.max(0, angle - 0.5) * 0.3 -
        (s.nimble - 0.5) * 0.08;
      if (random(s.rng) < risk * (steady ? 0.15 : 1)) {
        s.stats.bars++;
        s.knocked.push(t.index);
        log(s, `A bar down at number ${t.index + 1}.`, 'warn');
      }
    } else if (o.kind === 'weave') {
      const risk =
        0.5 * (1 - s.skill) ** 1.4 + (distance(k.pos, d.pos) > 7 ? 0.2 * (1 - s.skill) : 0);
      if (random(s.rng) < risk * (steady ? 0.5 : 1)) {
        s.stats.weaves++;
        log(s, `${name} popped out of the weave poles.`, 'warn');
      }
    } else if (o.kind === 'frame') {
      const risk = 0.5 * (1 - s.skill) + (s.drive - 0.5) * 0.3;
      if (random(s.rng) < (steady ? 0.04 : risk)) {
        s.stats.contacts++;
        log(s, `${name} leapt off the A-frame and missed the contact.`, 'warn');
      }
    }
  }
  if (along > half + RUNWAY * 0.6 || distance(d.pos, exit) < 0.5) finishObstacle(s);
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export interface AgilityReport {
  score: number;
  grade: 'Excellent' | 'Very good' | 'Good' | 'Pass' | 'Untidy' | 'Not completed';
  seconds: number;
  notes: { text: string; tone: 'good' | 'info' | 'warn' }[];
  clean: boolean;
}

export function buildAgilityReport(s: AgilitySession): AgilityReport {
  const st = s.stats;
  const total = s.course.obstacles.length;
  const complete = s.phase === 'complete';
  const seconds = st.startedAt === null ? 0 : (st.finishedAt ?? s.time) - st.startedAt;
  const standard = standardTime(s.course);
  const notes: AgilityReport['notes'] = [];
  const faults = 5 * (st.bars + st.refusals + st.contacts + st.weaves) + 20 * st.offCourse;
  const over = Math.max(0, Math.ceil(seconds - standard));
  let score = 100 - faults - over * 2;
  if (st.bars)
    notes.push({
      text: `${st.bars} bar${st.bars > 1 ? 's' : ''} down (5 each). Say "Easy" before a tight turn, or take a wider line.`,
      tone: 'warn',
    });
  if (st.refusals)
    notes.push({
      text: `${st.refusals} refusal${st.refusals > 1 ? 's' : ''} (5 each). Get ahead so the dog can see where you are going.`,
      tone: 'warn',
    });
  if (st.offCourse)
    notes.push({
      text: `Off course ${st.offCourse} time${st.offCourse > 1 ? 's' : ''} (20 each). The dog takes what you run toward: call "Here" past the traps.`,
      tone: 'warn',
    });
  if (st.contacts)
    notes.push({
      text: `Missed the A-frame contact (5). "Easy" on the way down keeps it.`,
      tone: 'warn',
    });
  if (st.weaves)
    notes.push({
      text: `Popped out of the weave poles (5). Stay close until the last pole.`,
      tone: 'warn',
    });
  notes.push({
    text: complete
      ? `Time ${seconds.toFixed(1)} s against a standard of ${standard} s${over ? ` (${over} s over, 2 each)` : ''}.`
      : `Stopped after ${st.cleared} of ${total} obstacles.`,
    tone: over || !complete ? 'info' : 'good',
  });
  if (!complete) score = Math.round((st.cleared / total) * 40);
  score = Math.max(0, Math.round(score));
  const clean = complete && faults === 0 && over === 0;
  if (clean) notes.unshift({ text: `A clear round from ${s.dogName}!`, tone: 'good' });
  const grade: AgilityReport['grade'] = !complete
    ? 'Not completed'
    : score >= 90
      ? 'Excellent'
      : score >= 75
        ? 'Very good'
        : score >= 55
          ? 'Good'
          : score >= 30
            ? 'Pass'
            : 'Untidy';
  return { score, grade, seconds, notes, clean };
}

/**
 * What one run teaches: a little for every obstacle taken in order without a
 * fault, and a bonus for a clear round. Simple courses stop teaching once the
 * dog has outgrown them.
 */
export function agilityLearning(s: AgilitySession): number {
  const st = s.stats;
  const faults = st.bars + st.refusals + st.contacts + st.weaves + st.offCourse * 2;
  const good = Math.max(0, st.cleared - faults);
  const room = Math.max(0, (s.course.teachesTo ?? 1) - s.skill);
  const clear = s.phase === 'complete' && faults === 0 ? 0.012 : 0;
  return Math.min(room, (good * 0.005 + clear) * Math.min(1, room * 3 + 0.15));
}

// ---------------------------------------------------------------------------
// A computer handler, for rivals and tests
// ---------------------------------------------------------------------------

/** Runs the course with a handler of the given skill (0-1). */
export function playAgility(s: AgilitySession, skill: number, rng: Rng): AgilitySession {
  const limit = standardTime(s.course) * 3;
  goOn(s);
  let nextCue = 0;
  let nextWander = 2;
  let wanderUntil = 0;
  let wander: Obstacle | null = null;
  for (let i = 0; i < limit / FIXED_DT && s.phase !== 'complete'; i++) {
    const list = s.course.obstacles;
    const o = list[Math.min(s.next, list.length - 1)]!;
    // Show the dog the next obstacle; once it has committed, leave for the one after.
    const committed = s.state === 'commit' && s.target?.index === s.next;
    const goal = committed && list[s.next + 1] ? list[s.next + 1]! : o;
    const through = fromHeading(goal.heading);
    const side = { x: -through.z, z: through.x };
    const mySide = Math.sign(dot(sub(s.keeper.pos, goal.pos), side)) || 1;
    // A wandering mind: now and then a weak handler runs at the wrong obstacle.
    if (s.time >= wanderUntil && s.time >= nextWander) {
      nextWander = s.time + 2;
      if (random(rng) < (1 - skill) ** 1.5 * 0.45) {
        wander = list[Math.floor(random(rng) * list.length)]!;
        wanderUntil = s.time + 1.3;
      }
    }
    const aim = s.time < wanderUntil && wander ? wander : goal;
    const spot = aim === goal ? add(entryOf(goal), scale(side, mySide * 1.5)) : entryOf(aim);
    const to = sub(spot, s.keeper.pos);
    const far = Math.hypot(to.x, to.z);
    if (far > 0.5) s.keeper.input = normalize(to);
    else {
      // Arrived beside the entrance: face down the obstacle so the dog reads it.
      s.keeper.input = { x: 0, z: 0 };
      s.keeper.heading = turnToward(s.keeper.heading, goal.heading, 6 * FIXED_DT);
    }
    // Weak handlers dawdle and fall behind their dogs.
    s.keeper.running = skill > 0.35 && random(rng) > (1 - skill) * 0.25;
    if (s.time >= nextCue) {
      nextCue = s.time + 0.5 - skill * 0.3;
      const good = random(rng) < skill;
      if (good && s.target && s.state !== 'wait') {
        const t = s.course.obstacles[s.target.index]!;
        if (t.kind === 'frame' && s.target.inside) easy(s);
        if (s.target.index !== s.next && s.state === 'seek') callHere(s);
      }
    }
    stepAgility(s, FIXED_DT);
  }
  return s;
}
