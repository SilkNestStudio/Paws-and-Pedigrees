import { add, clamp01, distance, headingOf, sub, type Vec2 } from '../core/math';
import { createRng, gaussian, random, weighted, type Rng } from '../core/rng';
import { aptitude, type Dog } from '../core/dog/dog';
import {
  brake,
  createDog,
  createKeeper,
  steerToward,
  type DogAgent,
  type KeeperAgent,
  keeperAct,
} from './agents';
import { dogParams, type DogParams } from './dogParams';
import { createTrainingField, type Field } from './field';

/**
 * Marker training. The dog offers responses; the player decides which ones to
 * reward and must mark ("Yes!") at the right moment. Good timing on the right
 * response teaches quickly. Late marks, rewarding the wrong thing, or letting
 * the dog reward itself all teach something else.
 *
 * This is deliberately a different game from the field work that uses these
 * skills: here you judge and time; out there you handle.
 */
export type Lesson = 'sit' | 'stay' | 'stop' | 'cast' | 'indicate';

/** Extra choice some cues take: which pile to point at, or how big a throw to make. */
export type CueChoice = 'left' | 'right' | 'back' | 'gentle' | 'full';

export interface ResponseDef {
  id: string;
  label: string;
  /** How close this is to the finished behaviour, 0-1. */
  quality: number;
}

export interface ActiveResponse {
  def: ResponseDef;
  onset: number;
  /** The moment worth marking (for a sit: when the rump touches the ground). */
  completeAt: number;
  /** When the dog gives up the position on its own. */
  releaseAt: number;
  marked: boolean;
  /** Direction (cast lesson) or other response-specific target. */
  target: Vec2 | null;
}

export type Verdict = 'perfect' | 'early' | 'late' | 'wrong' | 'sloppy' | 'shaping' | 'nothing';

export interface MarkResult {
  verdict: Verdict;
  /** Seconds between the mark and the ideal moment (negative = early). */
  offset: number;
  change: number;
}

export interface Feedback {
  text: string;
  tone: 'good' | 'info' | 'warn';
  time: number;
}

export interface LessonScene {
  /** Lesson-specific objects for the renderer. */
  ball: { pos: Vec2; y: number; visible: boolean };
  piles: { id: 'left' | 'right' | 'back'; pos: Vec2 }[];
  /** Scent boxes for the indicate lesson; `hot` holds the scent this time. */
  boxes: { pos: Vec2; hot: boolean }[];
  mound: Vec2 | null;
}

export interface TrainingSession {
  lesson: Lesson;
  time: number;
  rng: Rng;
  field: Field;
  dogName: string;
  pronoun: 'he' | 'she';
  params: DogParams;
  skillBefore: number;
  skill: number;
  learnRate: number;
  dog: DogAgent;
  keeper: KeeperAgent;
  /** idle: waiting for your cue. responding: dog reacting. resetting: walking back for the next go. */
  phase: 'idle' | 'waiting' | 'responding' | 'resetting' | 'done';
  pendingResponse: { at: number; def: ResponseDef; target: Vec2 | null } | null;
  current: ActiveResponse | null;
  treats: number;
  interest: number;
  reps: number;
  cueCount: number;
  results: MarkResult[];
  feedback: Feedback | null;
  scene: LessonScene;
  /** Ball flight for stay and stop lessons. */
  ballVel: { x: number; y: number; z: number } | null;
  ballLandsAt: number;
  /** The dog's Drive aptitude; keen dogs find staying put harder. */
  drive: number;
  resetAt: number;
  homePos: Vec2;
  /** Seconds the keeper's "perfect" window lasts after the ideal moment. */
  window: number;
  lastCast: 'left' | 'right' | 'back' | null;
  lastThrowGentle: boolean;
  /** Route through the scent boxes for the current indicate attempt. */
  path: Vec2[];
}

export const LESSONS: Record<
  Lesson,
  { title: string; summary: string; how: string; cueLabel: string }
> = {
  sit: {
    title: 'Sit on cue',
    summary: 'The basics of marker training, up close.',
    how: 'Say "Sit", watch, and press Yes! the instant the sit is finished. Only reward the sit.',
    cueLabel: 'Sit',
  },
  stay: {
    title: 'Steady to the throw',
    summary: 'Teach your dog to stay sitting while something is thrown.',
    how: 'Throw, then press Yes! as the dummy lands if your dog is still sitting. If it starts creeping, say "Sit" quickly. Start with gentle tosses; build up to big throws.',
    cueLabel: 'Throw',
  },
  stop: {
    title: 'Stop whistle',
    summary: 'One blast means stop and sit, even at full speed.',
    how: 'Throw the ball, blow the whistle while your dog runs, and press Yes! the moment it stops. Early on, reward a glance back; later, only a full stop.',
    cueLabel: 'Whistle',
  },
  cast: {
    title: 'Directions drill',
    summary: 'Left, right and back from a sitting dog, using three piles.',
    how: 'Point to a pile. Press Yes! the moment your dog commits to the right one. Never reward the wrong pile.',
    cueLabel: 'Point',
  },
  indicate: {
    title: 'Search and indicate',
    summary: 'Four scent boxes, one holding the scent. Teach a clear sit at the find.',
    how: 'Press "Find it". Your dog checks the boxes. Press Yes! the moment it sits at the box with the orange tag. Never reward a sit at an empty box.',
    cueLabel: 'Find it',
  },
};

