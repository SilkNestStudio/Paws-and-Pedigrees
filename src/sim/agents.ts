import { clamp, distance, fromHeading, headingOf, sub, turnToward, type Vec2 } from '../core/math';
import type { DogParams } from './dogParams';
import { clampToField, coverAt, resolveTrees, type Field } from './field';

/** What the dog is doing. Each mode has its own behaviour in the session step. */
export type DogMode =
  | 'heel' // walking beside the keeper
  | 'sit' // sitting at the keeper's side, waiting
  | 'run' // running to a remembered fall
  | 'line' // holding a line the keeper sent it on
  | 'hunt' // quartering an area looking for something
  | 'scent' // working a scent cone up to its source
  | 'pickup'
  | 'return'
  | 'deliver'
  | 'stopped' // sat on the stop whistle, waiting for direction
  | 'popped'; // stopped on its own to look to the keeper for help

export type Pose = 'stand' | 'sit' | 'down' | 'crouch';

/**
 * Body language the renderer animates and the interface describes. Dogs show
 * what they are about to do before they do it, so the player can react.
 */
export interface Tell {
  ears: 'forward' | 'neutral' | 'back' | 'flick';
  tail: 'high' | 'wag' | 'low' | 'neutral';
  noseDown: boolean;
  /** Short plain-language read of the dog, shown in the HUD. */
  text: string;
}

export interface DogAgent {
  pos: Vec2;
  heading: number;
  speed: number;
  mode: DogMode;
  modeTime: number;
  pose: Pose;
  /** Where the dog is looking, if somewhere specific. */
  lookAt: Vec2 | null;
  target: Vec2 | null;
  goalItem: number | null;
  lineHeading: number;
  carryLeft: number;
  huntCenter: Vec2;
  huntRadius: number;
  huntTime: number;
  huntLeg: number;
  /** How many times the dog has stopped to ask for help during this hunt. */
  huntPops: number;
  scentItem: number | null;
  scentLost: number;
  carrying: number | null;
  stamina: number;
  breakPressure: number;
  steadyBoost: number;
  /** Extra pull from a whistle the dog half-heard; fades quickly. */
  whistlePressure: number;
  /** Pending stop after a whistle, counts down while the dog brakes. */
  stopDelay: number;
  droppedOnce: boolean;
  tell: Tell;
}

export interface KeeperAgent {
  pos: Vec2;
  heading: number;
  speed: number;
  input: Vec2;
  running: boolean;
  /** Visible action for animation: a whistle, an arm signal, a throw. */
  action:
    | 'none'
    | 'whistle'
    | 'castLeft'
    | 'castRight'
    | 'castBack'
    | 'send'
    | 'call'
    | 'throw'
    | 'steady'
    | 'mark';
  actionTime: number;
  /** Heading of the last arm signal, for the renderer. */
  signalHeading: number;
  stillTime: number;
}

export function createDog(pos: Vec2, params: DogParams): DogAgent {
  return {
    pos: { ...pos },
    heading: Math.PI,
    speed: 0,
    mode: 'sit',
    modeTime: 0,
    pose: 'sit',
    lookAt: null,
    target: null,
    goalItem: null,
    lineHeading: Math.PI,
    carryLeft: 0,
    huntCenter: { ...pos },
    huntRadius: 3,
    huntTime: 0,
    huntLeg: 0,
    huntPops: 0,
    scentItem: null,
    scentLost: 0,
    carrying: null,
    stamina: params.staminaMax,
    breakPressure: 0,
    steadyBoost: 0,
    whistlePressure: 0,
    stopDelay: 0,
    droppedOnce: false,
    tell: { ears: 'neutral', tail: 'wag', noseDown: false, text: 'Sitting beside you' },
  };
}

export function createKeeper(pos: Vec2): KeeperAgent {
  return {
    pos: { ...pos },
    heading: Math.PI,
    speed: 0,
    input: { x: 0, z: 0 },
    running: false,
    action: 'none',
    actionTime: 0,
    signalHeading: Math.PI,
    stillTime: 0,
  };
}

