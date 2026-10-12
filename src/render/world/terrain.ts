import { DUCK_POND, LARKSPUR_LAKE, SEA, type FieldStyle, type Pond } from '../../sim/field';

/**
 * Ground height used by everything that stands on the field. The simulation
 * itself is flat (2D); height is purely visual, kept gentle so it never hides
 * the dog at distance.
 *
 * Most places share the same rolling ground. The beach has its own shape: a
 * flat strand sloping into the sea, with dunes behind.
 */
let current: FieldStyle = 'training';

/** Which place's ground is in force. The scene sets this when the place changes. */
export function setTerrain(style: FieldStyle): void {
  current = style;
}

/** Builds something for another place (ahead of a visit) with that place's ground. */
export function withTerrain<T>(style: FieldStyle, build: () => T): T {
  const previous = current;
  current = style;
  try {
    return build();
  } finally {
    current = previous;
  }
}

function rolling(x: number, z: number): number {
  return (
    0.55 * Math.sin(x * 0.045 + 1.3) * Math.cos(z * 0.035) +
    0.35 * Math.sin((x - z) * 0.06) +
    0.22 * Math.cos(z * 0.09 + x * 0.02)
  );
}

/** Level hollows where water lies (Grandpa's pond, the Larkspur lake). */
const HOLLOWS = [DUCK_POND, LARKSPUR_LAKE].map((p) => ({
  ...p,
  level: rolling(p.center.x, p.center.z),
}));

const SEA_LEVEL = -0.12;

/** The flat water surface of a pond, or of the sea. */
export const waterLevel = (pond: Pond): number =>
  pond === SEA || pond.rx > 50 ? SEA_LEVEL : rolling(pond.center.x, pond.center.z);

/** Sandy Cove: the strand slopes gently into the water, with dunes at the back. */
function beachHeight(x: number, z: number): number {
  // Beyond the widest part of the cove the sea runs on to the horizon.
  const dz = Math.max(0, z - SEA.center.z);
  const e = Math.hypot(x / SEA.rx, dz / SEA.rz);
  const ripple = 0.04 * Math.sin(x * 0.45 + z * 0.2) * Math.cos(z * 0.5);
  if (e < 1) return -0.1 - Math.min(2.6, (1 - e) * 9);
  const inland = (e - 1) * SEA.rz;
  const dunes = Math.max(0, z - 15) * 0.14 + Math.max(0, Math.abs(x) - 52) * 0.22;
  return -0.1 + Math.min(0.85, inland * 0.05) + dunes + ripple;
}

export function heightAt(x: number, z: number): number {
  if (current === 'beach') return beachHeight(x, z);
  let h = rolling(x, z);
  for (const p of HOLLOWS) {
    const e = Math.hypot((x - p.center.x) / (p.rx + 2), (z - p.center.z) / (p.rz + 2));
    if (e < 1.6) h += (p.level - h) * (1 - smoothstep(1, 1.6, e));
  }
  // Keep the area around the starting line and the kennel yard flat.
  const flat = smoothstep(4, 14, z);
  h *= 1 - flat;
  // Hills rise beyond the field boundary.
  h += Math.max(0, Math.abs(x) - 64) * 0.22 + Math.max(0, -98 - z) * 0.28;
  return h;
}

function smoothstep(a: number, b: number, v: number): number {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Cheap deterministic pseudo-random in [0, 1) from two numbers, for scatter. */
export function scatter(a: number, b: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
