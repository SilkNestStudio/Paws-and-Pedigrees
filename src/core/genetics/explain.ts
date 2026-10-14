import { copiesOf, dominantAllele, hasAllele, type Genotype } from './loci';

/**
 * DNA results in plain words. A dog can carry a colour or coat type without
 * showing it; those are the only things a DNA test tells a breeder that
 * looking at the dog does not. This lists them without any gene codes.
 */
const PATTERN_NAMES = {
  ay: 'fawn or sable',
  aw: 'wolf sable',
  at: 'tan points (as in black and tan)',
  a: 'solid black',
} as const;

/** What this dog carries without showing: colours, patterns and coat types it can pass on. */
export function hiddenTraits(loci: Genotype): string[] {
  const out: string[] = [];
  const red = copiesOf(loci.E, 'e') === 2;
  const brown = copiesOf(loci.B, 'b') === 2;
  const solidCopies = copiesOf(loci.K, 'KB');
  const solid = !red && solidCopies > 0;

  // Colours carried as a single, silent copy.
  if (copiesOf(loci.E, 'e') === 1) out.push('yellow or red');
  if (copiesOf(loci.B, 'b') === 1) out.push('chocolate');
  if (copiesOf(loci.D, 'd') === 1) out.push('blue (a washed-out, dilute colour)');
  // A yellow or red coat has no dark hair, so the dark colour underneath can't be seen.
  if (red) out.push(`${brown ? 'chocolate' : 'black'} (under the yellow or red coat)`);

  // Patterns: a solid coat, or a yellow or red one, covers whatever pattern is underneath.
  // With two copies of solid, every puppy is solid too, so the pattern stays hidden.
  if ((solid || red) && solidCopies < 2) {
    if (hasAllele(loci.K, 'kbr')) out.push('brindle stripes');
    const under = dominantAllele('A', loci.A);
    if (under !== 'a') out.push(PATTERN_NAMES[under]);
  } else if (!solid && !red) {
    // The pattern shows; the second, weaker pattern gene does not.
    const top = dominantAllele('A', loci.A);
    const other = loci.A[0] === top ? loci.A[1] : loci.A[0];
    if (other !== top) out.push(PATTERN_NAMES[other]);
  }
  if (red && hasAllele(loci.M, 'M')) out.push('merle (it cannot show on this coat)');
  if (copiesOf(loci.S, 'sp') === 1) out.push('large white patches');
  if (copiesOf(loci.L, 'l') === 1) out.push('a long coat');
  return out;
}

/** "chocolate, yellow or red and a long coat" */
export function listInWords(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** One sentence for a DNA result. */
export function dnaInWords(loci: Genotype): string {
  const hidden = hiddenTraits(loci);
  return hidden.length
    ? `Carries without showing: ${listInWords(hidden)}.`
    : 'Carries nothing hidden: what you see is what gets passed on.';
}
