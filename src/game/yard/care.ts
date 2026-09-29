import type { Dog } from '../../types';

export const YARD_CARE_THRESHOLD = 65;
/** Bowls belong to the selected companion. Preparing a bowl never grants care. */
export function neededBowl(dog: Dog): 'water' | 'food' | null {
    if (dog.is_dead) return null;
    if (dog.yard_bowls?.water && dog.thirst <= YARD_CARE_THRESHOLD) return 'water';
    if (dog.yard_bowls?.food && dog.hunger <= YARD_CARE_THRESHOLD) return 'food';
    return null;
}
