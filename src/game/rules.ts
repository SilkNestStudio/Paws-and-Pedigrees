import { clamp } from '../core/math';
import { ACTIVITY_OBSERVATIONS, observe, type Discovery } from '../core/dog/knowledge';
import { CUES, generateShelterTrio, type Cue, type Dog } from '../core/dog/dog';
import { boardForDay } from './jobs';
import {
  activeDog,
  addFlag,
  BLOCKS,
  dayName,
  eventRng,
  FUN_DAY,
  hasFlag,
  note,
  skillSnapshot,
  type GameState,
  type SeasonRecap,
} from './state';
import {
  ageText,
  isSeasonStart,
  isTrialDay,
  MONTHS_PER_SEASON,
  seasonOf,
  seasonStartDay,
} from './calendar';

/**
 * The rules of daily life at the kennel. Every function changes a draft
 * state (see `update` in state.ts) and is free of rendering and storage, so
 * the same rules can later run on a server.
 */

// ---------------------------------------------------------------------------
// Prices and things to buy
// ---------------------------------------------------------------------------

export interface ShopItem {
  id: string;
  name: string;
  cost: number;
  description: string;
  /** Owned once (tools) rather than consumed (food). */
  once: boolean;
}

export const SHOP: ShopItem[] = [
  {
    id: 'food',
    name: 'Bag of kibble',
    cost: 24,
    description: 'Eight meals. Your dog eats one each time you fill the bowl.',
    once: false,
  },
  {
    id: 'brush',
    name: 'Grooming brush',
    cost: 12,
    description: 'A daily brush builds your bond faster than petting alone.',
    once: true,
  },
  {
    id: 'longline',
    name: 'Long training line',
    cost: 18,
    description: 'Lessons go further: your dog stays interested for longer.',
    once: true,
  },
];

export const FOOD_PER_BAG = 8;

export interface Restoration {
  id: string;
  name: string;
  cost: number;
  description: string;
  unlocks: string;
}

export const RESTORATIONS: Restoration[] = [
  {
    id: 'scentGarden',
    name: "Grandpa's scent garden",
    cost: 90,
    description: 'An overgrown corner with old scent boxes. Clear it and set the boxes out again.',
    unlocks:
      'The "Search and indicate" lesson, which teaches your dog to sit and point out a find instead of guessing.',
  },
  {
    id: 'duckPond',
    name: "Grandpa's duck pond",
    cost: 150,
    description:
      'A silted-up hollow full of reeds at the far side of the training field. Dredge it and the spring will fill it again.',
    unlocks:
      'Water work in your field: a mark into the pond, a mark across it, and a water blind. Open-level trials at Larkspur include a water blind.',
  },
];

// ---------------------------------------------------------------------------
// Energy, food and the calendar
// ---------------------------------------------------------------------------

export type ActivityKind = 'lesson' | 'mark' | 'blind' | 'search' | 'free' | 'funday';

export const ACTIVITY_ENERGY: Record<ActivityKind, number> = {
  lesson: 12,
  mark: 22,
  blind: 22,
  search: 20,
  free: 0,
  funday: 0,
};

/** Activities that use up the current part of the day. */
const TAKES_TIME: Record<ActivityKind, boolean> = {
  lesson: true,
  mark: true,
  blind: true,
  search: true,
  free: false,
  funday: true,
};

export const isHungry = (dog: Dog) => dog.fullness < 30;
export const isTired = (dog: Dog) => dog.energy < 25;

export function canStartActivity(
  state: GameState,
  kind: ActivityKind,
): { ok: true } | { ok: false; reason: string } {
  const dog = activeDog(state);
  if (!dog) return { ok: false, reason: 'You need a dog first.' };
  if (TAKES_TIME[kind] && state.block === 'night') {
    return { ok: false, reason: "It's dark. Time for bed; the day starts fresh tomorrow." };
  }
  if (dog.energy < ACTIVITY_ENERGY[kind]) {
    return {
      ok: false,
      reason: `${dog.name} is worn out. Let ${dog.sex === 'female' ? 'her' : 'him'} rest until tomorrow.`,
    };
  }
  return { ok: true };
}

