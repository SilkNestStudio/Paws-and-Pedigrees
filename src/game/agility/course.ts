export type ObstacleKind = 'jump' | 'tunnel' | 'weave' | 'seesaw';
export interface CourseObstacle { id: string; kind: ObstacleKind; x: number; z: number; label: string }
export interface Gate { obstacle: number; x: number; z: number; halfWidth: number; clearance?: number; maxHeight?: number }

export const COURSE: CourseObstacle[] = [
  { id: 'jump-1', kind: 'jump', x: 0, z: 5, label: 'First jump' },
  { id: 'jump-2', kind: 'jump', x: -4, z: -5, label: 'Left jump' },
  { id: 'tunnel', kind: 'tunnel', x: 2, z: -17, label: 'Tunnel' },
  { id: 'weave', kind: 'weave', x: -2, z: -32, label: 'Weave poles' },
  { id: 'seesaw', kind: 'seesaw', x: 2, z: -47, label: 'Seesaw' },
  { id: 'finish-jump', kind: 'jump', x: 0, z: -60, label: 'Final jump' },
];

export function buildGates(obstacles: CourseObstacle[]): Gate[] {
  return obstacles.flatMap((o, obstacle): Gate[] => {
    if (o.kind === 'jump') return [{ obstacle, x: o.x, z: o.z, halfWidth: 1.4, clearance: 0.65 }];
    if (o.kind === 'tunnel') return [3, -3].map(offset => ({ obstacle, x: o.x, z: o.z + offset, halfWidth: 0.8, maxHeight: 0.2 }));
    if (o.kind === 'weave') return Array.from({ length: 6 }, (_, i) => ({
      obstacle, x: o.x + (i % 2 === 0 ? 0.85 : -0.85), z: o.z + 4 - i * 1.6, halfWidth: 0.55, maxHeight: 0.15,
    }));
    return [3.6, 0, -3.6].map(offset => ({ obstacle, x: o.x, z: o.z + offset, halfWidth: 0.65 }));
  });
}

export const GATES = buildGates(COURSE);
export const FINISH_Z = -66;
export const FIELD = { minX: -13, maxX: 13, minZ: -72, maxZ: 20 };
