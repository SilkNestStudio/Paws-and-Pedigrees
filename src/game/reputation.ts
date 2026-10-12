import { clamp } from '../core/math';
import { chance, createRng, hashString, int, pick } from '../core/rng';
import { aptitude, titleCount, type Dog } from '../core/dog/dog';
import { APTITUDE_LABELS, APTITUDES, type Aptitude } from '../core/genetics/traits';
import { note, type GameState } from './state';

/**
 * What the wider world makes of the kennel: its reputation, the letters that
 * come back from families who took its puppies, other kennels booking its
 * stud dogs, and the "type" its dogs become known for.
 *
 * All numbers are first proposals for tuning.
 */
export const REPUTATION = {
  qualifyingRun: 4,
  title: 10,
  trialWin: 3,
  studPupSeen: 1,
  max: 100,
};

export const REPUTATION_LEVELS: { from: number; name: string }[] = [
  { from: 0, name: 'Unknown beyond the lane' },
  { from: 10, name: 'Known in the village' },
  { from: 25, name: 'Respected locally' },
  { from: 50, name: 'Well regarded across the county' },
  { from: 75, name: 'Renowned' },
];

export const reputationName = (value: number): string =>
  [...REPUTATION_LEVELS].reverse().find((l) => value >= l.from)!.name;

export function addReputation(state: GameState, amount: number): void {
  state.reputation = clamp(state.reputation + amount, 0, REPUTATION.max);
}

// ---------------------------------------------------------------------------
// Letters from the families who took puppies
// ---------------------------------------------------------------------------

export interface Letter {
  day: number;
  from: string;
  text: string;
  reputation: number;
}

/** A puppy's overall quality as its new family will find it: its talents, 1-99. */
export const puppyQuality = (pup: Dog): number =>
  Math.round(APTITUDES.reduce((s, a) => s + aptitude(pup, a), 0) / APTITUDES.length);

export const bestTalent = (pup: Dog): Aptitude =>
  APTITUDES.reduce((best, a) => (aptitude(pup, a) > aptitude(pup, best) ? a : best));

const PROUD = [
  '{name} passed the gundog working test first time. The judge asked where we got {him}.',
  '{name} won best puppy at the county show. People keep asking about your kennel.',
  '{name} found a lost walker on the fell last month. The whole village knows {his} name now.',
  '{name} is the best dog we have ever worked. Put us down for another.',
];
const HAPPY = [
  '{name} has settled in beautifully. The children adore {him}.',
  '{name} comes everywhere with us and behaves like a dog twice {his} age.',
  '{name} is doing well at puppy classes: top of the group for recall.',
  '{name} sleeps by the stove and thinks {he} owns the place. Thank you for {him}.',
];
const RUEFUL = [
  '{name} is a handful, truth be told, but we would not be without {him}.',
  '{name} has eaten two slippers and a garden hose. We are working on it.',
  '{name} is shy of strangers still. We are taking it slowly.',
];

/** Letters due this season: each placed puppy writes home up to twice, a season or more after leaving. */
export function seasonalLetters(state: GameState): Letter[] {
  const letters: Letter[] = [];
  for (const litter of state.litters) {
    for (const p of litter.placed) {
      const sent = p.letters ?? 0;
      if (sent >= 2 || p.day === undefined || state.day - p.day < 7 * (sent + 1)) continue;
      const rng = createRng(hashString(`${p.puppyId}-letter-${sent}`));
      const quality = (p.quality ?? 50) + (p.raised ?? 0) * 0.8;
      const pool = quality >= 58 ? PROUD : quality >= 44 ? HAPPY : RUEFUL;
      const reputation = quality >= 58 ? 5 : quality >= 44 ? 2 : 0;
      const male = p.sex !== 'female';
      const text = pick(rng, pool)
        .replaceAll('{name}', p.name)
        .replaceAll('{him}', male ? 'him' : 'her')
        .replaceAll('{his}', male ? 'his' : 'her')
        .replaceAll('{he}', male ? 'he' : 'she');
      p.letters = sent + 1;
      const letter: Letter = { day: state.day, from: p.home, text, reputation };
      letters.push(letter);
      state.letters.push(letter);
      addReputation(state, reputation);
      note(state, `A letter from ${p.home}: "${text}"`);
    }
  }
  return letters;
}

// ---------------------------------------------------------------------------
// Your dogs at stud
// ---------------------------------------------------------------------------

export interface StudBooking {
  id: string;
  studId: string;
  studName: string;
  kennel: string;
  day: number;
  fee: number;
  puppies: number;
  seed: number;
}

