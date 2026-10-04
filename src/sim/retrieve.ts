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
import { createRng, gaussian, random, type Rng } from '../core/rng';
import type { Dog } from '../core/dog/dog';
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
import { bankWaypoint, coverAt, createTrainingField, waterCrossing, type Field } from './field';
import type { RetrieveSetup } from './exercises';
import { scentStrength, windAt, type Wind } from './scent';

export type ItemKind = 'mark' | 'blind' | 'ball';
export type ItemState = 'waiting' | 'flying' | 'lying' | 'carried' | 'delivered';

export interface Item {
  id: number;
  kind: ItemKind;
  state: ItemState;
  pos: Vec2;
  y: number;
  velocity: { x: number; y: number; z: number };
  /** Where the dog believes it fell, or null if the dog has not seen it. */
  memory: Vec2 | null;
  landedAt: number;
  hiddenInCover: boolean;
  thrower: number | null;
  landing: Vec2;
}

export interface Thrower {
  pos: Vec2;
  /** Seconds since the last throw, for the throwing animation. */
  throwTime: number;
}

export interface SessionEvent {
  time: number;
  text: string;
  tone: 'good' | 'info' | 'warn';
}

export interface RetrieveStats {
  whistles: number;
  ignoredWhistles: number;
  casts: number;
  refusals: number;
  broke: boolean;
  /** Whistles blown while the dog was on a mark (a minor fault in trials). */
  handledOnMarks: number;
  wrongItem: boolean;
  drops: number;
  pops: number;
  /** Times the dog ran round the bank rather than swim. */
  bankRuns: number;
  /** Seconds spent hesitating at the water's edge. */
  waterBalk: number;
  /** Closest distance at which the dog first picked up the scent of what it found. */
  scentDistances: number[];
  /** Sum of distance off the ideal blind line, sampled along the way. */
  lineError: number;
  lineSamples: number;
  startedAt: number | null;
  finishedAt: number | null;
  delivered: number;
  trace: Vec2[];
}

export type SessionPhase = 'ready' | 'throwing' | 'working' | 'complete';

export interface RetrieveSession {
  time: number;
  rng: Rng;
  field: Field;
  wind: Wind;
  setup: RetrieveSetup;
  dogName: string;
  params: DogParams;
  dog: DogAgent;
  keeper: KeeperAgent;
  items: Item[];
  throwers: Thrower[];
  phase: SessionPhase;
  /** Times at which scripted throws happen. */
  throwSchedule: { at: number; item: number }[];
  /** Start point and blind for measuring the line. */
  lineFrom: Vec2 | null;
  /** Where the keeper and dog start (the set-up's own start, or the field's line). */
  start: Vec2;
  stats: RetrieveStats;
  events: SessionEvent[];
  traceTimer: number;
  lastLanding: number;
}

const GRAVITY = 14;

export function createRetrieveSession(
  dog: Dog,
  setup: RetrieveSetup,
  seed: number,
  field: Field = createTrainingField(),
): RetrieveSession {
  const rng = createRng(seed);
  const params = dogParams(dog);
  const start = setup.start ?? field.line;
  const keeper = createKeeper(start);
  const agent = createDog(add(start, { x: -0.9, z: 0.2 }), params);
  const items: Item[] = [];
  const throwers: Thrower[] = [];

  setup.marks.forEach((mark, index) => {
    throwers.push({ pos: { ...mark.from }, throwTime: 99 });
    items.push(newItem(items.length, 'mark', 'waiting', mark.from, mark.landing, index));
  });
  for (const blind of setup.blinds) {
    const item = newItem(items.length, 'blind', 'lying', blind, blind, null);
    item.hiddenInCover = coverAt(field, blind) > 0.35;
    items.push(item);
  }

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
    params,
    dog: agent,
    keeper,
    items,
    throwers,
    phase: setup.free ? 'working' : 'ready',
    throwSchedule: [],
    lineFrom: null,
    start: { ...start },
    stats: {
      whistles: 0,
      ignoredWhistles: 0,
      casts: 0,
      refusals: 0,
      broke: false,
      handledOnMarks: 0,
      wrongItem: false,
      drops: 0,
      pops: 0,
      bankRuns: 0,
      waterBalk: 0,
      scentDistances: [],
      lineError: 0,
      lineSamples: 0,
      startedAt: null,
      finishedAt: null,
      delivered: 0,
      trace: [],
    },
    events: [],
    traceTimer: 0,
    lastLanding: -99,
  };
}

function newItem(
  id: number,
  kind: ItemKind,
  state: ItemState,
  pos: Vec2,
  landing: Vec2,
  thrower: number | null,
): Item {
  return {
    id,
    kind,
    state,
    pos: { ...pos },
    y: state === 'waiting' ? 1.7 : 0,
    velocity: { x: 0, y: 0, z: 0 },
    memory: null,
    landedAt: -1,
    hiddenInCover: false,
    thrower,
    landing: { ...landing },
  };
}

