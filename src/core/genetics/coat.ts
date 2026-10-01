import { clamp, clamp01, lerp } from '../math';
import { copiesOf, dominantAllele, hasAllele } from './loci';
import type { Genome } from './genome';
import { traitZ } from './traits';

/**
 * Everything the renderer and the interface need to show a dog's coat. It is
 * derived entirely from the genome, so the same dog always looks the same and
 * puppies resemble their families for genetic reasons.
 */
export interface CoatAppearance {
  /** Breeder-style colour name, e.g. "black and tan with white". */
  name: string;
  /** Colours as #rrggbb. */
  eumelanin: string;
  pheomelanin: string;
  white: string;
  nose: string;
  eye: string;
  /** Pigment covering most of the body before patterns are applied. */
  base: 'eumelanin' | 'pheomelanin';
  /** Tan points on a dark dog (A locus at). */
  points: boolean;
  /** For tan-pointed dogs: 1 = dark everywhere but the points, 0.4 = saddle only. */
  saddle: number;
  /** Dark tipping along the back and tail of a light dog (ay / aw), 0-1. */
  sable: number;
  /** Wild-type banded hair (aw), gives the "wolf grey" look. */
  agouti: boolean;
  brindle: boolean;
  /** Dark muzzle mask (Em) visible over light areas. */
  mask: boolean;
  /** 0 = none, 1 = merle, 2 = double merle. Only visible on dark pigment. */
  merle: 0 | 1 | 2;
  /** Share of the coat that is white, 0-1. */
  whiteAmount: number;
  ticking: boolean;
  length: 'short' | 'long';
  furnishings: boolean;
  /** 0 straight, 1 wavy, 2 curly. */
  curl: 0 | 1 | 2;
  markingSeed: number;
  /** Notes that explain non-obvious genetics to the player. */
  notes: string[];
}

const EUMELANIN = {
  black: '#1f1b1a',
  liver: '#5b3423',
  blue: '#5d6470',
  isabella: '#a08a7b',
} as const;
type EumelaninName = keyof typeof EUMELANIN;

const PHEO_STOPS: [number, string, string][] = [
  [0.0, '#f2e6cc', 'cream'],
  [0.3, '#e7c98f', 'yellow'],
  [0.55, '#d39d55', 'gold'],
  [0.78, '#b4642c', 'red'],
  [1.0, '#8c3c1c', 'deep red'],
];

const WHITE = '#f7f3ec';

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const part = (v: number) =>
    Math.round(clamp(v, 0, 255))
      .toString(16)
      .padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

export function mixHex(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex([lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)]);
}

function pheomelaninColour(intensity: number): { hex: string; name: string } {
  for (let i = 1; i < PHEO_STOPS.length; i++) {
    const [t1, hex1] = PHEO_STOPS[i]!;
    const [t0, hex0] = PHEO_STOPS[i - 1]!;
    if (intensity <= t1) {
      const local = (intensity - t0) / (t1 - t0);
      const name = PHEO_STOPS[local < 0.5 ? i - 1 : i]![2];
      return { hex: mixHex(hex0, hex1, local), name };
    }
  }
  return { hex: PHEO_STOPS[PHEO_STOPS.length - 1]![1], name: 'deep red' };
}

