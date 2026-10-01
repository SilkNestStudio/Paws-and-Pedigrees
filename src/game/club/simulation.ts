import { performanceReport } from './performance';
import { clamp, type FieldDiscipline } from './model';
export interface Point { x: number; z: number; }
export const SHORE: Point = { x: 0, z: 6 };
export const SEARCH_STATIONS = [
  { x: -5, z: 3 }, { x: 0, z: 3 }, { x: 5, z: 3 },
  { x: -5, z: -.5 }, { x: 0, z: -.5 }, { x: 5, z: -.5 },
  { x: -5, z: -4 }, { x: 0, z: -4 }, { x: 5, z: -4 },
];
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
export interface Sheep extends Point { penned: boolean; panic: number; }
export interface FieldState {
  targetCount: number; mode: FieldDiscipline; ability: number; phase: 'playing' | 'finished';
  dog: Point; target: Point; heading: number; moving: boolean; time: number;
  found: number[]; hidden: number[]; checked: number[]; mistakes: number;
  inspecting: number | null; inspection: number; signal: number;
  sheep: Sheep[]; gentle: boolean; dummies: Point[]; carrying: boolean;
  stamina: number; exhausted: boolean; feedback: string;
  distanceTraveled: number; commands: number; workSeconds: number; currentSeconds: number; staminaUsed: number;
  indicated: number | null;
  selectedBox: number | null; boxSide: number; checkedSides: Record<number, number[]>; scentSides: number[];
  workState: string;
  herdTarget: number | null; herdSide: -1 | 0 | 1; driveClock: number;
  earlyReturns: number[]; pickupProgress: number; retrieveTarget: number | null; route: 'direct' | 'sheltered'; returning: boolean;

}
export function createField(mode: FieldDiscipline, ability: number, seed: number, targetCount = 3): FieldState {
  let value = Math.abs(Math.floor(seed)) % 2147483646 + 1;
  const random = () => { value = value * 16807 % 2147483647; return value / 2147483647; };
  const stations = Array.from({ length: 9 }, (_, i) => i);
  for (let i = stations.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [stations[i], stations[j]] = [stations[j], stations[i]]; }
  const flip = random() < .5 ? 1 : -1;
  return {
    targetCount, mode, ability: clamp(ability, 10, 100), phase: 'playing', dog: { ...SHORE }, target: { ...SHORE }, heading: Math.PI, moving: false, time: 0,
    found: [], hidden: stations.slice(0, mode === 'search' ? targetCount : 3), checked: [], mistakes: 0, inspecting: null, inspection: 0, signal: 0,
    sheep: [{ x: -3.3, z: 1.2, penned: false, panic: 0 }, { x: .4, z: 2, penned: false, panic: 0 }, { x: 3.5, z: .5, penned: false, panic: 0 }], gentle: true,
    dummies: targetCount > 3 ? [{ x: -6 * flip, z: -5 }, { x: 6 * flip, z: -5 }, { x: 0, z: -4.8 }, { x: -4 * flip, z: -6 }] : [{ x: -5 * flip, z: -3 }, { x: 5 * flip, z: -5 }, { x: -2 * flip, z: -1 }], carrying: false, stamina: 100, exhausted: false,
    distanceTraveled: 0, commands: 0, workSeconds: 0, currentSeconds: 0, staminaUsed: 0,
    selectedBox: null, boxSide: 0, checkedSides: {}, scentSides: stations.map((v, i) => (v + i) % 4),
    indicated: null, workState: 'Waiting for your cue',
    herdTarget: null, herdSide: 0, driveClock: 0, earlyReturns: [], pickupProgress: 0, retrieveTarget: null, route: 'direct', returning: false,
    feedback: mode === 'search' ? 'Choose a box. Your dog sniffs on arrival; guide it around another side if needed.' : mode === 'herding' ? 'Select a sheep to work. Your dog takes up pressure; use flank cues to correct the line.' : 'Send your dog to dummy 1. Watch the pickup and return; redirect if it turns home empty.',
  };
}
export function sendField(s: FieldState, p: Point) {
  if (s.phase !== 'playing' || !Number.isFinite(p.x) || !Number.isFinite(p.z) || s.exhausted) return;
  s.commands++; s.selectedBox = null; s.herdTarget = null; s.retrieveTarget = null; s.returning = false;
  s.workState = 'Following your direction';
  s.target = { x: clamp(p.x, -8, 8), z: clamp(p.z, -6.7, 6.7) }; s.inspecting = null; s.inspection = 0;
}
export function inspectField(s: FieldState) {
  if (s.phase !== 'playing' || s.mode !== 'search' || s.inspecting !== null) return;
  const index = SEARCH_STATIONS.findIndex(p => distance(p, s.dog) < .95);
  if (index < 0) { s.feedback = 'Move beside a search station before asking your dog to investigate.'; return; }
  if (s.checked.includes(index)) { s.feedback = 'You have already checked this station. Try another.'; return; }
  s.target = { ...s.dog }; s.inspecting = index; s.inspection = 0; s.feedback = 'Investigating. Give your dog a moment to work the scent.';
}
export function recallField(s: FieldState) {
  if (s.phase !== 'playing') return;
  sendField(s, SHORE);
  s.feedback = s.carrying ? 'Bring the dummy to the shore marker. You can set a waypoint around the current.' : 'Returning to your handler.';
}
export function behindSheep(s: FieldState, index: number): Point {
  const sheep = s.sheep[index], goal = { x: 0, z: -6 };
  const d = Math.max(.1, distance(sheep, goal));
  return { x: clamp(sheep.x + (sheep.x - goal.x) / d * 2.1, -8, 8), z: clamp(sheep.z + (sheep.z - goal.z) / d * 2.1, -6.5, 6.5) };
}
export function inCurrent(p: Point) { return Math.abs(p.x) < 1.8 && p.z < 1 && p.z > -5.5; }
export const BOX_SIDES = [{ x: 0, z: 1.35 }, { x: -1.35, z: 0 }, { x: 0, z: -1.35 }, { x: 1.35, z: 0 }];
export function searchBox(s: FieldState, index: number, side = 0) {
  if (s.phase !== 'playing' || s.mode !== 'search' || s.indicated !== null || !SEARCH_STATIONS[index] || !BOX_SIDES[side] || s.checked.includes(index)) return;
  if (s.checkedSides[index]?.includes(side)) { s.selectedBox = index; s.workState = 'Needs another angle'; s.feedback = 'That side is already checked. Choose another side of this box.'; return; }
  s.commands++; s.selectedBox = index; s.boxSide = side; s.inspecting = null; s.inspection = 0;
  const box = SEARCH_STATIONS[index], offset = BOX_SIDES[side];
  s.target = { x: box.x + offset.x, z: box.z + offset.z };
  s.workState = 'Approaching the box'; s.feedback = 'Your dog will sniff on arrival. If no scent is found, guide them around another side.';
}
export function scentLocation(s: FieldState, index: number): Point {
  const box = SEARCH_STATIONS[index], side = BOX_SIDES[s.scentSides[index]];
  return { x: box.x + side.x * .52, z: box.z + side.z * .52 };
}
export function confirmFind(s: FieldState) {
  if (s.phase !== 'playing' || s.indicated === null) return;
  s.commands++; s.found.push(s.indicated); s.indicated = null;
  s.workState = 'Find confirmed'; s.feedback = `${s.found.length} of ${s.targetCount} recovered. Continue this area or choose another.`;
  if (s.found.length >= s.targetCount) s.phase = 'finished';
}
export function workSheep(s: FieldState, index: number) {
  if (s.phase !== 'playing' || s.mode !== 'herding' || !s.sheep[index] || s.sheep[index].penned) return;
  s.commands++; s.herdTarget = index; s.herdSide = 0; s.driveClock = 0;
  s.workState = 'Balancing behind the sheep';
  s.feedback = 'Your dog will keep pressure on this sheep. Use flanks to correct its line; steady handling keeps the flock calmer.';
}
export function flankSheep(s: FieldState, side: -1 | 0 | 1) {
  if (s.phase !== 'playing' || s.herdTarget === null) return;
  s.commands++; s.herdSide = side; s.workState = side === 0 ? 'Driving toward the pen' : side < 0 ? 'Flanking left' : 'Flanking right';
}
export function retrieveDummy(s: FieldState, index: number, route: 'direct' | 'sheltered') {
  if (s.phase !== 'playing' || s.mode !== 'water' || s.carrying || s.exhausted || index !== s.found.length || !s.dummies[index]) return;
  s.commands++; s.pickupProgress = 0; s.retrieveTarget = index; s.route = route; s.returning = false;
  s.workState = 'Swimming out'; s.feedback = route === 'direct' ? 'Taking the direct line. Watch stamina in the dark current.' : 'Taking the longer sheltered line around the current.';
}
function searchWork(s: FieldState) {
  if (s.indicated !== null) { s.target = { ...s.dog }; s.workState = 'Indicating a find'; return; }
  if (s.selectedBox === null || s.inspecting !== null || distance(s.dog, s.target) > .12) return;
  const sides = s.checkedSides[s.selectedBox] ?? [];
  if (sides.includes(s.boxSide)) return;
  s.inspecting = s.selectedBox; s.inspection = 0; s.workState = 'Working the scent';
}
function herdWork(s: FieldState, dt: number) {
  if (s.herdTarget === null) return;
  const sheep = s.sheep[s.herdTarget];
  if (sheep.penned) { s.herdTarget = null; s.target = { ...s.dog }; s.workState = 'Sheep safely penned'; return; }
  s.driveClock -= dt;
  if (s.driveClock > 0) return;
  // A trained dog reassesses the moving flock more often and holds a safer distance.
  s.driveClock = 1.9 - s.ability * .016;
  const base = behindSheep(s, s.herdTarget);
  const dx = base.x - sheep.x, dz = base.z - sheep.z;
  const error = Math.sin(s.time * .85 + s.herdTarget * 2) * (1 - s.ability / 100) * (s.gentle ? .65 : 1.5);
  const angle = s.herdSide * .85 + error, cos = Math.cos(angle), sin = Math.sin(angle);
  let target = { x: sheep.x + dx * cos - dz * sin, z: sheep.z + dx * sin + dz * cos };
  // Flank around the sheep instead of charging straight through it.
  const ax = s.dog.x - sheep.x, az = s.dog.z - sheep.z;
  if (ax * (target.x - sheep.x) + az * (target.z - sheep.z) < -.2 && distance(s.dog, sheep) < 4 && s.dog.z < sheep.z + 1.5) {
    target = { x: s.dog.x, z: sheep.z + 2.8 };
  }
  s.target = { x: clamp(target.x, -8, 8), z: clamp(target.z, -6.5, 6.5) };
}
function waterWork(s: FieldState) {
  if (s.retrieveTarget === null || s.exhausted) return;
  const goal = s.returning ? SHORE : s.dummies[s.retrieveTarget];
  const side = s.dummies[s.retrieveTarget].x < 0 ? -1 : 1;
  // Fixed route choice, but the dog executes its own pickup and return.
  if (s.route === 'sheltered' && !s.returning && s.dog.z > 2 && Math.abs(s.dog.x - side * 4) > .3) s.target = { x: side * 4, z: 2.5 };
  else if (s.route === 'sheltered' && s.returning && s.dog.z < 2.4) s.target = { x: side * 4, z: 2.5 };
  else s.target = { ...goal };
}
export function stepField(s: FieldState, delta: number) {
  if (s.phase !== 'playing' || !Number.isFinite(delta) || delta <= 0) return;
  // Bound physics steps, rather than slowing simulation below 20 fps.
  const elapsed = Math.min(delta, .1), steps = Math.ceil(elapsed / (1 / 60));
  for (let i = 0; i < steps && s.phase === 'playing'; i++) tickField(s, elapsed / steps);
}
function tickField(s: FieldState, dt: number) {
  s.time += dt;
  if (s.mode === 'search') searchWork(s);
  if (s.mode === 'herding') herdWork(s, dt);
  if (s.mode === 'water') waterWork(s);
  const d = distance(s.dog, s.target), water = s.mode === 'water' && s.dog.z < 3.6;
  const speed = s.mode === 'water' ? (water ? 1.1 + s.ability * .048 : 3.7) * (water && inCurrent(s.dog) ? .5 : 1) * (s.stamina < 20 ? .65 : 1) : (s.mode === 'herding' && s.gentle ? 2.6 : 3.4) + s.ability * .014;
  s.moving = d > .06 && s.inspecting === null && s.indicated === null;
  if (s.moving) {
    const step = Math.min(d, speed * dt); s.heading = Math.atan2(s.target.x - s.dog.x, s.target.z - s.dog.z);
    s.dog.x += (s.target.x - s.dog.x) / d * step; s.dog.z += (s.target.z - s.dog.z) / d * step; s.distanceTraveled += step;
  }
  if (s.mode === 'search') {
    const nearest = Math.min(...s.hidden.filter(i => !s.found.includes(i)).map(i => distance(s.dog, scentLocation(s, i))));
    s.signal = clamp(1 - nearest / (.6 + s.ability * .033), 0, 1);
    if (s.inspecting !== null) {
      s.workSeconds += dt; s.inspection += dt / (5.2 - s.ability * .043);
      if (s.inspection >= 1) {
        const index = s.inspecting; s.inspecting = null; s.inspection = 0;
        if (s.selectedBox === null) {
          s.checked.push(index);
          if (s.hidden.includes(index)) s.found.push(index); else s.mistakes++;
        } else {
          s.checkedSides[index] = [...(s.checkedSides[index] ?? []), s.boxSide];
          const reach = .6 + s.ability * .033;
          if (s.hidden.includes(index) && distance(s.dog, scentLocation(s, index)) < reach) {
            s.checked.push(index); s.indicated = index; s.workState = 'Indicating a find';
            s.feedback = `Your dog has located scent at box ${index + 1}. Confirm the find.`;
          } else if (reach > 2.1 || s.checkedSides[index].length === 4) {
            s.checked.push(index); s.mistakes++; s.workState = 'Box cleared';
            s.feedback = 'No target in this box. Choose another box; use the scent signal to narrow your search.';
          } else {
            s.workState = 'Needs another angle'; s.feedback = 'No scent from this side. Guide your dog to the left, back or right side of the box.';
          }
        }
      }
    }
    if (s.found.length >= s.targetCount) s.phase = 'finished';
  } else if (s.mode === 'herding') {
    for (const sheep of s.sheep) {
      if (sheep.penned) continue;
      sheep.panic = Math.max(0, sheep.panic - dt);
      const fromDog = distance(sheep, s.dog), radius = 2.1 + s.ability * .024;
      if (fromDog < radius && fromDog > .01) {
        const tooClose = fromDog < (s.gentle ? .6 : 1.6 - s.ability * .009);
        if (tooClose && sheep.panic === 0) { s.mistakes++; sheep.panic = 2; s.feedback = 'The flock scattered. Use steady pressure or a wider flank.'; }
        const force = (s.gentle ? 1.6 : 2.3) * (1 - fromDog / radius) + .18;
        sheep.x = clamp(sheep.x + (sheep.x - s.dog.x) / fromDog * force * dt, -7.3, 7.3);
        sheep.z = clamp(sheep.z + (sheep.z - s.dog.z) / fromDog * force * dt, -6.5, 5.5);
        if (sheep.panic > 0) sheep.x = clamp(sheep.x + Math.sin(s.time * 5 + sheep.z) * dt, -7.3, 7.3);
        if (sheep.z < -4.9 && Math.abs(sheep.x) > 2.1) sheep.z = -4.9;
        if (sheep.z < -5.1 && Math.abs(sheep.x) < 2.1) { sheep.penned = true; s.feedback = `${s.sheep.filter(v => v.penned).length} of 3 penned. Choose the next sheep.`; }
      }
    }
    if (s.sheep.filter(v => v.penned).length >= s.targetCount) s.phase = 'finished';
  } else {
    const drain = water ? dt * (inCurrent(s.dog) ? 6 : 2.6) * (1.3 - s.ability * .01) : 0;
    s.staminaUsed += drain; if (water && inCurrent(s.dog)) s.currentSeconds += dt;
    s.stamina = clamp(s.stamina + (water ? -drain : dt * 10), 0, 100);
    if (s.stamina < 3 && !s.exhausted) { s.exhausted = true; s.mistakes++; s.target = { ...SHORE }; s.workState = 'Returning to recover'; s.feedback = 'Low stamina: returning to shore. A sheltered route uses less effort.'; }
    const target = s.dummies[s.found.length];
    if (!s.exhausted && !s.carrying && target && s.ability < 38 && s.earlyReturns.length === 0 && distance(s.dog, target) < 1.1) {
      s.earlyReturns.push(s.found.length); s.retrieveTarget = null; s.target = { ...SHORE }; s.mistakes++;
      s.workState = 'Returning without the dummy'; s.feedback = 'Your dog turned home before securing the dummy. Send them to it again; training improves retrieve follow-through.';
    }
    if (!s.exhausted && !s.carrying && target && distance(s.dog, target) < .65) {
      s.target = { ...s.dog }; s.pickupProgress += dt / (4.5 - s.ability * .033); s.workState = 'Securing the dummy';
      if (s.pickupProgress >= 1) {
        s.pickupProgress = 0; s.carrying = true; s.returning = true;
        s.retrieveTarget ??= s.found.length; s.target = { ...SHORE };
        s.workState = 'Bringing the dummy home'; s.feedback = 'Collected. Your dog is bringing it back; you can redirect the return route.';
      }
    } else s.pickupProgress = 0;
    if (water && inCurrent(s.dog) && !s.exhausted && !s.pickupProgress) {
      const drift = (.85 - s.ability * .007) * dt; s.dog.x += drift; s.distanceTraveled += drift;
    }
    if (s.dog.z > 4.3 && s.exhausted && s.stamina > 40) { s.exhausted = false; s.retrieveTarget = null; s.workState = 'Recovered at shore'; }
    if (s.carrying && distance(s.dog, SHORE) < .75) { s.carrying = false; s.found.push(s.found.length); s.retrieveTarget = null; s.returning = false; s.target = { ...SHORE }; s.workState = 'Retrieve delivered'; s.feedback = `${s.found.length} of ${s.targetCount} retrieves complete. Let stamina recover or choose your next route.`; }
    if (s.found.length >= s.targetCount) s.phase = 'finished';
  }
  if (s.time >= 180) { s.phase = 'finished'; s.feedback = 'Time is up. Your completed work still counts. Review the result and try again.'; }
}
export function fieldReport(s: FieldState) {
  return performanceReport({ discipline: s.mode, completed: s.mode === 'herding' ? s.sheep.filter(v => v.penned).length : s.found.length, total: s.targetCount,
    seconds: s.time, distance: s.distanceTraveled, mistakes: s.mistakes, commands: s.commands,
    workSeconds: s.workSeconds, currentSeconds: s.currentSeconds, staminaUsed: s.staminaUsed });
}
export function fieldScore(s: FieldState) { return s.phase === 'finished' ? fieldReport(s).score : 0; }
