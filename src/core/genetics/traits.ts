/**
 * Quantitative (polygenic) traits. Each dog carries, per trait, an additive
 * genetic value `g` that is inherited and a permanent environmental value `e`
 * that is not. Both are in standard-deviation units of the dog population.
 *
 * Heritability (h2) splits the variance: Var(g) = h2, Var(e) = 1 - h2.
 * Inheritance follows the infinitesimal model: a puppy gets the mid-parent
 * value plus Mendelian sampling noise with variance h2 / 2, reduced by the
 * parents' inbreeding.
 *
 * Heritabilities and breed offsets are game-design starting values informed
 * by published ranges, not biological claims about particular breeds.
 */
export const APTITUDES = [
  'speed',
  'agility',
  'stamina',
  'power',
  'nose',
  'drive',
  'focus',
  'biddability',
  'confidence',
  'water',
  'mouth',
] as const;
export type Aptitude = (typeof APTITUDES)[number];

export const BODY_TRAITS = [
  'size',
  'legLength',
  'bodyLength',
  'chestDepth',
  'muzzleLength',
  'headWidth',
  'earErect',
  'earSize',
  'tailCurl',
] as const;
export type BodyTrait = (typeof BODY_TRAITS)[number];

/** Polygenic modifiers that fine-tune coat appearance. */
export const COAT_MODIFIERS = ['whiteSpread', 'redIntensity', 'sableShading', 'saddle'] as const;
export type CoatModifier = (typeof COAT_MODIFIERS)[number];

export type TraitId = Aptitude | BodyTrait | CoatModifier;
export const TRAIT_IDS: readonly TraitId[] = [...APTITUDES, ...BODY_TRAITS, ...COAT_MODIFIERS];

export const HERITABILITY: Record<TraitId, number> = {
  speed: 0.4,
  agility: 0.35,
  stamina: 0.35,
  power: 0.4,
  nose: 0.3,
  drive: 0.4,
  focus: 0.3,
  biddability: 0.35,
  confidence: 0.3,
  water: 0.35,
  mouth: 0.3,
  size: 0.7,
  legLength: 0.6,
  bodyLength: 0.5,
  chestDepth: 0.5,
  muzzleLength: 0.6,
  headWidth: 0.5,
  earErect: 0.6,
  earSize: 0.5,
  tailCurl: 0.5,
  whiteSpread: 0.6,
  redIntensity: 0.6,
  sableShading: 0.5,
  saddle: 0.6,
};

export const APTITUDE_LABELS: Record<Aptitude, { name: string; effect: string }> = {
  speed: { name: 'Speed', effect: 'Top running speed' },
  agility: { name: 'Turning', effect: 'How tightly and quickly the dog turns' },
  stamina: { name: 'Stamina', effect: 'How long the dog can run before slowing' },
  power: { name: 'Power', effect: 'Acceleration, jumping and pushing through cover' },
  nose: { name: 'Nose', effect: 'How faint a scent the dog can pick up' },
  drive: { name: 'Drive', effect: 'How long the dog keeps working before giving up' },
  focus: { name: 'Focus', effect: 'Remembering where things fell and ignoring distractions' },
  biddability: { name: 'Cooperation', effect: 'How readily the dog takes direction' },
  confidence: { name: 'Confidence', effect: 'Handling cover, water and new situations' },
  water: { name: 'Water', effect: 'Swimming speed and willingness to enter water' },
  mouth: { name: 'Soft mouth', effect: 'Carrying and delivering items cleanly' },
};

export interface TraitValue {
  /** Additive genetic value, inherited. */
  g: number;
  /** Permanent environmental value, unique to the individual. */
  e: number;
}

/** The dog's realised value in standard-deviation units. */
export const traitZ = (value: TraitValue): number => value.g + value.e;

/** Converts a trait to the 1-99 scale used for aptitudes. Average dog = 50. */
export const toScore = (z: number): number => Math.round(Math.min(99, Math.max(1, 50 + 15 * z)));