const INDICATE_RESPONSES: Record<string, ResponseDef> = {
  correct: { id: 'correct', label: 'Sits at the right box', quality: 1 },
  linger: { id: 'linger', label: "Sniffs the right box but doesn't sit", quality: 0.4 },
  false: { id: 'false', label: 'Sits at an empty box', quality: 0 },
};

const SIT_RESPONSES: Record<string, ResponseDef> = {
  sit: { id: 'sit', label: 'Sits neatly', quality: 1 },
  slowSit: { id: 'slowSit', label: 'Hesitates, then sits', quality: 0.7 },
  down: { id: 'down', label: 'Lies down instead', quality: 0.15 },
  spin: { id: 'spin', label: 'Spins round, hoping', quality: 0.05 },
  look: { id: 'look', label: 'Stands looking at you', quality: 0.25 },
  wander: { id: 'wander', label: 'Wanders off to sniff', quality: 0 },
};

const STAY_RESPONSES: Record<string, ResponseDef> = {
  hold: { id: 'hold', label: 'Holds the sit', quality: 1 },
  creep: { id: 'creep', label: 'Creeps forward', quality: 0.4 },
  break: { id: 'break', label: 'Breaks and chases', quality: 0 },
};

const STOP_RESPONSES: Record<string, ResponseDef> = {
  stopSit: { id: 'stopSit', label: 'Stops and sits', quality: 1 },
  stopStand: { id: 'stopStand', label: 'Stops standing', quality: 0.6 },
  glance: { id: 'glance', label: 'Glances back', quality: 0.3 },
  ignore: { id: 'ignore', label: 'Ignores the whistle', quality: 0 },
};

const CAST_RESPONSES: Record<string, ResponseDef> = {
  correct: { id: 'correct', label: 'Takes the right direction', quality: 1 },
  wrong: { id: 'wrong', label: 'Goes to the wrong pile', quality: 0 },
  stay: { id: 'stay', label: 'Stays put, unsure', quality: 0.1 },
};

const HOME: Vec2 = { x: 0, z: 10 };

/** Skill gained by one perfectly timed reward of the finished behaviour, before diminishing returns. */
export const LEARNING_SPEED = 0.045;

export function createTrainingSession(
  dog: Dog,
  lesson: Lesson,
  seed: number,
  keeperLevel = 1,
): TrainingSession {
  const rng = createRng(seed);
  const field = createTrainingField();
  const params = dogParams(dog);
  const keeper = createKeeper(HOME);
  keeper.heading = Math.PI;
  const dogStart =
    lesson === 'sit'
      ? add(HOME, { x: 0, z: -1.6 })
      : lesson === 'indicate'
        ? add(HOME, { x: 0, z: -3 })
        : lesson === 'cast'
          ? { x: 0, z: -6 }
          : add(HOME, { x: -0.9, z: 0.1 });
  const agent = createDog(dogStart, params);
  agent.heading = lesson === 'sit' || lesson === 'cast' ? 0 : Math.PI;
  agent.pose = lesson === 'sit' ? 'stand' : 'sit';

  const focus = aptitude(dog, 'focus');
  const drive = aptitude(dog, 'drive');
  const bondFactor = 0.85 + params.bond * 0.3;
  const lessonFactor = lesson === 'stay' ? 0.8 + (focus + (100 - drive)) / 400 : 1;

  return {
    lesson,
    time: 0,
    rng,
    field,
    dogName: dog.name,
    pronoun: dog.sex === 'female' ? 'she' : 'he',
    params,
    skillBefore: dog.skills[lesson],
    skill: dog.skills[lesson],
    learnRate: params.learning * bondFactor * lessonFactor,
    dog: agent,
    keeper,
    phase: 'idle',
    pendingResponse: null,
    current: null,
    treats: 15,
    interest: 1,
    reps: 0,
    cueCount: 0,
    results: [],
    feedback: null,
    scene: {
      ball: { pos: { ...HOME }, y: 1, visible: false },
      piles:
        lesson === 'cast'
          ? [
              { id: 'left', pos: { x: -12, z: -6 } },
              { id: 'right', pos: { x: 12, z: -6 } },
              { id: 'back', pos: { x: 0, z: -19 } },
            ]
          : [],
      mound: lesson === 'cast' ? { x: 0, z: -6 } : null,
      boxes:
        lesson === 'indicate' ? [-6, -2, 2, 6].map((x) => ({ pos: { x, z: 1 }, hot: false })) : [],
    },
    ballVel: null,
    ballLandsAt: 0,
    drive,
    resetAt: 0,
    homePos: { ...dogStart },
    window: 0.4 + (keeperLevel - 1) * 0.05,
    lastCast: null,
    lastThrowGentle: false,
    path: [],
  };
}