/** Moves on to the next part of the day. */
export function passTime(state: GameState): void {
  const index = BLOCKS.indexOf(state.block);
  state.block = BLOCKS[Math.min(BLOCKS.length - 1, index + 1)]!;
  for (const dog of state.dogs) dog.fullness = clamp(dog.fullness - 12, 0, 100);
}

export function fillBowl(state: GameState): boolean {
  if (state.bowlFilled || state.food <= 0) return false;
  state.food -= 1;
  state.bowlFilled = true;
  addFlag(state, 'filledBowl');
  return true;
}

/** The dog has eaten what was in the bowl. */
export function dogAte(state: GameState): void {
  const dog = activeDog(state);
  if (!dog || !state.bowlFilled) return;
  state.bowlFilled = false;
  dog.fullness = clamp(dog.fullness + 55, 0, 100);
  addFlag(state, 'dogAte');
}

export function petDog(state: GameState): boolean {
  const dog = activeDog(state);
  const when = `${state.day}-${state.block}`;
  if (!dog || state.pettedAt === when) return false;
  state.pettedAt = when;
  dog.bond = clamp(dog.bond + 2, 0, 100);
  addFlag(state, 'petted');
  return true;
}

export function brushDog(state: GameState): boolean {
  const dog = activeDog(state);
  if (!dog || !hasFlag(state, 'own:brush') || state.brushedDay === state.day) return false;
  state.brushedDay = state.day;
  dog.bond = clamp(dog.bond + 4, 0, 100);
  return true;
}

/** Bed: the night passes, the dog eats if the bowl is full, and a new day begins. */
export function sleep(state: GameState): string[] {
  const messages: string[] = [];
  const dog = activeDog(state);
  if (dog && state.bowlFilled) dogAte(state);
  for (const d of state.dogs) {
    d.fullness = clamp(d.fullness - 25, 0, 100);
    const rest = d.fullness >= 30 ? 70 : 40;
    d.energy = clamp(d.energy + rest, 0, 100);
  }
  if (dog && dog.fullness < 30)
    messages.push(`${dog.name} woke up hungry. Keep the bowl filled and the pantry stocked.`);
  const hungryInRuns = state.dogs.filter((d) => d !== dog && d.fullness < 30).map((d) => d.name);
  if (hungryInRuns.length)
    messages.push(`${hungryInRuns.join(' and ')} went hungry in the runs. Feed them at the runs.`);
  const lastDay = state.day;
  state.day += 1;
  state.block = 'morning';
  if (isSeasonStart(state.day)) {
    state.recap = endSeason(state, lastDay);
    messages.push(
      `${seasonOf(state.day)} has come. Every dog is ${MONTHS_PER_SEASON} months older.`,
    );
  }
  state.jobs = boardForDay(state.seed, state.day, [...state.recentJobs, 'mara-keys']);
  if (state.day === FUN_DAY) messages.push("It's Sunday: the Village Fun Day is this afternoon!");
  if (isTrialDay(state.day))
    messages.push("It's Sunday: trial day at Larkspur. Enter from the van.");
  messages.unshift(`${dayName(state.day)} morning.`);
  return messages;
}

/**
 * The season is over: sum it up, age every dog, and start the next one.
 * Jobs done this season come back on the board.
 */
