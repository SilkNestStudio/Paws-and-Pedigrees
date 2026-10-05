import { clamp } from '../core/math';
import { createRng, hashString, int, pick } from '../core/rng';
import {
  aptitude,
  coatOf,
  createPuppy,
  generateRescue,
  type Dog,
  type TrialLevel,
} from '../core/dog/dog';
import { observe, type DogKnowledge, type Estimate } from '../core/dog/knowledge';
import { createFounderGenome, inheritGenome } from '../core/genetics/genome';
import { deriveBody } from '../core/genetics/body';
import { describeMix, type BreedId } from '../core/genetics/breeds';
import { deriveCoat } from '../core/genetics/coat';
import { APTITUDES, HERITABILITY, toScore, type Aptitude } from '../core/genetics/traits';
import { activeDog, addFlag, eventRng, hasFlag, note, type GameState } from './state';
import { KENNEL_RUNS } from './rules';

/**
 * Breeding: choosing a pairing, the litter that follows, and what becomes of
 * each puppy. Genes come from both parents by real Mendelian inheritance for
 * coat colour and the infinitesimal model for working talents, so a good
 * pairing improves the odds rather than guaranteeing a champion.
 *
 * Every number here is a first proposal for tuning.
 */
export const BREEDING = {
  /** Youngest a dam (mother) may be bred, in months. */
  damMinMonths: 18,
  sireMinMonths: 12,
  damMaxMonths: 96,
  /** Days from mating to whelping (the game's calendar is compressed). */
  gestationDays: 5,
  /** Days a dam rests between litters (two seasons). */
  restDays: 14,
  litterMin: 3,
  litterMax: 7,
  dnaTestCost: 25,
  /** Puppies stay with their mother until this age. */
  goHomeMonths: 3,
  /** Puppies not kept or placed by this age are placed for you, for less. */
  decideByMonths: 6,
  inbreedingWarn: 0.0625,
  inbreedingHigh: 0.125,
};

// ---------------------------------------------------------------------------
// Pedigree records: every dog the kennel has known, including studs and
// puppies that went to new homes, so relationships can always be traced.
// ---------------------------------------------------------------------------

export interface PedigreeEntry {
  id: string;
  name: string;
  sex: Dog['sex'];
  sireId?: string;
  damId?: string;
  kennel: string;
  coat: string;
  breed: string;
  titles: TrialLevel[];
  inbreeding: number;
}

export function register(state: GameState, dog: Dog, kennel: string): void {
  state.pedigree[dog.id] = {
    id: dog.id,
    name: dog.name,
    sex: dog.sex,
    sireId: dog.sireId,
    damId: dog.damId,
    kennel,
    coat: coatOf(dog).name,
    breed: describeMix(dog.breedMix),
    titles: [...dog.titles],
    inbreeding: dog.genome.inbreeding,
  };
}

/** Longest path back to a founder: used to expand the younger dog first. */
function depth(ped: Record<string, PedigreeEntry>, id: string | undefined, seen = 0): number {
  if (!id || !ped[id] || seen > 30) return 0;
  const e = ped[id]!;
  return 1 + Math.max(depth(ped, e.sireId, seen + 1), depth(ped, e.damId, seen + 1));
}

/**
 * Coefficient of coancestry (kinship) between two dogs: the chance that a gene
 * drawn from each is identical by descent. A puppy's inbreeding coefficient
 * (Wright's F) equals its parents' kinship.
 */
export function kinship(
  ped: Record<string, PedigreeEntry>,
  a: string | undefined,
  b: string | undefined,
  memo = new Map<string, number>(),
): number {
  if (!a || !b || !ped[a] || !ped[b]) return 0;
  const key = a < b ? `${a}|${b}` : `${b}|${a}`;
  const cached = memo.get(key);
  if (cached !== undefined) return cached;
  let value: number;
  if (a === b) value = 0.5 * (1 + (ped[a]!.inbreeding ?? 0));
  else {
    // Expand whichever dog is further from the founders (it cannot be the other's ancestor).
    const [x, y] = depth(ped, a) >= depth(ped, b) ? [a, b] : [b, a];
    const e = ped[x]!;
    value = 0.5 * (kinship(ped, e.sireId, y, memo) + kinship(ped, e.damId, y, memo));
  }
  memo.set(key, value);
  return value;
}

// ---------------------------------------------------------------------------
// The stud book: proven dogs from other kennels, available for a fee.
// ---------------------------------------------------------------------------

export interface Stud {
  dog: Dog;
  kennel: string;
  owner: string;
  fee: number;
  blurb: string;
  /** What their owners publish: proven, fairly narrow ranges. */
  known: DogKnowledge;
}