function say(t: TrainingSession, text: string, tone: Feedback['tone'] = 'info'): void {
  t.feedback = { text, tone, time: t.time };
}

/** Learning slows as a skill approaches mastery. */
const headroom = (skill: number) => Math.pow(1 - skill, 0.8);

// ---------------------------------------------------------------------------
// Player inputs
// ---------------------------------------------------------------------------

/**
 * The lesson's cue: "Sit", a throw, a whistle, or pointing at a pile.
 * Repeating a cue while the dog is already responding (nagging) wears it out.
 */
export function giveCue(t: TrainingSession, choice?: CueChoice): void {
  if (t.phase === 'done' || t.phase === 'resetting') return;
  if (t.phase === 'responding' || t.phase === 'waiting') {
    if (t.lesson === 'stay' && t.current?.def.id === 'creep') {
      // A quick "Sit" settles a creeping dog back into a hold.
      keeperAct(t.keeper, 'steady');
      t.current.def = STAY_RESPONSES.hold!;
      say(t, `Good catch — "Sit" settled ${t.dogName} before ${t.pronoun} went.`, 'good');
      return;
    }
    if (t.lesson === 'stop' && t.phase === 'waiting' && t.current === null && !t.pendingResponse) {
      whistleDuringRun(t);
      return;
    }
    t.skill = Math.max(0, t.skill - 0.004);
    say(
      t,
      `Saying it again while ${t.dogName} is busy just teaches ${t.pronoun} to ignore it.`,
      'warn',
    );
    return;
  }

  t.cueCount++;
  t.reps++;
  switch (t.lesson) {
    case 'sit':
      cueSit(t);
      break;
    case 'stay':
      throwForStay(t, choice === 'gentle');
      break;
    case 'stop':
      throwForStop(t);
      break;
    case 'cast':
      cueCast(t, choice === 'left' || choice === 'right' ? choice : 'back');
      break;
    case 'indicate':
      cueFind(t);
      break;
  }
}

function responseRoll(t: TrainingSession, difficulty = 0): number {
  return t.skill + t.params.biddability * 0.12 - difficulty + gaussian(t.rng) * 0.15;
}

function cueSit(t: TrainingSession): void {
  keeperAct(t.keeper, 'call');
  const roll = responseRoll(t);
  let def: ResponseDef;
  if (roll > 0.55) def = SIT_RESPONSES.sit!;
  else if (roll > 0.38) def = SIT_RESPONSES.slowSit!;
  else {
    const wanderWeight = (100 - t.params.skills.sit * 100) / 100 + (1 - t.params.bond) * 0.5;
    const pickId = weighted(t.rng, { down: 1.2, spin: 0.8, look: 1.5, wander: wanderWeight });
    def = SIT_RESPONSES[pickId]!;
  }
  const latency = 0.35 + (1 - t.skill) * 0.6 + random(t.rng) * 0.3;
  t.pendingResponse = { at: t.time + latency, def, target: null };
  t.phase = 'waiting';
}

/** A gentle toss lands close and low, so it is far easier to sit through. */
function throwForStay(t: TrainingSession, gentle: boolean): void {
  keeperAct(t.keeper, 'throw', Math.PI);
  t.lastThrowGentle = gentle;
  launchBall(t, add(HOME, gentle ? { x: 1.5, z: -4 } : { x: 4, z: -18 }), gentle ? 0.8 : 1.3);
  const roll = responseRoll(t, (t.drive - 50) / 250 - (gentle ? 0.3 : 0));
  const def =
    roll > 0.5 ? STAY_RESPONSES.hold! : roll > 0.22 ? STAY_RESPONSES.creep! : STAY_RESPONSES.break!;
  // Creeping and breaking start partway through the flight; holding is judged on landing.
  t.pendingResponse = {
    at: t.time + (def.id === 'hold' ? 0.05 : 0.35 + random(t.rng) * 0.3),
    def,
    target: null,
  };
  t.phase = 'waiting';
}

function throwForStop(t: TrainingSession): void {
  keeperAct(t.keeper, 'throw', Math.PI);
  const landing = add(HOME, { x: (random(t.rng) - 0.5) * 8, z: -26 });
  launchBall(t, landing, 1.2);
  t.dog.target = landing;
  t.dog.mode = 'run';
  t.dog.pose = 'stand';
  t.phase = 'waiting';
  t.current = null;
}