export function setMode(dog: DogAgent, mode: DogMode): void {
  if (dog.mode !== mode) {
    dog.mode = mode;
    dog.modeTime = 0;
  }
}

const KEEPER_WALK = 2.7;
const KEEPER_RUN = 5;

export function stepKeeper(keeper: KeeperAgent, field: Field, dt: number): void {
  const len = Math.hypot(keeper.input.x, keeper.input.z);
  const target = len > 0.05 ? (keeper.running ? KEEPER_RUN : KEEPER_WALK) * Math.min(1, len) : 0;
  keeper.speed += clamp(target - keeper.speed, -14 * dt, 10 * dt);
  if (len > 0.05) {
    keeper.heading = turnToward(keeper.heading, headingOf(keeper.input), 9 * dt);
    keeper.stillTime = 0;
  } else {
    keeper.stillTime += dt;
  }
  const move = fromHeading(keeper.heading, keeper.speed * dt);
  keeper.pos = clampToField(
    field,
    resolveTrees(field, { x: keeper.pos.x + move.x, z: keeper.pos.z + move.z }, 0.4),
  );
  if (keeper.action !== 'none') {
    keeper.actionTime += dt;
    if (keeper.actionTime > 1.1) keeper.action = 'none';
  }
}

export function keeperAct(
  keeper: KeeperAgent,
  action: KeeperAgent['action'],
  heading?: number,
): void {
  keeper.action = action;
  keeper.actionTime = 0;
  if (heading !== undefined) keeper.signalHeading = heading;
}

/**
 * Moves the dog toward a desired heading and speed using its own turning,
 * acceleration, stamina and cover handling.
 */
export function steerDog(
  dog: DogAgent,
  params: DogParams,
  field: Field,
  desiredHeading: number,
  desiredSpeed: number,
  dt: number,
): void {
  const tired = dog.stamina < params.staminaMax * 0.2;
  const cover = coverAt(field, dog.pos);
  const coverSlow = 1 - cover * 0.45 * (1 - params.confidence * 0.5);
  const cap = params.gallop * (tired ? 0.75 : 1) * coverSlow;
  const wanted = Math.min(desiredSpeed, cap);

  dog.speed += clamp(wanted - dog.speed, -params.accel * 1.6 * dt, params.accel * dt);
  dog.speed = Math.max(0, dog.speed);

  const slowness = 1 - Math.min(1, dog.speed / params.gallop);
  const turn = params.turnRate * (1 + 2.2 * slowness) * dt;
  dog.heading = turnToward(dog.heading, desiredHeading, turn);

  const step = fromHeading(dog.heading, dog.speed * dt);
  const next = { x: dog.pos.x + step.x, z: dog.pos.z + step.z };
  dog.pos = clampToField(field, resolveTrees(field, next, 0.35));

  if (dog.speed > params.trot * 1.15) dog.stamina = Math.max(0, dog.stamina - dt);
  else dog.stamina = Math.min(params.staminaMax, dog.stamina + dt * 0.6);
}

export function steerToward(
  dog: DogAgent,
  params: DogParams,
  field: Field,
  target: Vec2,
  desiredSpeed: number,
  dt: number,
  arriveRadius = 1.5,
): boolean {
  const d = distance(dog.pos, target);
  const speed = d < arriveRadius * 2 ? Math.min(desiredSpeed, 1 + d * 1.2) : desiredSpeed;
  steerDog(dog, params, field, headingOf(sub(target, dog.pos)), speed, dt);
  return d <= arriveRadius;
}

export function brake(dog: DogAgent, params: DogParams, dt: number): void {
  dog.speed = Math.max(0, dog.speed - params.accel * 2 * dt);
  const step = fromHeading(dog.heading, dog.speed * dt);
  dog.pos = { x: dog.pos.x + step.x, z: dog.pos.z + step.z };
  dog.stamina = Math.min(params.staminaMax, dog.stamina + dt * 0.8);
}
