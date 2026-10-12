import {
  add,
  clamp,
  clamp01,
  damp,
  distance,
  dot,
  fromHeading,
  headingOf,
  length,
  normalize,
  scale,
  sub,
  turnToward,
  wrapAngle,
  type Vec2,
} from '../core/math';
import { createRng, random, range, type Rng } from '../core/rng';
import { aptitude, type Dog, type TrialLevel } from '../core/dog/dog';
import {
  createKeeper,
  keeperAct,
  stepKeeper,
  type KeeperAgent,
  type Pose,
  type Tell,
} from './agents';
import { dogParams, type DogParams } from './dogParams';
import { clampToField, type Field } from './field';

/**
 * Sheepdog work. You stand at the post and work your dog on a small flock
 * with five commands; the sheep move away from the dog, so where you put the
 * dog decides where the sheep go. Gather them, bring them through the gates
 * in order, and put them in the pen.
 *
 * "Come by" sends the dog clockwise round the sheep (to your left as it
 * leaves you), "Away" anticlockwise, "Walk up" straight onto them, "Lie
 * down" stops it, and "That'll do" calls it back.
 */
export type HerdCommand = 'comeBy' | 'away' | 'walkUp' | 'lieDown' | 'thatllDo';

export const COMMAND_NAMES: Record<HerdCommand, string> = {
  comeBy: 'Come by',
  away: 'Away',
  walkUp: 'Walk up',
  lieDown: 'Lie down',
  thatllDo: "That'll do",
};

/** A pair of hurdles. The sheep must pass between `a` and `b`, travelling along `dir`. */
export interface Gate {
  a: Vec2;
  b: Vec2;
  dir: Vec2;
  label: string;
}

/** A square pen, open on its north side, with wings flaring out from the mouth. */
export interface PenDef {
  center: Vec2;
  size: number;
}

export interface HerdingSetup {
  id: string;
  title: string;
  summary: string;
  focus: string;
  level: TrialLevel;
  sheep: number;
  sheepStart: Vec2;
  post: Vec2;
  gates: Gate[];
  pen: PenDef;
  /** A fair time for the whole run, seconds. */
  standard: number;
  /** How easily these sheep take fright; 1 is steady. */
  flighty?: number;
  /** Practising this builds the skill no higher than this. */
  teachesTo?: number;
}

export interface Segment {
  a: Vec2;
  b: Vec2;
}

const HURDLE = 3;

/** The solid panels of a setup: gate hurdles and the pen with its wings. */
export function wallsOf(setup: HerdingSetup): Segment[] {
  const walls: Segment[] = [];
  for (const g of setup.gates) {
    const along = normalize(sub(g.b, g.a));
    walls.push({ a: add(g.a, scale(along, -HURDLE)), b: g.a });
    walls.push({ a: g.b, b: add(g.b, scale(along, HURDLE)) });
  }
  const { center: c, size } = setup.pen;
  const h = size / 2;
  const nw = { x: c.x - h, z: c.z - h };
  const ne = { x: c.x + h, z: c.z - h };
  const sw = { x: c.x - h, z: c.z + h };
  const se = { x: c.x + h, z: c.z + h };
  walls.push({ a: nw, b: sw }, { a: sw, b: se }, { a: se, b: ne });
  walls.push(
    { a: nw, b: { x: nw.x - 2.2, z: nw.z - 3 } },
    { a: ne, b: { x: ne.x + 2.2, z: ne.z - 3 } },
  );
  return walls;
}

export const inPen = (pen: PenDef, p: Vec2, margin = 0): boolean =>
  Math.abs(p.x - pen.center.x) < pen.size / 2 - margin &&
  p.z > pen.center.z - pen.size / 2 + margin &&
  p.z < pen.center.z + pen.size / 2 - margin;

export interface Sheep {
  pos: Vec2;
  vel: Vec2;
  heading: number;
  /** 0 calm … 1 frightened. */
  alarm: number;
  /** Seconds left bolting after being rushed. */
  bolt: number;
  boltDir: Vec2;
  /** Which side of each gate's line it was on last step. */
  side: number[];
  crossed: boolean[];
  drift: Vec2;
  driftUntil: number;
}

export interface HerdDog {
  pos: Vec2;
  heading: number;
  speed: number;
  pose: Pose;
  tell: Tell;
  mode: 'heel' | 'flank' | 'walkUp' | 'down' | 'recall';
  /** +1 anticlockwise ("Away"), -1 clockwise ("Come by"). */
  dir: 1 | -1;
  /** When a dog that won't stay down starts to creep, or null. */
  creepAt: number | null;
}

