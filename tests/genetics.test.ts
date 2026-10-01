import { describe, expect, it } from 'vitest';
import { createRng, gaussian } from '../src/core/rng';
import { createFounderGenome, inheritGenome, type Genome } from '../src/core/genetics/genome';
import { deriveCoat } from '../src/core/genetics/coat';
import { formatGenotype, type Genotype } from '../src/core/genetics/loci';
import { HERITABILITY, traitZ } from '../src/core/genetics/traits';
import { aptitude, coatOf, generateShelterTrio } from '../src/core/dog/dog';

function genomeWith(loci: Partial<Genotype>, seed = 1): Genome {
  const base = createFounderGenome(createRng(seed), 'villageDog');
  return {
    ...base,
    loci: {
      ...base.loci,
      E: ['E', 'E'],
      K: ['ky', 'ky'],
      A: ['at', 'at'],
      B: ['B', 'B'],
      D: ['D', 'D'],
      M: ['m', 'm'],
      S: ['S', 'S'],
      T: ['t', 't'],
      ...loci,
    },
  };
}

function litterShare(sire: Genome, dam: Genome, test: (pup: Genome) => boolean, n = 4000): number {
  const rng = createRng(99);
  let hits = 0;
  for (let i = 0; i < n; i++) if (test(inheritGenome(rng, sire, dam))) hits++;
  return hits / n;
}

describe('coat colour genetics', () => {
  it('two black dogs carrying yellow have about a quarter yellow puppies', () => {
    const blackCarrier = genomeWith({ E: ['E', 'e'], K: ['KB', 'KB'] });
    expect(deriveCoat(blackCarrier).name.startsWith('black')).toBe(true);
    const share = litterShare(
      blackCarrier,
      blackCarrier,
      (pup) => deriveCoat(pup).base === 'pheomelanin',
    );
    expect(share).toBeGreaterThan(0.22);
    expect(share).toBeLessThan(0.28);
  });

  it('recessive red hides black, brown and agouti genes', () => {
    const coat = deriveCoat(genomeWith({ E: ['e', 'e'], K: ['KB', 'KB'], B: ['b', 'b'] }));
    expect(coat.base).toBe('pheomelanin');
    expect(coat.points).toBe(false);
    expect(coat.nose).not.toBe('#1a1615'); // liver nose still shows the b/b genes
  });

  it('dominant black hides the agouti pattern', () => {
    const coat = deriveCoat(genomeWith({ K: ['KB', 'ky'], A: ['at', 'at'] }));
    expect(coat.points).toBe(false);
    expect(coat.name.startsWith('black')).toBe(true);
  });

  it('ky/ky with at/at shows tan points', () => {
    const coat = deriveCoat(genomeWith({ A: ['at', 'a'] }));
    expect(coat.points).toBe(true);
    expect(coat.name).toContain('and tan');
  });

  it('brown and dilute change dark pigment as expected', () => {
    expect(deriveCoat(genomeWith({ K: ['KB', 'KB'], B: ['b', 'b'] })).name).toMatch(/^chocolate/);
    expect(deriveCoat(genomeWith({ K: ['KB', 'KB'], D: ['d', 'd'] })).name).toMatch(/^blue/);
    expect(deriveCoat(genomeWith({ K: ['KB', 'KB'], B: ['b', 'b'], D: ['d', 'd'] })).name).toMatch(
      /^lilac/,
    );
  });

  it('chocolate carriers produce about a quarter chocolate puppies', () => {
    const carrier = genomeWith({ K: ['KB', 'KB'], B: ['B', 'b'] });
    const share = litterShare(carrier, carrier, (pup) =>
      deriveCoat(pup).name.startsWith('chocolate'),
    );
    expect(share).toBeGreaterThan(0.22);
    expect(share).toBeLessThan(0.28);
  });

  it('merle cannot show on a recessive red coat', () => {
    const coat = deriveCoat(genomeWith({ E: ['e', 'e'], M: ['M', 'm'] }));
    expect(coat.merle).toBe(0);
    expect(coat.notes.join(' ')).toContain('cryptic merle');
  });

  it('double merle is flagged', () => {
    const coat = deriveCoat(genomeWith({ K: ['KB', 'KB'], M: ['M', 'M'] }));
    expect(coat.merle).toBe(2);
    expect(coat.notes.join(' ')).toContain('Double merle');
  });

  it('piebald needs two copies of sp', () => {
    expect(deriveCoat(genomeWith({ S: ['sp', 'sp'] })).whiteAmount).toBeGreaterThan(0.35);
    expect(deriveCoat(genomeWith({ S: ['S', 'S'] })).whiteAmount).toBeLessThan(0.09);
  });

  it('the same genome always produces the same coat', () => {
    const genome = createFounderGenome(createRng(7), 'borderCollie');
    expect(deriveCoat(genome)).toEqual(deriveCoat(genome));
  });

  it('formats genotypes breeder-style', () => {
    expect(formatGenotype(genomeWith({ E: ['E', 'e'] }).loci)).toContain('E/e ky/ky at/at');
  });
});

