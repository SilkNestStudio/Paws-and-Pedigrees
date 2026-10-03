import { add, distance, normalize, scale, sub, type Vec2 } from '../core/math';

/**
 * Grandpa's training field. The keeper's starting "line" is near the south
 * edge (positive z); the field stretches north (negative z). Coordinates are
 * metres. The renderer reads the same data so what you see is what the dog
 * experiences.
 */
export interface CoverPatch {
  center: Vec2;
  radius: number;
  /** 0-1: how much the cover slows the dog and hides what falls into it. */
  density: number;
}

export interface Tree {
  pos: Vec2;
  radius: number;
}

/** Open water: an ellipse the dog must swim, or run round by the bank. */
export interface Pond {
  center: Vec2;
  rx: number;
  rz: number;
}

export type FieldStyle = 'training' | 'orchard' | 'green' | 'shelter' | 'trial';

export interface Field {
  style: FieldStyle;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  line: Vec2;
  cover: CoverPatch[];
  trees: Tree[];
  ponds?: Pond[];
}

/** Grandpa's duck pond, once it has been dredged and refilled. */
export const DUCK_POND: Pond = { center: { x: -40, z: -28 }, rx: 9, rz: 7 };

export function createTrainingField(opts: { pond?: boolean } = {}): Field {
  const field: Field = {
    style: 'training',
    minX: -62,
    maxX: 62,
    minZ: -95,
    maxZ: 40,
    line: { x: 0, z: 18 },
    cover: [
      { center: { x: -16, z: -18 }, radius: 7, density: 0.7 },
      { center: { x: 14, z: -34 }, radius: 9, density: 0.8 },
      { center: { x: -26, z: -56 }, radius: 9, density: 0.75 },
      { center: { x: 22, z: -64 }, radius: 7, density: 0.7 },
      { center: { x: 1, z: -47 }, radius: 4.5, density: 0.6 },
      { center: { x: -44, z: -22 }, radius: 6, density: 0.6 },
      { center: { x: 44, z: -10 }, radius: 6, density: 0.65 },
    ],
    trees: [
      { pos: { x: -36, z: -8 }, radius: 1.3 },
      { pos: { x: 31, z: -22 }, radius: 1.5 },
      { pos: { x: -9, z: -74 }, radius: 1.6 },
      { pos: { x: 39, z: -58 }, radius: 1.4 },
      { pos: { x: -42, z: -42 }, radius: 1.5 },
      { pos: { x: 8, z: -84 }, radius: 1.4 },
    ],
  };
  if (opts.pond) {
    // The reed bed becomes open water with a fringe of reeds on the far side.
    field.cover = field.cover.filter((c) => !(c.center.x === -44 && c.center.z === -22));
    field.cover.push({ center: { x: -40, z: -37 }, radius: 3.5, density: 0.55 });
    field.ponds = [DUCK_POND];
  }
  return field;
}

/**
 * Mara's orchard: rows of apple trees running north, long grass between some
 * rows, a hedge along the far side. Used for search jobs and orchard blinds.
 */
export function createOrchard(): Field {
  const trees: Tree[] = [];
  for (let row = -4; row <= 4; row++) {
    for (let k = 0; k < 8; k++) {
      const x = row * 9 + (k % 2) * 0.8;
      const z = -6 - k * 8;
      if (row === 0 && k < 3) continue; // the lane up the middle
      trees.push({ pos: { x, z }, radius: 0.9 });
    }
  }
  return {
    style: 'orchard',
    minX: -44,
    maxX: 44,
    minZ: -72,
    maxZ: 14,
    line: { x: 0, z: 8 },
    cover: [
      { center: { x: -22, z: -30 }, radius: 7, density: 0.6 },
      { center: { x: 20, z: -18 }, radius: 6, density: 0.55 },
      { center: { x: 8, z: -50 }, radius: 8, density: 0.65 },
      { center: { x: -30, z: -58 }, radius: 6, density: 0.6 },
      { center: { x: 34, z: -48 }, radius: 6, density: 0.6 },
    ],
    trees,
  };
}

/** The village green for the Fun Day: open grass, a few rough patches, bunting round the edge. */
export function createVillageGreen(): Field {
  return {
    style: 'green',
    minX: -48,
    maxX: 48,
    minZ: -70,
    maxZ: 22,
    line: { x: 0, z: 12 },
    cover: [
      { center: { x: -18, z: -22 }, radius: 6, density: 0.6 },
      { center: { x: 16, z: -36 }, radius: 7, density: 0.65 },
      { center: { x: -10, z: -52 }, radius: 6, density: 0.6 },
    ],
    trees: [
      { pos: { x: -38, z: -10 }, radius: 1.4 },
      { pos: { x: 36, z: -14 }, radius: 1.5 },
      { pos: { x: 30, z: -58 }, radius: 1.4 },
    ],
  };
}

/**
 * Larkspur trial ground: a big mown field with rough patches and a few old
 * trees, where the weekly field trials run. The handlers' line is at z = 12.
 */
export function createTrialGround(): Field {
  return {
    style: 'trial',
    minX: -54,
    maxX: 54,
    minZ: -86,
    maxZ: 22,
    line: { x: 0, z: 12 },
    cover: [
      { center: { x: -20, z: -14 }, radius: 7, density: 0.65 },
      { center: { x: 18, z: -30 }, radius: 8, density: 0.7 },
      { center: { x: -8, z: -50 }, radius: 7, density: 0.7 },
      { center: { x: 28, z: -62 }, radius: 8, density: 0.75 },
      { center: { x: -34, z: -40 }, radius: 6, density: 0.6 },
      { center: { x: 4, z: -72 }, radius: 6, density: 0.65 },
    ],
    trees: [
      { pos: { x: -40, z: -18 }, radius: 1.5 },
      { pos: { x: 38, z: -12 }, radius: 1.4 },
      { pos: { x: 47, z: -54 }, radius: 1.6 },
      { pos: { x: -30, z: -70 }, radius: 1.5 },
    ],
    ponds: [LARKSPUR_LAKE],
  };
}