function whistleDuringRun(t: TrainingSession): void {
  keeperAct(t.keeper, 'whistle');
  const toBall = t.dog.target ? distance(t.dog.pos, t.dog.target) : 10;
  // Closer to the ball = more excited = harder to stop.
  const excitement = clamp01(1 - toBall / 25);
  const roll = responseRoll(t, excitement * 0.35);
  // Even an untrained dog usually glances back at a whistle: that is the first
  // thing to reward. Real stops come as the skill builds.
  const def =
    roll > 0.55
      ? STOP_RESPONSES.stopSit!
      : roll > 0.3
        ? STOP_RESPONSES.stopStand!
        : roll > -0.12
          ? STOP_RESPONSES.glance!
          : STOP_RESPONSES.ignore!;
  t.pendingResponse = { at: t.time + 0.15 + (1 - t.skill) * 0.35, def, target: null };
}

/**
 * "Find it!" A box is chosen to hold the scent (the player can see which).
 * The dog works along the boxes and sits at the one it believes is right.
 */
function cueFind(t: TrainingSession): void {
  keeperAct(t.keeper, 'send', Math.PI);
  const boxes = t.scene.boxes;
  const hot = Math.floor(random(t.rng) * boxes.length);
  boxes.forEach((b, i) => (b.hot = i === hot));
  const roll = responseRoll(t) + t.params.scentThreshold * -0.4 + 0.1;
  const def =
    roll > 0.45
      ? INDICATE_RESPONSES.correct!
      : roll > 0.2
        ? INDICATE_RESPONSES.linger!
        : INDICATE_RESPONSES.false!;
  const empty = boxes.map((_, i) => i).filter((i) => i !== hot);
  const stopAt = def.id === 'false' ? empty[Math.floor(random(t.rng) * empty.length)]! : hot;
  // Work along the row from the nearer end until reaching the chosen box.
  const leftToRight = random(t.rng) < 0.5;
  const order = boxes.map((_, i) => i);
  if (!leftToRight) order.reverse();
  const visit = order.slice(0, order.indexOf(stopAt) + 1);
  t.path = visit.map((i) => ({ x: boxes[i]!.pos.x, z: boxes[i]!.pos.z + 0.9 }));
  t.pendingResponse = { at: t.time + 0.3, def, target: t.path[t.path.length - 1]! };
  t.phase = 'waiting';
}

function cueCast(t: TrainingSession, pile: 'left' | 'right' | 'back'): void {
  const target = t.scene.piles.find((p) => p.id === pile)!.pos;
  keeperAct(
    t.keeper,
    pile === 'back' ? 'castBack' : pile === 'left' ? 'castRight' : 'castLeft',
    headingOf(sub(target, t.keeper.pos)),
  );
  const roll = responseRoll(t) + 0.12;
  let def: ResponseDef;
  let goTo: Vec2 | null = target;
  if (roll > 0.42) def = CAST_RESPONSES.correct!;
  else if (roll > 0.12) {
    def = CAST_RESPONSES.wrong!;
    // Dogs tend to repeat the last direction they were sent.
    const others = t.scene.piles.filter((p) => p.id !== pile);
    const habit = others.find((p) => p.id === t.lastCast);
    goTo = (habit ?? others[Math.floor(random(t.rng) * others.length)]!).pos;
  } else {
    def = CAST_RESPONSES.stay!;
    goTo = null;
  }
  t.lastCast = pile;
  t.pendingResponse = { at: t.time + 0.3 + (1 - t.skill) * 0.4, def, target: goTo };
  t.phase = 'waiting';
}

function launchBall(t: TrainingSession, to: Vec2, height: number): void {
  const from = add(t.keeper.pos, { x: 0.4, z: -0.3 });
  const time = 0.9 + distance(from, to) * 0.025;
  t.scene.ball = { pos: from, y: height, visible: true };
  t.ballLandsAt = t.time + time;
  t.ballVel = {
    x: (to.x - from.x) / time,
    z: (to.z - from.z) / time,
    y: (-height + 0.5 * 14 * time * time) / time,
  };
}

