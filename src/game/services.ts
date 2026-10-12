import { clamp } from '../core/math';
import { createRng, hashString, int, pick } from '../core/rng';
import { aptitude, createPuppy, generateRescue, type Dog } from '../core/dog/dog';
import { describe, observe, type Discovery } from '../core/dog/knowledge';
import { createFounderGenome } from '../core/genetics/genome';
import type { BreedId } from '../core/genetics/breeds';
import { APTITUDE_LABELS, type Aptitude } from '../core/genetics/traits';
import { expectedLitter, register, studBook } from './breeding';
import { seasonStartDay, weekday } from './calendar';
import { runsFree } from './kennel';
import { puppyQuality } from './reputation';
import { addFlag, hasFlag, note, type GameState } from './state';

/**
 * Services in the village: the vet's surgery and the breeders' market.
 * All prices are first proposals for tuning.
 */

// ---------------------------------------------------------------------------
// The vet
// ---------------------------------------------------------------------------

export const VET = { healthCheck: 15, scan: 20 };

const PHYSICAL: Aptitude[] = ['speed', 'agility', 'stamina', 'power'];

/** A full check-up: the vet measures what you could only guess at by watching. */
export function healthCheck(
  state: GameState,
  dogId: string,
): { ok: boolean; message: string; found: Discovery[] } {
  const dog = state.dogs.find((d) => d.id === dogId);
  if (!dog) return { ok: false, message: 'No such dog.', found: [] };
  if (state.money < VET.healthCheck)
    return { ok: false, message: `A check-up costs $${VET.healthCheck}.`, found: [] };
  state.money -= VET.healthCheck;
  const known = (state.knowledge[dog.id] ??= {});
  const found: Discovery[] = [];
  for (const a of PHYSICAL) {
    const truth = aptitude(dog, a);
    known[a] = { lo: clamp(truth - 3, 1, 99), hi: clamp(truth + 3, 1, 99) };
    found.push({
      aptitude: a,
      text: `${APTITUDE_LABELS[a].name}: ${describe(known[a]).toLowerCase()}.`,
    });
  }
  note(state, `The vet gave ${dog.name} a full check-up.`);
  return { ok: true, message: `${dog.name} is in good health.`, found };
}

/** A scan for a dam in whelp: how many puppies to expect. */
export function scanLitter(state: GameState, damId: string): { ok: boolean; message: string } {
  const pregnancy = state.pregnancies.find((p) => p.damId === damId);
  const dam = state.dogs.find((d) => d.id === damId);
  if (!pregnancy || !dam) return { ok: false, message: 'She is not in whelp.' };
  if (pregnancy.scanned !== undefined)
    return { ok: false, message: `Already scanned: ${pregnancy.scanned} puppies.` };
  if (state.money < VET.scan) return { ok: false, message: `A scan costs $${VET.scan}.` };
  const count = expectedLitter(state, pregnancy);
  if (count === null) return { ok: false, message: 'She is not in whelp.' };
  state.money -= VET.scan;
  pregnancy.scanned = count;
  note(state, `The vet scanned ${dam.name}: ${count} puppies on the way.`);
  return {
    ok: true,
    message: `${count} puppies, all with strong heartbeats. Due on day ${pregnancy.dueDay}.`,
  };
}

// ---------------------------------------------------------------------------
// The breeders' market: youngsters for sale at the start of each season
// ---------------------------------------------------------------------------

export const MARKET = { firstDay: 8, bulkMeals: 20, bulkCost: 50 };

/** The market sets up on the first two days of each season. */
export const isMarketDay = (day: number): boolean => day >= MARKET.firstDay && weekday(day) <= 1;

export interface MarketDog {
  dog: Dog;
  dam: Dog;
  sireId: string;
  sireName: string;
  seller: string;
  price: number;
  blurb: string;
  sold: boolean;
}

const DAM_NAMES = ['Tansy', 'Bryony', 'Heather', 'Sorrel', 'Marigold', 'Briar', 'Lark', 'Teasel'];

/** This season's three youngsters, each by a stud-book dog. The same every time it is asked. */
export function marketStock(state: GameState): MarketDog[] {
  const season = seasonStartDay(state.day);
  const rng = createRng(hashString(`market-${state.seed}-${season}`));
  const studs = studBook();
  const taken = state.dogs.map((d) => d.name);
  const stock: MarketDog[] = [];
  for (let i = 0; i < 3; i++) {
    const stud = pick(rng, studs);
    const breed = Object.keys(stud.dog.breedMix)[0] as BreedId;
    const dam = generateRescue(rng, pick(rng, DAM_NAMES));
    dam.genome = createFounderGenome(rng, breed);
    dam.sex = 'female';
    dam.breedMix = { [breed]: 1 };
    dam.origin = 'purchased';
    const pup = createPuppy(rng, stud.dog, dam, 0, stud.kennel, taken);
    taken.push(pup.name);
    // Stable ids, so the same youngster is on the stall each time you look.
    pup.id = `market-${state.seed.toString(16)}-${season}-${i}`;
    dam.id = `${pup.id}-dam`;
    pup.damId = dam.id;
    pup.ageMonths = int(rng, 0, 1) ? 9 : 6;
    pup.origin = 'purchased';
    pup.skills = { ...pup.skills, sit: 0.3, recall: 0.3 };
    const quality = puppyQuality(pup);
    const price = clamp(
      Math.round((100 + (quality - 45) * 9 + stud.dog.titles.length * 25) / 10) * 10,
      120,
      480,
    );
    stock.push({
      dog: pup,
      dam,
      sireId: stud.dog.id,
      sireName: stud.dog.name,
      seller: stud.kennel,
      price,
      blurb: `By ${stud.dog.name} out of ${dam.name}. ${pup.ageMonths} months old, house-trained, knows its name.`,
      sold: hasFlag(state, `market:${pup.id}`),
    });
  }
  return stock;
}

/** Buys one of the market's youngsters. Needs a free run and the money. */
export function buyMarketDog(state: GameState, index: number, name: string): Dog | null {
  if (!isMarketDay(state.day)) return null;
  const lot = marketStock(state)[index];
  if (!lot || lot.sold || state.money < lot.price || runsFree(state) <= 0) return null;
  state.money -= lot.price;
  const dog: Dog = { ...lot.dog, name: name.trim().slice(0, 16) || lot.dog.name };
  const stud = studBook().find((s) => s.dog.id === lot.sireId);
  if (stud) register(state, stud.dog, stud.kennel);
  register(state, lot.dam, lot.seller);
  state.dogs.push(dog);
  state.season.skills[dog.id] = { ...dog.skills };
  register(state, dog, lot.seller);
  // What the breeder could tell you about it.
  state.knowledge[dog.id] = {};
  observe(createRng(hashString(`market-known-${dog.id}`)), dog, state.knowledge[dog.id]!, [
    { aptitude: 'confidence', precision: 20 },
    { aptitude: 'drive', precision: 20 },
    { aptitude: 'biddability', precision: 22 },
  ]);
  addFlag(state, `market:${lot.dog.id}`);
  note(state, `Bought ${dog.name} from ${lot.seller} at the breeders' market for $${lot.price}.`);
  return dog;
}

/** A sack of kibble at market price. */
export function buyBulkFood(state: GameState): boolean {
  if (!isMarketDay(state.day) || state.money < MARKET.bulkCost) return false;
  state.money -= MARKET.bulkCost;
  state.food += MARKET.bulkMeals;
  return true;
}
