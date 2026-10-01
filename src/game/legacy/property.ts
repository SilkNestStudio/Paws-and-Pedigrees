import { newPlay, type YardPlay } from '../playyard/play';
export interface GroundPoint { x: number; z: number }
export type PlaceId = 'ledger' | 'run' | 'nursery' | 'field' | 'gate';
export const PLACES: { id: PlaceId; name: string; point: GroundPoint; lookAt: GroundPoint }[] = [
  { id: 'ledger', name: "Grandpa's ledger", point: { x: -4, z: -2.5 }, lookAt: { x: -4.25, z: -4 } },
  { id: 'run', name: 'The first dog run', point: { x: 3.3, z: -2.5 }, lookAt: { x: 4, z: -4 } },
  { id: 'nursery', name: 'The nursery', point: { x: 11.5, z: -.8 }, lookAt: { x: 11.8, z: -4.4 } },
  { id: 'field', name: 'Training grounds', point: { x: -12, z: 5 }, lookAt: { x: -20, z: -3 } },
  { id: 'gate', name: 'The road to town', point: { x: 0, z: 16.5 }, lookAt: { x: 0, z: 18.55 } },
];
// Expanded by the keeper's radius. Geometry and navigation share these footprints.
export const BUILDINGS = [
  { x: 0, z: -8.7, width: 17, depth: 7 },
  { x: 11.8, z: -7.5, width: 5, depth: 6 },
];
const obstacles = [
  ...BUILDINGS.map(b => [b.x - b.width / 2 - .35, b.x + b.width / 2 + .35, b.z - b.depth / 2 - .35, b.z + b.depth / 2 + .35]),
  [-6.1, -2.7, -4.8, -3.35], // ledger workbench
  [2, 5.8, -4.8, -3.35], // bed and run rail
  [-10.5, -8.8, 1, 5], // courtyard planting
  [7.4, 9.5, 6.8, 10.2], // tree planter
  [-3.5, -2.9, 4.2, 4.8], // courtyard fingerpost
  [-3.2, -2.4, 18, 19], [2.4, 3.2, 18, 19], // entrance pillars
];
export function canWalk(p: GroundPoint) {
  return Number.isFinite(p.x) && Number.isFinite(p.z) && p.x > -16 && p.x < 16 && p.z > -3 && p.z < 19
    && !obstacles.some(([l, r, t, b]) => p.x >= l && p.x <= r && p.z >= t && p.z <= b);
}
function clearPath(a: GroundPoint, b: GroundPoint) {
  const count = Math.max(1, Math.ceil(Math.hypot(a.x - b.x, a.z - b.z) / .2));
  for (let i = 0; i <= count; i++) if (!canWalk({ x: a.x + (b.x - a.x) * i / count, z: a.z + (b.z - a.z) * i / count })) return false;
  return true;
}
/** Bounded path search runs on a new destination, never on every frame. */
export function propertyPath(from: GroundPoint, to: GroundPoint): GroundPoint[] {
  if (!canWalk(from) || !canWalk(to)) return [];
  if (clearPath(from, to)) return [{ ...to }];
  const key = (p: GroundPoint) => `${p.x},${p.z}`;
  const candidates: GroundPoint[] = [];
  for (let x = Math.floor(from.x) - 1; x <= Math.ceil(from.x) + 1; x++) for (let z = Math.floor(from.z) - 1; z <= Math.ceil(from.z) + 1; z++) {
    if (canWalk({ x, z }) && clearPath(from, { x, z })) candidates.push({ x, z });
  }
  candidates.sort((a, b) => Math.hypot(a.x - from.x, a.z - from.z) - Math.hypot(b.x - from.x, b.z - from.z));
  if (!candidates.length) return [];
  const queue = [candidates[0]], visited = new Set([key(queue[0])]), parent = new Map<string, GroundPoint>();
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (Math.hypot(p.x - to.x, p.z - to.z) < 1.5 && clearPath(p, to)) {
      const path = [to, p]; let cursor = p;
      while (parent.has(key(cursor))) { cursor = parent.get(key(cursor))!; path.push(cursor); }
      path.reverse(); const smooth: GroundPoint[] = []; let anchor = from;
      for (let j = 0; j < path.length;) {
        let end = path.length - 1; while (end > j && !clearPath(anchor, path[end])) end--;
        smooth.push(path[end]); anchor = path[end]; j = end + 1;
      }
      return smooth;
    }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = { x: p.x + dx, z: p.z + dz };
      if (!visited.has(key(n)) && clearPath(p, n)) { visited.add(key(n)); parent.set(key(n), p); queue.push(n); }
    }
  }
  return [];
}
export function walkStep(position: GroundPoint, x: number, z: number) {
  if (canWalk({ x: position.x + x, z: position.z + z })) { position.x += x; position.z += z; }
  else if (canWalk({ x: position.x + x, z: position.z })) position.x += x;
  else if (canWalk({ x: position.x, z: position.z + z })) position.z += z;
}
export interface PropertyMotion {
  keeper: GroundPoint; dog: GroundPoint; route: GroundPoint[]; keys: Set<string>;
  stick: GroundPoint; yaw: number; overview: boolean; recall: boolean; wait: boolean; dogRoute: GroundPoint[];
  facing: number | null; destination: PlaceId | null;
  playing: boolean; play: YardPlay;
  care: { kind: 'meal' | 'water' | 'rest'; remaining: number } | null;
}
export function newMotion(): PropertyMotion {
  return { playing: false, play: newPlay(), keeper: { x: 0, z: 11 }, dog: { x: 1.5, z: 12 }, route: [], keys: new Set(), stick: { x: 0, z: 0 }, yaw: .15, overview: false, recall: false, wait: false, dogRoute: [], facing: null, destination: null, care: null };
}
