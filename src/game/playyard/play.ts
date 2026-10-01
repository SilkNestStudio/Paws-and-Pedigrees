export interface Point { x: number; z: number }
export const BEDS = [{ x: -3, z: -1, r: 1.15 }, { x: 5, z: -3, r: .95 }, { x: -6, z: 5, r: .85 }];
export const DOGS = {
  pip: { name: 'Pip', color: '#bc6a32', speed: 5.8, description: 'Fast feet. Loves a victory lap. Call him in when he gets carried away.' },
  june: { name: 'June', color: '#e7c5a0', speed: 4.3, description: 'A thoughtful explorer. On long throws, a little encouragement helps her commit.' },
};
export type DogId = keyof typeof DOGS;
export type Phase = 'ready' | 'chase' | 'hesitate' | 'parade' | 'return';
export interface YardPlay {
  handling?: { hesitates: boolean; parades: boolean; familiar: boolean };
  keeper: Point; dog: Point; ball: Point & { y: number; vx: number; vy: number; vz: number };
  personality: DogId; phase: Phase; aim: Point; charging: boolean; charge: number;
  time: number; phaseTime: number; returns: number; throws: number; longest: number; lastThrow: number;
  route: Point[]; repath: number; recalled: boolean; feedback: string; keeperMoving: boolean; dogMoving: boolean;
  keeperAngle: number; dogAngle: number; targetHits: number; scoredThrow: boolean;
}
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
export const clampPoint = (p: Point): Point => ({ x: Math.max(-9.5, Math.min(9.5, p.x)), z: Math.max(-7.5, Math.min(9.5, p.z)) });
export function walkable(p: Point) { return p.x >= -9.5 && p.x <= 9.5 && p.z >= -7.5 && p.z <= 9.5 && BEDS.every(b => distance(p, b) > b.r + .32); }
export function stepPerson(p: Point, dx: number, dz: number) {
  if (walkable({ x: p.x + dx, z: p.z + dz })) { p.x += dx; p.z += dz; }
  else { if (walkable({ x: p.x + dx, z: p.z })) p.x += dx; if (walkable({ x: p.x, z: p.z + dz })) p.z += dz; }
}
function clear(a: Point, b: Point) { const n = Math.ceil(distance(a, b) * 5); for (let i = 1; i <= n; i++) if (!walkable({ x: a.x + (b.x - a.x) * i / n, z: a.z + (b.z - a.z) * i / n })) return false; return true; }
export function dogPath(from: Point, target: Point): Point[] {
  const to = clampPoint(target);
  // Balls rest outside planters; stop the dog at their edge when necessary.
  for (const bed of BEDS) { const d = distance(to, bed); if (d < bed.r + .4) { const angle = Math.atan2(to.z - bed.z, to.x - bed.x); to.x = bed.x + Math.cos(angle) * (bed.r + .45); to.z = bed.z + Math.sin(angle) * (bed.r + .45); } }
  if (clear(from, to)) return [to];
  const nodes: Point[] = [];
  for (let x = -9; x <= 9; x++) for (let z = -7; z <= 9; z++) if (walkable({ x, z })) nodes.push({ x, z });
  const start = nodes.filter(p => clear(from, p)).sort((a, b) => distance(a, from) - distance(b, from))[0];
  if (!start) return [];
  const key = (p: Point) => `${p.x},${p.z}`, queue = [start], visited = new Set([key(start)]), previous = new Map<string, Point>();
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (clear(p, to)) { const route = [to, p]; let cursor = p; while (previous.has(key(cursor))) { cursor = previous.get(key(cursor))!; route.push(cursor); } return route.reverse(); }
    for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = { x: p.x + x, z: p.z + z }; if (!visited.has(key(n)) && n.x >= -9 && n.x <= 9 && n.z >= -7 && n.z <= 9 && clear(p, n)) { visited.add(key(n)); previous.set(key(n), p); queue.push(n); } }
  }
  return [];
}
export function newPlay(personality: DogId = 'pip'): YardPlay {
  return { keeper: { x: 0, z: 6 }, dog: { x: 1.6, z: 5 }, ball: { x: 0, z: 6, y: 1.2, vx: 0, vy: 0, vz: 0 }, personality, phase: 'ready', aim: { x: 1, z: -3 }, charging: false, charge: 0, time: 0, phaseTime: 0, returns: 0, throws: 0, longest: 0, lastThrow: 0, route: [], repath: 0, recalled: false, feedback: 'Pick a spot. Hold, aim, and release your throw.', keeperMoving: false, dogMoving: false, keeperAngle: Math.PI, dogAngle: 0, targetHits: 0, scoredThrow: false };
}
export function launchVelocity(s: YardPlay) {
  const vy = 3 + s.charge * 4, time = (vy + Math.sqrt(vy * vy + 2 * 12 * 1.15)) / 12;
  return { vx: (s.aim.x - s.keeper.x) / time, vy, vz: (s.aim.z - s.keeper.z) / time };
}
export function throwToy(s: YardPlay) {
  if (s.phase !== 'ready') return false;
  Object.assign(s.ball, s.keeper, { y: 1.3 }, launchVelocity(s));
  s.lastThrow = distance(s.keeper, s.aim); s.longest = Math.max(s.longest, s.lastThrow); s.throws++; s.scoredThrow = false;
  s.phase = (s.handling?.hesitates ?? s.personality === 'june') && s.lastThrow > 9 && (s.handling ? !s.handling.familiar : s.returns < 3) ? 'hesitate' : 'chase';
  s.phaseTime = 0; s.charging = false; s.charge = 0; s.repath = 0; s.recalled = false;
  s.feedback = s.phase === 'hesitate' ? 'Your dog is unsure about that distance. Encourage them—or go closer together.' : 'Off they go! You can move while your dog chases.';
  return true;
}
export function callPlayDog(s: YardPlay) {
  s.recalled = true; s.repath = 0;
  if (s.phase === 'hesitate') { s.phase = 'chase'; s.phaseTime = 0; s.feedback = 'That helped. Your dog is going for it.'; }
  else if (s.phase === 'parade') { s.phase = 'return'; s.phaseTime = 0; s.feedback = 'Your dog heard you. Here comes your toy.'; }
  else s.feedback = s.phase === 'ready' ? 'Come on over. There is time for another throw.' : 'Your dog heard you. Give them a moment to bring it back.';
}
export function movingTarget(time: number): Point { return { x: Math.sin(time * .28) * 5.5, z: -5.2 }; }
export interface PlayGround {
  step: typeof stepPerson; path: typeof dogPath; clamp: typeof clampPoint;
  bounce?: (ball: YardPlay['ball'], previous: Point) => void;
  speed?: number;
}
const garden: PlayGround = { step: stepPerson, path: dogPath, clamp: clampPoint };
export function stepPlay(s: YardPlay, delta: number, input: Point = { x: 0, z: 0 }, ground: PlayGround = garden) {
  const dt = Math.min(.04, Math.max(0, delta)); s.time += dt; s.phaseTime += dt; s.repath -= dt;
  const length = Math.hypot(input.x, input.z), before = { ...s.keeper };
  if (length > 0) { ground.step(s.keeper, input.x / Math.max(1, length) * 3.8 * dt, input.z / Math.max(1, length) * 3.8 * dt); s.keeperAngle = Math.atan2(input.x, input.z); }
  s.keeperMoving = distance(before, s.keeper) > .001;
  if (s.charging) { s.charge = Math.min(1, s.charge + dt / .85); s.keeperAngle = Math.atan2(s.aim.x - s.keeper.x, s.aim.z - s.keeper.z); }
  const loose = s.phase === 'chase' || s.phase === 'hesitate';
  if (loose) {
    const b = s.ball, previous = { x: b.x, z: b.z }; b.vy -= 12 * dt; b.x += b.vx * dt; b.z += b.vz * dt; b.y += b.vy * dt;
    if (b.y < .15) { b.y = .15; b.vy = Math.abs(b.vy) > 1 ? Math.abs(b.vy) * .4 : 0; const friction = Math.exp(-3 * dt); b.vx *= friction; b.vz *= friction; }
    if (ground.bounce) ground.bounce(b, previous);
    else {
      for (const axis of ['x', 'z'] as const) { const min = axis === 'x' ? -9.6 : -7.6, max = 9.6; if (b[axis] < min || b[axis] > max) { b[axis] = Math.max(min, Math.min(max, b[axis])); if (axis === 'x') b.vx *= -.55; else b.vz *= -.55; } }
      for (const bed of BEDS) { const d = distance(b, bed); if (b.y < .8 && d < bed.r + .16) { const nx = (b.x - bed.x) / Math.max(d, .001), nz = (b.z - bed.z) / Math.max(d, .001), dot = b.vx * nx + b.vz * nz; b.x = bed.x + nx * (bed.r + .18); b.z = bed.z + nz * (bed.r + .18); if (dot < 0) { b.vx -= 1.6 * dot * nx; b.vz -= 1.6 * dot * nz; } } }
      if (!s.scoredThrow && b.y < .6 && distance(b, movingTarget(s.time)) < 1.1) { s.scoredThrow = true; s.targetHits++; s.feedback = 'Right on the moving patch! Now bring it home.'; }
    }
  }
  if (s.phase === 'hesitate' && (s.phaseTime > 2.8 || distance(s.keeper, s.ball) < 6)) { s.phase = 'chase'; s.repath = 0; }
  if (s.phase === 'chase' && distance(s.dog, s.ball) < .7 && s.ball.y < .7) {
    s.phase = (s.handling?.parades ?? s.personality === 'pip') && s.lastThrow > 8 && (s.handling ? !s.handling.familiar : s.returns < 3) && !s.recalled ? 'parade' : 'return'; s.phaseTime = 0; s.repath = 0;
    s.feedback = s.phase === 'parade' ? 'Your dog wants to show it off. Call them in, or let them enjoy a lap.' : 'Got it! Make room for the return.';
  }
  if (s.phase === 'parade' && s.phaseTime > 2.5) { s.phase = 'return'; s.repath = 0; }
  let destination: Point = s.keeper;
  if (s.phase === 'chase') destination = s.ball;
  if (s.phase === 'parade') destination = ground.clamp({ x: s.keeper.x + Math.cos(s.phaseTime * 2) * 3.5, z: s.keeper.z + Math.sin(s.phaseTime * 2) * 3.5 });
  if (s.phase === 'ready' && !s.recalled) destination = ground.clamp({ x: s.keeper.x + Math.cos(s.time * .4) * 2, z: s.keeper.z - 1.8 + Math.sin(s.time * .4) });
  const stop = s.phase === 'hesitate' || (s.phase === 'return' && distance(s.dog, s.keeper) < 1.2) || (s.recalled && s.phase === 'ready' && distance(s.dog, s.keeper) < 1.5);
  if (s.repath <= 0 && !stop) { s.route = ground.path(s.dog, destination); s.repath = .35; }
  s.dogMoving = false;
  if (!stop && s.route.length) { const target = s.route[0], d = distance(s.dog, target), speed = s.phase === 'ready' ? 1.3 : ground.speed ?? DOGS[s.personality].speed; if (d > .02) { const step = Math.min(d, speed * dt); const dx = (target.x - s.dog.x) / d, dz = (target.z - s.dog.z) / d; ground.step(s.dog, dx * step, dz * step); s.dogAngle = Math.atan2(dx, dz); s.dogMoving = true; } if (d < .18) s.route.shift(); }
  if (s.phase === 'return' && distance(s.dog, s.keeper) < 1.25) { s.phase = 'ready'; s.returns++; s.recalled = false; s.route = []; s.feedback = !s.handling && s.returns === 3 ? 'Three returns together. Your dog is getting the hang of this—try a longer throw.' : 'Back in your hand. Where shall we go next?'; }
  if (s.phase === 'ready') Object.assign(s.ball, { x: s.keeper.x + Math.cos(s.keeperAngle) * .34 + Math.sin(s.keeperAngle) * (s.charging ? .4 : 0), z: s.keeper.z - Math.sin(s.keeperAngle) * .34 + Math.cos(s.keeperAngle) * (s.charging ? .4 : 0), y: s.charging ? 1.3 + s.charge * .2 : .92 });
  if (s.phase === 'return' || s.phase === 'parade') Object.assign(s.ball, { x: s.dog.x + Math.sin(s.dogAngle) * .75, z: s.dog.z + Math.cos(s.dogAngle) * .75, y: .7 });
}
