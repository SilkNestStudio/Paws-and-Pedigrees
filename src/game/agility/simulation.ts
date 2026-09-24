import { COURSE, FIELD, FINISH_Z, GATES } from './course';

export interface Controls { x: number; z: number; jump: boolean }
export interface RunState {
  x: number; y: number; z: number; vx: number; vz: number; vy: number;
  heading: number; grounded: boolean; gate: number; faults: number; time: number;
  finished: boolean; feedback: string; faultGate: number; jumpHeld: boolean;
}
export const createRun = (): RunState => ({
  x: 0, y: 0, z: 14, vx: 0, vz: 0, vy: 0, heading: Math.PI,
  grounded: true, gate: 0, faults: 0, time: 0, finished: false,
  feedback: 'Follow the numbered course. Jump with Space.', faultGate: -1, jumpHeld: false,
});
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const approach = (n: number, target: number, amount: number) => n + clamp(target - n, -amount, amount);

export function seesawAngle(z: number, x: number): number {
  const o = COURSE.find(o => o.kind === 'seesaw')!;
  return Math.abs(x - o.x) <= 0.9 && Math.abs(z - o.z) <= 4.2
    ? clamp((z - o.z) / 4, -1, 1) * 0.23 : 0.23;
}
export function surfaceHeight(x: number, z: number): number {
  const o = COURSE.find(o => o.kind === 'seesaw')!;
  if (Math.abs(x - o.x) > 0.85 || Math.abs(z - o.z) > 4) return 0;
  return Math.max(0, 1 - Math.sin(seesawAngle(z, x)) * (z - o.z));
}

/** Pure, bounded-step kinematic simulation; React only receives HUD snapshots. */
export function stepRun(run: RunState, input: Controls, elapsed: number, maxSpeed = 6): void {
  if (run.finished || elapsed <= 0 || !Number.isFinite(elapsed)) return;
  const duration = Math.min(elapsed, 0.1);
  const count = Math.ceil(duration / (1 / 120));
  for (let step = 0; step < count && !run.finished; step++) {
    const dt = duration / count;
    run.time += dt;
    const length = Math.max(1, Math.hypot(input.x, input.z));
    run.vx = approach(run.vx, input.x / length * maxSpeed, 22 * dt);
    run.vz = approach(run.vz, input.z / length * maxSpeed, 22 * dt);
    const oldX = run.x, oldZ = run.z, oldY = run.y;
    run.x = clamp(run.x + run.vx * dt, FIELD.minX, FIELD.maxX);
    run.z = clamp(run.z + run.vz * dt, FIELD.minZ, FIELD.maxZ);
    const tunnel = COURSE.find(o => o.kind === 'tunnel')!;
    const inTunnel = run.gate > 2 && run.gate < 4 && Math.abs(run.z - tunnel.z) < 3.3;
    if (inTunnel) run.x = clamp(run.x, tunnel.x - 0.75, tunnel.x + 0.75);
    if (input.jump && !run.jumpHeld && run.grounded && !inTunnel) {
      run.vy = 6.4; run.grounded = false;
    }
    run.jumpHeld = input.jump;
    const floor = surfaceHeight(run.x, run.z);
    if (run.grounded && floor - run.y < 0.3 && floor - run.y > -0.3) run.y = floor;
    else run.grounded = false;
    if (!run.grounded) {
      run.vy -= 18 * dt;
      run.y += run.vy * dt;
      if (run.y <= floor) { run.y = floor; run.vy = 0; run.grounded = true; }
    }
    const gate = GATES[run.gate];
    if (gate && oldZ > gate.z && run.z <= gate.z) {
      const fraction = (oldZ - gate.z) / Math.max(0.00001, oldZ - run.z);
      const crossingX = oldX + (run.x - oldX) * fraction;
      const crossingY = oldY + (run.y - oldY) * fraction;
      const onCourse = Math.abs(crossingX - gate.x) <= gate.halfWidth;
      const cleared = onCourse && crossingY >= (gate.clearance ?? 0)
        && crossingY <= (gate.maxHeight ?? Infinity)
        && (COURSE[gate.obstacle].kind !== 'seesaw' || run.grounded);
      if (cleared) {
        run.gate++;
        run.feedback = GATES[run.gate]?.obstacle !== gate.obstacle ? 'Obstacle clear! Keep going.' : 'Good line. Follow the next marker.';
      } else {
        run.z = gate.z + 0.05; run.vz = 0;
        if (run.faultGate !== run.gate) { run.faults++; run.faultGate = run.gate; }
        run.feedback = !onCourse ? 'Approach the glowing marker between the posts.'
          : gate.clearance ? 'Bar touched. Back up and jump a little earlier.' : 'Stay on the ground and follow the marked route.';
      }
    }
    if (Math.hypot(run.vx, run.vz) > 0.1) {
      const target = Math.atan2(run.vx, run.vz);
      const difference = Math.atan2(Math.sin(target - run.heading), Math.cos(target - run.heading));
      run.heading += difference * (1 - Math.exp(-12 * dt));
    }
    if (run.gate === GATES.length && run.z <= FINISH_Z) {
      run.finished = true; run.feedback = 'Course complete!';
    }
  }
}

export function runPerformance(run: Pick<RunState, 'time' | 'faults'>): number {
  return clamp(1.5 - Math.max(0, run.time - 28) * 0.012 - run.faults * 0.08, 0.4, 1.5);
}
