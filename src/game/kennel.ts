import { titleCount, type Dog } from '../core/dog/dog';
import { note, type GameState } from './state';

/**
 * Who lives where. Working dogs each need one of the six runs; retired dogs
 * move into the farmhouse, free their run, and steady the youngsters by
 * example. Nobody dies here: an old dog's story ends by the stove.
 *
 * All numbers are first proposals for tuning.
 */
export const RETIREMENT = {
  /** A dog may be retired from this age. */
  mayRetireMonths: 84,
  /** From here an old dog is visibly slower and tires sooner. */
  slowsMonths: 108,
  /** At this age a dog retires of its own accord. */
  retiresMonths: 144,
};

/** Grandpa's kennel block has six runs. */
export const KENNEL_RUNS = 6;

export const workingDogs = (state: GameState): Dog[] => state.dogs.filter((d) => !d.retired);
export const retiredDogs = (state: GameState): Dog[] => state.dogs.filter((d) => d.retired);
export const runsUsed = (state: GameState): number => workingDogs(state).length;
export const runsFree = (state: GameState): number => KENNEL_RUNS - runsUsed(state);

/** Why this dog can't be retired just now, or null if it can. */
export function retireProblem(state: GameState, dog: Dog): string | null {
  if (dog.retired) return 'Already retired.';
  if (dog.ageMonths < RETIREMENT.mayRetireMonths)
    return `Too young to retire: ${dog.name} has years of work left (from ${RETIREMENT.mayRetireMonths / 12} years old).`;
  if (state.pregnancies.some((p) => p.damId === dog.id)) return 'She is in whelp.';
  if (state.litters.some((l) => l.damId === dog.id && l.puppies.some((p) => p.ageMonths < 3)))
    return 'She has young puppies to raise first.';
  if (workingDogs(state).length <= 1) return 'You need another working dog first.';
  return null;
}

/** Moves a dog into the farmhouse for good. */
export function retireDog(state: GameState, dogId: string): boolean {
  const dog = state.dogs.find((d) => d.id === dogId);
  if (!dog || retireProblem(state, dog)) return false;
  dog.retired = true;
  dog.atStud = false;
  if (state.activeDogId === dog.id) {
    state.activeDogId = workingDogs(state)[0]?.id ?? null;
    state.bowlFilled = false;
  }
  note(state, `${dog.name} retired to the farmhouse, with a bed by the stove.`);
  return true;
}

/** Dogs that reach a great age retire themselves at the change of season. */
export function ageRetirements(state: GameState): string[] {
  const messages: string[] = [];
  for (const dog of [...state.dogs]) {
    if (dog.retired || dog.ageMonths < RETIREMENT.retiresMonths) continue;
    if (retireDog(state, dog.id))
      messages.push(
        `${dog.name} is ${Math.floor(dog.ageMonths / 12)} now and has earned the hearth: retired to the farmhouse.`,
      );
  }
  return messages;
}

/**
 * How much faster the youngsters learn with old hands about the place: a
 * titled veteran is worth more than one who never competed.
 */
export function mentorBonus(state: GameState): number {
  const bonus = retiredDogs(state).reduce((sum, d) => sum + (titleCount(d) > 0 ? 0.1 : 0.04), 0);
  return Math.min(0.25, bonus);
}
