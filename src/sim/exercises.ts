import type { Vec2 } from '../core/math';

/**
 * Retrieve set-ups for the training field, ordered from first steps to the
 * kind of test a field trial would use. Throwers stand out in the field and
 * throw "marks" the dog watches; "blinds" are hidden and the dog has not seen
 * them, so the keeper must handle it there with the whistle and directions.
 */
export interface MarkThrow {
  /** Where the helper stands. */
  from: Vec2;
  /** Where the dummy lands. */
  landing: Vec2;
}

export interface RetrieveSetup {
  id: string;
  title: string;
  summary: string;
  /** What this set-up teaches or tests, in one line for the menu. */
  focus: string;
  marks: MarkThrow[];
  blinds: Vec2[];
  /**
   * Direction the wind blows toward, in degrees. 0 blows south into the keeper's face
   * (scent drifts toward an approaching dog: easy); 180 blows north, away from the keeper.
   */
  windDeg: number;
  windStrength: number;
  /** Free play has no set-up; the keeper throws a ball. */
  free?: boolean;
  /** Where the keeper and dog start, if not at the field's usual line. */
  start?: Vec2;
  /** Needs water (the restored pond at home). */
  water?: boolean;
}

export const FREE_PLAY: RetrieveSetup = {
  id: 'free',
  title: 'Free play',
  summary: 'Throw the ball, run about, enjoy your dog.',
  focus: 'Get a feel for your dog',
  marks: [],
  blinds: [],
  windDeg: 200,
  windStrength: 0.35,
  free: true,
};

export const RETRIEVE_SETUPS: RetrieveSetup[] = [
  {
    id: 'first-mark',
    title: 'First mark',
    summary: 'One dummy thrown into open grass. Let your dog watch it fall, then send.',
    focus: 'Marking and steadiness',
    marks: [{ from: { x: 12, z: -14 }, landing: { x: 3, z: -12 } }],
    blinds: [],
    windDeg: 10,
    windStrength: 0.3,
  },
  {
    id: 'cover-mark',
    title: 'Into the cover',
    summary: 'The dummy drops into tall grass. Your dog has to remember the spot and hunt it out.',
    focus: 'Memory and nose',
    marks: [{ from: { x: 28, z: -30 }, landing: { x: 14, z: -33 } }],
    blinds: [],
    windDeg: 340,
    windStrength: 0.45,
  },
  {
    id: 'long-mark',
    title: 'Long mark',
    summary: 'A long throw past the old oak. Distance makes memory and stamina matter.',
    focus: 'Distance marking',
    marks: [{ from: { x: -36, z: -60 }, landing: { x: -22, z: -62 } }],
    blinds: [],
    windDeg: 30,
    windStrength: 0.5,
  },
  {
    id: 'double',
    title: 'Double mark',
    summary: 'Two throws. Your dog must remember both. Send for one, then the other.',
    focus: 'Memory under pressure',
    marks: [
      { from: { x: -28, z: -22 }, landing: { x: -14, z: -27 } },
      { from: { x: 26, z: -46 }, landing: { x: 12, z: -50 } },
    ],
    blinds: [],
    windDeg: 0,
    windStrength: 0.4,
  },
  {
    id: 'first-blind',
    title: 'First blind',
    summary:
      'A dummy is hidden by the orange stake. Your dog has not seen it. Send it out and help it with whistle and directions.',
    focus: 'Stop whistle and directions',
    marks: [],
    blinds: [{ x: -6, z: -26 }],
    windDeg: 60,
    windStrength: 0.45,
  },
  {
    id: 'blind-past-fall',
    title: 'Blind past the old fall',
    summary:
      'First a mark, then a blind on a line just past where the mark fell. Dogs love to go back to old falls.',
    focus: 'Handling against temptation',
    marks: [{ from: { x: 18, z: -20 }, landing: { x: 8, z: -22 } }],
    blinds: [{ x: 10, z: -52 }],
    windDeg: 110,
    windStrength: 0.5,
  },
  {
    id: 'long-blind',
    title: 'Long blind in a crosswind',
    summary:
      'A long blind with the wind blowing across the line and cover to get through. Use the wind to help the nose.',
    focus: 'Reading wind and handling at distance',
    marks: [],
    blinds: [{ x: -18, z: -70 }],
    windDeg: 270,
    windStrength: 0.65,
  },
];

/**
 * Water work at Grandpa's duck pond (only once it is restored). The keeper
 * stands on the near bank; the pond lies between the dog and the work.
 */
export const WATER_SETUPS: RetrieveSetup[] = [
  {
    id: 'water-into',
    title: 'Into the pond',
    summary: 'A dummy thrown into the middle of the pond. The only way to it is to swim.',
    focus: 'Confidence in water',
    marks: [{ from: { x: -54, z: -26 }, landing: { x: -41, z: -28 } }],
    blinds: [],
    windDeg: 20,
    windStrength: 0.3,
    start: { x: -29, z: -13 },
    water: true,
  },
  {
    id: 'water-across',
    title: 'Across the pond',
    summary:
      'A mark on the far bank. Many dogs try to run round instead of swimming straight: stop them and send them back in.',
    focus: 'Taking the water, not the bank',
    marks: [{ from: { x: -52, z: -44 }, landing: { x: -43, z: -40 } }],
    blinds: [],
    windDeg: 340,
    windStrength: 0.35,
    start: { x: -29, z: -13 },
    water: true,
  },
  {
    id: 'water-blind',
    title: 'Water blind',
    summary:
      'A hidden dummy on the far bank, past the reeds. Line, whistle and cast your dog across the water.',
    focus: 'Handling across water',
    marks: [],
    blinds: [{ x: -38, z: -41 }],
    windDeg: 90,
    windStrength: 0.45,
    start: { x: -28, z: -13 },
    water: true,
  },
];

export function setupById(id: string): RetrieveSetup {
  if (id === FREE_PLAY.id) return FREE_PLAY;
  const found = [...RETRIEVE_SETUPS, ...WATER_SETUPS].find((s) => s.id === id);
  if (!found) throw new Error(`Unknown retrieve set-up: ${id}`);
  return found;
}

/** Fun Day rounds on the village green (keeper's line at z = 12). */
export const FUN_DAY_MARK: RetrieveSetup = {
  id: 'funday-mark',
  title: 'Round 1: The mark',
  summary: 'One mark thrown across the green. Steady dog, clean retrieve, quick delivery.',
  focus: 'Marking and steadiness',
  marks: [{ from: { x: 16, z: -18 }, landing: { x: 5, z: -27 } }],
  blinds: [],
  windDeg: 15,
  windStrength: 0.35,
};

export const FUN_DAY_BLIND: RetrieveSetup = {
  id: 'funday-blind',
  title: 'Round 3: The blind',
  summary: 'A hidden dummy beyond the rough grass, with a breeze across the line.',
  focus: 'Handling',
  marks: [],
  blinds: [{ x: 13, z: -44 }],
  windDeg: 250,
  windStrength: 0.5,
};
