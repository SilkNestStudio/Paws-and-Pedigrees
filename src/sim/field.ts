import { distance, normalize, sub, type Vec2 } from '../core/math';

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

export type FieldStyle = 'training' | 'orchard' | 'green' | 'shelter';

export interface Field {
  style: FieldStyle;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  line: Vec2;
  cover: CoverPatch[];
  trees: Tree[];
}

export function createTrainingField(): Field {
  return {
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
