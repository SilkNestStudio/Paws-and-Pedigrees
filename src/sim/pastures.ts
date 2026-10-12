import type { TrialLevel } from '../core/dog/dog';
import type { Vec2 } from '../core/math';
import type { Gate, HerdingSetup } from './herding';

/**
 * Sheepdog courses on the hill pasture at Fell Top Farm. The handler's post
 * is at the south end; the sheep wait up the field. Each course can be run
 * as drawn or mirrored left to right.
 */
export const FELL_POST: Vec2 = { x: 0, z: 10 };

const gate = (
  label: string,
  x: number,
  z: number,
  facing: 'south' | 'west' | 'east',
  width = 7,
): Gate => {
  const half = width / 2;
  if (facing === 'south')
    return { label, a: { x: x - half, z }, b: { x: x + half, z }, dir: { x: 0, z: 1 } };
  return {
    label,
    a: { x, z: z - half },
    b: { x, z: z + half },
    dir: { x: facing === 'west' ? -1 : 1, z: 0 },
  };
};

// Beside and a little behind the post, clear of the dog's outrun on either side.
const PEN = { center: { x: 12, z: 12 }, size: 5 };

const PLANS: Record<TrialLevel, HerdingSetup> = {
  novice: {
    id: 'herd-gather',
    title: 'Gather and pen',
    summary:
      'Three sheep. Send your dog round them, bring them through the fetch gates, and pen them.',
    focus: 'The outrun, the fetch and the pen',
    level: 'novice',
    sheep: 3,
    sheepStart: { x: 4, z: -36 },
    post: FELL_POST,
    gates: [gate('fetch gates', 0, -14, 'south')],
    pen: PEN,
    standard: 70,
    teachesTo: 0.5,
  },
  open: {
    id: 'herd-drive',
    title: 'Gather, drive and pen',
    summary:
      'Four sheep. After the fetch, drive them away from you through the drive gates, then pen.',
    focus: 'Driving sheep away from you',
    level: 'open',
    sheep: 4,
    sheepStart: { x: -5, z: -40 },
    post: FELL_POST,
    gates: [gate('fetch gates', 0, -16, 'south', 6.2), gate('drive gates', -20, -4, 'west', 6.2)],
    pen: PEN,
    standard: 130,
    flighty: 1.12,
    teachesTo: 0.75,
  },
  excellent: {
    id: 'herd-full',
    title: 'The full course',
    summary: 'Five sheep: fetch, drive, a long cross-drive to the far gates, and the pen.',
    focus: 'Control at a distance',
    level: 'excellent',
    sheep: 5,
    sheepStart: { x: 6, z: -46 },
    post: FELL_POST,
    gates: [
      gate('fetch gates', 0, -18, 'south', 5.4),
      gate('drive gates', -22, -6, 'west', 5.4),
      gate('cross-drive gates', 20, -24, 'east', 5.4),
    ],
    pen: PEN,
    standard: 150,
    flighty: 1.25,
  },
};

function mirrored(setup: HerdingSetup): HerdingSetup {
  const m = (p: Vec2): Vec2 => ({ x: -p.x, z: p.z });
  return {
    ...setup,
    id: `${setup.id}-m`,
    sheepStart: m(setup.sheepStart),
    gates: setup.gates.map((g) => ({ ...g, a: m(g.a), b: m(g.b), dir: m(g.dir) })),
    pen: { ...setup.pen, center: m(setup.pen.center) },
  };
}

/** What you can practise on Sam Pennock's sheep, easiest first. */
export const PRACTICE_PASTURES: HerdingSetup[] = [PLANS.novice, PLANS.open, PLANS.excellent];

/** A trial run at a level; the second round is the same course the other way about. */
export function trialPasture(level: TrialLevel, round: number, flip: number): HerdingSetup {
  const plan = PLANS[level];
  const setup = (flip + round) % 2 === 1 ? mirrored(plan) : plan;
  return { ...setup, id: `${setup.id}-r${round}`, title: `Round ${round + 1}: ${plan.title}` };
}
