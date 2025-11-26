import { Dog, UserProfile } from '../types';

export function calculateTrainingGain(
  dog: Dog,
  statName: 'speed' | 'agility' | 'strength' | 'endurance' | 'obedience',
  multiplier: number,
  userTrainingSkill: number
): number {
  // Base gain: 0.1 to 0.3 per session
  const baseGain = 0.1 + (Math.random() * 0.2);
  
  // User skill bonus (training_skill / 100 = 0.01 to 1.0 bonus)
  const skillBonus = 1 + (userTrainingSkill / 100);
  
  // Dog's trainability affects gain (higher = learns faster)
  const trainabilityBonus = 1 + (dog.trainability / 100);
  
  // Total gain
  const totalGain = baseGain * multiplier * skillBonus * trainabilityBonus;
  
  return parseFloat(totalGain.toFixed(2));
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