interface StudSpec {
  key: string;
  name: string;
  breed: BreedId;
  kennel: string;
  owner: string;
  fee: number;
  titles: TrialLevel[];
  boost: Partial<Record<Aptitude, number>>;
  blurb: string;
}

const STUDS: StudSpec[] = [
  {
    key: 'sterling-monarch',
    name: 'Sterling Monarch',
    breed: 'labrador',
    kennel: 'Sterling Kennels',
    owner: 'Victor Sterling',
    fee: 220,
    titles: ['novice', 'open', 'excellent'],
    boost: { speed: 0.6, drive: 0.6, focus: 0.5, biddability: 0.4, water: 0.6, mouth: 0.4 },
    blurb: "Victor's best: fast, keen and a beautiful water dog. Priced like it.",
  },
  {
    key: 'hartley-rowan',
    name: 'Hartley Rowan',
    breed: 'golden',
    kennel: 'Hartley Gundogs',
    owner: 'Ruth Hartley',
    fee: 140,
    titles: ['novice', 'open'],
    boost: { biddability: 0.7, mouth: 0.7, focus: 0.4, nose: 0.3 },
    blurb: 'Gentle, biddable, a lovely soft mouth. Ruth breeds for temperament first.',
  },
  {
    key: 'glenreid-moss',
    name: 'Glenreid Moss',
    breed: 'borderCollie',
    kennel: 'Glenreid',
    owner: 'Hamish Reid',
    fee: 110,
    titles: ['novice', 'open'],
    boost: { focus: 0.8, agility: 0.7, stamina: 0.5, biddability: 0.6 },
    blurb: 'Sharp as a tack and never tires. Not a natural swimmer.',
  },
  {
    key: 'okafor-juniper',
    name: 'Okafor Juniper',
    breed: 'labrador',
    kennel: 'Okafor Retrievers',
    owner: 'Grace Okafor',
    fee: 160,
    titles: ['novice', 'open'],
    boost: { nose: 0.8, confidence: 0.5, water: 0.5, drive: 0.3 },
    blurb: "The best nose in the county, Grace says. Chocolate-carrying, if you're after colour.",
  },
  {
    key: 'pennock-scout',
    name: 'Pennock Scout',
    breed: 'beagle',
    kennel: 'Pennock Farm',
    owner: 'Sam Pennock',
    fee: 60,
    titles: ['novice'],
    boost: { nose: 0.9, drive: 0.4, stamina: 0.4 },
    blurb: "A hound's nose on a sensible dog. Cheap, cheerful, and smaller than most.",
  },
];

/** The studs on offer. The same dogs every time, with stable ids for pedigrees. */
export function studBook(): Stud[] {
  return STUDS.map((spec) => {
    const rng = createRng(hashString(`stud-${spec.key}`));
    const dog = generateRescue(rng, spec.name);
    dog.genome = createFounderGenome(rng, spec.breed);
    for (const [k, v] of Object.entries(spec.boost) as [Aptitude, number][])
      dog.genome.traits[k].g += v;
    if (spec.key === 'okafor-juniper') dog.genome.loci.B = ['B', 'b'];
    dog.id = `stud-${spec.key}`;
    dog.sex = 'male';
    dog.ageMonths = 48;
    dog.origin = 'purchased';
    dog.breedMix = { [spec.breed]: 1 };
    dog.titles = [...spec.titles];
    dog.dnaTested = true;
    dog.breeder = spec.kennel;
    const known: DogKnowledge = {};
    for (const a of APTITUDES) {
      const t = aptitude(dog, a);
      const lo = clamp(t - int(rng, 3, 9), 1, t);
      known[a] = { lo, hi: clamp(lo + 12, t, 99) };
    }
    return {
      dog,
      kennel: spec.kennel,
      owner: spec.owner,
      fee: spec.fee,
      blurb: spec.blurb,
      known,
    };
  });
}

export const findStud = (id: string): Stud | undefined => studBook().find((s) => s.dog.id === id);

// ---------------------------------------------------------------------------
// Eligibility and the forecast
// ---------------------------------------------------------------------------

export interface Pregnancy {
  id: string;
  damId: string;
  sireId: string;
  sireName: string;
  sireKennel: string;
  matedDay: number;
  dueDay: number;
  seed: number;
}

export interface PlacedPuppy {
  puppyId: string;
  name: string;
  home: string;
  fee: number;
}

export interface Litter {
  id: string;
  damId: string;
  sireId: string;
  damName: string;
  sireName: string;
  bornDay: number;
  /** Puppies still with their mother. */
  puppies: Dog[];
  kept: string[];
  placed: PlacedPuppy[];
  inbreeding: number;
}