/** "Yes!" The marker. Its timing and what it rewards decide what the dog learns. */
export function mark(t: TrainingSession): MarkResult | null {
  if (t.phase === 'done') return null;
  keeperAct(t.keeper, 'mark');
  const r = t.current;
  if (!r || r.marked) {
    t.skill = Math.max(0, t.skill - 0.003);
    say(t, 'Nothing worth rewarding just then. Random marks blur what "Yes!" means.', 'warn');
    const result: MarkResult = { verdict: 'nothing', offset: 0, change: -0.003 };
    t.results.push(result);
    return result;
  }
  r.marked = true;
  const offset = t.time - r.completeAt;
  const released = t.time > r.releaseAt;
  const name = t.dogName;
  let verdict: Verdict;
  let change = 0;

  if (released || r.def.quality === 0) {
    verdict = 'wrong';
    change = -0.02;
    say(
      t,
      released
        ? `Too late — ${name} had already moved. That rewarded getting up.`
        : `That rewarded "${r.def.label.toLowerCase()}". Wait for the right response.`,
      'warn',
    );
  } else {
    let timing: number;
    if (offset < -0.35) timing = 0.35;
    else if (offset < 0) timing = 0.85;
    else if (offset <= t.window) timing = 1;
    // Past the window the lesson fades fast: by a second late it barely teaches anything.
    else timing = Math.exp(-(offset - t.window) / 0.3);

    const level = t.skill;
    if (r.def.quality >= level - 0.05) {
      change =
        LEARNING_SPEED * t.learnRate * timing * (0.35 + r.def.quality * 0.65) * headroom(level);
      // Easy versions build the habit but cap out: a gentle toss can't prove steadiness to a big throw.
      if (t.lesson === 'stay' && t.lastThrowGentle && level > 0.55) change *= 0.25;
      if (r.def.quality < 0.9) {
        verdict = 'shaping';
        say(
          t,
          `Good shaping — rewarding "${r.def.label.toLowerCase()}" tells ${name} ${t.pronoun}'s on the right track.`,
          'good',
        );
      } else if (timing < 0.35) {
        verdict = 'late';
        say(
          t,
          `Too late to mean much (${formatOffset(offset)}). ${name} has lost track of what earned it.`,
          'warn',
        );
      } else if (timing >= 1) {
        verdict = 'perfect';
        say(t, `Spot on! (${formatOffset(offset)})`, 'good');
      } else if (offset < 0) {
        verdict = 'early';
        say(
          t,
          `A touch early (${formatOffset(offset)}). Mark when the movement is finished.`,
          'info',
        );
      } else {
        verdict = 'late';
        say(
          t,
          `A bit late (${formatOffset(offset)}). The sooner the "Yes!", the clearer the lesson.`,
          'info',
        );
      }
    } else {
      verdict = 'sloppy';
      change = -0.025 * (level - r.def.quality);
      say(
        t,
        `${name} can do better than "${r.def.label.toLowerCase()}" now. Hold out for the real thing.`,
        'warn',
      );
    }
  }

  t.skill = clamp01(t.skill + change);
  t.interest = clamp01(t.interest + (change > 0 ? 0.03 : -0.04));
  t.treats = Math.max(0, t.treats - 1);
  const result: MarkResult = { verdict, offset, change };
  t.results.push(result);
  beginReset(t, 1.1);
  return result;
}

const formatOffset = (offset: number) => `${offset >= 0 ? '+' : ''}${offset.toFixed(2)}s`;

function beginReset(t: TrainingSession, delay: number): void {
  t.phase = 'resetting';
  t.resetAt = t.time + delay;
}

// ---------------------------------------------------------------------------
// Simulation step
// ---------------------------------------------------------------------------

export function stepTraining(t: TrainingSession, dt: number): void {
  if (t.phase === 'done') return;
  t.time += dt;
  t.dog.modeTime += dt;
  if (t.keeper.action !== 'none') {
    t.keeper.actionTime += dt;
    if (t.keeper.actionTime > 1.1) t.keeper.action = 'none';
  }
  stepBall(t, dt);

  if (t.pendingResponse && t.time >= t.pendingResponse.at) {
    startResponse(t, t.pendingResponse.def, t.pendingResponse.target);
    t.pendingResponse = null;
  }

  switch (t.lesson) {
    case 'sit':
      animateSit(t, dt);
      break;
    case 'stay':
      animateStay(t, dt);
      break;
    case 'stop':
      animateStop(t, dt);
      break;
    case 'cast':
      animateCast(t, dt);
      break;
    case 'indicate':
      animateIndicate(t);
      break;
  }

  // An unmarked response ends on its own; self-rewards cost a little.
  if (
    t.current &&
    !t.current.marked &&
    t.phase === 'responding' &&
    t.time > t.current.releaseAt + 0.6
  ) {
    if (t.current.def.id === 'break' || t.current.def.id === 'ignore') {
      t.skill = Math.max(0, t.skill - 0.01);
      say(
        t,
        `${t.dogName} got the reward without you. Make it easier next time so ${t.pronoun} can succeed.`,
        'warn',
      );
    } else if (t.current.def.quality >= 0.9) {
      say(t, `That was a good one — and it went unrewarded.`, 'info');
    }
    t.interest = clamp01(t.interest - 0.03);
    beginReset(t, 0.6);
  }

  if (t.phase === 'resetting' && t.time >= t.resetAt) finishReset(t, dt);

  if ((t.treats === 0 || t.interest < 0.25) && t.phase === 'idle') {
    t.phase = 'done';
    say(
      t,
      t.treats === 0 ? 'Out of treats. Good session!' : `${t.dogName} has had enough for now.`,
      'info',
    );
  }
}