function log(s: RetrieveSession, text: string, tone: SessionEvent['tone'] = 'info'): void {
  s.events.push({ time: s.time, text, tone });
  if (s.events.length > 40) s.events.shift();
}

function launch(item: Item, from: Vec2, fromHeight: number, to: Vec2, flightTime: number): void {
  item.state = 'flying';
  item.pos = { ...from };
  item.y = fromHeight;
  item.velocity = {
    x: (to.x - from.x) / flightTime,
    z: (to.z - from.z) / flightTime,
    y: (0 - fromHeight + 0.5 * GRAVITY * flightTime * flightTime) / flightTime,
  };
}

// ---------------------------------------------------------------------------
// Commands from the player
// ---------------------------------------------------------------------------

/** Helpers in the field throw the set-up's marks, one after another. */
export function callForThrows(s: RetrieveSession): void {
  if (s.phase !== 'ready') return;
  const marks = s.items.filter((i) => i.kind === 'mark' && i.state === 'waiting');
  marks.forEach((item, index) =>
    s.throwSchedule.push({ at: s.time + 0.4 + index * 2.4, item: item.id }),
  );
  s.phase = marks.length > 0 ? 'throwing' : 'working';
  if (s.stats.startedAt === null) s.stats.startedAt = s.time;
  log(s, marks.length > 1 ? 'Throws coming. Watch both.' : 'Throw coming.');
}

const isAtSide = (dog: DogAgent) => dog.mode === 'sit' || dog.mode === 'heel';

/**
 * What a send toward `point` would do: go for a fall the dog saw, or run out
 * to that spot and search there. The renderer uses this to draw the aim line.
 */
export function aimTarget(
  s: RetrieveSession,
  point: Vec2,
): { kind: 'mark'; item: Item } | { kind: 'spot'; point: Vec2 } {
  const marks = s.items.filter((i) => i.state === 'lying' && i.memory && i.kind !== 'blind');
  let best: Item | null = null;
  let bestDistance = Infinity;
  for (const item of marks) {
    const d = distance(item.pos, point);
    if (d < bestDistance) {
      bestDistance = d;
      best = item;
    }
  }
  if (best && bestDistance < Math.max(9, distance(s.keeper.pos, best.pos) * 0.22))
    return { kind: 'mark', item: best };
  return { kind: 'spot', point: { ...point } };
}

/**
 * Sends the dog. Click near a fall it watched and it goes for that fall;
 * click anywhere else and it runs out to that spot and searches there.
 * Less trained dogs drift off line on the way, which you can see and correct.
 */
export function sendDog(s: RetrieveSession, aim: Vec2): void {
  const { dog, keeper } = s;
  if (!isAtSide(dog) || s.phase === 'complete') return;
  if (s.stats.startedAt === null) s.stats.startedAt = s.time;
  if (s.phase === 'ready') s.phase = 'working';
  const target = aimTarget(s, aim);
  dog.droppedOnce = false;
  resetWater(dog, false);
  const aimHeading = headingOf(sub(target.kind === 'mark' ? target.item.pos : aim, keeper.pos));
  keeperAct(keeper, 'send', aimHeading);

  if (target.kind === 'mark') {
    dog.goalItem = target.item.id;
    dog.target = { ...target.item.memory! };
    setMode(dog, 'run');
    log(s, `${s.dogName} is away to the mark.`);
  } else {
    // Lining up: the less trained the dog, the less exact the line.
    const sd = (1 - s.params.skills.cast * 0.6 - s.params.biddability * 0.3) * 0.16;
    dog.lineHeading = aimHeading + gaussian(s.rng) * Math.max(0.03, sd);
    dog.carryLeft = Math.max(4, distance(dog.pos, aim));
    dog.goalItem = null;
    s.lineFrom = { ...dog.pos };
    setMode(dog, 'line');
    log(s, `${s.dogName} is away.`);
  }
  dog.breakPressure = 0;
}

function attention(s: RetrieveSession): number {
  const d = distance(s.dog.pos, s.keeper.pos);
  return clamp01(
    0.35 +
      s.params.bond * 0.3 +
      s.params.biddability * 0.25 -
      d / 150 -
      (s.dog.mode === 'scent' ? 0.2 : 0),
  );
}

const EXCITEMENT: Partial<Record<DogAgent['mode'], number>> = {
  scent: 0.45,
  run: 0.25,
  line: 0.1,
  hunt: 0.1,
  return: 0.05,
};