export interface HerdingStats {
  startedAt: number | null;
  finishedAt: number | null;
  /** Sheep through each gate, and sheep that went round it. */
  through: number[];
  missed: number[];
  penned: number;
  harried: number;
  ignored: number;
  lifted: boolean;
  liftedEarly: boolean;
  timedOut: boolean;
  commands: number;
  /** How far the flock has travelled, for judging how straight the lines were. */
  travelled: number;
  lastCentre: Vec2 | null;
}

export interface HerdingSession {
  time: number;
  rng: Rng;
  field: Field;
  setup: HerdingSetup;
  walls: Segment[];
  dogName: string;
  params: DogParams;
  /** The trained herding skill, 0-1. */
  skill: number;
  /** How strongly sheep feel this dog, 0-1 (focus and power). */
  presence: number;
  /** How keen the dog is to rush in, 0-1. */
  keen: number;
  dog: HerdDog;
  keeper: KeeperAgent;
  sheep: Sheep[];
  /** Index of the gate being worked; gates.length means the pen. */
  task: number;
  pending: { command: HerdCommand; at: number } | null;
  lastHarried: number;
  pennedFor: number;
  /** Seconds the flanking dog has been held up by a hurdle. */
  blocked: number;
  phase: 'ready' | 'running' | 'complete';
  stats: HerdingStats;
  events: { time: number; text: string; tone: 'good' | 'info' | 'warn' }[];
}

export function createHerdingSession(
  dog: Dog,
  setup: HerdingSetup,
  field: Field,
  seed: number,
): HerdingSession {
  const rng = createRng(seed);
  const params = dogParams(dog);
  const keeper = createKeeper(setup.post);
  keeper.heading = headingOf(sub(setup.sheepStart, setup.post));
  const sheep: Sheep[] = Array.from({ length: setup.sheep }, (_, i) => {
    const pos = add(setup.sheepStart, {
      x: Math.cos(i * 2.4) * (0.8 + i * 0.35),
      z: Math.sin(i * 2.4) * (0.8 + i * 0.35),
    });
    return {
      pos,
      vel: { x: 0, z: 0 },
      heading: range(rng, 0, Math.PI * 2),
      alarm: 0,
      bolt: 0,
      boltDir: { x: 0, z: 0 },
      side: setup.gates.map((g) => dot(sub(pos, g.a), g.dir)),
      crossed: setup.gates.map(() => false),
      drift: { x: 0, z: 0 },
      driftUntil: 0,
    };
  });
  return {
    time: 0,
    rng,
    field,
    setup,
    walls: wallsOf(setup),
    dogName: dog.name,
    params,
    skill: dog.skills.herd ?? 0,
    presence: (aptitude(dog, 'focus') * 0.6 + aptitude(dog, 'power') * 0.4) / 100,
    keen: aptitude(dog, 'drive') / 100,
    dog: {
      pos: add(setup.post, fromHeading(keeper.heading - Math.PI / 2, 0.9)),
      heading: keeper.heading,
      speed: 0,
      pose: 'sit',
      tell: { ears: 'forward', tail: 'low', noseDown: false, text: 'Watching the sheep' },
      mode: 'heel',
      dir: 1,
      creepAt: null,
    },
    keeper,
    sheep,
    task: 0,
    pending: null,
    lastHarried: -99,
    pennedFor: 0,
    blocked: 0,
    phase: 'ready',
    stats: {
      startedAt: null,
      finishedAt: null,
      through: setup.gates.map(() => 0),
      missed: setup.gates.map(() => 0),
      penned: 0,
      harried: 0,
      ignored: 0,
      lifted: false,
      liftedEarly: false,
      timedOut: false,
      commands: 0,
      travelled: 0,
      lastCentre: null,
    },
    events: [],
  };
}

function log(s: HerdingSession, text: string, tone: 'good' | 'info' | 'warn' = 'info'): void {
  s.events.push({ time: s.time, text, tone });
  if (s.events.length > 30) s.events.shift();
}

export function centroid(s: HerdingSession): Vec2 {
  let x = 0;
  let z = 0;
  for (const sh of s.sheep) {
    x += sh.pos.x;
    z += sh.pos.z;
  }
  return { x: x / s.sheep.length, z: z / s.sheep.length };
}