function startResponse(t: TrainingSession, def: ResponseDef, target: Vec2 | null): void {
  const hold = 1.1 + t.skill * 1.4 + t.params.steadiness * 0.6;
  let complete = 0.45;
  if (def.id === 'slowSit') complete = 1.35;
  if (def.id === 'down') complete = 0.6;
  if (def.id === 'spin') complete = 0.9;
  if (def.id === 'look' || def.id === 'wander') complete = 0.3;
  t.phase = 'responding';
  t.current = {
    def,
    onset: t.time,
    completeAt: t.time + complete,
    releaseAt: t.time + complete + hold,
    marked: false,
    target,
  };
  t.dog.modeTime = 0;

  if (t.lesson === 'stay' && def.id === 'hold') {
    // Holding is worth marking when the dummy lands, while the dog is still sitting.
    t.current.completeAt = Math.max(t.time + 0.3, t.ballLandsAt);
    t.current.releaseAt = t.current.completeAt + hold;
  }
  if (t.lesson === 'stop') {
    // "Finished" is what the player sees: braked to a stop, or settled into the sit.
    const brakeTime = t.dog.speed / (t.params.accel * 2);
    const toSitPose = Math.max(0, t.dog.speed - 0.5) / (t.params.accel * 2);
    t.current.completeAt =
      t.time +
      (def.id === 'glance'
        ? 0.3
        : def.id === 'ignore'
          ? 0.2
          : def.id === 'stopSit'
            ? toSitPose + 0.25
            : brakeTime + 0.1);
    t.current.releaseAt = t.current.completeAt + (def.id === 'glance' ? 0.7 : hold);
  }
  if (t.lesson === 'cast') {
    t.current.completeAt = t.time + (def.id === 'stay' ? 1.2 : 0.75);
    t.current.releaseAt = t.current.completeAt + 1.4;
  }
  if (t.lesson === 'indicate') {
    const travel = pathTime(t.dog.pos, t.path);
    t.current.completeAt = t.time + travel + (def.id === 'linger' ? 0.3 : 0.45);
    t.current.releaseAt = t.current.completeAt + (def.id === 'linger' ? 1.2 : hold);
  }
}

const SNIFF_SPEED = 1.8;
const SNIFF_PAUSE = 0.6;

/** Seconds to walk the box route, pausing to sniff at each box before the last. */
function pathTime(from: Vec2, path: Vec2[]): number {
  let total = 0;
  let at = from;
  path.forEach((p, i) => {
    total += distance(at, p) / SNIFF_SPEED + (i < path.length - 1 ? SNIFF_PAUSE : 0);
    at = p;
  });
  return total;
}

/** Where the dog is along the box route `elapsed` seconds after starting. */
function pathPosition(
  from: Vec2,
  path: Vec2[],
  elapsed: number,
): { pos: Vec2; sniffing: boolean; done: boolean } {
  let at = from;
  let left = elapsed;
  for (let i = 0; i < path.length; i++) {
    const p = path[i]!;
    const leg = distance(at, p) / SNIFF_SPEED;
    if (left < leg) {
      const k = left / leg;
      return {
        pos: { x: at.x + (p.x - at.x) * k, z: at.z + (p.z - at.z) * k },
        sniffing: false,
        done: false,
      };
    }
    left -= leg;
    if (i < path.length - 1) {
      if (left < SNIFF_PAUSE) return { pos: p, sniffing: true, done: false };
      left -= SNIFF_PAUSE;
    }
    at = p;
  }
  return { pos: at, sniffing: true, done: true };
}

function animateIndicate(t: TrainingSession): void {
  const { dog } = t;
  const r = t.current;
  if (!r || t.phase !== 'responding') {
    if (t.phase !== 'resetting') {
      dog.pose = 'sit';
      dog.heading = Math.PI;
      dog.tell = { ears: 'forward', tail: 'wag', noseDown: false, text: 'Waiting for "Find it!"' };
    }
    return;
  }
  const start = t.homePos;
  const { pos, sniffing, done } = pathPosition(start, t.path, t.time - r.onset);
  const prev = dog.pos;
  dog.pos = pos;
  if (distance(prev, pos) > 0.001) dog.heading = headingOf(sub(pos, prev));
  const boxAhead = { x: pos.x, z: pos.z - 0.9 };
  if (!done) {
    dog.pose = 'stand';
    dog.speed = sniffing ? 0 : SNIFF_SPEED;
    dog.lookAt = boxAhead;
    dog.tell = {
      ears: 'forward',
      tail: 'wag',
      noseDown: true,
      text: sniffing ? 'Sniffing a box…' : 'Working along the boxes',
    };
    return;
  }
  dog.speed = 0;
  dog.heading = Math.PI;
  dog.lookAt = boxAhead;
  if (r.def.id === 'linger') {
    dog.pose = 'stand';
    dog.tell = {
      ears: 'forward',
      tail: 'wag',
      noseDown: true,
      text: 'Sniffing hard at this box, not sitting',
    };
  } else {
    dog.pose = t.time > r.releaseAt ? 'stand' : 'sit';
    dog.tell = {
      ears: 'forward',
      tail: 'neutral',
      noseDown: false,
      text: 'Sitting at a box, staring at it',
    };
  }
}