/** One blast on the stop whistle. Whether the dog stops depends on training, not luck alone. */
export function blowWhistle(s: RetrieveSession): void {
  const { dog, keeper, params } = s;
  keeperAct(keeper, 'whistle');
  const stoppable = ['run', 'line', 'hunt', 'scent'].includes(dog.mode);
  if (!stoppable || dog.stopDelay > 0) return;
  s.stats.whistles++;
  if (dog.goalItem !== null && s.items[dog.goalItem]?.kind === 'mark') s.stats.handledOnMarks++;

  const proximity = clamp01(1 - distance(dog.pos, keeper.pos) / 60) * 0.15;
  const excitement = (EXCITEMENT[dog.mode] ?? 0) * (1 - params.skills.stop * 0.4);
  const compliance =
    params.skills.stop * 0.6 +
    params.biddability * 0.25 +
    attention(s) * 0.2 +
    proximity +
    dog.whistlePressure -
    excitement +
    gaussian(s.rng) * 0.05;

  if (compliance >= 0.5) {
    dog.stopDelay = 0.2 + 0.45 * (1 - params.skills.stop);
    dog.tell = {
      ears: 'forward',
      tail: 'neutral',
      noseDown: false,
      text: 'Stopping on the whistle',
    };
  } else if (compliance >= 0.25) {
    dog.whistlePressure = 0.2;
    dog.tell = {
      ears: 'flick',
      tail: 'neutral',
      noseDown: false,
      text: 'Glanced back but kept going',
    };
    log(s, `${s.dogName} glanced back but kept going. Another blast might do it.`, 'warn');
    s.stats.ignoredWhistles++;
  } else {
    dog.tell = { ears: 'flick', tail: 'high', noseDown: false, text: 'Ignored the whistle' };
    log(s, `${s.dogName} ignored the whistle.`, 'warn');
    s.stats.ignoredWhistles++;
  }
}

/**
 * Arm signal toward a point while the dog is sitting out in the field.
 * Trained dogs take the direction; untrained ones drift toward what they want.
 */
export function castDog(s: RetrieveSession, toward: Vec2): void {
  const { dog, keeper, params } = s;
  if (dog.mode !== 'stopped' && dog.mode !== 'popped') return;
  s.stats.casts++;
  const desired = headingOf(sub(toward, dog.pos));
  const awayFromKeeper = headingOf(sub(dog.pos, keeper.pos));
  const relative = wrapAngle(desired - awayFromKeeper);
  const isBack = Math.abs(relative) < Math.PI / 4;
  // Arm signals are read from the dog's point of view, facing the keeper.
  keeperAct(
    keeper,
    isBack ? 'castBack' : relative > 0 ? 'castLeft' : 'castRight',
    headingOf(sub(toward, keeper.pos)),
  );

  let heading =
    desired +
    gaussian(s.rng) * (0.06 + (1 - params.skills.cast) * 0.5 * (1.2 - params.biddability));

  // Temptation: a remembered fall the dog has not picked up pulls the cast.
  const temptation = s.items.find(
    (i) =>
      i.state === 'lying' &&
      i.memory &&
      i.kind !== 'blind' &&
      Math.abs(wrapAngle(headingOf(sub(i.memory, dog.pos)) - desired)) < 1.3,
  );
  if (temptation?.memory) {
    const pull = (1 - params.skills.cast) * 0.6 * (1 - params.biddability * 0.5);
    heading += wrapAngle(headingOf(sub(temptation.memory, dog.pos)) - heading) * pull;
  }

  if (Math.abs(wrapAngle(heading - desired)) > 0.95) {
    s.stats.refusals++;
    log(s, `${s.dogName} didn't take that direction.`, 'warn');
  } else {
    log(s, isBack ? 'Back!' : 'Over!', 'info');
  }

  dog.lineHeading = heading;
  dog.carryLeft = Math.max(4, distance(dog.pos, toward));
  dog.goalItem = null;
  resetWater(dog, waterCrossing(s.field, dog.pos, toward) !== null);
  setMode(dog, 'line');
}

function resetWater(dog: DogAgent, castIntoWater: boolean): void {
  dog.detour = null;
  dog.detourGoal = null;
  dog.balk = 0;
  dog.waterChecked = false;
  dog.castIntoWater = castIntoWater;
}

/** "Here!" Calls the dog back. Mostly for when things are going wrong. */
export function recallDog(s: RetrieveSession): void {
  const { dog, params } = s;
  keeperAct(s.keeper, 'call');
  if (isAtSide(dog) || dog.mode === 'return' || dog.mode === 'deliver') return;
  const compliance =
    params.skills.recall * 0.6 +
    params.biddability * 0.3 +
    attention(s) * 0.25 -
    (EXCITEMENT[dog.mode] ?? 0);
  if (compliance >= 0.4 || dog.mode === 'stopped' || dog.mode === 'popped') {
    setMode(dog, 'return');
    log(s, `${s.dogName} is coming back.`);
  } else {
    log(s, `${s.dogName} is too busy to listen.`, 'warn');
  }
}

/** "Sit... steady." Settles an excited dog at your side before it is sent. */
export function steadyDog(s: RetrieveSession): void {
  keeperAct(s.keeper, 'steady');
  if (!isAtSide(s.dog)) return;
  s.dog.breakPressure = Math.max(0, s.dog.breakPressure - 0.35);
  s.dog.steadyBoost = 2.5;
}

