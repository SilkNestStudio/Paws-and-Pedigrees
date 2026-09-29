import type { Dog } from '../types';
import { activityRestriction } from './dogDevelopment';
import { calculateBondXpGain, checkBondLevelUp } from './bondSystem';
import { calculateHunger, calculateThirst } from './hungerThirstDecay';
import { checkRecoveryComplete, completeRecovery } from './veterinarySystem';
import { calculateHealthDecay } from './healthDecay';
export type BondingActivity = 'pet' | 'fetch' | 'walk';
export const BONDING_ACTIVITIES = {
 pet: { title: 'Quiet time', description: 'Slow down and build trust through gentle touch.', happiness: 15, energy: 0, xp: 10, timestamp: 'last_pet' },
 fetch: { title: 'Play fetch', description: 'Share a little play and bring out their confidence.', happiness: 30, energy: 20, xp: 15, timestamp: 'last_fetch' },
 walk: { title: 'Explore together', description: 'Head out for a walk and spend time side by side.', happiness: 25, energy: 25, xp: 20, timestamp: 'last_walk' },
} as const;
export function bondingRestriction(dog: Dog, activity: BondingActivity, now = Date.now()): string | null {
 if (dog.is_dead) return 'This companion is in your kennel history.';
 const definition = BONDING_ACTIVITIES[activity];
 if (activity !== 'pet') {
   const restriction = activityRestriction(dog);
   if (restriction) return restriction;
   if (dog.energy_stat < definition.energy) return 'Rest before this activity.';
 }
 const playedAfterArrival = Date.parse(dog.last_played || '') > Date.parse(dog.created_at) + 1000;
 const legacy = !dog.last_pet && !dog.last_fetch && !dog.last_walk && playedAfterArrival ? dog.last_played : undefined;
 const last = Date.parse(dog[definition.timestamp] || legacy || '');
 const remaining = last + 15 * 60 * 1000 - now;
 if (remaining > 0) return 'Ready again in ' + Math.ceil(remaining / 60000) + ' min. Try another activity or let them settle.';
 return null;
}
export function bondingOutcome(dog: Dog, activity: BondingActivity, now = Date.now()) {
 const restriction = bondingRestriction(dog, activity, now);
 if (restriction) return { success: false as const, message: restriction };
 const definition = BONDING_ACTIVITIES[activity];
 const xp = calculateBondXpGain(definition.xp, dog.is_rescue);
 const happiness = Math.min(100 - dog.happiness, definition.happiness);
 const updates: Partial<Dog> = { happiness: dog.happiness + happiness, energy_stat: dog.energy_stat - definition.energy,
   bond_xp: dog.bond_xp + xp, last_played: new Date(now).toISOString(), [definition.timestamp]: new Date(now).toISOString() };
 Object.assign(updates, checkBondLevelUp({ ...dog, ...updates }));
 return { success: true as const, updates, message: definition.title + ' with ' + dog.name + ': +' + xp + ' bond XP, +' + happiness + ' happiness.' };
}
export type CompanionDestination = 'dogDetail' | 'training' | 'competition' | 'vet';
export function nextCompanionStep(dog: Dog): { title: string; detail: string; destination: CompanionDestination; priority: number } {
 if (dog.is_dead) return { title: 'Remember their story', detail: 'A lasting part of your kennel history.', destination: 'dogDetail', priority: 9 };
 if (dog.current_ailment || calculateHealthDecay(dog) < 40) return { title: 'Arrange a veterinary check', detail: 'Recovery comes before performance. Give them the care they need.', destination: 'vet', priority: 0 };
 if (dog.hunger < 50 || dog.thirst < 50) return { title: 'Start with the essentials', detail: 'A meal and fresh water help them feel comfortable again.', destination: 'dogDetail', priority: 1 };
 if (dog.recovering_from && (!dog.recovery_due || Date.parse(dog.recovery_due) > Date.now())) return { title: 'A gentle recovery day', detail: 'Quiet company is enough today. Training can wait.', destination: 'dogDetail', priority: 2 };
 if (dog.is_pregnant || dog.active_puppy_training) return { title: 'Give them time to grow', detail: dog.is_pregnant ? 'An expectant mother needs a calm routine.' : 'Their puppy program is in progress. Check in and keep them comfortable.', destination: 'dogDetail', priority: 3 };
 if (dog.energy_stat < 30) return { title: 'Make room for rest', detail: 'They will get more from training after some recovery.', destination: 'dogDetail', priority: 2 };
 if (dog.bond_level < 1) return { title: 'Get to know each other', detail: 'Quiet time, play, and care build the trust that reveals their potential.', destination: 'dogDetail', priority: 4 };
 if (dog.training_points < 10) return { title: 'Let the session sink in', detail: 'Training points need to recover. Enjoy a little company in the meantime.', destination: 'dogDetail', priority: 6 };
 return { title: 'Build on your progress', detail: 'Choose a skill to practice, or look for an event that suits them.', destination: 'training', priority: 5 };
}

/** Idempotent time refresh: no per-render penalties or random illness rolls. */
export function companionConditionUpdates(dog: Dog): Partial<Dog> {
 if (dog.is_dead) return {};
 const next = { hunger: Math.min(dog.hunger, calculateHunger(dog.last_fed)), thirst: Math.min(dog.thirst, calculateThirst(dog.last_watered || dog.last_fed)), health: calculateHealthDecay(dog), ...(dog.recovering_from && checkRecoveryComplete(dog) ? completeRecovery(dog) : {}) };
 return Object.fromEntries(Object.entries(next).filter(([key,value]) => dog[key as keyof Dog] !== value));
}