/** Kennels that might book one of your dogs. Ids match the Larkspur regulars. */
export const BOOKING_KENNELS: { id: string; kennel: string }[] = [
  { id: 'ruth', kennel: 'Hartley Gundogs' },
  { id: 'sam', kennel: 'Pennock Farm' },
  { id: 'dora', kennel: 'Finch Cottage' },
  { id: 'hamish', kennel: 'Glenreid' },
  { id: 'grace', kennel: 'Okafor Retrievers' },
  { id: 'billy', kennel: 'Ashby family' },
];

/** Why this dog can't stand at stud, or null if he can. */
export function studProblem(dog: Dog): string | null {
  if (dog.sex !== 'male') return 'Only males stand at stud.';
  if (dog.retired) return 'He is retired.';
  if (dog.ageMonths < 12) return 'Too young.';
  if (!titleCount(dog)) return 'Other kennels want proof: he needs a title first.';
  return null;
}

/** What other kennels will pay: titles first, then the kennel's name. */
export const studFee = (state: GameState, dog: Dog): number =>
  Math.round((30 + titleCount(dog) * 35 + state.reputation * 0.8) / 5) * 5;

export function setAtStud(state: GameState, dogId: string, on: boolean): boolean {
  const dog = state.dogs.find((d) => d.id === dogId);
  if (!dog || (on && studProblem(dog))) return false;
  dog.atStud = on;
  return true;
}

/** Bookings for the season just ended: more titles and a bigger name bring more of them. */
export function seasonalBookings(state: GameState): StudBooking[] {
  const made: StudBooking[] = [];
  for (const dog of state.dogs) {
    if (!dog.atStud || studProblem(dog)) continue;
    const rng = createRng(hashString(`${dog.id}-stud-${state.day}`));
    const appeal = clamp(0.15 + titleCount(dog) * 0.2 + state.reputation / 150, 0, 0.95);
    for (let n = 0; n < 2; n++) {
      if (!chance(rng, appeal * (n === 0 ? 1 : 0.45))) break;
      const taken = made.filter((b) => b.studId === dog.id).map((b) => b.kennel);
      const options = BOOKING_KENNELS.filter((k) => !taken.includes(k.kennel));
      const kennel = pick(rng, options).kennel;
      const fee = studFee(state, dog);
      const booking: StudBooking = {
        id: `booking-${state.day}-${dog.id}-${n}`,
        studId: dog.id,
        studName: dog.name,
        kennel,
        day: state.day,
        fee,
        puppies: int(rng, 3, 7),
        seed: int(rng, 1, 2 ** 30),
      };
      state.money += fee;
      state.studBookings.push(booking);
      made.push(booking);
      note(state, `${kennel} booked ${dog.name} at stud for $${fee}.`);
    }
  }
  return made;
}

/** A booking whose puppies are now old enough to be running in trials (about nine months on). */
export function studPupDue(state: GameState, day: number): StudBooking | null {
  const ready = state.studBookings
    .filter((b) => day - b.day >= 21 && day - b.day <= 84)
    .sort((a, b) => b.day - a.day);
  return ready[0] ?? null;
}

// ---------------------------------------------------------------------------
// The kennel's type
// ---------------------------------------------------------------------------

/** What the kennel's own breeding is becoming known for, once there is enough of it to see. */
export function kennelType(state: GameState): string | null {
  const own = state.kennelName || 'Your kennel';
  const bred = Object.values(state.pedigree).filter((e) => e.kennel === own && e.sireId);
  if (bred.length < 5) return null;
  const count = <T extends string>(values: T[]) => {
    const tally = new Map<T, number>();
    for (const v of values) tally.set(v, (tally.get(v) ?? 0) + 1);
    return [...tally].sort((a, b) => b[1] - a[1])[0]!;
  };
  const [coat, coatN] = count(bred.map((e) => e.coat.split(' ')[0] ?? e.coat));
  const talents = bred.map((e) => e.best).filter((b): b is Aptitude => !!b);
  const parts: string[] = [];
  if (coatN / bred.length >= 0.45) parts.push(`${coat} dogs`);
  if (talents.length >= 4) {
    const [talent, n] = count(talents);
    if (n / talents.length >= 0.3)
      parts.push(`${APTITUDE_LABELS[talent].name.toLowerCase()} above all`);
  }
  if (!parts.length) return `${bred.length} puppies bred here so far, and no two alike.`;
  return `People are starting to know a ${own} dog when they see one: ${parts.join(', with ')}.`;
}
