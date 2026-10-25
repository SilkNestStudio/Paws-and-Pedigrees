import type { Dog } from '../types';
import type { EventRegistration } from '../types/competition';
import { DISCIPLINES, DISCIPLINE_INFO, discoveredText, learned, recordFor, type ClubProgress } from '../game/club/model';

/** Read-only views of existing records. Never infer a dog's title from kennel membership. */
export function companionFieldProgress(dog: Dog, progress?: ClubProgress) {
  const disciplines = DISCIPLINES.map(discipline => {
    const record = recordFor(progress, dog.id, discipline);
    return { discipline, record, learned: learned(record), discovery: discoveredText(dog, discipline, record) };
  });
  const reports = (progress?.matches ?? []).filter(match => match.results.some(result => result.dogId === dog.id));
  const combined = reports.find(match => match.kind === 'combined' && match.results.length === DISCIPLINES.length
    && DISCIPLINES.every(discipline => match.results.some(result => result.discipline === discipline && result.dogId === dog.id)));
  const team = reports.find(match => match.kind === 'team' && match.results.length === DISCIPLINES.length
    && DISCIPLINES.every(discipline => match.results.some(result => result.discipline === discipline))
    && new Set(match.results.map(result => result.dogId)).size >= 2);
  const latestEvent = reports.find(match => match.kind !== 'practice');
  const focus = latestEvent?.results.filter(result => result.dogId === dog.id).slice().sort((a, b) => a.score - b.score)[0];
  const nextDiscipline = (['search', 'herding', 'water', 'agility'] as const).find(discipline => !recordFor(progress, dog.id, discipline).sessions);
  return { disciplines, explored: disciplines.filter(item => item.record.sessions > 0).length,
    bestLearned: Math.max(...disciplines.map(item => item.learned)), reports, combined, team, latest: reports[0], focus, nextDiscipline };
}

export function companionMilestones(dog: Dog, progress?: ClubProgress, registrations: Pick<EventRegistration, 'dogId' | 'status'>[] = []) {
  const trained = Math.max(dog.agility_trained || 0, dog.speed_trained || 0, dog.strength_trained || 0, dog.endurance_trained || 0, dog.obedience_trained || 0);
  const competed = registrations.some(registration => registration.dogId === dog.id && registration.status === 'competed');
  const milestones = [
    { title: 'A place to belong', text: 'The beginning of your life together.', done: true },
    { title: 'Trust takes root', text: 'Reach bond level 1 through care and time together.', done: dog.bond_level >= 1 },
  ];
  if (progress) {
    const field = companionFieldProgress(dog, progress);
    milestones.push(
      { title: 'Four strengths to discover', text: `${field.explored}/4 Field Club disciplines explored through saved rounds.`, done: field.explored === 4 },
      { title: 'A field skill to build on', text: `Reach 10 learned ability in a Field Club discipline. Best so far: ${field.bestLearned.toFixed(1)}/100.`, done: field.bestLearned >= 10 },
      { title: 'A combined trial together', text: field.combined ? `All four rounds with ${dog.name}: ${field.combined.average}/100 overall in a recent report.` : 'Complete all four trial rounds with this dog. Shown when present in your latest 16 club visit reports.', done: !!field.combined },
      { title: 'A role on the team', text: field.team ? `${dog.name} contributed to a completed team trial in your recent reports.` : 'Contribute to a completed trial with at least two kennel dogs. Shown from recent visit reports.', done: !!field.team },
    );
  }
  // Retain the separate stat-training/event milestones for older saves and earned records.
  if (!progress || trained > 0) milestones.push({ title: 'Foundation training', text: 'Earn 10 trained points in an original stat skill; separate from Field Club learned ability.', done: trained >= 10 });
  if (!progress || competed) milestones.push({ title: 'Step into the ring', text: 'Complete a registered event on the original competition board.', done: competed });
  return milestones;
}

export function clubNextStep(dog: Dog, progress: ClubProgress) {
  const field = companionFieldProgress(dog, progress);
  const run = progress.active;
  if (run) {
    const next = run.rounds[run.results.length];
    if (!run.rounds.some(round => round.dogId === dog.id)) return { title: 'Finish the current club visit', detail: `Another companion has a visit in progress. Continue or leave that visit before starting a practice with ${dog.name}.` };
    return { title: 'Continue your club visit', detail: `${run.results.length}/${run.rounds.length} rounds saved.${next ? ` ${DISCIPLINE_INFO[next.discipline].name} is next${next.dogId === dog.id ? ` for ${dog.name}` : ' for an assigned teammate'}.` : ''} Return to the club to prepare and continue.` };
  }
  if (field.nextDiscipline) return { title: `Try ${DISCIPLINE_INFO[field.nextDiscipline].name.toLowerCase()}`, detail: `${field.explored}/4 disciplines explored. Save a practice round to discover their aptitude and develop ${DISCIPLINE_INFO[field.nextDiscipline].effect.toLowerCase()}.` };
  if (field.focus) return { title: `Build on ${DISCIPLINE_INFO[field.focus.discipline].name.toLowerCase()}`, detail: `${dog.name}'s lowest round in their latest recorded event was ${field.focus.score}/100. Practice that discipline, then choose a combined trial or a specialist event.` };
  return { title: 'Bring four skills together', detail: 'All four disciplines explored. A combined trial uses 16 training points and needs 44% energy and 60% food and water. Prepare at the club, or keep practicing.' };
}