/** How far the dog likes to stay off its sheep when flanking: trained dogs go wide. */
const flankWidth = (s: HerdingSession) => 6.5 + s.skill * 4;

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/** Gives a command. The dog answers after a moment, sooner the better trained it is. */
export function command(s: HerdingSession, cmd: HerdCommand): void {
  if (s.phase === 'complete') return;
  if (s.phase === 'ready') {
    if (cmd !== 'comeBy' && cmd !== 'away') return;
    s.phase = 'running';
    s.stats.startedAt = s.time;
  }
  s.stats.commands++;
  keeperAct(
    s.keeper,
    cmd === 'comeBy'
      ? 'castLeft'
      : cmd === 'away'
        ? 'castRight'
        : cmd === 'thatllDo'
          ? 'call'
          : 'whistle',
    s.keeper.heading,
  );
  const delay = 0.12 + (1 - s.skill) * 0.55 * (0.6 + random(s.rng) * 0.8);
  s.pending = { command: cmd, at: s.time + delay };
}

function obey(s: HerdingSession, cmd: HerdCommand): void {
  const d = s.dog;
  const near = distance(d.pos, centroid(s)) < 9;
  const name = s.dogName;
  if (cmd === 'lieDown') {
    // A keen, green dog close to its sheep doesn't always hear the stop.
    const deaf = near && d.mode !== 'down' ? (1 - s.skill) ** 1.6 * (0.25 + s.keen * 0.5) : 0;
    if (random(s.rng) < deaf) {
      s.stats.ignored++;
      log(s, `${name} didn't take the stop. Ask again!`, 'warn');
      return;
    }
    d.mode = 'down';
    // Untrained dogs creep back onto their sheep.
    d.creepAt =
      random(s.rng) < (1 - s.skill) ** 1.3 * (0.35 + s.keen * 0.5)
        ? s.time + 2.2 + random(s.rng) * 2.5
        : null;
    return;
  }
  if (cmd === 'thatllDo') {
    d.mode = 'recall';
    return;
  }
  if (cmd === 'walkUp') {
    d.mode = 'walkUp';
    return;
  }
  let dir: 1 | -1 = cmd === 'away' ? 1 : -1;
  // A dog that doesn't know its sides yet sometimes takes the wrong one.
  if (random(s.rng) < (1 - s.skill) ** 2 * 0.22) {
    dir = dir === 1 ? -1 : 1;
    log(s, `${name} went the wrong way round. Stop and ask again.`, 'warn');
  }
  d.mode = 'flank';
  d.dir = dir;
}

// ---------------------------------------------------------------------------
// The dog
// ---------------------------------------------------------------------------

function pushOut(walls: Segment[], p: Vec2, radius: number): Vec2 {
  let out = p;
  for (const w of walls) {
    const ab = sub(w.b, w.a);
    const t = clamp01(dot(sub(out, w.a), ab) / Math.max(1e-6, dot(ab, ab)));
    const q = add(w.a, scale(ab, t));
    const d = distance(out, q);
    if (d < radius) {
      const away = d > 1e-6 ? scale(sub(out, q), 1 / d) : { x: -ab.z, z: ab.x };
      out = add(q, scale(normalize(away), radius));
    }
  }
  return out;
}

function moveDog(s: HerdingSession, to: Vec2, speed: number, dt: number): void {
  const d = s.dog;
  const want = headingOf(sub(to, d.pos));
  const off = Math.abs(wrapAngle(want - d.heading));
  const wanted = speed * (1 - clamp01(off / 2.6) * 0.6);
  d.speed += clamp(wanted - d.speed, -s.params.accel * 2.5 * dt, s.params.accel * dt);
  d.heading = turnToward(d.heading, want, (s.params.turnRate * 1.3 + 2.5) * dt);
  d.pos = clampToField(
    s.field,
    pushOut(s.walls, add(d.pos, fromHeading(d.heading, d.speed * dt)), 0.35),
  );
}