/** Free play: the keeper throws a ball toward a point. */
export function throwBall(s: RetrieveSession, toward: Vec2): void {
  if (!s.setup.free) return;
  const { keeper, dog } = s;
  if (!isAtSide(dog)) return;
  const offset = sub(toward, keeper.pos);
  const dist = clamp(Math.hypot(offset.x, offset.z), 4, 38);
  const landing = add(keeper.pos, scale(normalize(offset), dist));
  const ball = newItem(s.items.length, 'ball', 'flying', keeper.pos, landing, null);
  launch(ball, keeper.pos, 1.5, landing, 0.7 + dist * 0.025);
  s.items.push(ball);
  keeperAct(keeper, 'throw', headingOf(offset));
}

export function setKeeperInput(s: RetrieveSession, input: Vec2, running: boolean): void {
  s.keeper.input = input;
  s.keeper.running = running;
}

// ---------------------------------------------------------------------------
// Simulation step
// ---------------------------------------------------------------------------

export const FIXED_DT = 1 / 60;

export function stepSession(s: RetrieveSession, dt: number): void {
  s.time += dt;
  stepKeeper(s.keeper, s.field, dt);
  stepThrows(s, dt);
  stepItems(s, dt);
  stepDog(s, dt);
  recordTrace(s, dt);
}

function stepThrows(s: RetrieveSession, dt: number): void {
  for (const thrower of s.throwers) thrower.throwTime += dt;
  while (s.throwSchedule.length > 0 && s.throwSchedule[0]!.at <= s.time) {
    const { item: id } = s.throwSchedule.shift()!;
    const item = s.items[id]!;
    const thrower = s.throwers[item.thrower ?? 0]!;
    thrower.throwTime = 0;
    launch(item, thrower.pos, 1.8, item.landing, 1.0 + distance(thrower.pos, item.landing) * 0.03);
  }
}

function stepItems(s: RetrieveSession, dt: number): void {
  for (const item of s.items) {
    if (item.state === 'flying') {
      item.velocity.y -= GRAVITY * dt;
      item.pos = { x: item.pos.x + item.velocity.x * dt, z: item.pos.z + item.velocity.z * dt };
      item.y += item.velocity.y * dt;
      if (item.y <= 0) land(s, item);
    } else if (item.state === 'carried') {
      item.pos = add(s.dog.pos, fromHeading(s.dog.heading, 0.45));
      item.y = 0.35;
    }
  }
  if (
    s.phase === 'throwing' &&
    s.throwSchedule.length === 0 &&
    !s.items.some((i) => i.state === 'flying')
  ) {
    s.phase = 'working';
  }
}

function land(s: RetrieveSession, item: Item): void {
  item.state = 'lying';
  item.y = 0;
  item.landedAt = s.time;
  item.hiddenInCover = coverAt(s.field, item.pos) > 0.35;
  s.lastLanding = s.time;

  // Earlier falls get fuzzier in the dog's memory when a new one lands.
  for (const other of s.items) {
    if (other !== item && other.memory && other.state === 'lying') {
      other.memory = add(
        other.memory,
        scale({ x: gaussian(s.rng), z: gaussian(s.rng) }, 1.2 * s.params.markError * 20),
      );
    }
  }

  const watching = s.dog.mode === 'sit' || s.dog.mode === 'heel' || item.kind === 'ball';
  if (watching) {
    const dist = distance(s.dog.pos, item.pos);
    const spread =
      item.kind === 'ball' ? 0.3 : dist * s.params.markError * (item.hiddenInCover ? 1.6 : 1);
    item.memory = add(item.pos, scale({ x: gaussian(s.rng), z: gaussian(s.rng) }, spread));
  }

  if (item.kind === 'ball' && (s.dog.mode === 'sit' || s.dog.mode === 'heel')) {
    s.dog.goalItem = item.id;
    s.dog.target = { ...item.memory! };
    setMode(s.dog, 'run');
  }
}

