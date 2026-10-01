import { gaussian, int, random, type Rng } from '../rng';
import { BREEDS, POPULATION_ALLELES, type BreedId } from './breeds';
import { LOCI, LOCUS_IDS, type Allele, type AllelePair, type Genotype, type Locus } from './loci';
import { HERITABILITY, TRAIT_IDS, type TraitId, type TraitValue } from './traits';

export interface Genome {
  loci: Genotype;
  traits: Record<TraitId, TraitValue>;
  /** Wright's inbreeding coefficient of this individual (0 = unrelated parents). */
  inbreeding: number;
  /** Seeds this dog's own marking layout. Not inherited, so siblings differ. */
  markingSeed: number;
}

/** Breed founders vary less than the whole dog population. */
const WITHIN_BREED_SPREAD = 0.75;

function sampleAllele<L extends Locus>(rng: Rng, locus: L, breed: BreedId): Allele<L> {
  const table = (BREEDS[breed].alleles[locus] ?? POPULATION_ALLELES[locus]) as Partial<
    Record<Allele<L>, number>
  >;
  const options = LOCI[locus] as readonly Allele<L>[];
  const total = options.reduce((sum, allele) => sum + (table[allele] ?? 0), 0);
  let roll = random(rng) * total;
  for (const allele of options) {
    roll -= table[allele] ?? 0;
    if (roll < 0) return allele;
  }
  return options.find((allele) => (table[allele] ?? 0) > 0) ?? options[0]!;
}

/** A purebred dog with no recorded ancestry, drawn from its breed's gene pool. */
export function createFounderGenome(rng: Rng, breed: BreedId): Genome {
  const loci = {} as Record<Locus, AllelePair<Locus>>;
  for (const locus of LOCUS_IDS) {
    loci[locus] = [sampleAllele(rng, locus, breed), sampleAllele(rng, locus, breed)];
  }
  const traits = {} as Record<TraitId, TraitValue>;
  for (const id of TRAIT_IDS) {
    const h2 = HERITABILITY[id];
    traits[id] = {
      g: (BREEDS[breed].means[id] ?? 0) + gaussian(rng) * Math.sqrt(h2) * WITHIN_BREED_SPREAD,
      e: gaussian(rng) * Math.sqrt(1 - h2),
    };
  }
  return {
    loci: loci as Genotype,
    traits,
    inbreeding: 0,
    markingSeed: int(rng, 1, 2 ** 31 - 1),
  };
}

/** One allele from each parent, chosen at random (Mendelian segregation). */
function inheritLocus<L extends Locus>(
  rng: Rng,
  sire: AllelePair<L>,
  dam: AllelePair<L>,
): AllelePair<L> {
  const fromSire = random(rng) < 0.5 ? sire[0] : sire[1];
  const fromDam = random(rng) < 0.5 ? dam[0] : dam[1];
  return [fromSire, fromDam];
}

/**
 * Produces a puppy's genome. `inbreeding` is the puppy's own coefficient,
 * which equals the kinship of its parents and is computed from the pedigree.
 */
export function inheritGenome(rng: Rng, sire: Genome, dam: Genome, inbreeding = 0): Genome {
  const loci = {} as Record<Locus, AllelePair<Locus>>;
  for (const locus of LOCUS_IDS) {
    loci[locus] = inheritLocus(rng, sire.loci[locus], dam.loci[locus]);
  }
  const parentF = (sire.inbreeding + dam.inbreeding) / 2;
  const traits = {} as Record<TraitId, TraitValue>;
  for (const id of TRAIT_IDS) {
    const h2 = HERITABILITY[id];
    const midParent = (sire.traits[id].g + dam.traits[id].g) / 2;
    const mendelianSd = Math.sqrt((h2 / 2) * (1 - parentF));
    traits[id] = {
      g: midParent + gaussian(rng) * mendelianSd,
      e: gaussian(rng) * Math.sqrt(1 - h2),
    };
  }
  return {
    loci: loci as Genotype,
    traits,
    inbreeding,
    markingSeed: int(rng, 1, 2 ** 31 - 1),
  };
}