function stepDog(s: HerdingSession, dt: number): void {
  const d = s.dog;
  const c = centroid(s);
  const rel = sub(d.pos, c);
  const r = length(rel);
  const angle = headingOf(rel);
  const name = s.dogName;
  d.pose = 'stand';

  if (d.mode === 'heel' || d.mode === 'recall') {
    const side = add(s.keeper.pos, fromHeading(s.keeper.heading - Math.PI / 2, 0.9));
    if (distance(d.pos, side) > 0.8) {
      moveDog(s, side, s.params.gallop * 0.8, dt);
      d.tell = { ears: 'neutral', tail: 'neutral', noseDown: false, text: 'Coming back to you' };
    } else {
      d.mode = 'heel';
      d.speed = Math.max(0, d.speed - 14 * dt);
      d.heading = turnToward(d.heading, headingOf(sub(c, d.pos)), 4 * dt);
      d.pose = 'sit';
      d.tell = { ears: 'forward', tail: 'low', noseDown: false, text: 'Watching the sheep' };
    }
    return;
  }

  if (d.mode === 'down') {
    d.speed = Math.max(0, d.speed - 16 * dt);
    d.heading = turnToward(d.heading, headingOf(sub(c, d.pos)), 3 * dt);
    d.pose = d.speed < 0.4 ? 'down' : 'crouch';
    d.tell = {
      ears: 'forward',
      tail: 'low',
      noseDown: false,
      text: 'Lying down, eyes on the sheep',
    };
    if (d.creepAt !== null && s.time >= d.creepAt) {
      d.creepAt = null;
      d.mode = 'walkUp';
      log(s, `${name} is creeping up on the sheep.`, 'warn');
    }
    return;
  }

  if (d.mode === 'walkUp') {
    // Steady pressure straight onto the sheep. Green, keen dogs hurry as they get close.
    const rush = r < 9 ? (1 - s.skill) * s.keen * 3.8 : 0;
    const pace = r > 16 ? s.params.trot + 1.2 : r < 2.8 ? 0.4 + rush * 0.8 : 1.7 + rush;
    moveDog(s, c, pace, dt);
    d.pose = pace < 2.4 ? 'crouch' : 'stand';
    d.tell = {
      ears: 'forward',
      tail: 'low',
      noseDown: false,
      text: rush > 1.2 && r < 9 ? 'Pushing on hard' : 'Walking up on the sheep',
    };
    return;
  }

  // Flanking: round the sheep at a distance, never straight at them.
  const wide = flankWidth(s);
  let radius: number;
  if (r > wide) radius = Math.max(wide, r * 0.74);
  // Inside its distance, a trained dog bends out; a green one cuts in.
  else radius = Math.max(3, r + (s.skill - 0.45) * 2.5);
  // A dog that knows its job goes round the whole flock, stragglers included.
  if (s.skill > 0.3) {
    const spread = Math.max(...s.sheep.map((sh) => distance(sh.pos, c)));
    radius = Math.max(radius, spread + 3 + s.skill * 2);
  }
  const step = clamp(5 / Math.max(r, 1), 0.28, 0.9);
  const to = add(c, fromHeading(angle + d.dir * step, radius));
  const speed = Math.min(s.params.gallop, 4.6 + r * 0.18);
  const before = d.pos;
  moveDog(s, to, speed, dt);
  // Hurdles in the way: go round the other way rather than push at them.
  s.blocked = d.speed > 2 && distance(before, d.pos) < d.speed * dt * 0.35 ? s.blocked + dt : 0;
  if (s.blocked > 0.8) {
    s.blocked = 0;
    d.dir = d.dir === 1 ? -1 : 1;
  }
  d.tell = {
    ears: 'back',
    tail: 'low',
    noseDown: false,
    text: d.dir === 1 ? 'Flanking away' : 'Flanking come by',
  };

  // The outrun: a trained dog stops itself behind its sheep, opposite the handler.
  if (!s.stats.lifted) {
    const balance = headingOf(sub(c, aimPoint(s)));
    const off = Math.abs(wrapAngle(angle - balance));
    if (off < 0.2 && r < wide + 6) {
      s.stats.lifted = true;
      if (s.skill > 0.4) {
        d.mode = 'down';
        d.creepAt = null;
        log(s, `${name} is behind the sheep. Now "Walk up".`, 'good');
      }
    }
  }
}

// ---------------------------------------------------------------------------
// The sheep
// ---------------------------------------------------------------------------