function stepDog(s: RetrieveSession, dt: number): void {
  const { dog, params, field, keeper } = s;
  dog.modeTime += dt;
  dog.steadyBoost = Math.max(0, dog.steadyBoost - dt);
  dog.whistlePressure = Math.max(0, dog.whistlePressure - dt * 0.08);
  dog.lookAt = null;

  if (dog.stopDelay > 0) {
    dog.stopDelay -= dt;
    brake(dog, params, dt);
    if (dog.stopDelay <= 0) {
      dog.stopDelay = 0;
      dog.speed = 0;
      dog.detour = null;
      dog.balk = 0;
      setMode(dog, 'stopped');
      log(s, `${s.dogName} stopped and is waiting for a direction.`, 'good');
    }
    return;
  }

  switch (dog.mode) {
    case 'heel':
    case 'sit':
      atSide(s, dt);
      break;
    case 'run':
      if (waterOnTheWay(s, dt)) break;
      if (dog.target && steerToward(dog, params, field, dog.target, params.gallop, dt, 2.2)) {
        startHunt(dog, dog.target, 3);
      }
      checkForScent(s);
      break;
    case 'line':
      if (waterOnTheWay(s, dt)) break;
      holdLine(s, dt);
      checkForScent(s);
      break;
    case 'hunt':
      hunt(s, dt);
      checkForScent(s);
      break;
    case 'scent':
      workScent(s, dt);
      break;
    case 'pickup':
      brake(dog, params, dt);
      dog.pose = 'stand';
      if (dog.modeTime > 0.6) pickUp(s);
      break;
    case 'return':
      returnToKeeper(s, dt);
      break;
    case 'deliver':
      brake(dog, params, dt);
      dog.lookAt = keeper.pos;
      if (dog.modeTime > 0.8) deliver(s);
      break;
    case 'stopped':
    case 'popped':
      brake(dog, params, dt);
      dog.pose = 'sit';
      dog.lookAt = keeper.pos;
      if (dog.mode === 'popped' && dog.modeTime > 4) {
        // No help came, so the dog widens its search and carries on.
        dog.huntRadius *= 1.2;
        setMode(dog, 'hunt');
      } else if (dog.mode === 'stopped' && dog.modeTime > 7) {
        log(s, `${s.dogName} got tired of waiting and went back to hunting.`, 'warn');
        startHunt(dog, dog.pos, 4);
      }
      break;
  }

  if (
    dog.mode !== 'sit' &&
    dog.mode !== 'stopped' &&
    dog.mode !== 'popped' &&
    dog.mode !== 'deliver'
  ) {
    dog.pose = 'stand';
  }
  updateTell(s);
}

function atSide(s: RetrieveSession, dt: number): void {
  const { dog, keeper, params, field } = s;
  const side = add(keeper.pos, fromHeading(keeper.heading - Math.PI / 2, 0.9));
  const away = distance(dog.pos, side);

  if (keeper.speed > 0.3 || away > 1.6) {
    setMode(dog, 'heel');
    dog.pose = 'stand';
    const speed = away > 4 ? params.trot * 1.4 : Math.max(keeper.speed * 1.05, away * 1.5);
    if (away > 0.25) steerToward(dog, params, field, side, speed, dt, 0.2);
    else brake(dog, params, dt);
  } else {
    if (dog.mode === 'heel' && keeper.stillTime > 0.5) setMode(dog, 'sit');
    if (dog.mode === 'sit') {
      brake(dog, params, dt);
      dog.pose = 'sit';
      // Shuffle round smoothly to face what the keeper faces (or the fall it is
      // watching); snapping to the keeper's heading made the dog spin as you turned.
      const watching = dog.lookAt ? headingOf(sub(dog.lookAt, dog.pos)) : keeper.heading;
      dog.heading = turnToward(dog.heading, watching, 3 * dt);
    }
  }

  // Watching throws and the urge to go before being sent.
  const flying = s.items.find((i) => i.state === 'flying' && i.kind !== 'ball');
  const sinceLanding = s.time - s.lastLanding;
  const pending = s.items.some((i) => i.state === 'lying' && i.memory && i.kind !== 'blind');
  if (flying) dog.lookAt = flying.pos;
  else if (pending) {
    const last = s.items
      .filter((i) => i.state === 'lying' && i.memory)
      .sort((a, b) => b.landedAt - a.landedAt)[0];
    if (last) dog.lookAt = last.pos;
  }
  const excitement = flying ? 1 : pending ? Math.max(0.15, 0.8 - sinceLanding * 0.15) : 0;
  const drive = 1 - params.steadiness;
  dog.breakPressure = Math.max(
    0,
    dog.breakPressure +
      dt * (excitement * (0.25 + drive * 1.1) - params.steadiness * 0.55 - dog.steadyBoost * 0.4),
  );
  if (excitement === 0) dog.breakPressure = Math.max(0, dog.breakPressure - dt);

  if (dog.breakPressure > 1 && !s.setup.free) {
    const target = s.items
      .filter((i) => i.state === 'lying' && i.memory)
      .sort((a, b) => b.landedAt - a.landedAt)[0];
    if (target?.memory) {
      s.stats.broke = true;
      dog.goalItem = target.id;
      dog.target = { ...target.memory };
      dog.breakPressure = 0;
      setMode(dog, 'run');
      log(s, `${s.dogName} broke! Went before being sent.`, 'warn');
    }
  }
}

/**
 * Water between the dog and where it is going. A keen water dog goes straight
 * in; a reluctant one hesitates at the edge, or takes the easy way round by
 * the bank, which judges mark down. The handler's answer is a stop whistle
 * and a cast back into the water, which a trained dog trusts.
 */
