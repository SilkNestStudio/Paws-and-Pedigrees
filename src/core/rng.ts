/**
 * Seeded random numbers. Every simulation and generator takes an Rng so that
 * results can be replayed and tested. The state is a plain object so it can be
 * saved alongside the rest of the game.
 */
export interface Rng {
  state: number;
}

export function createRng(seed: number): Rng {
  return { state: seed >>> 0 || 0x9e3779b9 };
}

/** Uniform float in [0, 1). Mulberry32. */
export function random(rng: Rng): number {
  rng.state = (rng.state + 0x6d2b79f5) >>> 0;
  let t = rng.state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function range(rng: Rng, min: number, max: number): number {
  return min + (max - min) * random(rng);
}

/** Integer in [min, max], inclusive. */
export function int(rng: Rng, min: number, max: number): number {
  return Math.floor(range(rng, min, max + 1));
}

export function chance(rng: Rng, probability: number): boolean {
  return random(rng) < probability;
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick() needs at least one item');
  return items[Math.floor(random(rng) * items.length)] as T;
}

/** Standard normal sample (mean 0, standard deviation 1). */
export function gaussian(rng: Rng): number {
  const u = Math.max(random(rng), 1e-12);
  const v = random(rng);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** A shuffled copy of the items (Fisher-Yates). */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random(rng) * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Picks a key from a table of relative weights. */
export function weighted<K extends string>(rng: Rng, weights: Partial<Record<K, number>>): K {
  const entries = Object.entries(weights) as [K, number][];
  const total = entries.reduce((sum, [, w]) => sum + Math.max(0, w), 0);
  if (total <= 0) throw new Error('weighted() needs a positive weight');
  let roll = random(rng) * total;
  for (const [key, w] of entries) {
    roll -= Math.max(0, w);
    if (roll < 0) return key;
  }
  return entries[entries.length - 1]![0];
}

/** Stable 32-bit hash of a string, for turning names or ids into seeds. */
export function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
