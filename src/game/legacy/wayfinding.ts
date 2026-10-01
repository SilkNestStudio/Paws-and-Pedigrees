import { BUILDINGS, type GroundPoint } from './property';

export function destinationBearing(from: GroundPoint, to: GroundPoint, yaw: number) {
  const dx = to.x - from.x, dz = to.z - from.z;
  const right = dx * Math.cos(yaw) - dz * Math.sin(yaw);
  const forward = -dx * Math.sin(yaw) - dz * Math.cos(yaw);
  const angle = Math.atan2(right, forward);
  return { distance: Math.hypot(dx, dz), angle: angle * 180 / Math.PI,
    direction: Math.abs(angle) > Math.PI * .7 ? 'Behind you' : Math.abs(angle) < .4 ? 'Ahead' : angle > 0 ? 'To your right' : 'To your left' };
}
export function faceDestination(from: GroundPoint, to: GroundPoint) {
  return Math.atan2(from.x - to.x, from.z - to.z);
}
export function shortestTurn(from: number, to: number) { return Math.atan2(Math.sin(to - from), Math.cos(to - from)); }
interface Point3 { x: number; y: number; z: number }
/** Retract the orbit before it intersects either building, including its roof. */
export function safeCameraPosition(focus: Point3, desired: Point3): Point3 {
  const distance = Math.hypot(desired.x - focus.x, desired.y - focus.y, desired.z - focus.z);
  const count = Math.ceil(distance / .15);
  let safe = { ...focus };
  for (let i = 1; i <= count; i++) {
    const t = i / count;
    const p = { x: focus.x + (desired.x - focus.x) * t, y: focus.y + (desired.y - focus.y) * t, z: focus.z + (desired.z - focus.z) * t };
    const blocked = BUILDINGS.some((b, index) => {
      const ridgeHeight = index ? 4.3 : 5.2, eaves = index ? 2.8 : 3.45;
      const roofHeight = Math.max(eaves, ridgeHeight - Math.abs(p.z - b.z) * .5) + .3;
      return p.x > b.x - b.width / 2 - .55 && p.x < b.x + b.width / 2 + .55 && p.z > b.z - b.depth / 2 - .55 && p.z < b.z + b.depth / 2 + .55 && p.y < roofHeight;
    });
    if (blocked) return safe;
    safe = p;
  }
  return desired;
}