function stepBall(t: TrainingSession, dt: number): void {
  if (!t.ballVel) return;
  const ball = t.scene.ball;
  t.ballVel.y -= 14 * dt;
  ball.pos = { x: ball.pos.x + t.ballVel.x * dt, z: ball.pos.z + t.ballVel.z * dt };
  ball.y += t.ballVel.y * dt;
  if (ball.y <= 0.05) {
    ball.y = 0.05;
    t.ballVel = null;
  }
}

function faceKeeper(t: TrainingSession): void {
  t.dog.heading = headingOf(sub(t.keeper.pos, t.dog.pos));
}

function animateSit(t: TrainingSession, dt: number): void {
  const { dog, params, field } = t;
  const r = t.current;
  dog.lookAt = t.keeper.pos;
  if (t.phase !== 'responding' || !r) {
    if (t.phase === 'idle' || t.phase === 'waiting') {
      dog.pose = 'stand';
      brake(dog, params, dt);
      faceKeeper(t);
      dog.tell = {
        ears: 'forward',
        tail: 'wag',
        noseDown: false,
        text: t.phase === 'waiting' ? 'Thinking about it…' : 'Watching you',
      };
    }
    return;
  }
  const since = t.time - r.onset;
  const released = t.time > r.releaseAt;
  if (released) {
    dog.pose = 'stand';
    dog.tell = { ears: 'neutral', tail: 'wag', noseDown: false, text: 'Got up again' };
    return;
  }
  switch (r.def.id) {
    case 'sit':
      dog.pose = 'sit';
      dog.tell = { ears: 'forward', tail: 'wag', noseDown: false, text: 'Sitting' };
      break;
    case 'slowSit':
      dog.pose = since > 0.9 ? 'sit' : 'stand';
      dog.tell = {
        ears: 'neutral',
        tail: 'neutral',
        noseDown: false,
        text: since > 0.9 ? 'Sitting' : 'Hesitating…',
      };
      break;
    case 'down':
      dog.pose = 'down';
      dog.tell = { ears: 'neutral', tail: 'wag', noseDown: false, text: 'Lying down' };
      break;
    case 'spin':
      dog.pose = 'stand';
      dog.heading += dt * 7;
      dog.tell = { ears: 'neutral', tail: 'wag', noseDown: false, text: 'Spinning' };
      break;
    case 'look':
      dog.pose = 'stand';
      dog.tell = { ears: 'forward', tail: 'wag', noseDown: false, text: 'Looking at you' };
      break;
    case 'wander': {
      const spot = add(t.homePos, { x: 2.5, z: -1 });
      steerToward(dog, params, field, spot, 1.2, dt, 0.3);
      dog.lookAt = null;
      dog.tell = { ears: 'neutral', tail: 'neutral', noseDown: true, text: 'Sniffing about' };
      break;
    }
  }
}

function animateStay(t: TrainingSession, dt: number): void {
  const { dog, params, field } = t;
  const r = t.current;
  dog.lookAt = t.scene.ball.visible ? t.scene.ball.pos : null;
  if (!r || t.phase !== 'responding') {
    if (t.phase !== 'resetting') {
      dog.pose = 'sit';
      dog.heading = Math.PI;
      dog.tell = {
        ears: 'forward',
        tail: 'wag',
        noseDown: false,
        text: t.phase === 'waiting' ? 'Watching the throw' : 'Sitting beside you',
      };
    }
    return;
  }
  if (r.def.id === 'hold') {
    dog.pose = 'sit';
    dog.tell = {
      ears: 'forward',
      tail: 'wag',
      noseDown: false,
      text: 'Holding, eyes on the dummy',
    };
  } else if (r.def.id === 'creep') {
    dog.pose = 'crouch';
    const ahead = add(t.homePos, { x: 0.3, z: -1.2 });
    steerToward(dog, params, field, ahead, 0.8, dt, 0.1);
    dog.tell = { ears: 'forward', tail: 'high', noseDown: false, text: 'Creeping forward!' };
  } else {
    dog.pose = 'stand';
    steerToward(dog, params, field, t.scene.ball.pos, params.gallop, dt, 0.6);
    dog.tell = { ears: 'back', tail: 'high', noseDown: false, text: 'Broke! Chasing the dummy' };
  }
}