function stepSheep(s: HerdingSession, dt: number): void {
  const c = centroid(s);
  const d = s.dog;
  const pen = s.setup.pen;
  const flighty = s.setup.flighty ?? 1;
  const zone = (9 + s.presence * 5) * flighty;
  let avg = { x: 0, z: 0 };
  for (const sh of s.sheep) avg = add(avg, sh.vel);
  avg = scale(avg, 1 / s.sheep.length);
  const start = s.sheep.map((sh) => sh.pos);
  const flockAway = normalize(sub(c, d.pos));
  const inside = start.filter((p) => inPen(pen, p, 0.6));
  const penCentre = inside.length
    ? scale(
        inside.reduce((a, p) => add(a, p), { x: 0, z: 0 }),
        1 / inside.length,
      )
    : c;

  s.sheep.forEach((sh, i) => {
    const fromDog = sub(sh.pos, d.pos);
    const dd = length(fromDog);
    const settled = inPen(pen, sh.pos, 0.6);
    let pressure = dd < zone ? 1 - dd / zone : 0;
    // A dog lying down still holds them, but gently.
    if (d.pose === 'down') pressure *= 0.4;
    if (d.mode === 'heel') pressure *= 0.3;
    if (settled) pressure *= 0.3;
    const fromKeeper = sub(sh.pos, s.keeper.pos);
    const kd = length(fromKeeper);
    const keeperPressure = kd < 4.5 ? (1 - kd / 4.5) * 0.7 : 0;

    // Rushed at close range, sheep bolt and the flock splits.
    if (dd < 2.6 * flighty && d.speed > 2.7 && sh.bolt <= 0 && !settled) {
      sh.bolt = 1.6;
      const turn = (random(s.rng) - 0.5) * 2;
      sh.boltDir = fromHeading(headingOf(fromDog) + turn);
      if (s.time - s.lastHarried > 2.5) {
        s.lastHarried = s.time;
        s.stats.harried++;
        log(s, 'Too close, too fast: the sheep scattered!', 'warn');
      }
    }
    sh.bolt = Math.max(0, sh.bolt - dt);
    sh.alarm += (Math.max(pressure, keeperPressure) - sh.alarm) * damp(3, dt);

    let want = { x: 0, z: 0 };
    if (sh.bolt > 0) want = scale(sh.boltDir, 6.4);
    else {
      // They move off as a flock: partly straight away from the dog, partly the way the rest go.
      const away = normalize(add(normalize(fromDog), flockAway));
      want = add(want, scale(away, pressure * 5.6));
      want = add(want, scale(normalize(fromKeeper), keeperPressure * 3.2));
      // Flocking: close up under pressure, keep a body's width apart, move together.
      // Sheep already in the pen keep to each other, not to those still outside.
      const toC = sub(settled ? penCentre : c, sh.pos);
      const dc = length(toC);
      want = add(want, scale(normalize(toC), clamp01((dc - 0.9) / 2.5) * (0.8 + sh.alarm * 4)));
      for (let j = 0; j < s.sheep.length; j++) {
        if (j === i) continue;
        const off = sub(sh.pos, start[j]!);
        const od = length(off);
        if (od < 1) want = add(want, scale(normalize(off), (1 - od) * 2.6));
      }
      want = add(want, scale(sub(avg, sh.vel), 0.35));
      // Left alone, they drift a little as they graze.
      if (sh.alarm < 0.08) {
        if (s.time >= sh.driftUntil) {
          sh.driftUntil = s.time + 2 + random(s.rng) * 4;
          sh.drift = random(s.rng) < 0.5 ? { x: 0, z: 0 } : fromHeading(random(s.rng) * 6.28, 0.3);
        }
        want = add(want, sh.drift);
      }
      const cap = 0.5 + sh.alarm * 5.4;
      const speed = length(want);
      if (speed > cap) want = scale(want, cap / speed);
    }
    sh.vel = add(sh.vel, scale(sub(want, sh.vel), damp(sh.bolt > 0 ? 8 : 3.2, dt)));
    const moved = add(sh.pos, scale(sh.vel, dt));
    sh.pos = clampToField(s.field, pushOut(s.walls, moved, 0.45), 2);
    const pace = length(sh.vel);
    if (pace > 0.15) sh.heading = turnToward(sh.heading, headingOf(sh.vel), 7 * dt);
  });
}

// ---------------------------------------------------------------------------
// Tasks: gates in order, then the pen
// ---------------------------------------------------------------------------

function stepTasks(s: HerdingSession, dt: number): void {
  const { gates, pen } = s.setup;
  const n = s.sheep.length;
  for (const sh of s.sheep) {
    gates.forEach((g, i) => {
      const side = dot(sub(sh.pos, g.a), g.dir);
      if (i === s.task && !sh.crossed[i] && sh.side[i]! < 0 && side >= 0) {
        sh.crossed[i] = true;
        const ab = sub(g.b, g.a);
        const t = dot(sub(sh.pos, g.a), ab) / dot(ab, ab);
        if (t >= 0 && t <= 1) s.stats.through[i]!++;
        else s.stats.missed[i]!++;
      }
      sh.side[i] = side;
    });
  }
  if (s.task < gates.length) {
    const g = gates[s.task]!;
    const done = s.sheep.filter((sh) => sh.crossed[s.task]).length;
    const past = dot(sub(centroid(s), g.a), g.dir);
    if (done === n || (done > 0 && past > 7)) {
      const through = s.stats.through[s.task]!;
      s.stats.missed[s.task] = n - through;
      log(
        s,
        through === n
          ? `All ${n} through the ${g.label}!`
          : through === 0
            ? `The sheep went round the ${g.label}.`
            : `${through} of ${n} through the ${g.label}.`,
        through === n ? 'good' : 'warn',
      );
      s.task++;
    }
  }
  const penned = s.sheep.filter((sh) => inPen(pen, sh.pos)).length;
  s.stats.penned = penned;
  s.pennedFor = penned === n ? s.pennedFor + dt : 0;
  if (s.pennedFor > 1.2) finish(s, false);
}