function waterOnTheWay(s: RetrieveSession, dt: number): boolean {
  const { dog, params, field } = s;
  if (!field.ponds?.length) return false;
  if (dog.detour) {
    const goal = dog.detourGoal ?? dog.target;
    if (steerToward(dog, params, field, dog.detour, params.gallop, dt, 2.5)) {
      dog.detour = null;
      s.stats.bankRuns++;
      log(s, `${s.dogName} ran round the bank instead of swimming.`, 'warn');
      if (dog.mode === 'line' && goal) {
        dog.lineHeading = headingOf(sub(goal, dog.pos));
        dog.carryLeft = Math.max(4, distance(dog.pos, goal));
      }
    }
    return true;
  }
  if (dog.balk > 0) {
    brake(dog, params, dt);
    dog.balk -= dt;
    s.stats.waterBalk += dt;
    return true;
  }
  if (dog.swimming || dog.waterChecked) return false;
  const goal =
    dog.mode === 'run' ? dog.target : add(dog.pos, fromHeading(dog.lineHeading, dog.carryLeft));
  if (!goal) return false;
  const crossing = waterCrossing(field, dog.pos, goal);
  if (!crossing || crossing.distToEntry > 3) return false;
  dog.waterChecked = true;
  const handled = dog.castIntoWater;
  const will = clamp01(
    0.15 +
      params.waterLove * 0.6 +
      params.confidence * 0.2 +
      (handled ? params.skills.cast * 0.45 + params.biddability * 0.2 : 0),
  );
  if (crossing.endsInWater || random(s.rng) < will) {
    const hesitation = (0.8 - will) * 5 * random(s.rng);
    if (hesitation > 0.5) {
      dog.balk = hesitation;
      log(s, `${s.dogName} hesitates at the water's edge.`, 'info');
      return true;
    }
    return false;
  }
  dog.detour = bankWaypoint(crossing.pond, dog.pos, goal);
  dog.detourGoal = { ...goal };
  return true;
}

function startHunt(dog: DogAgent, center: Vec2, radius: number): void {
  dog.huntCenter = { ...center };
  dog.huntRadius = radius;
  dog.huntTime = 0;
  dog.huntLeg = 0;
  dog.huntPops = 0;
  setMode(dog, 'hunt');
}

function holdLine(s: RetrieveSession, dt: number): void {
  const { dog, params, field } = s;
  const forward = fromHeading(dog.lineHeading);
  let drift = 0;

  // Old falls pull a dog off its line.
  for (const item of s.items) {
    const spot = item.memory;
    if (!spot || item.kind === 'blind' || (item.state !== 'lying' && item.state !== 'delivered'))
      continue;
    const to = sub(spot, dog.pos);
    const d = Math.hypot(to.x, to.z);
    if (d > 2 && d < 28 && dot(normalize(to), forward) > 0.55) {
      const strength = (1 - params.skills.cast) * 0.9 * (1 - d / 28);
      drift += wrapAngle(headingOf(to) - dog.lineHeading) * strength;
    }
  }
  // Less confident dogs bend around cover rather than push through it.
  const ahead = add(dog.pos, scale(forward, 6));
  const coverAhead = coverAt(field, ahead);
  if (coverAhead > 0.2) {
    const left = coverAt(field, add(dog.pos, fromHeading(dog.lineHeading + 0.6, 6)));
    const right = coverAt(field, add(dog.pos, fromHeading(dog.lineHeading - 0.6, 6)));
    drift += (left < right ? 1 : -1) * coverAhead * (1 - params.confidence) * 0.9;
  }
  // A crosswind slowly pushes an untrained dog off its line.
  const { dir } = windAt(s.wind, s.time);
  const cross = forward.x * dir.z - forward.z * dir.x;
  drift -= cross * s.wind.strength * 0.18 * (1 - params.skills.cast * 0.7);

  dog.lineHeading = wrapAngle(dog.lineHeading + drift * dt);
  steerDog(dog, params, field, dog.lineHeading, params.gallop, dt);
  dog.carryLeft -= dog.speed * dt;

  const blind = s.items.find((i) => i.kind === 'blind' && i.state === 'lying');
  if (s.lineFrom && blind) {
    const lineDir = normalize(sub(blind.pos, s.lineFrom));
    const off = sub(dog.pos, s.lineFrom);
    s.stats.lineError += Math.abs(off.x * lineDir.z - off.z * lineDir.x) * dt;
    s.stats.lineSamples += dt;
  }

  const nearEdge =
    dog.pos.x < field.minX + 3 ||
    dog.pos.x > field.maxX - 3 ||
    dog.pos.z < field.minZ + 3 ||
    dog.pos.z > field.maxZ - 3;
  if (dog.carryLeft <= 0 || nearEdge) startHunt(dog, dog.pos, 4);
}

