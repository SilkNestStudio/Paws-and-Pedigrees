import { canWalk, propertyPath, walkStep } from './property';
import type { PlayGround, Point, YardPlay } from '../playyard/play';

export function yardAim(p: Point): Point {
  const bounded = { x: Math.max(-15.5, Math.min(15.5, p.x)), z: Math.max(-2.5, Math.min(18.5, p.z)) };
  if (canWalk(bounded)) return bounded;
  // Resolve a planter/sign hit to nearby reachable ground, not a lost toy.
  for (let r = .3; r < 4; r += .3) for (let i = 0; i < 16; i++) {
    const q = { x: bounded.x + Math.cos(i * Math.PI / 8) * r, z: bounded.z + Math.sin(i * Math.PI / 8) * r };
    if (canWalk(q)) return q;
  }
  return { x: 0, z: 8 };
}
function bounce(ball: YardPlay['ball'], previous: Point) {
  const end = { x: ball.x, z: ball.z };
  const steps = Math.max(1, Math.ceil(Math.hypot(end.x - previous.x, end.z - previous.z) / .08));
  let safe = previous;
  for (let i = 1; i <= steps; i++) {
    const next = { x: previous.x + (end.x - previous.x) * i / steps, z: previous.z + (end.z - previous.z) * i / steps };
    if (!canWalk(next)) {
      ball.x = safe.x; ball.z = safe.z; ball.vx *= -.45; ball.vz *= -.45; return;
    }
    safe = next;
  }
}
export const homeGround: PlayGround = { step: walkStep, path: (from, to) => propertyPath(from, yardAim(to)), clamp: yardAim, bounce };
