import { Dog } from '../types';
import { Season, WeatherCondition } from '../types/weather';
import { applyTrainingBonus } from './kennelUpgrades';
import { getPersonalityEffects } from './personalityGenerator';
import { getTrainingModifier } from './weatherSystem';

export function calculateTrainingGain(
  dog: Dog,
  statName: 'speed' | 'agility' | 'strength' | 'endurance' | 'obedience',
  multiplier: number,
  userTrainingSkill: number,
  kennelLevel: number = 1,
  season?: Season,
  weather?: WeatherCondition
): number {
  // Base gain: 0.1 to 0.3 per session
  const baseGain = 0.1 + (Math.random() * 0.2);
  // Slightly adjust gains based on the stat being trained (obedience tends to improve slower)
  const statDifficultyModifier = statName === 'obedience' ? 0.9 : 1;

  // User skill bonus (training_skill / 100 = 0.01 to 1.0 bonus)
  const skillBonus = 1 + (userTrainingSkill / 100);

  // Dog's trainability affects gain (higher = learns faster)
  const trainabilityBonus = 1 + (dog.trainability / 100);

  // Personality effects
  let personalityMultiplier = 1.0;
  if (dog.personality) {
    const effects = getPersonalityEffects(dog.personality);

    // Training speed affects all training
    if (effects.trainingSpeed) {
      personalityMultiplier *= effects.trainingSpeed;
    }

    // Focus bonus helps concentration-based training (obedience)
    if (statName === 'obedience' && effects.focusBonus) {
      personalityMultiplier *= effects.focusBonus;
    }

    // Obedience bonus helps obedience training
    if (statName === 'obedience' && effects.obedienceBonus) {
      personalityMultiplier *= effects.obedienceBonus;
    }
  }

  // Total gain before kennel bonus
  const baseTotal = baseGain * multiplier * skillBonus * trainabilityBonus * statDifficultyModifier * personalityMultiplier;

  // Apply kennel training effectiveness bonus
  const withKennelBonus = applyTrainingBonus(baseTotal * 100, kennelLevel) / 100;

  // Apply weather/seasonal modifiers if available
  let weatherModifier = 1.0;
  if (season && weather) {
    weatherModifier = getTrainingModifier(season, weather);
  }

  const finalGain = withKennelBonus * weatherModifier;

  return parseFloat(finalGain.toFixed(2));
}

export function getTrainingPointsAvailable(dog: Dog): number {
  // Calculate available TP based on care stats
  const hungerMultiplier = dog.hunger / 100;
  const happinessMultiplier = dog.happiness / 100;
  const energyMultiplier = dog.energy_stat / 100;
  const healthMultiplier = dog.health / 100;
  
  const tpPercentage = (hungerMultiplier * 0.25) + 
                       (happinessMultiplier * 0.25) + 
                       (energyMultiplier * 0.25) + 
                       (healthMultiplier * 0.25);
  
  return Math.floor(100 * tpPercentage);
}

export function canTrain(dog: Dog, tpCost: number): boolean {
  return dog.training_points >= tpCost;
}

export function getUserTrainingMultiplier(userTrainingSkill: number): number {
  // At skill 1: 0.8x (worse than NPC)
  // At skill 50: 1.3x
  // At skill 100: 2.0x (best possible)
  return 0.8 + (userTrainingSkill / 100) * 1.2;
}
