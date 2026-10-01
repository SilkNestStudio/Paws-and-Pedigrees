/**
 * Coat loci used by the game. This is a documented subset of established
 * canine coat genetics, not a complete biological simulation.
 *
 * Each locus lists its alleles from most to least dominant. Where real
 * dominance is incomplete (merle, white spotting, curl) the phenotype code in
 * coat.ts counts copies instead of using `dominantAllele`.
 *
 * E  Extension (MC1R):      Em (melanistic mask) > E > e (recessive red/yellow)
 * K  Dominant black (CBD103): KB (solid) > kbr (brindle) > ky (lets agouti show)
 * A  Agouti (ASIP):         ay (sable/fawn) > aw (wild sable) > at (tan points) > a (recessive black)
 * B  Brown (TYRP1):         B > b (black pigment becomes liver/chocolate)
 * D  Dilute (MLPH):         D > d (black becomes blue, liver becomes isabella)
 * M  Merle (PMEL):          M (one copy merle, two copies double merle) / m
 * S  White spotting (MITF): S (little or no white) / sp (piebald); incomplete dominance
 * T  Ticking:               T (flecks of colour in white areas) > t
 * L  Coat length (FGF5):    L (short) > l (long)
 * F  Furnishings (RSPO2):   F (beard and eyebrows) > f
 * Cu Curl (KRT71):          Cu / cu; one copy wavy, two copies curly
 */
export const LOCI = {
  E: ['Em', 'E', 'e'],
  K: ['KB', 'kbr', 'ky'],
  A: ['ay', 'aw', 'at', 'a'],
  B: ['B', 'b'],
  D: ['D', 'd'],
  M: ['M', 'm'],
  S: ['S', 'sp'],
  T: ['T', 't'],
  L: ['L', 'l'],
  F: ['F', 'f'],
  Cu: ['Cu', 'cu'],
} as const;

export type Locus = keyof typeof LOCI;
export type Allele<L extends Locus> = (typeof LOCI)[L][number];
export type AllelePair<L extends Locus> = readonly [Allele<L>, Allele<L>];
export type Genotype = { [L in Locus]: AllelePair<L> };

export const LOCUS_NAMES: Record<Locus, string> = {
  E: 'Extension',
  K: 'Dominant black',
  A: 'Agouti',
  B: 'Brown',
  D: 'Dilute',
  M: 'Merle',
  S: 'White spotting',
  T: 'Ticking',
  L: 'Coat length',
  F: 'Furnishings',
  Cu: 'Curl',
};

export const LOCUS_IDS = Object.keys(LOCI) as Locus[];

/** The allele that is expressed under simple dominance. */
export function dominantAllele<L extends Locus>(locus: L, pair: AllelePair<L>): Allele<L> {
  const order = LOCI[locus] as readonly Allele<L>[];
  return order.indexOf(pair[0]) <= order.indexOf(pair[1]) ? pair[0] : pair[1];
}

export function copiesOf<L extends Locus>(pair: AllelePair<L>, allele: Allele<L>): number {
  return (pair[0] === allele ? 1 : 0) + (pair[1] === allele ? 1 : 0);
}

export function hasAllele<L extends Locus>(pair: AllelePair<L>, allele: Allele<L>): boolean {
  return pair[0] === allele || pair[1] === allele;
}

/** Writes a genotype the way breeders do, e.g. "E/e ky/ky at/a B/b". */
export function formatGenotype(genotype: Genotype): string {
  return LOCUS_IDS.map((locus) => genotype[locus].join('/')).join(' ');
}
