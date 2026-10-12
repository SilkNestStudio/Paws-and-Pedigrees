import { distance, headingOf, sub, turnToward, type Vec2 } from '../core/math';
import { createRng, gaussian, random, type Rng } from '../core/rng';
import type { Aptitude } from '../core/genetics/traits';

/**
 * Puppy sessions in the paddock. One puppy at a time meets a small challenge
 * and shows how it feels about it: keen, unsure or worried. The keeper reads
 * each puppy and answers: praise at the right moment, make it easier for a
 * puppy that needs help, wait for one that is working it out, and never
 * praise fear. Good handling nudges that puppy's temperament for life.
 *
 * In an evaluation the puppies are only watched: the keeper says what they
 * saw, and a correct read gives a much clearer picture of that puppy.
 */
export type PupActivity = 'novelty' | 'handling' | 'fetch' | 'follow' | 'paddle';
export type PupResponse = 'keen' | 'unsure' | 'worried';

export const PUP_ACTIVITIES: Record<
  PupActivity,
  { title: string; trait: Aptitude; summary: string; thing: string; builds: string }
> = {
  novelty: {
    title: 'New sights and sounds',
    trait: 'confidence',
    summary: 'A flapping umbrella and a rattling tin. Brave puppies walk up; shy ones need time.',
    thing: 'the umbrella',
    builds: 'Confidence',
  },
  handling: {
    title: 'Gentle handling',
    trait: 'biddability',
    summary:
      'Paws, ears, a soft brush. Puppies that learn to enjoy hands grow up easy to work with.',
    thing: 'your hands',
    builds: 'Cooperation',
  },
  fetch: {
    title: 'First fetch',
    trait: 'drive',
    summary: 'A soft toy rolled a little way. Some puppies pounce on it; some need to be shown.',
    thing: 'the toy',
    builds: 'Drive',
  },
  follow: {
    title: 'Follow me',
    trait: 'focus',
    summary:
      'Clap, crouch and call. Puppies that choose to come and stay with you learn to pay attention.',
    thing: 'you',
    builds: 'Focus',
  },
  paddle: {
    title: 'Paddling pool',
    trait: 'water',
    summary: 'A shallow tub of water. A happy first paddle makes a confident swimmer.',
    thing: 'the pool',
    builds: 'Water',
  },
};

/** The three tests of an evaluation, one after another for each puppy. */
export const EVALUATION_TESTS: PupActivity[] = ['novelty', 'fetch', 'follow'];

export const PEN = { minX: 28.7, maxX: 33.3, minZ: 53.1, maxZ: 56.9 };
const KEEPER_SPOT: Vec2 = { x: 31, z: 53.5 };
const GOAL: Record<PupActivity, Vec2> = {
  novelty: { x: 32.4, z: 55.6 },
  handling: { x: 31, z: 54.2 },
  fetch: { x: 29.8, z: 55.9 },
  follow: { x: 31, z: 54.2 },
  paddle: { x: 32.3, z: 55.4 },
};

export type PupOutcome =
  | 'perfect' // praised right as the puppy did it by itself
  | 'good' // praised, a little early or late
  | 'helped' // made easier, then praised
  | 'unrewarded' // did it, but nobody said so
  | 'stuck' // praised while it was hesitating
  | 'rewardedFear' // praised while it was frightened
  | 'leftWorried'; // frightened, and nobody helped

/** How much each outcome moves the puppy's temperament, in standard deviations. */
export const OUTCOME_BONUS: Record<PupOutcome, number> = {
  perfect: 0.2,
  good: 0.13,
  helped: 0.12,
  unrewarded: 0.04,
  stuck: 0,
  rewardedFear: -0.08,
  leftWorried: -0.04,
};

export interface PupAgent {
  id: string;
  name: string;
  pos: Vec2;
  heading: number;
  speed: number;
  pose: 'stand' | 'sit' | 'down' | 'crouch';
  tail: 'high' | 'wag' | 'low' | 'neutral';
  rest: Vec2;
}

type RoundPhase = 'notice' | 'approach' | 'hesitate' | 'retreat' | 'cower' | 'reached' | 'over';

