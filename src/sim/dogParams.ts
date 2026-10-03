import { clamp01 } from '../core/math';
import { aptitude, type Dog } from '../core/dog/dog';

/**
 * Turns a dog's aptitudes, skills and bond into the numbers the simulation
 * uses. Every aptitude changes something you can see the dog do; this file is
 * the single place where that mapping lives.
 */
export interface DogParams {
  gallop: number; // m/s
  trot: number;
  walk: number;
  accel: number; // m/s^2
  /** Turning rate at full gallop, rad/s. Slower dogs turn faster. */
  turnRate: number;
  /** Seconds of galloping before the dog tires. */
  staminaMax: number;
  scentThreshold: number;
  /** Seconds the dog hunts an area before stopping to look to you for help. */
  huntPatience: number;
  /** How far (m) the dog keeps going on a line or cast before it starts hunting. */
  carry: number;
  /** Mark memory error as a share of the throw distance. */
  markError: number;
  /** 0-1 resistance to breaking before being sent. */
  steadiness: number;
  biddability: number; // 0-1
  confidence: number; // 0-1
  softMouth: number; // 0-1
  /** Swimming speed, m/s: far slower than running, so the bank is tempting. */
  swim: number;
  /** 0-1 love of water: entering without fuss and swimming straight. */
  waterLove: number;
  /** How quickly the dog takes in a lesson, ~0.6-1.4. */
  learning: number;
  skills: Dog['skills'];
  bond: number; // 0-1
}

/**
 * A tired dog runs slower and tires sooner; a hungry one listens less and
 * gives up sooner. Care shows up directly in the work.
 */
export function conditionEffects(dog: Dog) {
  const energy = dog.energy ?? 100;
  const fullness = dog.fullness ?? 100;
  return {
    speed: energy < 25 ? 0.88 : 1,
    stamina: energy < 25 ? 0.7 : energy < 50 ? 0.85 : 1,
    attention: fullness < 30 ? -0.1 : 0,
    patience: fullness < 30 ? 0.8 : 1,
  };
}

export function dogParams(dog: Dog): DogParams {
  const a = (k: Parameters<typeof aptitude>[1]) => aptitude(dog, k);
  const skills = dog.skills;
  const c = conditionEffects(dog);
  return {
    gallop: (6.2 + a('speed') * 0.05) * c.speed,
    trot: 3 + a('speed') * 0.012,
    walk: 1.5,
    accel: 5 + a('power') * 0.06,
    turnRate: 2.2 + a('agility') * 0.035,
    staminaMax: (25 + a('stamina') * 0.6) * c.stamina,
    scentThreshold: 0.555 - a('nose') * 0.0047,
    huntPatience: (6 + a('drive') * 0.14) * c.patience,
    carry: 14 + a('drive') * 0.3 + skills.cast * 30,
    markError: 0.03 + (100 - a('focus')) * 0.0011,
    steadiness: clamp01(skills.stay * 0.7 + a('focus') * 0.002 + (100 - a('drive')) * 0.002),
    biddability: clamp01(a('biddability') / 100 + c.attention),
    confidence: a('confidence') / 100,
    softMouth: a('mouth') / 100,
    swim: 1.2 + a('water') * 0.02,
    waterLove: a('water') / 100,
    learning: 0.6 + a('biddability') * 0.005 + a('focus') * 0.003,
    skills,
    bond: dog.bond / 100,
  };
}
