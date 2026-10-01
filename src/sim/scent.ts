import { clamp01, dot, fromHeading, length, sub, type Vec2 } from '../core/math';

/**
 * Wind carries scent downwind in a widening plume. Dogs detect a target when
 * the scent strength at their nose beats a threshold set by their Nose
 * aptitude, so where you put the dog relative to the wind really matters.
 */
export interface Wind {
  /** Heading the wind blows toward (radians, 0 = +z). */
  heading: number;
  /** 0 = still air, 1 = strong breeze. */
  strength: number;
  /** Random phase so every session gusts differently. */
  phase: number;
}

/** Wind direction drifts gently over time so plumes swing and dogs lose scent. */
export function windAt(wind: Wind, time: number): { dir: Vec2; heading: number } {
  const heading =
    wind.heading +
    0.16 * Math.sin(time * 0.07 + wind.phase) +
    0.07 * Math.sin(time * 0.23 + wind.phase * 2.1);
  return { dir: fromHeading(heading), heading };
}

/** How far downwind (m) a plume reaches before it is too faint for any dog. */
export const plumeLength = (wind: Wind): number => 22 + 22 * wind.strength;

/**
 * Scent strength 0-1 at `p` from a source at `source`.
 * Close to the source scent is strong in every direction; further out it
 * only exists downwind, inside a cone that widens with distance.
 */
export function scentStrength(p: Vec2, source: Vec2, wind: Wind, time: number): number {
  const offset = sub(p, source);
  const dist = length(offset);
  const near = clamp01(1 - dist / 2.2);

  const { dir } = windAt(wind, time);
  const along = dot(offset, dir);
  if (along <= 0) return near;
  const cross = Math.abs(offset.x * dir.z - offset.z * dir.x);
  const width = 1.2 + along * (0.42 - wind.strength * 0.18);
  const reach = plumeLength(wind);
  const plume = clamp01(1 - along / reach) * Math.exp(-((cross / width) ** 2));
  return Math.max(near, plume);
}

/** Lowest scent strength this dog notices. Nose 99 is roughly 0.09, nose 1 roughly 0.55. */
export const detectionThreshold = (nose: number): number => 0.555 - nose * 0.0047;
