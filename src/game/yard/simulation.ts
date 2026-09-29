export interface YardPosition {
    x: number;
    z: number;
}
const solids = [[-9, -2, -9, -2], [-6.7, -3.3, 1.4, 2.6], [6.1, 7.9, -3.9, -2.1]];
export function moveInYard(p: YardPosition, x: number, z: number, dt: number): YardPosition {
    const length = Math.max(1, Math.hypot(x, z));
    const step = 3.5 * Math.min(.05, Math.max(0, dt));
    const valid = (a: number, b: number) => Math.abs(a) < 10.5 && Math.abs(b) < 10.5 && !solids.some(([l, r, t, d]) => a > l - .3 && a < r + .3 && b > t - .3 && b < d + .3);
    const nx = p.x + x / length * step, nz = p.z + z / length * step;
    const next = { ...p };
    if (valid(nx, next.z))
        next.x = nx;
    if (valid(next.x, nz))
        next.z = nz;
    return next;
}
export const stations = [
    { id: 'water', name: 'Fill water bowl', x: 3, z: -3, hint: 'Walk over and leave a fresh serving for when they are thirsty.' },
    { id: 'food', name: 'Put out a meal', x: 5, z: -3, hint: 'Reserve one meal from the pantry for this companion.' },
    { id: 'rest', name: 'Settle down', x: -4, z: .5, hint: 'Take a breather on the outdoor bed.' },
    { id: 'inside', name: 'Inside the kennel', x: -5.6, z: -1.5, hint: 'Walk to the cottage door and return to your kennel.' },
    { id: 'supplies', name: 'Visit Supplies', x: 0, z: 9, hint: 'Walk to the entrance to open the shop.' },
    { id: 'agility', name: 'Enter agility training', x: 6, z: -9.5, hint: 'Train together on the full agility course.' },
] as const;
export function nearbyStation(p: YardPosition) { return stations.filter(s => Math.hypot(p.x - s.x, p.z - s.z) < 1.65).sort((a, b) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(p.x - b.x, p.z - b.z))[0]; }

export function stationApproach(station: typeof stations[number]): YardPosition {
    if (station.id === 'inside') return { x: -5.6, z: -.8 };
    if (station.id === 'rest') return { x: -2.7, z: .3 };
    if (station.id === 'supplies') return { x: 0, z: 8 };
    return { x: station.x, z: station.z + (station.id === 'agility' ? 1 : 1.8) };
}