function animateStop(t: TrainingSession, dt: number): void {
  const { dog, params, field } = t;
  const r = t.current;
  if (t.phase === 'idle') {
    dog.pose = 'sit';
    dog.heading = Math.PI;
    dog.tell = { ears: 'forward', tail: 'wag', noseDown: false, text: 'Ready to chase' };
    return;
  }
  if (t.phase === 'resetting') return;
  const target = dog.target ?? t.scene.ball.pos;
  const chasing =
    !r || r.def.id === 'ignore' || (r.def.id === 'glance' && t.time > r.completeAt + 0.4);
  if (chasing) {
    dog.pose = 'stand';
    // A glance back checks the stride for a moment, so you can see it happen.
    const glancing = r?.def.id === 'glance' && t.time < r.completeAt + 0.4;
    const reached = steerToward(
      dog,
      params,
      field,
      target,
      glancing ? params.trot * 0.8 : params.gallop,
      dt,
      0.8,
    );
    dog.tell = {
      ears: 'back',
      tail: 'neutral',
      noseDown: false,
      text: r?.def.id === 'glance' ? 'Glanced back, still going' : 'Racing for the ball',
    };
    if (r?.def.id === 'glance' && t.time < r.completeAt + 0.4) dog.lookAt = t.keeper.pos;
    if (reached && !r) {
      // No whistle this time: the dog just gets the ball.
      t.scene.ball.visible = false;
      t.current = {
        def: STOP_RESPONSES.ignore!,
        onset: t.time,
        completeAt: t.time,
        releaseAt: t.time,
        marked: false,
        target: null,
      };
      t.phase = 'responding';
    } else if (reached && r) {
      t.scene.ball.visible = false;
    }
    return;
  }
  brake(dog, params, dt);
  dog.lookAt = t.keeper.pos;
  if (dog.speed < 0.5) faceKeeper(t);
  dog.pose = r.def.id === 'stopSit' && dog.speed < 0.5 ? 'sit' : 'stand';
  dog.tell = {
    ears: 'forward',
    tail: 'neutral',
    noseDown: false,
    text: r.def.id === 'stopSit' ? 'Stopped and sitting' : 'Stopped, standing',
  };
}

function animateCast(t: TrainingSession, dt: number): void {
  const { dog, params, field } = t;
  const r = t.current;
  if (!r || t.phase !== 'responding') {
    if (t.phase !== 'resetting') {
      dog.pose = 'sit';
      faceKeeper(t);
      dog.tell = {
        ears: 'forward',
        tail: 'wag',
        noseDown: false,
        text: 'Sitting on the mound, watching your arm',
      };
    }
    return;
  }
  if (r.target) {
    dog.pose = 'stand';
    steerToward(dog, params, field, r.target, params.trot * 1.4, dt, 0.8);
    dog.tell = {
      ears: 'back',
      tail: 'wag',
      noseDown: false,
      text: r.def.id === 'correct' ? 'Off in the direction you sent' : 'Heading for the wrong pile',
    };
  } else {
    dog.pose = 'sit';
    faceKeeper(t);
    dog.tell = { ears: 'neutral', tail: 'low', noseDown: false, text: 'Unsure, staying put' };
  }
}

function finishReset(t: TrainingSession, dt: number): void {
  const { dog, params, field } = t;
  t.current = null;
  t.scene.ball.visible = false;
  t.ballVel = null;
  const arrived = steerToward(dog, params, field, t.homePos, params.trot, dt, 0.25);
  dog.pose = 'stand';
  dog.tell = {
    ears: 'neutral',
    tail: 'wag',
    noseDown: false,
    text: 'Coming back for the next one',
  };
  if (arrived) {
    dog.pos = { ...t.homePos };
    dog.speed = 0;
    dog.mode = 'sit';
    dog.target = null;
    dog.heading =
      t.lesson === 'sit' || t.lesson === 'cast' ? headingOf(sub(t.keeper.pos, dog.pos)) : Math.PI;
    dog.pose = t.lesson === 'sit' ? 'stand' : 'sit';
    t.phase = 'idle';
  }
}

export function lessonSummary(t: TrainingSession) {
  const counts: Partial<Record<Verdict, number>> = {};
  for (const r of t.results) counts[r.verdict] = (counts[r.verdict] ?? 0) + 1;
  const timed = t.results.filter(
    (r) => r.verdict === 'perfect' || r.verdict === 'early' || r.verdict === 'late',
  );
  const averageOffset = timed.length
    ? timed.reduce((s, r) => s + r.offset, 0) / timed.length
    : null;
  return { before: t.skillBefore, after: t.skill, reps: t.reps, counts, averageOffset };
}
