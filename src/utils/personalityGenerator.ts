import { DogPersonality, PersonalityTrait } from '../types/personality';
import { PERSONALITY_TRAITS, PERSONALITY_QUIRKS } from '../data/personalityTraits';
import { Breed } from '../types';

/**
 * Generate a personality for a dog based on breed tendencies and randomness
 */
export function generatePersonality(breed: Breed, parentPersonalities?: DogPersonality[]): DogPersonality {
  // Get breed-influenced weights (some breeds are more likely to have certain traits)
  const traitWeights = getBreedPersonalityWeights(breed);

  // Consider parent personalities if breeding
  if (parentPersonalities && parentPersonalities.length > 0) {
    inheritParentTraits(traitWeights, parentPersonalities);
  }

  // Select primary trait
  const primaryTrait = selectWeightedTrait(traitWeights);

  // 40% chance of a secondary trait
  let secondaryTrait: PersonalityTrait | undefined;
  if (Math.random() < 0.4) {
    // Remove primary trait from selection
    const secondaryWeights = { ...traitWeights };
    delete secondaryWeights[primaryTrait];
    secondaryTrait = selectWeightedTrait(secondaryWeights);
  }

  // Select 1-3 random quirks
  const quirkCount = 1 + Math.floor(Math.random() * 3);
  const quirks = selectRandomQuirks(quirkCount);

  return {
    primaryTrait,
    secondaryTrait,
    quirks
  };
}

/**
 * Get personality trait weights based on breed characteristics
 */
function getBreedPersonalityWeights(breed: Breed): Record<string, number> {
  const weights: Record<string, number> = {};

  // Base weights for all traits
  Object.keys(PERSONALITY_TRAITS).forEach(trait => {
    weights[trait] = 1.0;
  });

  // Adjust based on breed stats
  const energy = (breed.energy_min + breed.energy_max) / 2;
  const friendliness = (breed.friendliness_min + breed.friendliness_max) / 2;
  const trainability = (breed.trainability_min + breed.trainability_max) / 2;

  // High energy breeds more likely to be energetic/playful
  if (energy > 75) {
    weights.energetic = 2.0;
    weights.playful = 1.8;
    weights.rowdy = 1.5;
    weights.lazy = 0.3;
    weights.calm = 0.5;
  } else if (energy < 40) {
    weights.lazy = 2.0;
    weights.calm = 1.8;
    weights.energetic = 0.3;
  }

  // Friendly breeds more likely to be social/gentle
  if (friendliness > 75) {
    weights.social = 2.0;
    weights.gentle = 1.5;
    weights.loyal = 1.8;
    weights.independent = 0.5;
    weights.timid = 0.5;
  }

  // Trainable breeds more likely to be focused/obedient
  if (trainability > 75) {
    weights.focused = 2.0;
    weights.loyal = 1.5;
    weights.stubborn = 0.3;
    weights.easily_distracted = 0.3;
  } else if (trainability < 40) {
    weights.stubborn = 2.0;
    weights.independent = 1.5;
    weights.focused = 0.5;
  }

  return weights;
}

/**
 * Inherit traits from parents (for bred puppies)
 */
function inheritParentTraits(weights: Record<string, number>, parentPersonalities: DogPersonality[]) {
  parentPersonalities.forEach(parent => {
    // 30% boost to parent's primary trait
    weights[parent.primaryTrait] = (weights[parent.primaryTrait] || 1.0) * 1.3;

    // 15% boost to parent's secondary trait
    if (parent.secondaryTrait) {
      weights[parent.secondaryTrait] = (weights[parent.secondaryTrait] || 1.0) * 1.15;
    }
  });
}

/**
 * Select a trait based on weighted probabilities
 */
function selectWeightedTrait(weights: Record<string, number>): PersonalityTrait {
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;

  for (const [trait, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) {
      return trait as PersonalityTrait;
    }
  }

  // Fallback (should never reach here)
  return 'playful';
}

/**
 * Select random quirks
 */
function selectRandomQuirks(count: number): string[] {
  const shuffled = [...PERSONALITY_QUIRKS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get combined personality effects
 */
export function getPersonalityEffects(personality: DogPersonality) {
  const primaryEffects = PERSONALITY_TRAITS[personality.primaryTrait]?.effects || {};
  const secondaryEffects = personality.secondaryTrait
    ? PERSONALITY_TRAITS[personality.secondaryTrait]?.effects || {}
    : {};

  // Combine effects (secondary trait has 50% strength)
  const combined = { ...primaryEffects };

  Object.entries(secondaryEffects).forEach(([key, value]) => {
    const effectKey = key as keyof typeof primaryEffects;
    const primaryValue = combined[effectKey] || 1.0;
    const secondaryValue = typeof value === 'number' ? value : 1.0;

    // Average the effect if both have it
    combined[effectKey] = (primaryValue + secondaryValue * 0.5) / 1.5 as any;
  });

  return combined;
}