function finish(s: HerdingSession, timedOut: boolean): void {
  if (s.phase === 'complete') return;
  s.phase = 'complete';
  s.stats.finishedAt = s.time;
  s.stats.timedOut = timedOut;
  // Gates never reached count as missed.
  s.setup.gates.forEach((_, i) => {
    if (i >= s.task) s.stats.missed[i] = s.sheep.length - s.stats.through[i]!;
  });
  s.dog.mode = 'down';
  s.dog.creepAt = null;
  log(
    s,
    timedOut ? 'Time! The judge calls you off.' : 'Penned! The gate swings shut.',
    timedOut ? 'warn' : 'good',
  );
}

/** How long a run may last before the judge calls time. */
export const timeLimit = (setup: HerdingSetup): number => Math.round(setup.standard * 1.9);

export const FIXED_DT = 1 / 60;

export function stepHerding(s: HerdingSession, dt: number): void {
  s.time += dt;
  stepKeeper(s.keeper, s.field, dt);
  if (s.phase === 'complete') {
    stepDog(s, dt);
    stepSheep(s, dt);
    return;
  }
  if (s.pending && s.time >= s.pending.at) {
    const cmd = s.pending.command;
    s.pending = null;
    obey(s, cmd);
  }
  stepDog(s, dt);
  stepSheep(s, dt);
  if (s.phase !== 'running') return;
  // Sheep that leave before the dog is behind them were disturbed on the outrun.
  if (!s.stats.lifted && !s.stats.liftedEarly && distance(centroid(s), s.setup.sheepStart) > 6) {
    s.stats.liftedEarly = true;
    s.stats.lifted = true;
    log(s, 'The sheep moved off before your dog got behind them.', 'warn');
  }
  const at = centroid(s);
  if (s.stats.lastCentre) s.stats.travelled += distance(at, s.stats.lastCentre);
  s.stats.lastCentre = at;
  stepTasks(s, dt);
  if (s.time - (s.stats.startedAt ?? s.time) > timeLimit(s.setup)) finish(s, true);
}

// ---------------------------------------------------------------------------
// Reading the work: where the dog should be, and what to ask for
// ---------------------------------------------------------------------------

/** The point the sheep should be heading for right now. */
export function aimPoint(s: HerdingSession, from?: Vec2): Vec2 {
  const c = from ?? centroid(s);
  const { gates, pen } = s.setup;
  if (s.task < gates.length) {
    const g = gates[s.task]!;
    const mid = scale(add(g.a, g.b), 0.5);
    const side = dot(sub(c, mid), g.dir);
    const ab = normalize(sub(g.b, g.a));
    const lateral = Math.abs(dot(sub(c, mid), ab));
    // Line them up in front of the gap first, then push through it.
    if (side < -2 && lateral > 1.2 + -side * 0.35)
      return add(mid, scale(g.dir, -Math.min(8, -side * 0.6)));
    return add(mid, scale(g.dir, 5));
  }
  // Bring them to a point well in front of the mouth, clear of the wings,
  // and only then turn them in.
  const mouth = { x: pen.center.x, z: pen.center.z - pen.size / 2 };
  const before = mouth.z - c.z;
  const lined = before > -0.5 && Math.abs(c.x - mouth.x) < 1.2 + Math.max(0, before) * 0.45;
  if (!lined && !inPen(pen, c)) return { x: mouth.x, z: mouth.z - 7.5 };
  return { x: pen.center.x, z: pen.center.z + 0.8 };
}

export interface Advice {
  command: HerdCommand | null;
  text: string;
}

/**
 * What a good handler would ask for now. The dog belongs on the far side of
 * the sheep from where they should go; flank it there, then walk it up.
 */
