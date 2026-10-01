import type { Journey } from './journey';
import type { Point } from '../playyard/play';

export const JOBS = [
  { id: 'mara', title: 'The missing satchel', person: 'Mara', item: 'satchel', color: '#bd7051',
    story: "I took the orchard path and stopped by the old picnic table. Somewhere along the way I lost my satchel. Your grandpa always said a good nose was worth two pairs of eyes. Shall we see what your partner makes of it?",
    clues: [{ x: -10, z: 6, text: 'A torn blue ribbon. The same fabric as Mara’s scarf. The trail heads toward the wooden bridge.' }, { x: -12, z: -11, text: 'Fresh bootprints beyond the bridge. They turn toward the picnic clearing.' }], bag: { x: -7, z: -21 } },
  { id: 'ellis', title: 'A delivery gone astray', person: 'Ellis', item: 'medicine pouch', color: '#668bac',
    story: 'A strap broke on my delivery bag. A sealed medicine pouch is missing. I crossed the stepping stones and rested near the eastern lookout. Here is the empty bag for your dog to smell.',
    clues: [{ x: 11, z: 5, text: 'A canvas strap caught on a branch. Ellis crossed at the stepping stones.' }, { x: 12, z: -13, text: 'A delivery label beside the lookout trail. The pouch must be farther uphill.' }], bag: { x: 6, z: -24 } },
  { id: 'rowan', title: 'Grandpa’s old route', person: 'Rowan', item: 'field notebook', color: '#b99655',
    story: 'Your grandpa and I used to walk this loop. I was remembering those days and left my notebook behind. I went past the orchard, crossed the wooden bridge, then followed the north bank east.',
    clues: [{ x: -13, z: 8, text: 'A pencil beside the orchard. Rowan came this way.' }, { x: -10, z: -10, text: 'A page snagged on the bridge rail. The footprints follow the north bank east.' }], bag: { x: 14, z: -21 } },
] as const;
export type JobId = typeof JOBS[number]['id'];
export interface WorkRecord { completed: JobId[]; searchXp: number; best: number }
export const workRecord = (j: Journey): WorkRecord => j.work ?? { completed: [], searchXp: 0, best: 0 };
export function jobBlocked(j: Journey, id: JobId): string | null {
  if (!j.dog || !j.settled) return 'Bring your rescue home and help them settle in first.';
  if (id !== 'mara' && !workRecord(j).completed.includes('mara')) return 'Help Mara first. She will introduce you to the neighbors.';
  if (workRecord(j).completed.includes(id)) return null;
  if (j.routine.energy < 25 || j.routine.water < 25 || j.routine.food < 20) return 'Offer food, fresh water or rest at the run before heading out.';
  return null;
}
export function finishOuting(j: Journey, id: JobId, quality: number): Journey {
  if (jobBlocked(j, id) || !JOBS.some(job => job.id === id) || !Number.isFinite(quality)) return j;
  const previous = workRecord(j);
  if (previous.completed.includes(id)) return j; // replay is practice; no repeated payout
  return { ...j, dog: { ...j.dog!, bond: Math.min(100, j.dog!.bond + 4) },
    work: { completed: [...previous.completed, id], searchXp: previous.searchXp + 10, best: Math.max(previous.best, Math.round(Math.max(0, Math.min(100, quality)))) },
    routine: { ...j.routine, meals: j.routine.meals + 2, keeperXp: j.routine.keeperXp + 8, energy: j.routine.energy - 15, water: j.routine.water - 12, food: j.routine.food - 8 } };
}
export const START = { x: 0, z: 14 };
export const ROCKS = [{ x: -5, z: 4, r: 1.5 }, { x: 6, z: 0, r: 1.5 }, { x: -2, z: -14, r: 2 }, { x: 10, z: -18, r: 1.3 }];
export const RABBITS = [{ x: -15, z: 2 }, { x: 15, z: 0 }, { x: 2, z: -18 }];
export const apart = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
export function trailWalkable(p: Point) {
  return Number.isFinite(p.x) && Number.isFinite(p.z) && Math.abs(p.x) < 19 && p.z > -28 && p.z < 18
    && !(p.z < -2 && p.z > -6 && !(p.x > -14 && p.x < -10 || p.x > 10 && p.x < 14))
    && ROCKS.every(r => apart(p, r) > r.r + .35);
}
function clear(a: Point, b: Point) {
  const n = Math.max(1, Math.ceil(apart(a, b) * 4));
  for (let i = 0; i <= n; i++) if (!trailWalkable({ x: a.x + (b.x - a.x) * i / n, z: a.z + (b.z - a.z) * i / n })) return false;
  return true;
}
export function trailPath(from: Point, to: Point): Point[] {
  if (!trailWalkable(from) || !trailWalkable(to)) return [];
  if (clear(from, to)) return [{ ...to }];
  const candidates: Point[] = [];
  for (let x = Math.floor(from.x) - 1; x <= Math.ceil(from.x) + 1; x++) for (let z = Math.floor(from.z) - 1; z <= Math.ceil(from.z) + 1; z++) if (clear(from, { x, z })) candidates.push({ x, z });
  candidates.sort((a, b) => apart(a, from) - apart(b, from));
  if (!candidates.length) return [];
  const key = (p: Point) => `${p.x},${p.z}`, queue = [candidates[0]], seen = new Set([key(queue[0])]), parents = new Map<string, Point>();
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (apart(p, to) < 2 && clear(p, to)) {
      const route = [to, p]; let cursor = p;
      while (parents.has(key(cursor))) { cursor = parents.get(key(cursor))!; route.push(cursor); }
      route.reverse(); const smooth: Point[] = []; let anchor = from;
      for (let j = 0; j < route.length;) { let end = route.length - 1; while (end > j && !clear(anchor, route[end])) end--; smooth.push(route[end]); anchor = route[end]; j = end + 1; }
      return smooth;
    }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const next = { x: p.x + dx, z: p.z + dz }; if (!seen.has(key(next)) && clear(p, next)) { seen.add(key(next)); parents.set(key(next), p); queue.push(next); } }
  }
  return [];
}
function move(p: Point, dx: number, dz: number) {
  if (trailWalkable({ x: p.x + dx, z: p.z + dz })) { p.x += dx; p.z += dz; }
  else if (trailWalkable({ x: p.x + dx, z: p.z })) p.x += dx;
  else if (trailWalkable({ x: p.x, z: p.z + dz })) p.z += dz;
}
export interface Outing {
  id: JobId; keeper: Point; dog: Point; keeperAngle: number; dogAngle: number; keeperMoving: boolean; dogMoving: boolean;
  time: number; clues: number; sniff: number; scent: number; focus: number; learned: number;
  searchTraining: number; inspectSeconds: number; listening: boolean; signal: number; detecting: boolean; found: boolean; carrying: boolean; complete: boolean;
  route: Point[]; repath: number; send: Point | null; distraction: number; seenRabbits: number[]; recall: number;
  message: string; distance: number; distractions: number; active: number; together: number;
}
export function createOuting(j: Journey, id: JobId): Outing {
  return { id, keeper: { ...START }, dog: { x: 1.5, z: 13 }, keeperAngle: Math.PI, dogAngle: Math.PI, keeperMoving: false, dogMoving: false,
    time: 0, clues: 0, sniff: 0, scent: j.dog!.aptitude.scent, focus: j.dog!.aptitude.focus, learned: j.routine.focus,
    searchTraining: workRecord(j).searchXp, inspectSeconds: Math.max(.7, 1.6 - j.routine.keeperXp / 100), listening: true, signal: 0, detecting: false, found: false, carrying: false, complete: false, route: [], repath: 0, send: null,
    distraction: 0, seenRabbits: [], recall: 0, message: 'Mara’s trail starts in the orchard to the left. Walk together and watch your dog.', distance: 0, distractions: 0, active: 0, together: 0 };
}
export function searchTarget(s: Outing): Point { const job = JOBS.find(j => j.id === s.id)!; return job.clues[s.clues] ?? job.bag; }
export function whistle(s: Outing) { s.distraction = 0; s.recall = 3; s.send = null; s.repath = 0; s.message = 'Your dog checks back with you. Choose where to search next.'; }
export function sendSearch(s: Outing, p: Point) {
  if (s.complete || s.carrying || !trailWalkable(p) || apart(s.keeper, p) > 10) return false;
  s.send = { ...p }; s.recall = 0; s.repath = 0; s.message = 'Searching that patch. Follow close enough to support your dog.'; return true;
}
export function collectBag(s: Outing) {
  if (!s.found || s.carrying || apart(s.keeper, s.dog) > 3) return false;
  s.carrying = true; s.send = null; s.repath = 0; s.message = 'Safely retrieved. Bring your partner back to the trailhead.'; return true;
}
export function outingQuality(s: Outing) { return Math.round(Math.min(100, 60 + (s.active ? s.together / s.active : 0) * 35 + Math.max(0, 5 - s.distractions * 2))); }
export function stepOuting(s: Outing, delta: number, input: Point) {
  if (s.complete) return;
  const dt = Math.max(0, Math.min(.04, delta)); s.time += dt; s.repath -= dt; s.recall = Math.max(0, s.recall - dt); s.distraction = Math.max(0, s.distraction - dt);
  const old = { ...s.keeper }, n = Math.max(1, Math.hypot(input.x, input.z)), speed = s.listening ? 2.7 : 4.5;
  move(s.keeper, input.x / n * speed * dt, input.z / n * speed * dt);
  const traveled = apart(old, s.keeper); s.distance += traveled; s.keeperMoving = traveled > .001;
  if (s.keeperMoving) { s.keeperAngle = Math.atan2(input.x, input.z); s.active += dt; if (apart(s.dog, s.keeper) < 5) s.together += dt; }
  const target = searchTarget(s), range = (2.8 + s.scent / 18 + s.learned / 35 + s.searchTraining / 30) * (s.listening ? 1 : .45);
  s.signal = Math.max(0, 1 - apart(s.dog, target) / (range + 2));
  s.detecting = !s.carrying && apart(s.dog, target) < range && apart(s.keeper, s.dog) < 9 && s.recall <= 0;
  let destination: Point = s.send ?? { x: s.keeper.x + Math.sin(s.keeperAngle) * 2, z: s.keeper.z + Math.cos(s.keeperAngle) * 2 };
  if (!trailWalkable(destination)) destination = s.keeper;
  if (s.send && apart(s.dog, s.send) < .6) s.send = null;
  if (s.detecting || s.found && !s.carrying) destination = target;
  if (!s.carrying && !s.found && s.recall <= 0) RABBITS.forEach((p, i) => {
    if (!s.seenRabbits.includes(i) && apart(s.dog, p) < 3) {
      s.seenRabbits.push(i);
      if (s.focus + s.learned < 90) { s.distraction = 4; s.distractions++; s.message = 'Rabbit scent! Whistle to bring your partner back to the job.'; }
    }
  });
  if (s.distraction > 0) { destination = RABBITS[s.seenRabbits[s.seenRabbits.length - 1]]; s.detecting = false; }
  if (s.recall > 0 || s.carrying || apart(s.dog, s.keeper) > 10) destination = s.keeper;
  const stop = apart(s.dog, destination) < (s.carrying || s.recall > 0 ? 1.5 : .3);
  if (s.repath <= 0 && !stop) { s.route = trailPath(s.dog, destination); s.repath = .65; }
  s.dogMoving = false;
  if (!stop && s.route.length) {
    const t = s.route[0], d = apart(t, s.dog), step = Math.min(d, (s.detecting ? 2.6 : 4.3) * dt), before = { ...s.dog };
    if (d > .001) { move(s.dog, (t.x - s.dog.x) / d * step, (t.z - s.dog.z) / d * step); s.dogAngle = Math.atan2(t.x - before.x, t.z - before.z); }
    s.dogMoving = apart(before, s.dog) > .001; if (d < .2) s.route.shift();
  }
  if (!s.found && s.distraction <= 0 && s.recall <= 0 && apart(s.dog, target) < .8 && apart(s.keeper, s.dog) < 5) {
    s.sniff += dt;
    if (s.sniff > s.inspectSeconds) {
      const job = JOBS.find(j => j.id === s.id)!;
      s.message = job.clues[s.clues]?.text ?? `Found the ${job.item}! Come close and ask your dog to bring it.`;
      if (s.clues < 2) s.clues++; else s.found = true;
      s.sniff = 0; s.send = null; s.repath = 0;
    }
  } else s.sniff = 0;
  if (s.carrying && apart(s.keeper, START) < 2.5 && apart(s.dog, START) < 4) s.complete = true;
}
