import {
  add,
  clamp,
  distance,
  fromHeading,
  headingOf,
  sub,
  turnToward,
  type Vec2,
} from '../core/math';
import { createRng, random, type Rng } from '../core/rng';
import type { Dog } from '../core/dog/dog';
import {
  brake,
  createDog,
  createKeeper,
  keeperAct,
  steerToward,
  type DogAgent,
  type KeeperAgent,
} from './agents';
import { dogParams, type DogParams } from './dogParams';
import type { Field } from './field';

/**
 * Home: Grandpa's kennel yard. The keeper walks around; the dog, if you have
 * one, lives its own life nearby: following, sniffing about, napping in the
 * sun, coming when called and going to its bowl when it's filled.
 */
export type SpotId =
  | 'office'
  | 'runs'
  | 'pantry'
  | 'gateSign'
  | 'van'
  | 'noticeboard'
  | 'fieldGate'
  | 'house'
  | 'scentGarden'
  | 'bowl';

export interface Spot {
  id: SpotId;
  pos: Vec2;
  /** How close the keeper must be to use it. */
  reach: number;
  label: string;
}

/** Solid footprints the keeper and dog walk around (axis-aligned boxes). */
export interface Block2 {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const HOME_SPOTS: Spot[] = [
  { id: 'office', pos: { x: -16, z: 57.2 }, reach: 2.6, label: 'Office' },
  { id: 'house', pos: { x: -11, z: 57.2 }, reach: 2.4, label: 'Front door (bed)' },
  { id: 'runs', pos: { x: 10, z: 52.8 }, reach: 2.6, label: 'Kennel runs' },
  { id: 'bowl', pos: { x: 13.5, z: 52.4 }, reach: 2.2, label: 'Food bowl' },
  { id: 'pantry', pos: { x: 22.5, z: 57 }, reach: 2.4, label: 'Pantry' },
  { id: 'noticeboard', pos: { x: 5, z: 47.5 }, reach: 2.4, label: 'Noticeboard' },
  { id: 'fieldGate', pos: { x: 0, z: 44.5 }, reach: 3, label: 'Training field' },
  { id: 'van', pos: { x: 26, z: 70 }, reach: 3.2, label: 'Van' },
  { id: 'gateSign', pos: { x: 0, z: 79 }, reach: 3, label: 'Gate sign' },
  { id: 'scentGarden', pos: { x: -30, z: 49 }, reach: 4, label: 'Overgrown corner' },
];

export const HOME_BOUNDS = { minX: -40, maxX: 40, minZ: 45, maxZ: 82 };

export const HOME_SOLIDS: (Block2 & { height: number })[] = [
  { minX: -21.5, maxX: -10.5, minZ: 58.5, maxZ: 65.5, height: 8.5 }, // farmhouse
  { minX: 6.5, maxX: 21.5, minZ: 57.8, maxZ: 62.2, height: 4.8 }, // kennel block
  { minX: 6.5, maxX: 21.5, minZ: 54.4, maxZ: 57.8, height: 1.6 }, // the runs in front of it
  { minX: 21, maxX: 24, minZ: 58, maxZ: 62, height: 2.8 }, // pantry shed
  { minX: 23.5, maxX: 28.5, minZ: 71, maxZ: 74, height: 2.4 }, // van
];

/** Where the dog likes to potter about when nothing is happening. */
const POTTER_SPOTS: Vec2[] = [
  { x: -4, z: 52 },
  { x: 8, z: 50 },
  { x: -24, z: 54 },
  { x: 16, z: 66 },
  { x: -6, z: 70 },
  { x: 30, z: 52 },
];

export type HomeDogMode = 'follow' | 'potter' | 'nap' | 'toBowl' | 'eat' | 'come' | 'greet';

export interface HomeSession {
  time: number;
  rng: Rng;
  keeper: KeeperAgent;
  dog: DogAgent | null;
  params: DogParams | null;
  dogMode: HomeDogMode;
  modeTime: number;
  potterTarget: Vec2 | null;
  bowlFilled: boolean;
  /** Set when the dog finishes eating; the app applies it to the save. */
  ate: boolean;
  nearSpot: SpotId | null;
  nearDog: boolean;
}

export function createHomeSession(
  dog: Dog | null,
  seed: number,
  start: Vec2,
  bowlFilled: boolean,
): HomeSession {
  const keeper = createKeeper(start);
  keeper.heading = Math.PI;
  const params = dog ? dogParams(dog) : null;
  const agent = dog && params ? createDog(add(start, { x: -1.2, z: 1 }), params) : null;
  if (agent) agent.mode = 'heel';
  return {
    time: 0,
    rng: createRng(seed),
    keeper,
    dog: agent,
    params,
    dogMode: bowlFilled ? 'toBowl' : 'follow',
    modeTime: 0,
    potterTarget: null,
    bowlFilled,
    ate: false,
    nearSpot: null,
    nearDog: false,
  };
}

function collide(p: Vec2, radius: number): Vec2 {
  let out = {
    x: clamp(p.x, HOME_BOUNDS.minX + radius, HOME_BOUNDS.maxX - radius),
    z: clamp(p.z, HOME_BOUNDS.minZ + radius, HOME_BOUNDS.maxZ - radius),
  };
  for (const b of HOME_SOLIDS) {
    if (
      out.x > b.minX - radius &&
      out.x < b.maxX + radius &&
      out.z > b.minZ - radius &&
      out.z < b.maxZ + radius
    ) {
      const pushes = [
        { d: out.x - (b.minX - radius), p: { x: b.minX - radius, z: out.z } },
        { d: b.maxX + radius - out.x, p: { x: b.maxX + radius, z: out.z } },
        { d: out.z - (b.minZ - radius), p: { x: out.x, z: b.minZ - radius } },
        { d: b.maxZ + radius - out.z, p: { x: out.x, z: b.maxZ + radius } },
      ];
      out = pushes.reduce((a, c) => (c.d < a.d ? c : a)).p;
    }
  }
  return out;
}

function insideBox(p: Vec2, b: Block2, pad: number): boolean {
  return p.x > b.minX - pad && p.x < b.maxX + pad && p.z > b.minZ - pad && p.z < b.maxZ + pad;
}

function segmentBlocked(a: Vec2, b: Vec2, box: Block2, pad: number): boolean {
  for (let i = 1; i < 24; i++) {
    const t = i / 24;
    if (insideBox({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }, box, pad)) return true;
  }
  return false;
}

const clear = (a: Vec2, b: Vec2, pad = 0.55) =>
  HOME_SOLIDS.every((box) => !segmentBlocked(a, b, box, pad));

// A 1 m walking grid over the yard, with buildings (plus a margin) marked solid.
const CELL = 1;
const COLS = Math.round((HOME_BOUNDS.maxX - HOME_BOUNDS.minX) / CELL);
const ROWS = Math.round((HOME_BOUNDS.maxZ - HOME_BOUNDS.minZ) / CELL);
const cellCenter = (c: number, r: number): Vec2 => ({
  x: HOME_BOUNDS.minX + (c + 0.5) * CELL,
  z: HOME_BOUNDS.minZ + (r + 0.5) * CELL,
});
const SOLID_CELLS: boolean[] = Array.from({ length: COLS * ROWS }, (_, i) => {
  const p = cellCenter(i % COLS, Math.floor(i / COLS));
  return HOME_SOLIDS.some((b) => insideBox(p, b, 0.8));
});
const cellOf = (p: Vec2) => ({
  c: clamp(Math.floor((p.x - HOME_BOUNDS.minX) / CELL), 0, COLS - 1),
  r: clamp(Math.floor((p.z - HOME_BOUNDS.minZ) / CELL), 0, ROWS - 1),
});

/** A* over the yard grid; returns waypoints from start to goal, smoothed. */
export function findPath(from: Vec2, to: Vec2): Vec2[] {
  const start = cellOf(from);
  const goal = cellOf(to);
  const index = (c: number, r: number) => r * COLS + c;
  const open: number[] = [index(start.c, start.r)];
  const came = new Map<number, number>();
  const cost = new Map<number, number>([[index(start.c, start.r), 0]]);
  const goalIndex = index(goal.c, goal.r);
  const h = (i: number) => Math.hypot((i % COLS) - goal.c, Math.floor(i / COLS) - goal.r);
  let found = false;
  for (let guard = 0; open.length && guard < 6000; guard++) {
    open.sort((a, b) => cost.get(a)! + h(a) - (cost.get(b)! + h(b)));
    const current = open.shift()!;
    if (current === goalIndex) {
      found = true;
      break;
    }
    const cc = current % COLS;
    const cr = Math.floor(current / COLS);
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (!dc && !dr) continue;
        const nc = cc + dc;
        const nr = cr + dr;
        if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
        const next = index(nc, nr);
        if (SOLID_CELLS[next] && next !== goalIndex) continue;
        const step = dc && dr ? Math.SQRT2 : 1;
        const g = cost.get(current)! + step;
        if (g < (cost.get(next) ?? Infinity)) {
          cost.set(next, g);
          came.set(next, current);
          if (!open.includes(next)) open.push(next);
        }
      }
    }
  }
  if (!found) return [to];
  const cells: Vec2[] = [];
  for (let i: number | undefined = goalIndex; i !== undefined; i = came.get(i)) {
    cells.unshift(cellCenter(i % COLS, Math.floor(i / COLS)));
  }
  cells[cells.length - 1] = to;
  // String-pull: skip waypoints while the straight line stays clear.
  const path: Vec2[] = [];
  let anchor = from;
  let k = 0;
  while (k < cells.length) {
    let far = k;
    while (far + 1 < cells.length && clear(anchor, cells[far + 1]!)) far++;
    path.push(cells[far]!);
    anchor = cells[far]!;
    k = far + 1;
  }
  return path;
}