export const breedingUnlocked = (state: GameState): boolean =>
  hasFlag(state, 'restored:whelpingRoom');

export const isPregnant = (state: GameState, dogId: string): boolean =>
  state.pregnancies.some((p) => p.damId === dogId);

/** Why this dog can't be a dam right now, or null if she can. */
export function damProblem(state: GameState, dam: Dog): string | null {
  if (dam.sex !== 'female') return 'Only a female can carry a litter.';
  if (dam.ageMonths < BREEDING.damMinMonths)
    return `Too young: she should be at least ${BREEDING.damMinMonths / 12} years old.`;
  if (dam.ageMonths > BREEDING.damMaxMonths) return 'She has earned a quiet retirement.';
  if (isPregnant(state, dam.id)) return 'Already in whelp.';
  const last = state.litters
    .filter((l) => l.damId === dam.id)
    .sort((a, b) => b.bornDay - a.bornDay)[0];
  if (last && state.day - last.bornDay < BREEDING.restDays)
    return `Resting after her last litter (ready on day ${last.bornDay + BREEDING.restDays}).`;
  return null;
}

export function sireProblem(sire: Dog): string | null {
  if (sire.sex !== 'male') return 'The sire must be male.';
  if (sire.ageMonths < BREEDING.sireMinMonths) return 'Too young to sire a litter.';
  return null;
}

export interface Forecast {
  /** Likely coats, when both parents' coat genes are known. */
  coats: { name: string; share: number; sample: Dog['genome'] }[] | null;
  /** Expected range for each talent, from what is known about the parents. */
  talents: { aptitude: Aptitude; lo: number; mid: number; hi: number; certain: boolean }[];
  inbreeding: number;
  warnings: string[];
  blocked: string | null;
  litterSize: [number, number];
  fee: number;
}

const estimateFor = (state: GameState, dog: Dog): DogKnowledge =>
  findStud(dog.id)?.known ?? state.knowledge[dog.id] ?? {};

/** What this pairing is likely to produce, as far as the keeper can tell. */
export function forecast(state: GameState, dam: Dog, sire: Dog): Forecast {
  const stud = findStud(sire.id);
  const ped = { ...state.pedigree };
  if (stud && !ped[sire.id]) {
    ped[sire.id] = {
      id: sire.id,
      name: sire.name,
      sex: 'male',
      kennel: stud.kennel,
      coat: coatOf(sire).name,
      breed: describeMix(sire.breedMix),
      titles: sire.titles,
      inbreeding: 0,
    };
  }
  const inbreeding = kinship(ped, dam.id, sire.id);
  const warnings: string[] = [];
  let blocked = damProblem(state, dam) ?? sireProblem(sire);

  // Merle to merle risks double merle puppies (deafness, blindness).
  const merle = (d: Dog) => coatOf(d).merle > 0 || (d.dnaTested && d.genome.loci.M.includes('M'));
  if (merle(dam) && merle(sire)) {
    blocked ??=
      'Merle to merle: a quarter of the puppies would be double merle, which risks deafness and blindness. Responsible breeders never make this pairing.';
  }
  if (inbreeding >= BREEDING.inbreedingHigh)
    warnings.push(
      `Close relatives (inbreeding ${(inbreeding * 100).toFixed(1)}%). Puppies may lose vigour and hidden faults can double up.`,
    );
  else if (inbreeding >= BREEDING.inbreedingWarn)
    warnings.push(`Related parents (inbreeding ${(inbreeding * 100).toFixed(1)}%). Use with care.`);

  // Coat outcomes: sample many possible puppies from the real genes, but only
  // show them when both parents have been DNA tested.
  let coats: Forecast['coats'] = null;
  if (dam.dnaTested && sire.dnaTested) {
    const rng = createRng(hashString(`${dam.id}x${sire.id}`));
    const tally = new Map<string, { n: number; sample: Dog['genome'] }>();
    const samples = 400;
    for (let i = 0; i < samples; i++) {
      const g = inheritGenome(rng, sire.genome, dam.genome, inbreeding);
      const name = simpleCoatName(deriveCoat(g).name);
      const entry = tally.get(name);
      if (entry) entry.n++;
      else tally.set(name, { n: 1, sample: g });
    }
    coats = [...tally]
      .map(([name, v]) => ({ name, share: v.n / samples, sample: v.sample }))
      .sort((a, b) => b.share - a.share)
      .slice(0, 6);
  }

  // Talents: regression of offspring on the parents, using what the keeper
  // actually knows (unknown parents give wide, honest ranges).
  const known = [estimateFor(state, dam), estimateFor(state, sire)];
  const talents = APTITUDES.map((a) => {
    const ests = known.map((k) => k[a] ?? ({ lo: 1, hi: 99 } as Estimate));
    const mids = ests.map((e) => ((e.lo + e.hi) / 2 - 50) / 15);
    const widths = ests.map((e) => (e.hi - e.lo) / 30);
    const h2 = HERITABILITY[a];
    const mid = (h2 * (mids[0]! + mids[1]!)) / 2;
    const spread = Math.sqrt(1 - h2 / 2) * 0.75 + (h2 / 2) * ((widths[0]! + widths[1]!) / 2);
    return {
      aptitude: a,
      lo: toScore(mid - spread),
      mid: toScore(mid),
      hi: toScore(mid + spread),
      certain: ests.every((e) => e.hi - e.lo <= 30),
    };
  });

  return {
    coats,
    talents,
    inbreeding,
    warnings,
    blocked,
    litterSize: litterRange(dam),
    fee: stud?.fee ?? 0,
  };
}