function hunt(s: RetrieveSession, dt: number): void {
  const { dog, params, field } = s;
  dog.huntTime += dt;
  dog.huntRadius = Math.min(14, dog.huntRadius + dt * 0.25);

  // Quarter across the wind, working gradually into it.
  const { dir } = windAt(s.wind, s.time);
  const upwind = scale(dir, -1);
  const across = { x: -dir.z, z: dir.x };
  const leg = dog.huntLeg;
  const side = leg % 2 === 0 ? 1 : -1;
  const progress = ((leg % 6) / 5) * 2 - 1;
  const waypoint = add(
    dog.huntCenter,
    add(
      scale(across, side * dog.huntRadius * 0.85),
      scale(upwind, progress * dog.huntRadius * 0.7),
    ),
  );
  if (steerToward(dog, params, field, waypoint, params.trot * 1.25, dt, 1.2)) dog.huntLeg++;

  if (dog.huntTime > params.huntPatience * (1 + dog.huntPops * 1.5) && dog.huntPops < 2) {
    dog.huntPops++;
    s.stats.pops++;
    setMode(dog, 'popped');
    log(s, `${s.dogName} stopped and looked to you for help.`, 'info');
    return;
  }
  if (dog.huntTime > params.huntPatience * 4) {
    log(s, `${s.dogName} gave up and came back empty-handed.`, 'warn');
    setMode(dog, 'return');
  }
}

function checkForScent(s: RetrieveSession): void {
  const { dog, params } = s;
  const nose = add(dog.pos, fromHeading(dog.heading, 0.5));
  // Galloping dogs miss faint scent; hunting dogs are careful.
  const speedPenalty = 1 + 0.55 * Math.min(1, dog.speed / params.gallop);
  const threshold = params.scentThreshold * speedPenalty;
  for (const item of s.items) {
    if (item.state !== 'lying') continue;
    const sight = distance(nose, item.pos) < (item.hiddenInCover ? 1.2 : 3);
    const strength = scentStrength(nose, item.pos, s.wind, s.time);
    if (sight || strength > threshold) {
      dog.scentItem = item.id;
      dog.scentLost = 0;
      setMode(dog, 'scent');
      if (!sight) {
        const d = distance(nose, item.pos);
        s.stats.scentDistances.push(d);
        log(s, `${s.dogName} caught the scent ${Math.round(d)} m away!`, 'good');
      }
      return;
    }
  }
}

function workScent(s: RetrieveSession, dt: number): void {
  const { dog, params, field } = s;
  const item = dog.scentItem !== null ? s.items[dog.scentItem] : undefined;
  if (!item || item.state !== 'lying') {
    startHunt(dog, dog.pos, 3);
    return;
  }
  const nose = add(dog.pos, fromHeading(dog.heading, 0.5));
  const strength = scentStrength(nose, item.pos, s.wind, s.time);
  const d = distance(dog.pos, item.pos);

  // Weave up the scent cone: a small zigzag that tightens near the source.
  const toward = headingOf(sub(item.pos, dog.pos));
  const weave = Math.sin(dog.modeTime * 3.2) * Math.min(0.6, d / 25);
  steerDog(dog, params, field, toward + weave, d < 3 ? params.trot * 0.8 : params.trot * 1.15, dt);

  if (strength < params.scentThreshold * 0.6 && d > 3) dog.scentLost += dt;
  else dog.scentLost = 0;
  if (dog.scentLost > 1.3) {
    log(s, `${s.dogName} lost the scent as the breeze shifted.`, 'info');
    startHunt(dog, dog.pos, 3);
    return;
  }
  if (d < 0.8) setMode(dog, 'pickup');
}

function pickUp(s: RetrieveSession): void {
  const { dog } = s;
  const item = dog.scentItem !== null ? s.items[dog.scentItem] : undefined;
  if (!item || item.state !== 'lying') {
    startHunt(dog, dog.pos, 3);
    return;
  }
  item.state = 'carried';
  dog.carrying = item.id;
  const outstandingBlind = s.items.some((i) => i.kind === 'blind' && i.state === 'lying');
  if (item.kind !== 'blind' && dog.goalItem === null && outstandingBlind && item.kind === 'mark') {
    s.stats.wrongItem = true;
    log(s, `${s.dogName} picked up the old mark instead of the blind.`, 'warn');
  }
  setMode(dog, 'return');
}

function returnToKeeper(s: RetrieveSession, dt: number): void {
  const { dog, params, field, keeper } = s;
  const speed = dog.carrying !== null ? params.gallop * 0.85 : params.gallop * 0.75;
  const arrived = steerToward(dog, params, field, keeper.pos, speed, dt, 1.4);

  if (
    dog.carrying !== null &&
    !dog.droppedOnce &&
    params.softMouth < 0.38 &&
    distance(dog.pos, keeper.pos) < 20 &&
    distance(dog.pos, keeper.pos) > 8
  ) {
    const item = s.items[dog.carrying]!;
    item.state = 'lying';
    item.y = 0;
    dog.scentItem = item.id;
    dog.carrying = null;
    dog.droppedOnce = true;
    s.stats.drops++;
    log(s, `${s.dogName} dropped the dummy to shake it, then picked it back up.`, 'info');
    setMode(dog, 'pickup');
    return;
  }
  if (arrived) setMode(dog, dog.carrying !== null ? 'deliver' : 'sit');
}

