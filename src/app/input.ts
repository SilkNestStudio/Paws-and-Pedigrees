import { type Vec2 } from '../core/math';

/** Live input shared by keyboard, on-screen stick and the frame loop. */
export const input = {
  keys: new Set<string>(),
  /** Touch stick: x right, y forward, each -1..1. */
  stick: { x: 0, y: 0 },
  runHeld: false,
};

/** Camera orbit shared by the camera rig, controls and movement. */
export const cameraState = {
  /** Heading the camera looks along (0 = +z). Starts looking north up the field. */
  yaw: Math.PI,
  pitch: 0.38,
  zoom: 1,
  /** Time of the last manual orbit; auto-framing waits a moment after it. */
  manualAt: -99,
  watchDog: false,
};

/**
 * Steering for the keeper: W/S (or the stick up/down) walk forward and back,
 * A/D (or the stick left/right) turn. The camera stays behind the keeper, so
 * "forward" always means into the screen.
 */
export function steering(): { forward: number; turn: number; running: boolean; active: boolean } {
  const k = input.keys;
  let forward = input.stick.y;
  let turn = -input.stick.x;
  if (k.has('KeyW') || k.has('ArrowUp')) forward += 1;
  if (k.has('KeyS') || k.has('ArrowDown')) forward -= 1;
  if (k.has('KeyA') || k.has('ArrowLeft')) turn += 1;
  if (k.has('KeyD') || k.has('ArrowRight')) turn -= 1;
  forward = Math.max(-1, Math.min(1, forward));
  turn = Math.max(-1, Math.min(1, turn));
  const stickPush = Math.hypot(input.stick.x, input.stick.y);
  return {
    forward,
    turn,
    running:
      (k.has('ShiftLeft') || k.has('ShiftRight') || input.runHeld || input.stick.y > 0.92) &&
      forward > 0,
    active: Math.abs(forward) > 0.08 || Math.abs(turn) > 0.08 || stickPush > 0.15,
  };
}

/** Movement wish in world space from keys or stick, relative to the camera. */
export function movementVector(): { move: Vec2; running: boolean } {
  let forward = input.stick.y;
  let right = input.stick.x;
  const k = input.keys;
  if (k.has('KeyW') || k.has('ArrowUp')) forward += 1;
  if (k.has('KeyS') || k.has('ArrowDown')) forward -= 1;
  if (k.has('KeyD') || k.has('ArrowRight')) right += 1;
  if (k.has('KeyA') || k.has('ArrowLeft')) right -= 1;
  const len = Math.hypot(forward, right);
  if (len > 1) {
    forward /= len;
    right /= len;
  }
  const h = cameraState.yaw;
  const fx = Math.sin(h);
  const fz = Math.cos(h);
  const move = { x: fx * forward - fz * right, z: fz * forward + fx * right };
  const stickPush = Math.hypot(input.stick.x, input.stick.y);
  return {
    move,
    running: k.has('ShiftLeft') || k.has('ShiftRight') || input.runHeld || stickPush > 0.92,
  };
}
