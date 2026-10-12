import type { Vec2 } from '../core/math';
import type { AgilityCourse, Obstacle, ObstacleKind } from './agility';

/**
 * Agility courses. Each is drawn in ring coordinates (x across, z toward the
 * far end of the ring, both in metres from the ring's centre) and then placed
 * wherever the ring is: Grandpa's field at home, or the village green on show
 * days. Headings: N runs away from the start, S back toward it, E and W across.
 */
const N = Math.PI;
const S = 0;
const E = Math.PI / 2;
const W = -Math.PI / 2;

type Row = [ObstacleKind, number, number, number];

interface Plan {
  id: string;
  title: string;
  summary: string;
  focus: string;
  start: [number, number];
  teachesTo?: number;
  rows: Row[];
}

const PLANS: Record<string, Plan> = {
  first: {
    id: 'agility-first',
    title: 'First jumps',
    summary: 'Four jumps in a gentle curve. Run alongside and let your dog find the rhythm.',
    focus: 'Running together',
    teachesTo: 0.35,
    start: [0, 10.5],
    rows: [
      ['jump', 0, 6.5, N],
      ['jump', 0, 1.5, N],
      ['jump', 1.5, -3.5, N - 0.3],
      ['jump', 4.5, -8, N - 0.6],
    ],
  },
  tunnel: {
    id: 'agility-tunnel',
    title: 'Tunnel and turn',
    summary: 'A jump, the tunnel, then a turn for home. Be ahead of your dog when it comes out.',
    focus: 'Turning with your dog',
    teachesTo: 0.6,
    start: [-6, 10.5],
    rows: [
      ['jump', -6, 6.5, N],
      ['tunnel', -6, -1.5, N],
      ['jump', -1, -8.5, E],
      ['jump', 5.5, -4, S],
      ['jump', 5.5, 3, S],
    ],
  },
  full: {
    id: 'agility-full',
    title: 'Full course',
    summary:
      'Ten obstacles with weave poles, the A-frame, and one tempting wrong jump. Walk it in your head first.',
    focus: 'Planning your line',
    start: [-8, 10.8],
    rows: [
      ['jump', -8, 7, N],
      ['jump', -8, 1.5, N],
      ['tunnel', -8, -5.5, N],
      ['jump', -2.5, -9.2, E],
      ['frame', 4.5, -9.2, E],
      ['jump', 9.8, -5, S],
      ['weave', 9.8, 2, S],
      ['jump', 5, 8.6, W],
      ['jump', -0.5, 6, W - 0.5],
      ['jump', -3, 0.5, N + 0.4],
    ],
  },
  showNovice: {
    id: 'show-novice',
    title: 'Novice course',
    summary: 'Seven obstacles: jumps and the tunnel, with one real turn.',
    focus: 'A flowing round',
    start: [-7, 10.5],
    rows: [
      ['jump', -7, 6.5, N],
      ['jump', -7, 1, N],
      ['tunnel', -7, -6, N],
      ['jump', -1.5, -9.5, E],
      ['jump', 5, -6, S + 0.5],
      ['jump', 7.5, 0, S],
      ['jump', 7.5, 6, S],
    ],
  },
  showOpen: {
    id: 'show-open',
    title: 'Open course',
    summary:
      'Ten obstacles with the weave poles and A-frame, and a jump placed to tempt your dog off course.',
    focus: 'Handling the traps',
    start: [8, 10.8],
    rows: [
      ['jump', 8, 7, N],
      ['weave', 8, 0, N],
      ['jump', 8, -7, N],
      ['jump', 2.5, -9.5, W],
      ['tunnel', -4.5, -9.5, W],
      ['jump', -9.5, -4.5, S],
      ['frame', -9.5, 2.5, S],
      ['jump', -5, 8.6, E],
      ['jump', 0.5, 5.5, E + 0.5],
      ['jump', 3, 0, N - 0.3],
    ],
  },
  showExcellent: {
    id: 'show-excellent',
    title: 'Excellent course',
    summary:
      'Twelve obstacles, tight turns, and two places where the obvious jump is the wrong one.',
    focus: 'Precision at speed',
    start: [0, 10.8],
    rows: [
      ['jump', 0, 7, N],
      ['jump', -4, 2.5, N + 0.6],
      ['tunnel', -8.5, -3, N],
      ['jump', -5, -9.5, E],
      ['weave', 1.5, -9.5, E],
      ['jump', 8.5, -8, S + 0.4],
      ['frame', 9.8, -1.5, S],
      ['jump', 8, 5.5, S - 0.5],
      ['jump', 3.5, 8.6, W],
      ['jump', 0.5, 2.5, N],
      ['jump', 4, -3.5, N - 0.6],
      ['jump', -2, -4.5, W],
    ],
  },
};

/** Places a course plan at a ring centre, optionally mirrored left to right. */
function place(plan: Plan, origin: Vec2, mirror = false): AgilityCourse {
  const m = mirror ? -1 : 1;
  const obstacles: Obstacle[] = plan.rows.map(([kind, x, z, heading]) => ({
    kind,
    pos: { x: origin.x + x * m, z: origin.z + z },
    heading: mirror ? -heading : heading,
  }));
  return {
    id: plan.id + (mirror ? '-m' : ''),
    title: plan.title,
    summary: plan.summary,
    focus: plan.focus,
    obstacles,
    start: { x: origin.x + plan.start[0] * m, z: origin.z + plan.start[1] },
    teachesTo: plan.teachesTo,
  };
}

/** The agility ring in Grandpa's training field, east of the start line. */
export const HOME_RING: Vec2 = { x: 32, z: 22 };
/** The ring on the village green on show days. */
export const SHOW_RING: Vec2 = { x: 0, z: -8 };
export const RING_HALF = { x: 13, z: 12 };

export const PRACTICE_COURSES: AgilityCourse[] = [
  place(PLANS.first!, HOME_RING),
  place(PLANS.tunnel!, HOME_RING),
  place(PLANS.full!, HOME_RING),
];

export function showCourse(
  level: 'novice' | 'open' | 'excellent',
  round: number,
  seed: number,
): AgilityCourse {
  const plan =
    level === 'novice'
      ? PLANS.showNovice!
      : level === 'open'
        ? PLANS.showOpen!
        : PLANS.showExcellent!;
  // The second round runs the same course the other way about.
  const course = place(plan, SHOW_RING, (seed + round) % 2 === 1);
  return { ...course, id: `${course.id}-r${round}`, title: `Round ${round + 1}: ${plan.title}` };
}
