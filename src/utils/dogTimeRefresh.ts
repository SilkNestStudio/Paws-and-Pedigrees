import type { Dog } from '../types';
import { companionConditionUpdates } from './companionLoop';
import { regenerateEnergy } from './energyRegeneration';
import { regenerateTP } from './tpRegeneration';
import { ageDog } from './puppyAging';

/** One ordered snapshot: current care, passive energy, then the daily TP allowance. */
export function dogTimeUpdates(dog: Dog, kennelLevel = 1, now = Date.now(), separateEnergyClock = true): Partial<Dog> {
  if (dog.is_dead) return {};
  const condition = companionConditionUpdates(dog, now);
  const energy = regenerateEnergy({ ...dog, ...condition }, kennelLevel, now, separateEnergyClock);
  const tp = regenerateTP({ ...dog, ...condition, ...energy }, now);
  const next = { ...condition, ...energy, ...tp, ...ageDog(dog, now) };
  return Object.fromEntries(Object.entries(next).filter(([key, value]) => dog[key as keyof Dog] !== value));
}

export const DOG_REFRESH_INTERVAL_MS = 60000;
/** A stable scheduler; refresh must read the live store, never mount-time dogs. */
export function startDogTimeRefresh(refresh: () => void, page: Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'>, host: Pick<Window, 'addEventListener' | 'removeEventListener' | 'setInterval' | 'clearInterval'>): () => void {
  const foreground = () => { if (!page.hidden) refresh(); };
  foreground();
  const timer = host.setInterval(foreground, DOG_REFRESH_INTERVAL_MS);
  page.addEventListener('visibilitychange', foreground);
  host.addEventListener('focus', foreground);
  host.addEventListener('pageshow', foreground);
  return () => {
    host.clearInterval(timer);
    page.removeEventListener('visibilitychange', foreground);
    host.removeEventListener('focus', foreground);
    host.removeEventListener('pageshow', foreground);
  };
}
