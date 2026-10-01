import { createRng } from '../src/core/rng';
import { generateRescue, type Cue, type Dog } from '../src/core/dog/dog';
import type { Aptitude } from '../src/core/genetics/traits';

/** A dog with exact aptitude scores and skills, for repeatable simulation tests. */
export function testDog(
  aptitudes: Partial<Record<Aptitude, number>> = {},
  skills: Partial<Record<Cue, number>> = {},
  seed = 1,
): Dog {
  const dog = generateRescue(createRng(seed), 'Tester');
  for (const key of Object.keys(dog.genome.traits) as (keyof typeof dog.genome.traits)[]) {
    dog.genome.traits[key] = { g: 0, e: 0 };
  }
  for (const [key, score] of Object.entries(aptitudes) as [Aptitude, number][]) {
    dog.genome.traits[key] = { g: (score - 50) / 15, e: 0 };
  }
  dog.skills = { sit: 0.6, stay: 0.5, recall: 0.6, stop: 0, cast: 0, deliver: 0.6, ...skills };
  dog.bond = 40;
  return dog;
}