export function deriveCoat(genome: Genome): CoatAppearance {
  const { loci, traits } = genome;
  const notes: string[] = [];

  // B and D decide what colour the dark pigment (eumelanin) is.
  const brown = dominantAllele('B', loci.B) === 'b';
  const dilute = dominantAllele('D', loci.D) === 'd';
  const euName: EumelaninName = brown ? (dilute ? 'isabella' : 'liver') : dilute ? 'blue' : 'black';
  const eumelanin = EUMELANIN[euName];

  // Red/yellow pigment (pheomelanin) shade is polygenic; dilution lightens it.
  const intensity = clamp01(0.55 + traitZ(traits.redIntensity) * 0.22 - (dilute ? 0.15 : 0));
  const pheo = pheomelaninColour(intensity);

  const recessiveRed = dominantAllele('E', loci.E) === 'e';
  const kTop = dominantAllele('K', loci.K);
  const aTop = dominantAllele('A', loci.A);
  const hasMask = hasAllele(loci.E, 'Em');

  let base: CoatAppearance['base'] = 'eumelanin';
  let points = false;
  let sable = 0;
  let agouti = false;
  let brindle = false;
  let saddle = 1;

  if (recessiveRed) {
    // e/e: no dark pigment in the coat at all, whatever K and A say.
    base = 'pheomelanin';
    if (kTop !== 'ky' || aTop !== 'ay') {
      notes.push("Two copies of recessive red (e/e) hide this dog's other colour genes.");
    }
  } else if (kTop === 'KB') {
    base = 'eumelanin';
  } else {
    brindle = kTop === 'kbr';
    if (aTop === 'ay') {
      base = 'pheomelanin';
      sable = clamp(0.25 + traitZ(traits.sableShading) * 0.18, 0.02, 0.7);
    } else if (aTop === 'aw') {
      base = 'pheomelanin';
      agouti = true;
      sable = clamp(0.55 + traitZ(traits.sableShading) * 0.12, 0.35, 0.8);
    } else if (aTop === 'at') {
      base = 'eumelanin';
      points = true;
      saddle = clamp(0.75 + traitZ(traits.saddle) * 0.18, 0.35, 1);
    } else {
      base = 'eumelanin';
    }
  }

  const lightAreasVisible = base === 'pheomelanin' || points;
  // A mask only reads clearly on a light-bodied dog.
  const mask = hasMask && !recessiveRed && base === 'pheomelanin';
  if (brindle && !lightAreasVisible) brindle = false;

  const merleCopies = copiesOf(loci.M, 'M') as 0 | 1 | 2;
  const darkAreasVisible = base === 'eumelanin' || sable > 0.05 || brindle || mask;
  const merle: CoatAppearance['merle'] = darkAreasVisible ? merleCopies : 0;
  if (merleCopies > 0 && merle === 0) {
    notes.push('Carries merle that cannot show on a coat without dark pigment ("cryptic merle").');
  }
  if (merleCopies === 2) {
    notes.push('Double merle: extra white and a higher risk of eye and hearing problems.');
  }

  // White spotting: S/S little or none, S/sp moderate, sp/sp extensive.
  const spCopies = copiesOf(loci.S, 'sp');
  const spread = traitZ(traits.whiteSpread);
  let whiteAmount =
    spCopies === 0
      ? clamp(0.015 + spread * 0.03, 0, 0.08)
      : spCopies === 1
        ? clamp(0.14 + spread * 0.07, 0.03, 0.32)
        : clamp(0.58 + spread * 0.1, 0.38, 0.88);
  if (merleCopies === 2) whiteAmount = clamp(whiteAmount + 0.25, 0, 0.92);
  const ticking = hasAllele(loci.T, 'T') && whiteAmount > 0.1;

  const merleWord =
    euName === 'black' ? 'blue merle' : euName === 'liver' ? 'red merle' : `${euName} merle`;
  const darkWord =
    merle > 0
      ? merleWord
      : euName === 'liver'
        ? 'chocolate'
        : euName === 'isabella'
          ? 'lilac'
          : euName;

  let name: string;
  if (recessiveRed) name = pheo.name === 'gold' ? 'golden' : pheo.name;
  else if (kTop === 'KB' || aTop === 'a') name = darkWord;
  else if (points) name = `${darkWord} and tan`;
  else if (agouti) name = euName === 'black' ? 'wolf sable' : `${euName} wolf sable`;
  else name = sable > 0.3 ? `${pheo.name} sable` : pheo.name === 'cream' ? 'cream' : 'fawn';
  if (brindle)
    name = points
      ? `${name} with brindle points`
      : `${darkWord === 'black' ? '' : `${darkWord} `}brindle`;
  if (mask) name += ' with a dark mask';
  if (whiteAmount >= 0.45) name = `piebald ${name}`;
  else if (whiteAmount >= 0.12) name += ' and white';
  else if (whiteAmount >= 0.05) name += ' with white markings';
  if (ticking) name += ', ticked';

  const merleEyes = merle > 0 && genome.markingSeed % 3 === 0;
  const eye = merleEyes ? '#6f9fc4' : brown || dilute ? '#a8743a' : '#4a2a17';

  return {
    name,
    eumelanin,
    pheomelanin: pheo.hex,
    white: WHITE,
    nose: euName === 'black' ? '#1a1615' : eumelanin,
    eye,
    base,
    points,
    saddle,
    sable,
    agouti,
    brindle,
    mask,
    merle,
    whiteAmount,
    ticking,
    length: copiesOf(loci.L, 'l') === 2 ? 'long' : 'short',
    furnishings: hasAllele(loci.F, 'F'),
    curl: copiesOf(loci.Cu, 'Cu') as 0 | 1 | 2,
    markingSeed: genome.markingSeed,
    notes,
  };
}