/** The lake at Larkspur, used for water rounds from Open level. */
export const LARKSPUR_LAKE: Pond = { center: { x: 40, z: -36 }, rx: 9, rz: 7 };

/** The exercise yard at Larchwood Rescue, where you meet the dogs. */
export function createShelterYard(): Field {
  return {
    style: 'shelter',
    minX: -16,
    maxX: 16,
    minZ: -22,
    maxZ: 8,
    line: { x: 0, z: 3 },
    cover: [],
    trees: [{ pos: { x: -11, z: -16 }, radius: 1.2 }],
  };
}

/** Cover density at a point, 0 in the open. Soft-edged so patches feel natural. */
export function coverAt(field: Field, p: Vec2): number {
  let best = 0;
  for (const patch of field.cover) {
    const d = distance(p, patch.center);
    if (d < patch.radius) {
      const edge = Math.min(1, (patch.radius - d) / 1.5);
      best = Math.max(best, patch.density * edge);
    }
  }
  return best;
}

export function insideField(field: Field, p: Vec2, margin = 0): boolean {
  return (
    p.x >= field.minX + margin &&
    p.x <= field.maxX - margin &&
    p.z >= field.minZ + margin &&
    p.z <= field.maxZ - margin
  );
}

export function clampToField(field: Field, p: Vec2, margin = 1): Vec2 {
  return {
    x: Math.min(field.maxX - margin, Math.max(field.minX + margin, p.x)),
    z: Math.min(field.maxZ - margin, Math.max(field.minZ + margin, p.z)),
  };
}

/** Pushes a moving body out of tree trunks. */
export function resolveTrees(field: Field, p: Vec2, bodyRadius: number): Vec2 {
  let out = p;
  for (const tree of field.trees) {
    const min = tree.radius + bodyRadius;
    const d = distance(out, tree.pos);
    if (d < min) {
      const away = d > 1e-6 ? normalize(sub(out, tree.pos)) : { x: 1, z: 0 };
      out = { x: tree.pos.x + away.x * min, z: tree.pos.z + away.z * min };
    }
  }
  return out;
}

/** Normalised distance from a pond's centre: under 1 is in the water. */
const ellipse = (pond: Pond, p: Vec2): number =>
  Math.hypot((p.x - pond.center.x) / pond.rx, (p.z - pond.center.z) / pond.rz);

/** Depth in metres-ish: 0 on dry land, growing past the water's edge. */
export function waterAt(field: Field, p: Vec2): number {
  let best = 0;
  for (const pond of field.ponds ?? []) {
    const e = ellipse(pond, p);
    if (e < 1) best = Math.max(best, (1 - e) * Math.min(pond.rx, pond.rz));
  }
  return best;
}

export const inWater = (field: Field, p: Vec2): boolean => waterAt(field, p) > 0.4;

/** The first pond on a straight path, where the path meets it, and whether it ends in it. */
export function waterCrossing(
  field: Field,
  from: Vec2,
  to: Vec2,
): { pond: Pond; entry: Vec2; distToEntry: number; endsInWater: boolean } | null {
  const length = distance(from, to);
  if (length < 0.5) return null;
  const dir = normalize(sub(to, from));
  for (const pond of field.ponds ?? []) {
    for (let d = 0; d <= length; d += 0.5) {
      const p = add(from, scale(dir, d));
      if (ellipse(pond, p) < 1) {
        return { pond, entry: p, distToEntry: d, endsInWater: ellipse(pond, to) < 1 };
      }
    }
  }
  return null;
}

/** Metres of water along a straight path, for par times. */
export function waterLength(field: Field, from: Vec2, to: Vec2): number {
  const length = distance(from, to);
  const dir = normalize(sub(to, from));
  let wet = 0;
  for (let d = 0; d < length; d += 0.5) if (inWater(field, add(from, scale(dir, d)))) wet += 0.5;
  return wet;
}

/** A point beyond the end of a pond, for running round it by the bank. */
export function bankWaypoint(pond: Pond, from: Vec2, to: Vec2): Vec2 {
  const dir = normalize(sub(to, from));
  const perp = { x: -dir.z, z: dir.x };
  const reach = 1 / Math.hypot(perp.x / pond.rx, perp.z / pond.rz) + 3.5;
  const a = add(pond.center, scale(perp, reach));
  const b = add(pond.center, scale(perp, -reach));
  const via = (w: Vec2) => distance(from, w) + distance(w, to);
  return via(a) <= via(b) ? a : b;
}

/** Keeps a walker (the keeper) on dry land. */
export function resolvePonds(field: Field, p: Vec2, radius: number): Vec2 {
  let out = p;
  for (const pond of field.ponds ?? []) {
    const grown = { center: pond.center, rx: pond.rx + radius, rz: pond.rz + radius };
    const e = ellipse(grown, out);
    if (e < 1 && e > 1e-6) {
      const k = 1 / e;
      out = {
        x: pond.center.x + (out.x - pond.center.x) * k,
        z: pond.center.z + (out.z - pond.center.z) * k,
      };
    }
  }
  return out;
}

export const pondShore = (pond: Pond, angle: number, extra = 0): Vec2 => ({
  x: pond.center.x + Math.sin(angle) * (pond.rx + extra),
  z: pond.center.z + Math.cos(angle) * (pond.rz + extra),
});
