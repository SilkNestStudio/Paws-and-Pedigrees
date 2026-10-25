import type { Dog } from '../types';

export const TP_RESET_MS = 24 * 60 * 60 * 1000;
export function nextTPResetAt(dog: Dog): number {
  const lastReset = Date.parse(dog.last_training_reset);
  const baseline = Number.isFinite(lastReset) ? lastReset : Date.parse(dog.created_at);
  return baseline + TP_RESET_MS;
}
export function shouldRegenerateTP(dog: Dog, now = Date.now()): boolean {
  return !dog.is_dead && now >= nextTPResetAt(dog);
}
export function regenerateTP(dog: Dog, now = Date.now()): Partial<Dog> {
  if (!shouldRegenerateTP(dog, now)) return {};
  // Keep the original daily phase, including after a multi-day absence. Missed
  // days never stack refills, and a repeated refresh cannot replay a reset.
  const due = nextTPResetAt(dog);
  const reset = due + Math.floor((now - due) / TP_RESET_MS) * TP_RESET_MS;
  const maxTP = Math.floor((dog.hunger + dog.happiness + dog.energy_stat + dog.health) / 4);
  return {
    training_points: Math.max(0, Math.min(100, maxTP)),
    last_training_reset: new Date(reset).toISOString(),
    training_sessions_today: 0,
    tp_refills_today: 0,
  };
}

export function tpRecoveryText(dog: Dog, now = Date.now()): string {
  if (dog.is_dead) return 'This companion is in your kennel history.';
  const remaining = nextTPResetAt(dog) - now;
  if (!Number.isFinite(remaining)) return 'Training points recover on the daily schedule.';
  if (remaining <= 0) return 'Training points are due to refresh.';
  const minutes = Math.ceil(remaining / 60000);
  const hours = Math.floor(minutes / 60);
  return `TP refresh in ${hours ? hours + 'h ' : ''}${minutes % 60}m · amount depends on care.`;
}