export interface PupRound {
  pup: number;
  activity: PupActivity;
  response: PupResponse;
  /** What the puppy will do after hesitating, if left to work it out. */
  willGo: boolean;
  easy: boolean;
  phase: RoundPhase;
  phaseAt: number;
  reachedAt: number | null;
  startedAt: number;
  /** Raising: the result. Evaluation: what the keeper said they saw. */
  outcome: PupOutcome | null;
  read: PupResponse | null;
}

export interface PupResult {
  pupId: string;
  name: string;
  activity: PupActivity;
  response: PupResponse;
  outcome: PupOutcome | null;
  /** Evaluation only: whether the keeper read the puppy correctly. */
  readRight: boolean | null;
}

export interface PuppySession {
  mode: 'raise' | 'evaluate';
  time: number;
  rng: Rng;
  activity: PupActivity;
  pups: PupAgent[];
  /** Each puppy's value for each trait that might be tested, in standard deviations. */
  values: Partial<Record<Aptitude, number>>[];
  queue: { pup: number; activity: PupActivity }[];
  round: PupRound | null;
  results: PupResult[];
  phase: 'between' | 'round' | 'done';
  nextAt: number;
  keeper: { pos: Vec2; heading: number; action: 'none' | 'mark' | 'call'; actionTime: number };
  feedback: { text: string; tone: 'good' | 'info' | 'warn'; time: number } | null;
  tell: string;
}

export interface PupInput {
  id: string;
  name: string;
  values: Partial<Record<Aptitude, number>>;
}

export function createPuppySession(
  pups: PupInput[],
  mode: 'raise' | 'evaluate',
  activity: PupActivity,
  seed: number,
): PuppySession {
  const rng = createRng(seed);
  const agents: PupAgent[] = pups.map((p, i) => {
    // Waiting puppies sit along the back of the pen.
    const t = pups.length === 1 ? 0.5 : i / (pups.length - 1);
    const rest = { x: PEN.minX + 0.4 + t * (PEN.maxX - PEN.minX - 0.8), z: PEN.maxZ - 0.3 };
    return {
      id: p.id,
      name: p.name,
      pos: { ...rest },
      heading: Math.PI,
      speed: 0,
      pose: 'sit',
      tail: 'wag',
      rest,
    };
  });
  const queue =
    mode === 'raise'
      ? pups.map((_, pup) => ({ pup, activity }))
      : pups.flatMap((_, pup) => EVALUATION_TESTS.map((a) => ({ pup, activity: a })));
  return {
    mode,
    time: 0,
    rng,
    activity,
    pups: agents,
    values: pups.map((p) => p.values),
    queue,
    round: null,
    results: [],
    phase: 'between',
    nextAt: 1.2,
    keeper: { pos: { ...KEEPER_SPOT }, heading: 0, action: 'none', actionTime: 9 },
    feedback: null,
    tell: '',
  };
}

function say(s: PuppySession, text: string, tone: 'good' | 'info' | 'warn' = 'info'): void {
  s.feedback = { text, tone, time: s.time };
}

/** How a puppy takes to a challenge: its nature, plus the mood of the moment. */
export function rollResponse(z: number, easy: boolean, rng: Rng): PupResponse {
  const roll = z * 0.6 + (easy ? 0.9 : 0) + gaussian(rng) * 0.35;
  return roll > 0.15 ? 'keen' : roll > -0.35 ? 'unsure' : 'worried';
}

function beginRound(s: PuppySession): void {
  const next = s.queue.shift();
  if (!next) {
    s.phase = 'done';
    s.round = null;
    say(s, s.mode === 'raise' ? 'Session over. Good puppies!' : 'Evaluation finished.', 'good');
    return;
  }
  const trait = PUP_ACTIVITIES[next.activity].trait;
  const z = s.values[next.pup]![trait] ?? 0;
  const response = rollResponse(z, false, s.rng);
  s.activity = next.activity;
  s.round = {
    pup: next.pup,
    activity: next.activity,
    response,
    willGo: random(s.rng) < 0.5 + z * 0.2,
    easy: false,
    phase: 'notice',
    phaseAt: s.time,
    reachedAt: null,
    startedAt: s.time,
    outcome: null,
    read: null,
  };
  s.phase = 'round';
  s.keeper.action = next.activity === 'follow' || next.activity === 'handling' ? 'call' : 'none';
  s.keeper.actionTime = 0;
}