/** Next point to head for so walkers go round buildings instead of into them. */
export function routeAround(from: Vec2, to: Vec2): Vec2 {
  if (clear(from, to)) return to;
  const path = findPath(from, to);
  return path.find((p) => distance(p, from) > 0.8) ?? to;
}

const WALK = 2.8;
const JOG = 5;

export function setHomeInput(s: HomeSession, input: Vec2, running: boolean): void {
  s.keeper.input = input;
  s.keeper.running = running;
}

export function fillHomeBowl(s: HomeSession): void {
  s.bowlFilled = true;
  if (s.dog) setDogMode(s, 'toBowl');
}

/** Whistle or call: the dog trots over and sits in front of you. */
export function callDog(s: HomeSession): void {
  keeperAct(s.keeper, 'call');
  if (s.dog && s.dogMode !== 'eat') setDogMode(s, 'come');
}

export function greetDog(s: HomeSession): void {
  keeperAct(s.keeper, 'mark');
  if (s.dog && s.dogMode !== 'eat') setDogMode(s, 'greet');
}

function setDogMode(s: HomeSession, mode: HomeDogMode): void {
  s.dogMode = mode;
  s.modeTime = 0;
}

export function stepHome(s: HomeSession, dt: number): void {
  s.time += dt;
  s.modeTime += dt;
  stepKeeperHome(s.keeper, dt);
  if (s.dog && s.params) stepHomeDog(s, s.dog, s.params, dt);

  let near: SpotId | null = null;
  let best = Infinity;
  for (const spot of HOME_SPOTS) {
    const d = distance(s.keeper.pos, spot.pos);
    if (d < spot.reach && d < best) {
      best = d;
      near = spot.id;
    }
  }
  s.nearSpot = near;
  s.nearDog = !!s.dog && distance(s.dog.pos, s.keeper.pos) < 2.2;
}

