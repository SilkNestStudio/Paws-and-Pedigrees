import {
  distance,
  fromHeading,
  headingOf,
  sub,
  turnToward,
  wrapAngle,
  type Vec2,
} from '../core/math';
import type { KeeperAgent } from '../sim/agents';
import { live } from '../app/store';
import { steering } from '../app/input';
import { currentTargets } from './Targets';

/**
 * Keeper steering and the "where should I be looking?" rule shared by the
 * frame loop and the camera. The camera sits behind the keeper, so turning
 * the keeper turns the view.
 */
export const steerState = {
  /** Seconds (performance clock) when the player last steered. */
  lastActive: -99,
};

const TURN_RATE = 2.6; // rad/s at full turn input
const now = () => performance.now() / 1000;

/** What deserves the keeper's (and so the camera's) attention right now. */
export function focusPoint(): Vec2 | null {
  const f = live.field;
  if (f && !f.setup.free) {
    const flying = f.items.find((i) => i.state === 'flying' && i.kind !== 'ball');
    if (flying) return flying.landing;
    const atSide = f.dog.mode === 'sit' || f.dog.mode === 'heel';
    if (!atSide && distance(f.dog.pos, f.keeper.pos) > 4) return f.dog.pos;
    const marks = f.items
      .filter((i) => i.kind === 'mark' && i.state === 'lying')
      .sort((a, b) => b.landedAt - a.landedAt);
    if (marks[0]) return marks[0].landing;
    const blind = f.items.find((i) => i.kind === 'blind' && i.state === 'lying');
    if (blind) return blind.pos;
    return null;
  }
  const s = live.search;
  if (s) {
    const atSide = s.dog.mode === 'sit' || s.dog.mode === 'heel';
    if (!atSide && distance(s.dog.pos, s.keeper.pos) > 4) return s.dog.pos;
    if (s.phase === 'ready' || s.phase === 'searching') return s.setup.hintCenter;
  }
  return null;
}

/**
 * How far ahead the camera needs to see: the farthest of the focus and the
 * marked targets that lie roughly in front of the keeper (so a running dog
 * and the fall it is heading for both stay in view).
 */
export function framingReach(k: KeeperAgent): number {
  const points: Vec2[] = currentTargets().map((t) => t.pos);
  const focus = focusPoint();
  if (focus) points.push(focus);
  let reach = 0;
  for (const p of points) {
    const d = distance(p, k.pos);
    if (d < 1) continue;
    const off = Math.abs(wrapAngle(headingOf(sub(p, k.pos)) - k.heading));
    if (off < 1.2) reach = Math.max(reach, d);
  }
  return reach;
}

/**
 * Applies steering to a keeper. Returns true if the player steered this frame.
 * When the player isn't steering, the keeper turns to face what matters.
 */
export function driveKeeper(k: KeeperAgent, dt: number, paused: boolean): boolean {
  const { forward, turn, running, active } = steering();
  if (paused) {
    k.input = { x: 0, z: 0 };
    k.backing = false;
    return false;
  }
  if (Math.abs(turn) > 0.05) k.heading = wrapAngle(k.heading + turn * TURN_RATE * dt);
  k.backing = forward < -0.1;
  k.input =
    Math.abs(forward) > 0.08
      ? fromHeading(k.heading, Math.min(1, Math.abs(forward)))
      : { x: 0, z: 0 };
  k.running = running;
  if (active) {
    steerState.lastActive = now();
    return true;
  }
  const focus = focusPoint();
  if (focus && now() - steerState.lastActive > 0.6 && k.speed < 0.4 && distance(focus, k.pos) > 2) {
    k.heading = turnToward(k.heading, headingOf(sub(focus, k.pos)), 2.4 * dt);
  }
  return false;
}