function setPhase(s: PuppySession, phase: RoundPhase): void {
  if (!s.round) return;
  s.round.phase = phase;
  s.round.phaseAt = s.time;
}

function endRound(s: PuppySession, outcome: PupOutcome | null): void {
  const r = s.round;
  if (!r || r.phase === 'over') return;
  r.outcome = outcome;
  const pup = s.pups[r.pup]!;
  s.results.push({
    pupId: pup.id,
    name: pup.name,
    activity: r.activity,
    response: r.response,
    outcome,
    readRight: s.mode === 'evaluate' ? r.read === r.response : null,
  });
  setPhase(s, 'over');
  s.phase = 'between';
  s.nextAt = s.time + 1.3;
}

// ---------------------------------------------------------------------------
// The keeper's answers
// ---------------------------------------------------------------------------

/** "Good pup!" Praise is only right once the puppy is doing the brave thing. */
export function praise(s: PuppySession): void {
  const r = s.round;
  if (s.mode !== 'raise' || !r || s.phase !== 'round') return;
  s.keeper.action = 'mark';
  s.keeper.actionTime = 0;
  const name = s.pups[r.pup]!.name;
  if (r.phase === 'cower' || r.phase === 'retreat') {
    say(s, `That praised ${name} for being frightened. Help first, praise after.`, 'warn');
    endRound(s, 'rewardedFear');
  } else if (r.phase === 'hesitate' || r.phase === 'notice') {
    say(s, `Too soon: ${name} hadn't done anything yet, and now waits for more.`, 'warn');
    endRound(s, 'stuck');
  } else if (r.phase === 'approach') {
    say(
      s,
      `Good: ${name} was on the way. Praise at the moment it gets there is even better.`,
      'info',
    );
    endRound(s, r.easy ? 'helped' : 'good');
  } else if (r.phase === 'reached') {
    const late = s.time - (r.reachedAt ?? s.time) > 1.2;
    if (r.easy) {
      say(s, `Well handled. ${name} did it with a little help.`, 'good');
      endRound(s, 'helped');
    } else if (late) {
      say(s, `Good, if a little late for ${name} to know what it was for.`, 'info');
      endRound(s, 'good');
    } else {
      say(s, `Perfect! ${name} did it alone and heard about it straight away.`, 'good');
      endRound(s, 'perfect');
    }
  }
}

/** Make it easier: move the thing closer, crouch lower, go slower. */
export function help(s: PuppySession): void {
  const r = s.round;
  if (s.mode !== 'raise' || !r || s.phase !== 'round' || r.easy) return;
  const name = s.pups[r.pup]!.name;
  if (r.phase === 'reached') return;
  r.easy = true;
  if (r.response === 'keen' && r.phase === 'approach') {
    say(s, `${name} didn't need help, but no harm done.`, 'info');
    return;
  }
  // Easier, the puppy nearly always manages it.
  const trait = PUP_ACTIVITIES[r.activity].trait;
  const again = rollResponse(s.values[r.pup]![trait] ?? 0, true, s.rng);
  if (again === 'worried') {
    say(s, `Even made easy, ${name} isn't ready today. That's fine: no pressure.`, 'info');
    endRound(s, null);
    return;
  }
  say(s, `You made it easier. ${name} is thinking about it…`, 'info');
  setPhase(s, 'approach');
}

/** Evaluation: say what you saw. */
export function readPup(s: PuppySession, read: PupResponse): void {
  const r = s.round;
  if (s.mode !== 'evaluate' || !r || s.phase !== 'round' || r.read) return;
  // The answer only counts once the puppy has shown its hand.
  if (r.phase === 'notice') return;
  r.read = read;
  const name = s.pups[r.pup]!.name;
  if (read === r.response) say(s, `Yes: ${name} was ${read}. Noted.`, 'good');
  else say(s, `Not quite: ${name} was ${r.response}. A rough note is all you get.`, 'warn');
  endRound(s, null);
}

