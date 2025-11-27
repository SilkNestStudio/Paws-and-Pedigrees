import { Dog } from '../types';

/**
 * Determines which image pose to use based on dog's current stats
 * - Laying: Really hungry (<30%), tired (<30%), or sick (<50% health)
 * - Standing: All stats at 100% (happy and healthy)
 * - Sitting: Default/medium state
 */
export function getDogImagePose(dog: Dog): 'laying' | 'sitting' | 'standing' {
  // Check if dog is in bad condition (laying down)
  const isVeryHungry = dog.hunger < 30;
  const isVeryTired = dog.energy_stat < 30;
  const isSick = dog.health < 50;

  if (isVeryHungry || isVeryTired || isSick) {
    return 'laying';
  }

  // Check if dog is in perfect condition (standing, happy)
  const isPerfect =
    dog.hunger === 100 &&
    dog.happiness === 100 &&
    dog.health === 100 &&
    dog.energy_stat === 100;

  if (isPerfect) {
    return 'standing';
  }

  // Default state (sitting)
  return 'sitting';
}

/**
 * Get the appropriate image URL for a dog based on its current state
 */
export function getDogImage(dog: Dog, breedImgSitting?: string, breedImgStanding?: string, breedImgPlaying?: string): string {
  const pose = getDogImagePose(dog);

  // Map pose to available images
  // Note: We use img_playing as img_laying since that's what we have
  switch (pose) {
    case 'laying':
      return breedImgPlaying || breedImgSitting || '';
    case 'standing':
      return breedImgStanding || breedImgSitting || '';
    case 'sitting':
    default:
      return breedImgSitting || '';
  }
}
