import { Dog } from '../types';

export function shouldRegenerateTP(dog: Dog): boolean {
  const lastReset = new Date(dog.last_training_reset);
  const now = new Date();
  const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);
  
  // Regenerate TP every 24 hours
  return hoursSinceReset >= 24;
}

export function regenerateTP(dog: Dog): Partial<Dog> {
  if (!shouldRegenerateTP(dog)) {
    return {};
  }

  // Calculate max TP based on care stats
  const hungerMultiplier = dog.hunger / 100;
  const happinessMultiplier = dog.happiness / 100;
  const energyMultiplier = dog.energy_stat / 100;
  const healthMultiplier = dog.health / 100;
  
  const maxTP = Math.floor(100 * (
    (hungerMultiplier * 0.25) + 
    (happinessMultiplier * 0.25) + 
    (energyMultiplier * 0.25) + 
    (healthMultiplier * 0.25)
  ));

  return {
    training_points: maxTP,
    last_training_reset: new Date().toISOString(),
    tp_refills_today: 0, // Reset gem refill counter
  };
}