/** Coat names without the polygenic shade words, so outcomes group sensibly. */
function simpleCoatName(name: string): string {
  return name.replace(/\b(light|dark|pale|deep)\s+/g, '');
}

function litterRange(dam: Dog): [number, number] {
  const small = deriveBody(dam.genome).height < 0.42;
  return small ? [2, 5] : [BREEDING.litterMin, BREEDING.litterMax];
}

// ---------------------------------------------------------------------------
// Mating, whelping, and the puppies' futures
// ---------------------------------------------------------------------------

export function dnaTest(state: GameState, dogId: string): boolean {
  const dog = state.dogs.find((d) => d.id === dogId);
  if (!dog || dog.dnaTested || state.money < BREEDING.dnaTestCost) return false;
  state.money -= BREEDING.dnaTestCost;
  dog.dnaTested = true;
  return true;
}

/** Arranges the mating. The litter is due a few days later. */
export function breed(state: GameState, damId: string, sireId: string): Pregnancy | null {
  const dam = state.dogs.find((d) => d.id === damId);
  const stud = findStud(sireId);
  const sire = stud?.dog ?? state.dogs.find((d) => d.id === sireId);
  if (!dam || !sire || !breedingUnlocked(state)) return null;
  const f = forecast(state, dam, sire);
  if (f.blocked || state.money < f.fee) return null;
  state.money -= f.fee;
  if (stud) register(state, stud.dog, stud.kennel);
  const pregnancy: Pregnancy = {
    id: `preg-${state.day}-${damId}`,
    damId,
    sireId: sire.id,
    sireName: sire.name,
    sireKennel: stud?.kennel ?? (state.kennelName || 'Your kennel'),
    matedDay: state.day,
    dueDay: state.day + BREEDING.gestationDays,
    seed: eventRng(state, `mating-${damId}`).state,
  };
  state.pregnancies.push(pregnancy);
  note(state, `${dam.name} was mated with ${sire.name}. Puppies due on day ${pregnancy.dueDay}.`);
  return pregnancy;
}

/** A dam whelps: her puppies are born and join the kennel's records. */
export function whelp(state: GameState, pregnancy: Pregnancy): Litter | null {
  const dam = state.dogs.find((d) => d.id === pregnancy.damId);
  const sire = findStud(pregnancy.sireId)?.dog ?? state.dogs.find((d) => d.id === pregnancy.sireId);
  state.pregnancies = state.pregnancies.filter((p) => p.id !== pregnancy.id);
  if (!dam || !sire) return null;
  const rng = createRng(pregnancy.seed);
  const [min, max] = litterRange(dam);
  const count = int(rng, min, max);
  const inbreeding = kinship(state.pedigree, dam.id, sire.id);
  const breeder = state.kennelName || 'Your kennel';
  const taken = [...state.dogs.map((d) => d.name)];
  const puppies: Dog[] = [];
  for (let i = 0; i < count; i++) {
    const pup = createPuppy(rng, sire, dam, inbreeding, breeder, taken);
    taken.push(pup.name);
    puppies.push(pup);
    register(state, pup, breeder);
    // First impressions: a puppy's boldness and keenness show early, roughly.
    state.knowledge[pup.id] = {};
    observe(rng, pup, state.knowledge[pup.id]!, [
      { aptitude: 'confidence', precision: 26 },
      { aptitude: 'drive', precision: 28 },
    ]);
  }
  const litter: Litter = {
    id: `litter-${state.day}-${dam.id}`,
    damId: dam.id,
    sireId: sire.id,
    damName: dam.name,
    sireName: sire.name,
    bornDay: state.day,
    puppies,
    kept: [],
    placed: [],
    inbreeding,
  };
  state.litters.push(litter);
  addFlag(state, 'firstLitter');
  note(
    state,
    `${dam.name} whelped ${count} puppies by ${sire.name}: ${puppies.map((p) => p.name).join(', ')}.`,
  );
  return litter;
}

