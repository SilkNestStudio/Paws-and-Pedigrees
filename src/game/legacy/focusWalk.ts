export interface Point { x: number; z: number }
export const WALK_MARKERS: Point[] = [{ x: -4, z: 3 }, { x: -4, z: -3 }, { x: 3, z: -5 }, { x: 5, z: 2 }, { x: 0, z: 6 }];
export const DISTRACTIONS: Point[] = [{ x: -1.8, z: 1 }, { x: -2, z: -3.5 }, { x: 4, z: -2 }, { x: 2.5, z: 3.5 }];
export interface FocusWalk {
  keeper: Point; dog: Point; target: Point | null; marker: number; elapsed: number; active: number; together: number;
  distracted: number; distraction: Point | null; recovery: number; cue: number; cueCooldown: number;
  cues: number; praise: number; praised: number; completed: boolean; keeperMoving: boolean; dogMoving: boolean;
  attention: number; pace: 'easy' | 'brisk';
}
export function attentionFor(naturalFocus: number, learnedFocus: number, keeperXp: number) { return Math.min(.95, .25 + naturalFocus / 220 + learnedFocus / 200 + Math.min(keeperXp, 100) / 600); }
export function createFocusWalk(naturalFocus: number, learnedFocus: number, keeperXp: number): FocusWalk {
  return { keeper: { x: 0, z: 7 }, dog: { x: 1, z: 7.5 }, target: null, marker: 0, elapsed: 0, active: 0, together: 0, distracted: 0, distraction: null, recovery: 0, cue: 0, cueCooldown: 0, cues: 0, praise: 0, praised: -1, completed: false, keeperMoving: false, dogMoving: false, attention: attentionFor(naturalFocus, learnedFocus, keeperXp), pace: 'easy' };
}
export const gap = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
function move(p: Point, to: Point, speed: number, dt: number) {
  const distance = gap(p, to), step = Math.min(distance, speed * dt);
  if (distance > .01) { p.x += (to.x - p.x) / distance * step; p.z += (to.z - p.z) / distance * step; }
  p.x = Math.max(-8, Math.min(8, p.x)); p.z = Math.max(-8, Math.min(8, p.z));
  return step > .005;
}
export function cueFocus(s: FocusWalk) {
  if (s.completed || s.cueCooldown > 0) return false;
  s.distraction = null; s.distracted = 0; s.cue = 4; s.cueCooldown = 4; s.recovery = 6; s.cues++; return true;
}
export function praiseFocus(s: FocusWalk) {
  if (s.completed || s.distraction || gap(s.keeper, s.dog) > 2.3 || s.praised === s.marker) return false;
  s.praised = s.marker; s.praise++; s.recovery = Math.max(s.recovery, 4); return true;
}
export function stepFocusWalk(s: FocusWalk, dt: number, direction: Point = { x: 0, z: 0 }) {
  if (s.completed) return;
  dt = Math.min(Math.max(0, dt), .1); s.elapsed += dt; s.cue = Math.max(0, s.cue - dt); s.cueCooldown = Math.max(0, s.cueCooldown - dt); s.recovery = Math.max(0, s.recovery - dt);
  const speed = s.pace === 'easy' ? 1.85 : 3.25, length = Math.hypot(direction.x, direction.z);
  if (length > 0) { s.target = null; s.keeperMoving = move(s.keeper, { x: s.keeper.x + direction.x / length, z: s.keeper.z + direction.z / length }, speed, dt); }
  else s.keeperMoving = s.target ? move(s.keeper, s.target, speed, dt) : false;
  if (s.target && gap(s.keeper, s.target) < .08) s.target = null;
  if (!s.distraction && !s.cue && !s.recovery) {
    const smell = DISTRACTIONS.find(p => gap(s.dog, p) < (s.pace === 'brisk' ? 2.6 : 1.9) * (1.25 - s.attention));
    if (smell) { s.distraction = smell; s.distracted = 1.5 + (1 - s.attention) * 5; }
  }
  if (s.distraction) {
    s.dogMoving = move(s.dog, s.distraction, 1.2, dt); s.distracted -= dt;
    if (s.distracted <= 0) { s.distraction = null; s.recovery = 5; }
  } else {
    const distance = gap(s.dog, s.keeper);
    s.dogMoving = distance > 1.15 && move(s.dog, s.keeper, s.cue > 0 ? 3.8 : 1.8 + s.attention * 1.25, dt);
  }
  const active = s.keeperMoving || s.dogMoving || !!s.distraction;
  if (active) s.active += dt;
  if (active && !s.distraction && gap(s.dog, s.keeper) < 2.3) s.together += dt;
  if (gap(s.keeper, WALK_MARKERS[s.marker]) < 1 && gap(s.dog, s.keeper) < 2.3 && !s.distraction) { s.marker++; if (s.marker === WALK_MARKERS.length) s.completed = true; }
}
export function focusQuality(s: FocusWalk) {
  // No speed bonus: attentive handling, not rushing, is the aim of this lesson.
  return Math.round(Math.min(100, 20 + 65 * s.together / Math.max(1, s.active) + Math.min(15, s.praise * 3)));
}
