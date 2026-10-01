/**
 * Ground height used by everything that stands on the field. The simulation
 * itself is flat (2D); height is purely visual, kept gentle so it never hides
 * the dog at distance.
 */
export function heightAt(x: number, z: number): number {
  let h =
    0.55 * Math.sin(x * 0.045 + 1.3) * Math.cos(z * 0.035) +
    0.35 * Math.sin((x - z) * 0.06) +
    0.22 * Math.cos(z * 0.09 + x * 0.02);
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