// ---------------------------------------------------------------------------
// Simulation step
// ---------------------------------------------------------------------------

const SPEED = { keen: 1.7, unsure: 0.8, worried: 1.3 };

function walk(p: PupAgent, to: Vec2, speed: number, dt: number): boolean {
  const d = distance(p.pos, to);
  if (d < 0.15) {
    p.speed = 0;
    return true;
  }
  p.heading = turnToward(p.heading, headingOf(sub(to, p.pos)), 6 * dt);
  p.speed = Math.min(speed, d * 3);
  p.pos = {
    x: p.pos.x + Math.sin(p.heading) * p.speed * dt,
    z: p.pos.z + Math.cos(p.heading) * p.speed * dt,
  };
  return false;
}

const face = (p: PupAgent, at: Vec2, dt: number) => {
  p.heading = turnToward(p.heading, headingOf(sub(at, p.pos)), 5 * dt);
};

export function stepPuppies(s: PuppySession, dt: number): void {
  if (s.phase === 'done') return;
  s.time += dt;
  s.keeper.actionTime += dt;
  if (s.keeper.actionTime > 1.1) s.keeper.action = 'none';

  // Puppies not having their turn go back to their places.
  s.pups.forEach((p, i) => {
    if (s.round && s.round.pup === i && s.round.phase !== 'over') return;
    if (walk(p, p.rest, 1.2, dt)) {
      p.pose = 'sit';
      p.tail = 'wag';
      face(p, s.keeper.pos, dt);
    } else p.pose = 'stand';
  });

  if (s.phase === 'between') {
    if (s.time >= s.nextAt) beginRound(s);
    return;
  }
  const r = s.round!;
  const pup = s.pups[r.pup]!;
  const thing = PUP_ACTIVITIES[r.activity].thing;
  const goal = GOAL[r.activity];
  const since = s.time - r.phaseAt;
  const half = { x: (pup.rest.x + goal.x) / 2, z: (pup.rest.z + goal.z) / 2 };

  switch (r.phase) {
    case 'notice':
      pup.pose = 'stand';
      pup.tail = 'neutral';
      face(pup, goal, dt);
      s.tell = `${pup.name} notices ${thing}`;
      if (since > 0.9)
        setPhase(
          s,
          r.response === 'keen' ? 'approach' : r.response === 'unsure' ? 'hesitate' : 'retreat',
        );
      break;
    case 'approach': {
      pup.pose = 'stand';
      pup.tail = r.easy || r.response !== 'keen' ? 'wag' : 'high';
      s.tell =
        r.response === 'keen' && !r.easy
          ? `${pup.name} trots straight up, tail high`
          : `${pup.name} goes carefully, tail starting to wag`;
      const speed = r.response === 'keen' && !r.easy ? SPEED.keen : SPEED.unsure;
      if (walk(pup, goal, speed, dt)) {
        r.reachedAt = s.time;
        setPhase(s, 'reached');
      }
      break;
    }
    case 'hesitate': {
      // Halfway, then stops to think. Its body says which way it will go.
      const there = walk(pup, half, SPEED.unsure, dt);
      pup.pose = there ? 'sit' : 'stand';
      pup.tail = r.willGo ? 'wag' : 'low';
      if (there) face(pup, goal, dt);
      s.tell = there
        ? r.willGo
          ? `${pup.name} stops, leaning forward, tail wagging`
          : `${pup.name} stops, weight back, tail low`
        : `${pup.name} edges closer, unsure`;
      if (since > 4.2) setPhase(s, r.willGo ? 'approach' : 'retreat');
      break;
    }
    case 'retreat': {
      pup.pose = 'stand';
      pup.tail = 'low';
      s.tell = `${pup.name} backs away from ${thing}`;
      const corner = { x: goal.x > 31 ? PEN.minX + 0.3 : PEN.maxX - 0.3, z: PEN.maxZ - 0.2 };
      if (walk(pup, corner, SPEED.worried, dt)) setPhase(s, 'cower');
      break;
    }
    case 'cower':
      pup.pose = 'crouch';
      pup.tail = 'low';
      face(pup, goal, dt);
      s.tell = `${pup.name} crouches in the corner, tail tucked`;
      if (since > 3.5) {
        if (s.mode === 'raise')
          say(s, `${pup.name} was frightened and nobody helped. Make it easier next time.`, 'warn');
        endRound(s, s.mode === 'raise' ? 'leftWorried' : null);
      }
      break;
    case 'reached':
      pup.pose = r.activity === 'handling' || r.activity === 'follow' ? 'sit' : 'stand';
      pup.tail = 'wag';
      face(pup, r.activity === 'handling' || r.activity === 'follow' ? s.keeper.pos : goal, dt);
      s.tell =
        r.activity === 'fetch'
          ? `${pup.name} pounces on the toy!`
          : r.activity === 'paddle'
            ? `${pup.name} is in the water, paddling`
            : r.activity === 'novelty'
              ? `${pup.name} sniffs the umbrella, tail wagging`
              : `${pup.name} settles happily with you`;
      if (since > 2.4) {
        if (s.mode === 'raise')
          say(s, `${pup.name} did it, and nobody said so. A missed chance.`, 'info');
        endRound(s, s.mode === 'raise' ? 'unrewarded' : null);
      }
      break;
    case 'over':
      break;
  }
}