function deliver(s: RetrieveSession): void {
  const { dog } = s;
  if (dog.carrying !== null) {
    const item = s.items[dog.carrying]!;
    item.state = 'delivered';
    item.pos = { ...s.keeper.pos };
    item.y = 1;
    dog.carrying = null;
    s.stats.delivered++;
    if (item.kind !== 'ball') log(s, `${s.dogName} delivered to hand.`, 'good');
  }
  setMode(dog, 'sit');
  dog.goalItem = null;

  const remaining = s.items.some((i) => i.kind !== 'ball' && i.state !== 'delivered');
  if (!s.setup.free && !remaining) {
    s.phase = 'complete';
    s.stats.finishedAt = s.time;
  }
}

function recordTrace(s: RetrieveSession, dt: number): void {
  if (s.phase === 'complete' || s.stats.startedAt === null) return;
  s.traceTimer += dt;
  if (s.traceTimer >= 0.25) {
    s.traceTimer = 0;
    s.stats.trace.push({ ...s.dog.pos });
    if (s.stats.trace.length > 2400) s.stats.trace.shift();
  }
}

function updateTell(s: RetrieveSession): void {
  const { dog } = s;
  const pressure = dog.breakPressure;
  if (dog.stopDelay > 0) return;
  if (dog.detour) {
    dog.tell = {
      ears: 'back',
      tail: 'low',
      noseDown: false,
      text: 'Veering along the bank, avoiding the water',
    };
    return;
  }
  if (dog.balk > 0) {
    dog.tell = {
      ears: 'flick',
      tail: 'low',
      noseDown: false,
      text: "Hesitating at the water's edge",
    };
    return;
  }
  if (dog.swimming && dog.mode !== 'stopped' && dog.mode !== 'popped') {
    dog.tell = {
      ears: 'back',
      tail: 'neutral',
      noseDown: false,
      text: dog.carrying !== null ? 'Swimming back with it' : 'Swimming out',
    };
    return;
  }
  switch (dog.mode) {
    case 'sit':
    case 'heel':
      if (pressure > 0.55) {
        dog.tell = {
          ears: 'forward',
          tail: 'high',
          noseDown: false,
          text: 'Quivering, itching to go…',
        };
        dog.pose = pressure > 0.75 ? 'crouch' : dog.pose;
      } else if (dog.lookAt) {
        dog.tell = { ears: 'forward', tail: 'wag', noseDown: false, text: 'Watching the fall' };
      } else {
        dog.tell = {
          ears: 'neutral',
          tail: 'wag',
          noseDown: false,
          text: dog.mode === 'sit' ? 'Sitting beside you' : 'Walking with you',
        };
      }
      break;
    case 'run':
      dog.tell = {
        ears: 'back',
        tail: 'neutral',
        noseDown: false,
        text: s.setup.free ? 'Chasing the ball' : 'Running out to the mark',
      };
      break;
    case 'line':
      dog.tell = {
        ears: 'back',
        tail: 'neutral',
        noseDown: false,
        text: 'Running out on your line',
      };
      break;
    case 'hunt':
      dog.tell = {
        ears: 'neutral',
        tail: dog.huntTime > s.params.huntPatience * 0.7 ? 'low' : 'wag',
        noseDown: true,
        text:
          dog.huntTime > s.params.huntPatience * 0.7 ? 'Hunting, losing heart' : 'Hunting the area',
      };
      break;
    case 'scent':
      dog.tell = {
        ears: 'forward',
        tail: 'high',
        noseDown: true,
        text: 'On the scent! Working into the wind',
      };
      break;
    case 'pickup':
      dog.tell = { ears: 'forward', tail: 'wag', noseDown: true, text: 'Got it!' };
      break;
    case 'return':
    case 'deliver':
      dog.tell = {
        ears: 'neutral',
        tail: 'wag',
        noseDown: false,
        text: dog.carrying !== null ? 'Bringing it back' : 'Coming back to you',
      };
      break;
    case 'stopped':
      dog.tell = {
        ears: 'forward',
        tail: 'neutral',
        noseDown: false,
        text: 'Sitting on the whistle, waiting for direction',
      };
      break;
    case 'popped':
      dog.tell = { ears: 'neutral', tail: 'low', noseDown: false, text: 'Looking to you for help' };
      break;
  }
}

export function wantedItemsRemaining(s: RetrieveSession): number {
  return s.items.filter((i) => i.kind !== 'ball' && i.state !== 'delivered').length;
}