function stepKeeperHome(k: KeeperAgent, dt: number): void {
  const len = Math.hypot(k.input.x, k.input.z);
  const top = k.backing ? WALK * 0.6 : k.running ? JOG : WALK;
  const target = len > 0.05 ? top * Math.min(1, len) : 0;
  k.speed += clamp(target - k.speed, -14 * dt, 10 * dt);
  if (len > 0.05) {
    if (!k.backing) k.heading = turnToward(k.heading, headingOf(k.input), 9 * dt);
    k.stillTime = 0;
  } else k.stillTime += dt;
  const step = fromHeading(k.heading, k.speed * dt * (k.backing ? -1 : 1));
  k.pos = collide({ x: k.pos.x + step.x, z: k.pos.z + step.z }, 0.45);
  if (k.action !== 'none') {
    k.actionTime += dt;
    if (k.actionTime > 1.1) k.action = 'none';
  }
}

/** Where the dog stands to eat, facing the bowl just outside the runs. */
const BOWL: Vec2 = { x: 13.5, z: 52.7 };

function stepHomeDog(s: HomeSession, dog: DogAgent, params: DogParams, dt: number): void {
  const k = s.keeper;
  const yard: Field = { style: 'training', ...HOME_BOUNDS, cover: [], trees: [], line: k.pos };
  const go = (target: Vec2, speed: number, arrive = 0.5) => {
    const next = routeAround(dog.pos, target);
    const final = next === target;
    const done = steerToward(dog, params, yard, next, speed, dt, final ? arrive : 1.5);
    dog.pos = collide(dog.pos, 0.35);
    return final && done;
  };
  const awayFromKeeper = distance(dog.pos, k.pos);
  dog.lookAt = null;

  switch (s.dogMode) {
    case 'toBowl':
      dog.pose = 'stand';
      dog.tell = { ears: 'forward', tail: 'high', noseDown: false, text: 'Hurrying to the bowl!' };
      if (go(BOWL, params.trot * 1.3, 0.4)) setDogMode(s, 'eat');
      break;
    case 'eat':
      brake(dog, params, dt);
      dog.pose = 'stand';
      dog.heading = 0;
      dog.tell = { ears: 'neutral', tail: 'wag', noseDown: true, text: 'Eating happily' };
      if (s.modeTime > 3.2) {
        s.bowlFilled = false;
        s.ate = true;
        setDogMode(s, 'follow');
      }
      break;
    case 'come':
    case 'greet': {
      const front = add(k.pos, fromHeading(k.heading, 1.1));
      dog.tell = {
        ears: 'forward',
        tail: 'wag',
        noseDown: false,
        text: s.dogMode === 'greet' ? 'Loving the attention' : 'Coming to you',
      };
      if (go(front, params.trot * 1.5, 0.7)) {
        brake(dog, params, dt);
        dog.heading = headingOf(sub(k.pos, dog.pos));
        dog.pose = 'sit';
        dog.lookAt = k.pos;
        if (s.modeTime > (s.dogMode === 'greet' ? 3 : 5)) setDogMode(s, 'follow');
      } else dog.pose = 'stand';
      break;
    }
    case 'follow': {
      if (s.bowlFilled) {
        setDogMode(s, 'toBowl');
        break;
      }
      const behind = add(k.pos, fromHeading(k.heading + Math.PI * 0.75, 1.6));
      if (awayFromKeeper > 2.2 || k.speed > 0.3) {
        dog.pose = 'stand';
        go(behind, Math.max(k.speed * 1.15, awayFromKeeper > 6 ? params.trot * 1.4 : 1.4), 0.6);
        dog.tell = {
          ears: 'neutral',
          tail: 'wag',
          noseDown: false,
          text: 'Trotting along with you',
        };
      } else {
        brake(dog, params, dt);
        dog.lookAt = k.pos;
        dog.pose = k.stillTime > 2 ? 'sit' : 'stand';
        dog.tell = { ears: 'forward', tail: 'wag', noseDown: false, text: 'Watching you' };
      }
      // Left alone for a while, the dog goes exploring.
      if (k.stillTime > 7 || (k.stillTime > 4 && random(s.rng) < dt * 0.15)) {
        s.potterTarget = POTTER_SPOTS[Math.floor(random(s.rng) * POTTER_SPOTS.length)]!;
        setDogMode(s, 'potter');
      }
      break;
    }
    case 'potter': {
      const target = s.potterTarget ?? dog.pos;
      if (go(target, 1.6, 0.8)) {
        brake(dog, params, dt);
        dog.pose = 'stand';
        dog.tell = {
          ears: 'neutral',
          tail: 'wag',
          noseDown: true,
          text: 'Sniffing about the yard',
        };
        if (s.modeTime > 9) setDogMode(s, random(s.rng) < 0.5 ? 'nap' : 'follow');
      } else {
        dog.pose = 'stand';
        dog.tell = { ears: 'neutral', tail: 'wag', noseDown: true, text: 'Exploring' };
      }
      if (k.speed > 0.5 && awayFromKeeper > 8) setDogMode(s, 'follow');
      break;
    }
    case 'nap':
      brake(dog, params, dt);
      dog.pose = 'down';
      dog.tell = { ears: 'neutral', tail: 'low', noseDown: false, text: 'Dozing in the sun' };
      if (k.speed > 0.5 && awayFromKeeper > 4) setDogMode(s, 'follow');
      if (s.modeTime > 25) setDogMode(s, 'follow');
      break;
  }
}
