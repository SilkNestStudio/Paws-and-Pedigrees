/** Small 2D vector helpers for the ground plane (x = east, z = south). */
export interface Vec2 {
  x: number;
  z: number;
}

export const vec = (x: number, z: number): Vec2 => ({ x, z });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, z: a.z + b.z });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, z: a.z - b.z });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, z: a.z * s });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.z * b.z;
export const length = (a: Vec2): number => Math.hypot(a.x, a.z);
export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.z - b.z);

export function normalize(a: Vec2): Vec2 {
  const len = length(a);
  return len > 1e-9 ? { x: a.x / len, z: a.z / len } : { x: 0, z: 0 };
}

/** Heading angle in radians: 0 points toward +z, increasing toward +x. */
export const headingOf = (a: Vec2): number => Math.atan2(a.x, a.z);
export const fromHeading = (angle: number, len = 1): Vec2 => ({
  x: Math.sin(angle) * len,
  z: Math.cos(angle) * len,
});

/** Wraps an angle to [-PI, PI]. */
export function wrapAngle(angle: number): number {
  let a = angle % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** Rotates `from` toward `to` by at most `maxStep` radians. */
export function turnToward(from: number, to: number, maxStep: number): number {
  const diff = wrapAngle(to - from);
  if (Math.abs(diff) <= maxStep) return to;
  return wrapAngle(from + Math.sign(diff) * maxStep);
}

export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;
export const clamp01 = (v: number): number => clamp(v, 0, 1);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Maps v from [a, b] to [0, 1], clamped. */
export const inverseLerp = (a: number, b: number, v: number): number => clamp01((v - a) / (b - a));

/** Frame-rate independent exponential smoothing factor. */
export const damp = (rate: number, dt: number): number => 1 - Math.exp(-rate * dt);

export const degToRad = (deg: number): number => (deg * Math.PI) / 180;
