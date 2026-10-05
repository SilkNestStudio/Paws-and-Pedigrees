import type { CoatAppearance } from '../core/genetics/coat';

/** A small CSS background that suggests a dog's coat: base colour, points, white. */
export function coatSwatch(coat: CoatAppearance | null): string {
  if (!coat) return '#ccc';
  const main = coat.base === 'eumelanin' ? coat.eumelanin : coat.pheomelanin;
  if (coat.whiteAmount > 0.45)
    return `radial-gradient(circle at 35% 35%, ${main} 30%, ${coat.white} 32%)`;
  if (coat.points) return `linear-gradient(135deg, ${coat.eumelanin} 55%, ${coat.pheomelanin} 55%)`;
  if (coat.merle) return `radial-gradient(circle at 30% 40%, ${coat.eumelanin} 18%, #9aa0a8 20%)`;
  if (coat.brindle)
    return `repeating-linear-gradient(60deg, ${coat.pheomelanin} 0 4px, ${coat.eumelanin} 4px 7px)`;
  return main;
}