export function advise(s: HerdingSession): Advice {
  const d = s.dog;
  if (s.phase === 'ready')
    return {
      command: 'away',
      text: 'Send your dog round the sheep: "Away" (D) goes right, "Come by" (A) goes left.',
    };
  if (s.phase === 'complete') return { command: null, text: 'Done.' };
  const c = centroid(s);
  // A straggler comes first: gather it back before driving on.
  let far = s.sheep[0]!;
  for (const sh of s.sheep) if (distance(sh.pos, c) > distance(far.pos, c)) far = sh;
  const split = distance(far.pos, c) > 3.2 + s.sheep.length * 0.5;
  const from = split ? far.pos : c;
  // With most of them penned, a straggler is worked to the mouth on its own.
  const mostPenned = s.stats.penned * 2 >= s.sheep.length && s.task >= s.setup.gates.length;
  const aim = split ? (mostPenned ? aimPoint(s, far.pos) : c) : aimPoint(s);
  const want = headingOf(sub(from, aim));
  const rel = sub(d.pos, from);
  const r = length(rel);
  const off = wrapAngle(want - headingOf(rel));
  const where = s.task < s.setup.gates.length ? `the ${s.setup.gates[s.task]!.label}` : 'the pen';
  const moving =
    s.sheep.reduce((m, sh) => m + dot(sh.vel, normalize(sub(aim, sh.pos))), 0) / s.sheep.length;

  if (!s.stats.lifted) {
    if (d.mode === 'flank')
      return { command: null, text: 'Let the outrun finish: wide and quiet.' };
    return { command: off >= 0 ? 'away' : 'comeBy', text: 'Send your dog out round the sheep.' };
  }
  const tolerance = r > 12 ? 0.22 : 0.34;
  if (Math.abs(off) > tolerance) {
    const cmd: HerdCommand = off > 0 ? 'away' : 'comeBy';
    const flanking = d.mode === 'flank' && d.dir === (off > 0 ? 1 : -1);
    return {
      command: flanking ? null : cmd,
      text: split
        ? `A sheep has split off. "${COMMAND_NAMES[cmd]}" to tuck it back in.`
        : `The sheep are drifting off line for ${where}. "${COMMAND_NAMES[cmd]}" to turn them.`,
    };
  }
  if (d.mode === 'flank')
    return { command: 'lieDown', text: `Your dog is right behind them now. "Lie down".` };
  if (moving > 2.6 && r < 7)
    return {
      command: d.mode === 'down' ? null : 'lieDown',
      text: 'They are moving well. "Lie down" and give them room.',
    };
  if (r < 2.6 && moving > 0.5)
    return { command: d.mode === 'down' ? null : 'lieDown', text: 'Close enough. "Lie down".' };
  return {
    command: d.mode === 'walkUp' ? null : 'walkUp',
    text: `On line for ${where}. "Walk up" to push them on.`,
  };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export interface HerdingReport {
  score: number;
  grade: 'Excellent' | 'Very good' | 'Good' | 'Pass' | 'Untidy' | 'No score';
  seconds: number;
  notes: { text: string; tone: 'good' | 'info' | 'warn' }[];
  clean: boolean;
}

/** The shortest way round the course: start, each gate, the mouth of the pen, the pen. */
export function courseLength(setup: HerdingSetup): number {
  const pen = setup.pen;
  const points = [
    setup.sheepStart,
    ...setup.gates.map((g) => scale(add(g.a, g.b), 0.5)),
    { x: pen.center.x, z: pen.center.z - pen.size / 2 - 4 },
    pen.center,
  ];
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distance(points[i - 1]!, points[i]!);
  return total;
}

export function buildHerdingReport(s: HerdingSession): HerdingReport {
  const st = s.stats;
  const n = s.sheep.length;
  const gates = s.setup.gates;
  const seconds = st.startedAt === null ? 0 : (st.finishedAt ?? s.time) - st.startedAt;
  const notes: HerdingReport['notes'] = [];
  const lift = !st.lifted ? 0 : st.liftedEarly ? 4 : 10;
  const gateShare = gates.length
    ? gates.reduce((sum, _, i) => sum + st.through[i]! / n, 0) / gates.length
    : 1;
  const gatePoints = 40 * gateShare;
  const penPoints = 30 * (st.penned / n);
  const over = Math.max(0, seconds - s.setup.standard);
  const finished = !st.timedOut && st.startedAt !== null;
  const pace = finished ? Math.max(0, 10 - Math.ceil(over / 3)) : 0;
  // Straight lines: how far the sheep went against the shortest way round.
  const straight = st.travelled > 1 ? Math.min(1, courseLength(s.setup) / st.travelled) : 0;
  const lines = finished ? Math.round(10 * clamp01((straight - 0.5) / 0.38)) : 0;
  const harried = Math.min(6, st.harried) * 4;
  const score = Math.max(0, Math.round(lift + gatePoints + penPoints + pace + lines - harried));

  notes.push({
    text: !st.lifted
      ? 'Your dog never got behind the sheep (0 of 10 for the outrun).'
      : st.liftedEarly
        ? 'The sheep were disturbed on the outrun (4 of 10). A wider, quieter outrun keeps them settled.'
        : 'A clean outrun and lift (10 of 10).',
    tone: st.lifted && !st.liftedEarly ? 'good' : 'warn',
  });
  gates.forEach((g, i) => {
    const through = st.through[i]!;
    notes.push({
      text: `${g.label[0]!.toUpperCase()}${g.label.slice(1)}: ${through} of ${n} sheep through.`,
      tone: through === n ? 'good' : 'warn',
    });
  });
  notes.push({
    text:
      st.penned === n
        ? `All ${n} penned in ${Math.round(seconds)} s (standard ${s.setup.standard} s).`
        : `${st.penned} of ${n} sheep in the pen when time was called.`,
    tone: st.penned === n ? 'good' : 'warn',
  });
  if (finished)
    notes.push({
      text:
        lines >= 9
          ? `Straight, tidy lines (${lines} of 10).`
          : `The sheep wandered off line (${lines} of 10 for straight lines). Flank early, a little at a time, to keep them on course.`,
      tone: lines >= 9 ? 'good' : 'info',
    });
  if (st.harried)
    notes.push({
      text: `The sheep were rushed and scattered ${st.harried} time${st.harried > 1 ? 's' : ''} (4 each). "Lie down" before your dog gets too close.`,
      tone: 'warn',
    });
  if (st.ignored)
    notes.push({
      text: `${s.dogName} ignored ${st.ignored} stop${st.ignored > 1 ? 's' : ''}. Practice builds a dog that listens.`,
      tone: 'info',
    });
  if (over > 0 && !st.timedOut)
    notes.push({ text: `${Math.ceil(over)} s over the standard time.`, tone: 'info' });
  const clean =
    st.penned === n &&
    gateShare === 1 &&
    !st.harried &&
    !st.liftedEarly &&
    over === 0 &&
    lines >= 9;
  const grade: HerdingReport['grade'] =
    score >= 90
      ? 'Excellent'
      : score >= 75
        ? 'Very good'
        : score >= 55
          ? 'Good'
          : score >= 30
            ? 'Pass'
            : score > 0
              ? 'Untidy'
              : 'No score';
  return { score, grade, seconds, notes, clean };
}

/** What one run teaches: more for a tidy run, and nothing once the dog has outgrown the work. */
export function herdingLearning(s: HerdingSession): number {
  const report = buildHerdingReport(s);
  const room = Math.max(0, (s.setup.teachesTo ?? 1) - s.skill);
  return Math.min(room, (0.015 + 0.05 * (report.score / 100)) * Math.min(1, room * 3 + 0.15));
}

// ---------------------------------------------------------------------------
// A computer handler, for rivals and tests
// ---------------------------------------------------------------------------

/** Works the run with a handler of the given skill (0-1). */
export function playHerding(s: HerdingSession, skill: number, rng: Rng): HerdingSession {
  const limit = timeLimit(s.setup) + 5;
  let next = 0.5;
  for (let i = 0; i < limit / FIXED_DT && s.phase !== 'complete'; i++) {
    if (s.time >= next && !s.pending) {
      // Weaker handlers are slower to see what is needed, and sometimes ask for the wrong side.
      next = s.time + 0.25 + (1 - skill) * 0.9 * (0.5 + random(rng));
      const a = advise(s);
      // A weaker handler often takes a moment longer to see it.
      if (a.command && random(rng) > (1 - skill) * 0.55) {
        let cmd = a.command;
        if ((cmd === 'away' || cmd === 'comeBy') && random(rng) < (1 - skill) ** 2 * 0.3)
          cmd = cmd === 'away' ? 'comeBy' : 'away';
        if (cmd === 'lieDown' && random(rng) < (1 - skill) * 0.35) cmd = 'walkUp';
        command(s, cmd);
      }
    }
    stepHerding(s, FIXED_DT);
  }
  return s;
}