/** Puppies grow up with the seasons; undecided older puppies are placed for you. */
export function growPuppies(state: GameState, months: number): string[] {
  const messages: string[] = [];
  for (const litter of state.litters) {
    for (const pup of litter.puppies) pup.ageMonths += months;
    const overdue = litter.puppies.filter((p) => p.ageMonths >= BREEDING.decideByMonths);
    for (const pup of overdue) {
      const fee = Math.round(placementFee(state, litter, pup) * 0.5);
      placeOne(state, litter, pup, fee, 'a family Mara found');
      messages.push(`${pup.name} was ready for a home, so Mara found one. +$${fee}.`);
    }
  }
  return messages;
}

const HOMES = [
  'the Hendersons at Elm Cross',
  'a shepherd up at Fell Top',
  'the Ashby children (Billy is thrilled)',
  'a retired gamekeeper in Larkspur',
  'a young couple in the village',
  'the vicar, who has been lonely',
  "Mara's niece",
  'a farm family over the hill',
];

/** What a family will pay for a puppy: parents' titles, the kennel's results, the pup itself. */
export function placementFee(state: GameState, litter: Litter, pup: Dog): number {
  const ped = state.pedigree;
  const titles = (ped[litter.sireId]?.titles.length ?? 0) + (ped[litter.damId]?.titles.length ?? 0);
  const quality = APTITUDES.reduce((s, a) => s + aptitude(pup, a), 0) / APTITUDES.length;
  const reputation = Math.min(60, state.trials.filter((t) => t.qualified).length * 10);
  return Math.round(clamp(45 + titles * 25 + (quality - 50) * 1.5 + reputation, 30, 400));
}

export const puppyReady = (pup: Dog): boolean => pup.ageMonths >= BREEDING.goHomeMonths;

function placeOne(state: GameState, litter: Litter, pup: Dog, fee: number, home: string): void {
  litter.puppies = litter.puppies.filter((p) => p.id !== pup.id);
  litter.placed.push({ puppyId: pup.id, name: pup.name, home, fee });
  state.money += fee;
  note(state, `${pup.name} went to a new home with ${home}.`);
}

/** Places a puppy with a good family. */
export function placePuppy(
  state: GameState,
  litterId: string,
  puppyId: string,
): PlacedPuppy | null {
  const litter = state.litters.find((l) => l.id === litterId);
  const pup = litter?.puppies.find((p) => p.id === puppyId);
  if (!litter || !pup || !puppyReady(pup)) return null;
  const fee = placementFee(state, litter, pup);
  const home = pick(createRng(hashString(pup.id)), HOMES);
  placeOne(state, litter, pup, fee, home);
  return litter.placed[litter.placed.length - 1]!;
}

/** Keeps a puppy: it joins the kennel and needs a run of its own. */
export function keepPuppy(
  state: GameState,
  litterId: string,
  puppyId: string,
  name: string,
): Dog | null {
  const litter = state.litters.find((l) => l.id === litterId);
  const pup = litter?.puppies.find((p) => p.id === puppyId);
  if (!litter || !pup || !puppyReady(pup) || state.dogs.length >= KENNEL_RUNS) return null;
  const clean = name.trim().slice(0, 16) || pup.name;
  pup.name = clean;
  litter.puppies = litter.puppies.filter((p) => p.id !== pup.id);
  litter.kept.push(pup.id);
  state.dogs.push(pup);
  state.season.skills[pup.id] = { ...pup.skills };
  register(state, pup, pup.breeder ?? (state.kennelName || 'Your kennel'));
  note(state, `Kept ${clean} from ${litter.damName}'s litter.`);
  return pup;
}

/** Called each morning: litters due today arrive. */
export function dueToday(state: GameState): Litter[] {
  const born: Litter[] = [];
  for (const p of [...state.pregnancies]) {
    if (p.dueDay <= state.day) {
      const litter = whelp(state, p);
      if (litter) born.push(litter);
    }
  }
  return born;
}

/** Puppies too young for field work. */
export const tooYoungForWork = (dog: Dog): boolean => dog.ageMonths < 9;

/** The current dog can't do hard work while in whelp. */
export function restingForLitter(state: GameState): boolean {
  const dog = activeDog(state);
  return !!dog && isPregnant(state, dog.id);
}