/** What the coach would say right now, while the keeper is still learning to read puppies. */
export function pupHint(s: PuppySession): { text: string; kind: 'now' | 'help' | 'wait' | null } {
  const r = s.round;
  if (s.phase === 'done') return { text: 'All done.', kind: null };
  if (!r || s.phase === 'between') return { text: 'Next puppy…', kind: null };
  const name = s.pups[r.pup]!.name;
  if (s.mode === 'evaluate')
    return r.phase === 'notice'
      ? { text: `Watch ${name} closely…`, kind: null }
      : { text: `What did you see? Keen, unsure or worried?`, kind: 'now' };
  switch (r.phase) {
    case 'reached':
      return { text: `${name} did it. Praise now! (Space)`, kind: 'now' };
    case 'hesitate':
      return r.willGo
        ? { text: `${name} is thinking, tail wagging. Wait: it may do this alone.`, kind: 'wait' }
        : { text: `${name}'s weight is back, tail low. Make it easier (X).`, kind: 'help' };
    case 'retreat':
    case 'cower':
      return { text: `${name} is frightened. Don't praise: make it easier (X).`, kind: 'help' };
    case 'approach':
      return { text: `${name} is going. Praise the moment it gets there.`, kind: 'wait' };
    default:
      return { text: `Watch ${name}…`, kind: null };
  }
}

/** A computer keeper, for tests: `skill` 0-1 is how well it reads puppies. */
export function playPuppies(s: PuppySession, skill: number, rng: Rng, maxSeconds = 400): void {
  const dt = 1 / 60;
  let reactAt = 0;
  let judged: PupRound | null = null;
  let good = false;
  for (let i = 0; i < maxSeconds / dt && s.phase !== 'done'; i++) {
    stepPuppies(s, dt);
    const r = s.round;
    if (!r || s.phase !== 'round' || s.time < reactAt) continue;
    // One reading per puppy: it either understands this one or it doesn't.
    if (judged !== r) {
      judged = r;
      good = random(rng) < skill;
    }
    if (s.mode === 'evaluate') {
      if (r.phase !== 'notice' && s.time - r.phaseAt > 0.8) {
        const options: PupResponse[] = ['keen', 'unsure', 'worried'];
        readPup(s, good ? r.response : options[Math.floor(random(rng) * 3)]!);
        reactAt = s.time + 0.3;
      }
      continue;
    }
    if (r.phase === 'reached' && s.time - r.phaseAt > 0.3) {
      if (good || s.time - r.phaseAt > 1.6) praise(s);
    } else if ((r.phase === 'cower' || r.phase === 'retreat') && s.time - r.phaseAt > 0.6) {
      if (good) help(s);
      else praise(s);
      reactAt = s.time + 0.5;
    } else if (r.phase === 'hesitate' && s.time - r.phaseAt > 1.5) {
      if (good) {
        if (!r.willGo) help(s);
      } else if (random(rng) < 0.02) praise(s);
      reactAt = s.time + 0.5;
    }
  }
}