export function endSeason(state: GameState, lastDay: number): SeasonRecap {
  const mark = state.season;
  const inSeason = state.results.filter((r) => r.day >= mark.startDay && r.day <= lastDay);
  const bestByTitle = new Map<string, number>();
  for (const r of inSeason)
    if (r.activity !== 'lesson')
      bestByTitle.set(r.title, Math.max(bestByTitle.get(r.title) ?? 0, r.score));
  const skillGains: SeasonRecap['skillGains'] = [];
  for (const d of state.dogs) {
    const before = mark.skills[d.id];
    for (const cue of CUES) {
      const was = before?.[cue] ?? 0;
      if (d.skills[cue] - was >= 0.02)
        skillGains.push({ dog: d.name, cue, before: was, after: d.skills[cue] });
    }
  }
  const trials = state.trials
    .filter((t) => t.day >= mark.startDay && t.day <= lastDay)
    .map((t) => ({
      name: t.name,
      placing: t.placing,
      entries: t.entries.length,
      qualified: t.qualified,
    }));
  for (const d of state.dogs) d.ageMonths += MONTHS_PER_SEASON;
  const recap: SeasonRecap = {
    season: seasonOf(lastDay),
    next: seasonOf(state.day),
    activities: inSeason.length,
    best: [...bestByTitle]
      .map(([title, score]) => ({ title, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4),
    moneyChange: state.money - mark.money,
    jobs: state.jobsDone.length - mark.jobsDone,
    skillGains,
    trials,
    ages: state.dogs.map((d) => ({ dog: d.name, months: d.ageMonths })),
  };
  note(
    state,
    `${recap.season} ended. ${state.dogs.map((d) => `${d.name} is now ${ageText(d.ageMonths)}`).join('; ')}.`,
  );
  state.season = {
    startDay: seasonStartDay(state.day),
    money: state.money,
    jobsDone: state.jobsDone.length,
    skills: skillSnapshot(state.dogs),
  };
  state.recentJobs = [];
  return recap;
}

/** An evening at home recovers a little energy. */
export function restAtHome(state: GameState): void {
  const dog = activeDog(state);
  if (dog) dog.energy = clamp(dog.energy + 15, 0, 100);
  passTime(state);
}

// ---------------------------------------------------------------------------
// Buying and restoring
// ---------------------------------------------------------------------------

export function buy(state: GameState, itemId: string): { ok: boolean; message: string } {
  const item = SHOP.find((i) => i.id === itemId);
  if (!item) return { ok: false, message: 'Not for sale.' };
  if (item.once && hasFlag(state, `own:${item.id}`))
    return { ok: false, message: 'You already have one.' };
  if (state.money < item.cost)
    return { ok: false, message: `You need $${item.cost}. Jobs on the noticeboard pay.` };
  state.money -= item.cost;
  if (item.id === 'food') state.food += FOOD_PER_BAG;
  else addFlag(state, `own:${item.id}`);
  return {
    ok: true,
    message:
      item.id === 'food'
        ? `Bought ${FOOD_PER_BAG} meals.`
        : `Bought the ${item.name.toLowerCase()}.`,
  };
}

export function restore(state: GameState, id: string): { ok: boolean; message: string } {
  const r = RESTORATIONS.find((x) => x.id === id);
  if (!r) return { ok: false, message: 'Nothing to restore.' };
  if (hasFlag(state, `restored:${id}`)) return { ok: false, message: 'Already restored.' };
  if (state.money < r.cost) return { ok: false, message: `Restoring this costs $${r.cost}.` };
  state.money -= r.cost;
  addFlag(state, `restored:${id}`);
  note(state, `Restored ${r.name.toLowerCase()}. Grandpa would be pleased.`);
  return { ok: true, message: `${r.name} is back in use. ${r.unlocks}` };
}

// ---------------------------------------------------------------------------
// More dogs: the rescue, the runs, and who comes out with you
// ---------------------------------------------------------------------------

/** Grandpa's kennel block has six runs. */
export const KENNEL_RUNS = 6;
/** The first dog was Grandpa's wish; later rescues pay the shelter's fee. */
export const ADOPTION_FEE = 40;

export const canAdoptMore = (state: GameState): boolean =>
  state.dogs.length > 0 && state.dogs.length < KENNEL_RUNS && !!state.funDay;

/** New arrivals at Larchwood: a fresh three each season. */
export function refreshShelter(state: GameState): void {
  const flag = `shelter:${state.season.startDay}`;
  if (hasFlag(state, flag) || state.dogs.length === 0) return;
  addFlag(state, flag);
  state.shelter = generateShelterTrio(eventRng(state, flag));
}

/** Brings a dog home from the rescue. Returns false if the fee can't be paid. */
export function adoptDog(state: GameState, index: number, name: string): Dog | null {
  const chosen = state.shelter[index];
  if (!chosen) return null;
  const fee = state.dogs.length > 0 ? ADOPTION_FEE : 0;
  if (state.money < fee || state.dogs.length >= KENNEL_RUNS) return null;
  state.money -= fee;
  const dog: Dog = { ...chosen, name };
  state.dogs.push(dog);
  state.activeDogId = dog.id;
  state.season.skills[dog.id] = { ...dog.skills };
  state.shelter = [];
  return dog;
}

/** Which dog walks out with you. */
export function setActiveDog(state: GameState, id: string): boolean {
  if (!state.dogs.some((d) => d.id === id)) return false;
  state.activeDogId = id;
  return true;
}

/** Feeds every hungry dog waiting in the runs, one meal each, while the pantry lasts. */
export function feedRuns(state: GameState): { fed: string[]; hungry: string[] } {
  const fed: string[] = [];
  const hungry: string[] = [];
  for (const d of state.dogs) {
    if (d.id === state.activeDogId || d.fullness >= 70) continue;
    if (state.food <= 0) {
      hungry.push(d.name);
      continue;
    }
    state.food -= 1;
    d.fullness = clamp(d.fullness + 55, 0, 100);
    fed.push(d.name);
  }
  return { fed, hungry };
}

// ---------------------------------------------------------------------------
// After an activity
// ---------------------------------------------------------------------------

export interface ActivityOutcome {
  kind: ActivityKind;
  title: string;
  score: number;
  grade: string;
  /** Observation set to learn from (see knowledge.ts). */
  observe?: keyof typeof ACTIVITY_OBSERVATIONS;
  pay?: number;
  jobId?: string;
  skill?: { cue: Cue; value: number };
}

/**
 * Applies the effects of a finished activity: energy and time spent, pay,
 * learned skills, and what the keeper noticed about the dog.
 */
export function finishActivity(state: GameState, outcome: ActivityOutcome): Discovery[] {
  const dog = activeDog(state);
  if (!dog) return [];
  dog.energy = clamp(dog.energy - ACTIVITY_ENERGY[outcome.kind], 0, 100);
  if (outcome.skill) dog.skills[outcome.skill.cue] = outcome.skill.value;
  if (outcome.score > 0 && outcome.kind !== 'lesson') dog.bond = clamp(dog.bond + 1, 0, 100);
  if (outcome.pay) state.money += outcome.pay;
  if (outcome.jobId && !state.recentJobs.includes(outcome.jobId)) {
    state.jobsDone.push(outcome.jobId);
    state.recentJobs.push(outcome.jobId);
    state.jobs = state.jobs.filter((j) => j.id !== outcome.jobId);
    note(state, `${outcome.title}: done for $${outcome.pay ?? 0}.`);
  }
  if (outcome.kind !== 'free') {
    state.results.push({
      day: state.day,
      dogId: dog.id,
      activity: outcome.kind,
      title: outcome.title,
      score: outcome.score,
      grade: outcome.grade,
    });
  }
  if (TAKES_TIME[outcome.kind]) passTime(state);

  if (!outcome.observe) return [];
  state.knowledge[dog.id] ??= {};
  return observe(
    eventRng(state, `${outcome.title}-${state.results.length}`),
    dog,
    state.knowledge[dog.id]!,
    ACTIVITY_OBSERVATIONS[outcome.observe]!,
  );
}
