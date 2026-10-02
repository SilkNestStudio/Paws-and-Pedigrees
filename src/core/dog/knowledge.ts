import { clamp } from '../math';
import { range as randomRange, type Rng } from '../rng';
import { APTITUDE_LABELS, type Aptitude } from '../genetics/traits';
import { aptitude, type Dog } from './dog';

/**
 * What the keeper has worked out about a dog's natural aptitudes. Each
 * aptitude starts unknown and narrows to a range as the keeper watches the
 * dog work. Ranges always contain the true value: observations are noisy
 * but honest, so what you learn is never wrong, only imprecise.
 */
export interface Estimate {
  lo: number;
  hi: number;
}

export type DogKnowledge = Partial<Record<Aptitude, Estimate>>;

export interface Observation {
  aptitude: Aptitude;
  /** Half-width of the range this single observation supports. */
  precision: number;
}

export interface Discovery {
  aptitude: Aptitude;
  text: string;
}

/** Plain-language band for an aptitude estimate. */
export function describe(est: Estimate | undefined): string {
  if (!est) return 'Not yet known';
  const mid = (est.lo + est.hi) / 2;
  const word =
    mid >= 78 ? 'exceptional' : mid >= 64 ? 'strong' : mid >= 52 ? 'good' : mid >= 40 ? 'average' : mid >= 28 ? 'modest' : 'weak';
  return est.hi - est.lo > 34 ? `Maybe ${word}` : word[0]!.toUpperCase() + word.slice(1);
}

export const isKnown = (est: Estimate | undefined): boolean => !!est && est.hi - est.lo <= 30;

/**
 * Narrows the keeper's knowledge with what they just saw. Returns any
 * aptitude that has just become clear enough to put into words.
 */
export function observe(rng: Rng, dog: Dog, knowledge: DogKnowledge, observations: Observation[]): Discovery[] {
  const discoveries: Discovery[] = [];
  for (const { aptitude: which, precision } of observations) {
    const truth = aptitude(dog, which);
    const seen = truth + randomRange(rng, -precision / 2, precision / 2);
    const before = knowledge[which];
    const lo = Math.max(before?.lo ?? 1, Math.round(seen - precision));
    const hi = Math.min(before?.hi ?? 99, Math.round(seen + precision));
    knowledge[which] = { lo: clamp(lo, 1, truth), hi: clamp(hi, truth, 99) };
    if (!isKnown(before) && isKnown(knowledge[which])) {
      const label = APTITUDE_LABELS[which].name.toLowerCase();
      discoveries.push({
        aptitude: which,
        text: `You're getting a feel for ${dog.name}'s ${label}: ${describe(knowledge[which]).toLowerCase()}.`,
      });
    }
  }
  return discoveries;
}

/** What each kind of activity lets the keeper see, and how clearly. */
export const ACTIVITY_OBSERVATIONS: Record<string, Observation[]> = {
  meet: [
    { aptitude: 'speed', precision: 22 },
    { aptitude: 'biddability', precision: 22 },
  ],
  mark: [
    { aptitude: 'speed', precision: 12 },
    { aptitude: 'focus', precision: 14 },
    { aptitude: 'drive', precision: 16 },
    { aptitude: 'mouth', precision: 18 },
  ],
  blind: [
    { aptitude: 'biddability', precision: 14 },
    { aptitude: 'confidence', precision: 16 },
    { aptitude: 'nose', precision: 15 },
    { aptitude: 'stamina', precision: 18 },
  ],
  search: [
    { aptitude: 'nose', precision: 10 },
    { aptitude: 'focus', precision: 14 },
    { aptitude: 'drive', precision: 14 },
  ],
  lesson: [
    { aptitude: 'biddability', precision: 16 },
    { aptitude: 'focus', precision: 18 },
  ],
};
