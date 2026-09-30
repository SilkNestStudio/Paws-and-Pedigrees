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
  mode: FieldDiscipline; ability: number; phase: 'playing' | 'finished';
  dog: Point; target: Point; heading: number; moving: boolean; time: number;
  found: number[]; hidden: number[]; checked: number[]; mistakes: number;
  inspecting: number | null; inspection: number; signal: number;
  sheep: Sheep[]; gentle: boolean; dummies: Point[]; carrying: boolean;
  stamina: number; exhausted: boolean; feedback: string;
}
export function createField(mode: FieldDiscipline, ability: number, seed: number): FieldState {
  let value = Math.abs(Math.floor(seed)) % 2147483646 + 1;
  const random = () => { value = value * 16807 % 2147483647; return value / 2147483647; };
  const stations = Array.from({ length: 9 }, (_, i) => i);
  for (let i = stations.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [stations[i], stations[j]] = [stations[j], stations[i]]; }
  const flip = random() < .5 ? 1 : -1;
  return {
    mode, ability: clamp(ability, 10, 100), phase: 'playing', dog: { ...SHORE }, target: { ...SHORE }, heading: Math.PI, moving: false, time: 0,
    found: [], hidden: stations.slice(0, 3), checked: [], mistakes: 0, inspecting: null, inspection: 0, signal: 0,
    sheep: [{ x: -3.3, z: 1.2, penned: false, panic: 0 }, { x: .4, z: 2, penned: false, panic: 0 }, { x: 3.5, z: .5, penned: false, panic: 0 }], gentle: true,
    dummies: [{ x: -5 * flip, z: -3 }, { x: 5 * flip, z: -5 }, { x: -2 * flip, z: -1 }], carrying: false, stamina: 100, exhausted: false,
    feedback: mode === 'search' ? 'Send your dog to a station. Watch the scent signal before investigating.' : mode === 'herding' ? 'Get behind a sheep, opposite the far pen. Your position guides its movement.' : 'Retrieve dummy 1, then guide your dog back to the shore marker.',
  };
}
export function sendField(s: FieldState, p: Point) {
  if (s.phase !== 'playing' || !Number.isFinite(p.x) || !Number.isFinite(p.z) || s.exhausted) return;
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
export function stepField(s: FieldState, delta: number) {
  if (s.phase !== 'playing') return;
  const dt = clamp(delta, 0, .05); s.time += dt;
  const d = distance(s.dog, s.target), water = s.mode === 'water' && s.dog.z < 3.6;
  const speed = s.mode === 'water' ? (water ? 1.9 + s.ability * .025 : 3.7) * (water && inCurrent(s.dog) ? .58 : 1) * (s.stamina < 20 ? .7 : 1) : (s.mode === 'herding' && s.gentle ? 2.8 : 4) + s.ability * .008;
  s.moving = d > .06 && s.inspecting === null;
  if (s.moving) {
    const step = Math.min(d, speed * dt); s.heading = Math.atan2(s.target.x - s.dog.x, s.target.z - s.dog.z);
    s.dog.x += (s.target.x - s.dog.x) / d * step; s.dog.z += (s.target.z - s.dog.z) / d * step;
  }
  if (s.mode === 'search') {
    const nearest = Math.min(...s.hidden.filter(i => !s.found.includes(i)).map(i => distance(s.dog, SEARCH_STATIONS[i])));
    const range = 2 + s.ability * .035;
    s.signal = clamp(1 - nearest / range, 0, 1);
    if (s.inspecting !== null) {
      s.inspection += dt / (3 - s.ability * .018);
      if (s.inspection >= 1) {
        const index = s.inspecting; s.checked.push(index); s.inspecting = null; s.inspection = 0;
        if (s.hidden.includes(index)) { s.found.push(index); s.feedback = `Object found at station ${index + 1}. ${s.found.length} of 3 recovered.`; }
        else { s.mistakes++; s.feedback = 'An old scent, but no target. Use the live scent signal to narrow the next search.'; }
      }
    }
    if (s.found.length === 3) s.phase = 'finished';
  } else if (s.mode === 'herding') {
    for (const sheep of s.sheep) {
      if (sheep.penned) continue;
      sheep.panic = Math.max(0, sheep.panic - dt);
      const fromDog = distance(sheep, s.dog), radius = 2.5 + s.ability * .012;
      if (fromDog < radius && fromDog > .01) {
        const tooClose = fromDog < (s.gentle ? .45 : 1 - s.ability * .003);
        if (tooClose && sheep.panic === 0) { s.mistakes++; sheep.panic = 2; s.feedback = 'Too close! Back off and use steady handling to keep the flock calm.'; }
        const force = (s.gentle ? .92 : 1.65) * (1 - fromDog / radius) + .18;
        sheep.x = clamp(sheep.x + (sheep.x - s.dog.x) / fromDog * force * dt, -7.3, 7.3);
        sheep.z = clamp(sheep.z + (sheep.z - s.dog.z) / fromDog * force * dt, -6.5, 5.5);
        if (sheep.panic > 0) sheep.x = clamp(sheep.x + Math.sin(s.time * 5 + sheep.z) * dt * .6, -7.3, 7.3);
        if (sheep.z < -4.9 && Math.abs(sheep.x) > 2.1) sheep.z = -4.9;
        if (sheep.z < -5.1 && Math.abs(sheep.x) < 2.1) { sheep.penned = true; s.feedback = `${s.sheep.filter(v => v.penned).length} of 3 safely in the pen. Work behind the next sheep.`; }
      }
    }
    if (s.sheep.every(v => v.penned)) s.phase = 'finished';
  } else {
    s.stamina = clamp(s.stamina + (water ? -dt * (inCurrent(s.dog) ? 3 : 1.3) * (1.25 - s.ability * .008) : dt * 10), 0, 100);
    if (s.stamina < 3 && !s.exhausted) { s.exhausted = true; s.mistakes++; s.target = { ...SHORE }; s.feedback = 'Low stamina. Your dog is returning to shore to recover. Try a route around the current.'; }
    const target = s.dummies[s.found.length];
    if (!s.exhausted && !s.carrying && target && distance(s.dog, target) < .65) { s.carrying = true; s.target = { ...s.dog }; s.feedback = `Dummy ${s.found.length + 1} collected. Call your dog back or guide a return route.`; }
    if (s.dog.z > 4.3 && s.exhausted && s.stamina > 40) s.exhausted = false;
    if (s.carrying && distance(s.dog, SHORE) < .75) { s.carrying = false; s.found.push(s.found.length); s.stamina = clamp(s.stamina + 25, 0, 100); s.feedback = `${s.found.length} of 3 retrieves complete. Choose the next numbered dummy.`; }
    if (s.found.length === 3) s.phase = 'finished';
  }
  if (s.time >= 180) { s.phase = 'finished'; s.feedback = 'Time is up. Your completed work still counts. Review the result and try again.'; }
}
export function fieldScore(s: FieldState) {
  if (s.phase !== 'finished') return 0;
  const count = s.mode === 'herding' ? s.sheep.filter(v => v.penned).length : s.found.length;
  return Math.round(clamp(count * 30 + (count === 3 ? 10 : 0) - Math.max(0, s.time - (s.mode === 'herding' ? 80 : 40)) * .16 - s.mistakes * 5, 0, 100));
}