describe('inherited aptitudes', () => {
  it('puppies centre on the mid-parent value with h2/2 Mendelian variance', () => {
    const rng = createRng(5);
    const sire = createFounderGenome(rng, 'villageDog');
    const dam = createFounderGenome(rng, 'villageDog');
    sire.traits.nose.g = 1.2;
    dam.traits.nose.g = 0.2;
    const values: number[] = [];
    for (let i = 0; i < 5000; i++) values.push(inheritGenome(rng, sire, dam).traits.nose.g);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    expect(mean).toBeCloseTo(0.7, 1);
    expect(variance).toBeCloseTo(HERITABILITY.nose / 2, 1);
  });

  it('inbred parents produce less varied puppies', () => {
    const rng = createRng(6);
    const sire = createFounderGenome(rng, 'villageDog');
    const dam = createFounderGenome(rng, 'villageDog');
    const spreadOf = (f: number) => {
      const s = { ...sire, inbreeding: f };
      const d = { ...dam, inbreeding: f };
      const vals = Array.from({ length: 3000 }, () => inheritGenome(rng, s, d).traits.speed.g);
      const m = vals.reduce((a, v) => a + v, 0) / vals.length;
      return vals.reduce((a, v) => a + (v - m) ** 2, 0) / vals.length;
    };
    expect(spreadOf(0.5)).toBeLessThan(spreadOf(0));
  });

  it('breed tendencies show up on average but individuals overlap', () => {
    const rng = createRng(11);
    const beagles = Array.from({ length: 300 }, () => createFounderGenome(rng, 'beagle'));
    const labs = Array.from({ length: 300 }, () => createFounderGenome(rng, 'labrador'));
    const avg = (gs: Genome[]) => gs.reduce((s, g) => s + traitZ(g.traits.nose), 0) / gs.length;
    expect(avg(beagles)).toBeGreaterThan(avg(labs));
    const bestLab = Math.max(...labs.map((g) => traitZ(g.traits.nose)));
    const worstBeagle = Math.min(...beagles.map((g) => traitZ(g.traits.nose)));
    expect(bestLab).toBeGreaterThan(worstBeagle);
  });

  it('gaussian sampler is roughly standard normal', () => {
    const rng = createRng(3);
    const xs = Array.from({ length: 20000 }, () => gaussian(rng));
    const mean = xs.reduce((s, v) => s + v, 0) / xs.length;
    const variance = xs.reduce((s, v) => s + (v - mean) ** 2, 0) / xs.length;
    expect(Math.abs(mean)).toBeLessThan(0.03);
    expect(variance).toBeCloseTo(1, 1);
  });
});

describe('shelter dogs', () => {
  it('a shelter trio has three different looks and different standout strengths', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const trio = generateShelterTrio(createRng(seed));
      const coats = new Set(trio.map((d) => coatOf(d).name));
      expect(coats.size).toBe(3);
      for (const dog of trio) expect(aptitude(dog, 'nose')).toBeGreaterThanOrEqual(1);
    }
  });
});
