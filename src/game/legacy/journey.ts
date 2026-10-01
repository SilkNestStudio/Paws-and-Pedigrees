import type { WorkRecord } from './outings';
import { newRoutine, validateRoutine, type Routine } from './routine';
export type DogBuild = 'companion' | 'stocky';
export type Greeting = 'quiet' | 'toy' | 'call';
export interface RescueCandidate {
  id: string; name: string; build: DogBuild; collar: string; ageMonths: number; sex: 'Female' | 'Male';
  description: string; intake: string; responseSeconds: number;
  observations: Record<Greeting, string>;
  aptitude: { agility: number; scent: number; retrieve: number; focus: number };
}
export const RESCUES: RescueCandidate[] = [
  { id: 'willow', name: 'Willow', build: 'companion', collar: '#477f8b', ageMonths: 18, sex: 'Female',
    description: 'Bright-eyed and always investigating the next interesting thing.', intake: 'Athletic mixed breed. Found wandering; her family could not be located.', responseSeconds: 2.4,
    observations: { quiet: 'She sniffs the ground around you before checking your face. New smells are hard to resist.', toy: 'She follows the toy eagerly, turning to investigate it with her nose.', call: 'She comes over quickly, then pauses to investigate a scent beside your feet.' },
    aptitude: { agility: 78, scent: 85, retrieve: 54, focus: 48 } },
  { id: 'bruno', name: 'Bruno', build: 'stocky', collar: '#a15e48', ageMonths: 28, sex: 'Male',
    description: 'A steady companion who keeps one eye on the people he trusts.', intake: 'Sturdy mixed breed. His previous family could no longer care for him.', responseSeconds: 3.3,
    observations: { quiet: 'He settles close by and watches you. He seems comfortable sharing a quiet moment.', toy: 'He follows with steady steps, then checks the toy carefully.', call: 'He watches your hand, then approaches and stays near you.' },
    aptitude: { agility: 52, scent: 62, retrieve: 78, focus: 82 } },
  { id: 'fern', name: 'Fern', build: 'companion', collar: '#916c97', ageMonths: 22, sex: 'Female',
    description: 'Thoughtful at first. Give her room, and she starts to open up.', intake: 'Lean mixed breed. Transferred from a busy shelter for a quieter start.', responseSeconds: 4.2,
    observations: { quiet: 'She takes her time, then chooses to approach. A little space helped her feel safe.', toy: 'She watches the toy before following. Once she moves, her turns are light and precise.', call: 'She hesitates, watches your posture, then comes closer at her own pace.' },
    aptitude: { agility: 86, scent: 60, retrieve: 66, focus: 72 } },
];
export interface FoundingDog {
  id: string; rescueId: string; name: string; adoptedAt: string;
  bond: number; observations: Greeting[]; aptitude: RescueCandidate['aptitude'];
}
export interface Journey {
  work?: WorkRecord;
  version: 2; introSeen: boolean; readLedger: boolean; prepared: boolean; kennelName: string;
  dog: FoundingDog | null; settled: boolean; firstRecall: boolean;
  routine: Routine;
}
export const newJourney = (): Journey => ({ version: 2, introSeen: false, readLedger: false, prepared: false, kennelName: '', dog: null, settled: false, firstRecall: false, routine: newRoutine() });
export function canAdopt(journey: Journey) { return journey.readLedger && journey.prepared && journey.kennelName.trim().length >= 2 && !journey.dog; }
export function adoptRescue(journey: Journey, rescueId: string, name: string, observations: Greeting[], id: string, date: string): Journey {
  const rescue = RESCUES.find(d => d.id === rescueId), cleanName = name.trim();
  if (!canAdopt(journey) || !rescue || cleanName.length < 2 || cleanName.length > 24 || !observations.length || observations.some(o => !['quiet', 'toy', 'call'].includes(o))) throw new Error('Prepare your kennel, meet this dog, and choose a name with 2 to 24 characters.');
  return { ...journey, dog: { id, rescueId, name: cleanName, adoptedAt: date, bond: 5, observations: [...new Set(observations)], aptitude: { ...rescue.aptitude } }, settled: false, firstRecall: false };
}
export function readJourney(value: unknown): Journey {
  const raw = value as { version?: number } | null;
  const j = (raw?.version === 1 ? { ...raw, version: 2, routine: newRoutine() } : raw) as Journey;
  if (!j || j.version !== 2 || ['introSeen', 'readLedger', 'prepared', 'settled', 'firstRecall'].some(k => typeof j[k as keyof Journey] !== 'boolean') || typeof j.kennelName !== 'string' || j.kennelName.length > 36 || (j.kennelName.length > 0 && j.kennelName.trim().length < 2)) throw new Error('This Homecoming save is not a supported version. It has not been overwritten.');
  if (j.dog) {
    const d = j.dog;
    if (!RESCUES.some(r => r.id === d.rescueId) || typeof d.id !== 'string' || !d.id || typeof d.name !== 'string' || d.name.trim().length < 2 || d.name.length > 24 || !Number.isFinite(Date.parse(d.adoptedAt)) || !Number.isFinite(d.bond) || d.bond < 0 || d.bond > 100 || !Array.isArray(d.observations) || !d.observations.length || d.observations.some(o => !['quiet', 'toy', 'call'].includes(o)) || !d.aptitude || ['agility', 'scent', 'retrieve', 'focus'].some(k => !Number.isFinite(d.aptitude[k as keyof typeof d.aptitude])) || !j.readLedger || !j.prepared || !j.kennelName) throw new Error('The saved rescue record is incomplete. It has not been overwritten.');
  } else if (j.dog !== null || j.settled || j.firstRecall) throw new Error('The Homecoming save has an invalid companion record.');
  if (j.firstRecall && !j.settled) throw new Error('The Homecoming save has invalid story progress.');
  if (j.work !== undefined && (!j.work || !Array.isArray(j.work.completed) || j.work.completed.some(id => !['mara', 'ellis', 'rowan'].includes(id)) || new Set(j.work.completed).size !== j.work.completed.length || !Number.isSafeInteger(j.work.searchXp) || j.work.searchXp < 0 || !Number.isFinite(j.work.best) || j.work.best < 0 || j.work.best > 100 || !j.dog || !j.settled)) throw new Error('The saved neighborhood work record is invalid. It has not been overwritten.');
  validateRoutine(j.routine);
  if ((j.routine.fed || j.routine.watered || j.routine.sessions > 0) && !j.dog || j.routine.sessions > 0 && !j.firstRecall || j.routine.invitationRead && j.routine.sessions === 0) throw new Error('The Homecoming care and lesson history is inconsistent.');
  return j;
}
