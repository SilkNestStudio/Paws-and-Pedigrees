import type { ActivityReport } from './performance';
import { useGameStore } from '../../stores/gameStore';
import { activityRestriction } from '../../utils/dogDevelopment';
import { checkBondLevelUp } from '../../utils/bondSystem';
import { checkLevelUp, getLevelFromXP } from '../../utils/levelProgression';
import { DISCIPLINES, fieldAbility, clubQualified, challengeQualified, newClubProgress, recordFor, sampledAll, standings, trainingGain, type ClubEvent, type ClubProgress, type ClubRound, type Discipline } from './model';

export function enrollClub() {
  const s = useGameStore.getState();
  if (!s.tutorialProgress.fieldClub) useGameStore.setState({ activeTutorial: null, tutorialProgress: { ...s.tutorialProgress, fieldClub: newClubProgress() } });
}
export function startClubRun(kind: ClubEvent, rounds: ClubRound[], exercise: 'training' | 'club' = kind === 'practice' ? 'training' : 'club', challenge = false) {
  const s = useGameStore.getState(), progress = s.tutorialProgress.fieldClub ?? newClubProgress();
  if (!['training', 'club'].includes(exercise) || ((exercise === 'training') !== (kind === 'practice'))) return { success: false, message: 'Choose a valid exercise.' };
  if (!s.user) return { success: false, message: 'Open your kennel first.' };
  if (s.syncEnabled) return { success: false, message: 'The Field Club preview currently uses local saves. Cloud competitions remain in the event board.' };
  if (progress.active) return { success: false, message: 'Continue or leave your current visit first.' };
  if (!['practice', 'specialist', 'combined', 'team'].includes(kind) || !rounds.length || rounds.some(r => !DISCIPLINES.includes(r.discipline))) return { success: false, message: 'Choose a valid activity.' };
  if (['practice', 'specialist'].includes(kind) ? rounds.length !== 1 : rounds.length !== 4 || rounds.some((r, i) => r.discipline !== DISCIPLINES[i])) return { success: false, message: 'Choose a dog for each event round.' };
  if (kind === 'combined' && new Set(rounds.map(r => r.dogId)).size !== 1) return { success: false, message: 'The combined trial tests one dog across all four sports.' };
  if (kind === 'combined' && !sampledAll(progress, rounds[0].dogId)) return { success: false, message: 'Try all four disciplines with this dog before their first combined trial.' };
  if (kind === 'team' && !progress.completedAt) return { success: false, message: 'Finish your first club event to open team entries.' };
  if (kind === 'team' && new Set(rounds.map(r => r.dogId)).size < 2) return { success: false, message: 'Choose at least two different dogs for your team.' };
  if (challenge && (kind !== 'specialist' || !['search', 'water'].includes(rounds[0].discipline))) return { success: false, message: 'Choose a valid advanced event.' };
  for (const round of rounds) {
    const dog = s.dogs.find(d => d.id === round.dogId);
    if (!dog) return { success: false, message: 'Choose a dog who is still in your kennel.' };
    if (challenge && !challengeQualified(dog, round.discipline, recordFor(progress, dog.id, round.discipline))) return { success: false, message: `${dog.name} needs 120 discipline experience and working ability 55 for this advanced event. Train in the yard to qualify.` };
    if (exercise !== 'training' && !clubQualified(dog, round.discipline, recordFor(progress, dog.id, round.discipline))) return { success: false, message: `${dog.name} needs working ability 35 in ${round.discipline}. Use the separate training exercise to build that skill.` };
    const reason = activityRestriction(dog);
    if (reason) return { success: false, message: `${dog.name}: ${reason}` };
    const needed = rounds.filter(r => r.dogId === dog.id).length * 6 + 20;
    if (dog.energy_stat < needed) return { success: false, message: `${dog.name} needs ${needed}% energy for this visit. Rest before entering.` };
    if (dog.training_points < rounds.filter(r => r.dogId === dog.id).length * 4) return { success: false, message: `${dog.name} needs more training points. Come back after recovery.` };
    if (kind !== 'practice' && (dog.hunger < 60 || dog.thirst < 60)) return { success: false, message: `Feed and water ${dog.name} to at least 60% before entering.` };
  }
  const active = { id: crypto.randomUUID(), kind, exercise, challenge, rounds, results: [], seed: Math.floor(Math.random() * 100000), startedAt: new Date().toISOString() };
  useGameStore.setState({ activeTutorial: null, tutorialProgress: { ...s.tutorialProgress, fieldClub: { ...progress, active } } });
  return { success: true, message: '' };
}
export function leaveClubRun() {
  const s = useGameStore.getState(), progress = s.tutorialProgress.fieldClub;
  if (progress) useGameStore.setState({ tutorialProgress: { ...s.tutorialProgress, fieldClub: { ...progress, active: undefined } } });
}
export function completeClubRound(runId: string, index: number, score: number, report?: ActivityReport) {
  const s = useGameStore.getState(), progress = s.tutorialProgress.fieldClub, run = progress?.active;
  if (s.syncEnabled || !s.user || !progress || !run || run.id !== runId || index !== run.results.length || !run.rounds[index] || !Number.isFinite(score) || score < 0 || score > 100) return { success: false, message: 'This round has already been saved or is no longer active.' };
  const round = run.rounds[index], dog = s.dogs.find(d => d.id === round.dogId);
  if (!dog || activityRestriction(dog) || dog.training_points < 4 || dog.energy_stat < 26) return { success: false, message: 'Your dog needs care before this round can be saved. Return to the club.' };
  if (report && (report.rules !== 2 || report.discipline !== round.discipline || report.score !== score || Object.values(report).some(v => typeof v === 'number' && (!Number.isFinite(v) || v < 0)))) return { success: false, message: 'The round report is invalid. Retry this round.' };
  const record = recordFor(progress, dog.id, round.discipline);
  const completed = report ? report.total > 0 && report.completed === report.total : score > 0;
  const training = run.exercise === 'training';
  const gain = report?.completed === 0 ? 0 : trainingGain(dog, round.discipline, score, s.user) + (training && !record.trainingCompleted && completed ? 15 : 0);
  const nextRecord = {
    trainingSessions: (record.trainingSessions ?? 0) + (training ? 1 : 0),
    trainingCompleted: record.trainingCompleted || (training && completed),
    clubSessions: (record.clubSessions ?? record.sessions) + (!training && completed ? 1 : 0),
    xp: Math.min(1000, record.xp + gain), sessions: record.sessions + 1,
    bestRules: training ? record.bestRules : report?.rules,
    bestActivity: training ? record.bestActivity : report?.activity,
    best: training ? record.best : Math.max(record.bestRules === report?.rules && record.bestActivity === report?.activity ? record.best : 0, Math.round(score * 10) / 10),
    last: Math.round(score * 10) / 10,
  };
  const result = { ...round, score: Math.round(score * 10) / 10, dogName: dog.name, gain,
    abilityBefore: fieldAbility(dog, round.discipline, record), abilityAfter: fieldAbility(dog, round.discipline, nextRecord),
    ...(report ? { report } : {}) };
  const results = [...run.results, result], finished = results.length === run.rounds.length;
  const bond = dog.bond_xp + 4, levelUp = checkBondLevelUp({ ...dog, bond_xp: bond });
  const updatedDog = { ...dog, energy_stat: Math.max(0, dog.energy_stat - 6), training_points: dog.training_points - 4, training_sessions_today: dog.training_sessions_today + 1, happiness: Math.min(100, dog.happiness + 2), bond_xp: bond, ...levelUp };
  const next: ClubProgress = { ...progress, records: { ...progress.records, [dog.id]: { ...progress.records[dog.id], [round.discipline]: nextRecord } }, active: { ...run, results } };
  let cash = 0, xp = record.sessions === 0 ? 35 : 15;
  if (finished) {
    const board = standings(results, run.kind === 'team'), placement = board.findIndex(r => r.player) + 1;
    const eventCompleted = results.every(r => r.report ? r.report.total > 0 && r.report.completed === r.report.total : r.score > 0);
    const prizeKey = run.kind === 'specialist' ? `specialist:${round.discipline}${run.challenge ? ':advanced' : ''}` : run.kind;
    // One grant per event type, plus repeatable personal bests. No endless free-entry cash faucet.
    if (run.kind !== 'practice' && eventCompleted && !progress.prizes.includes(prizeKey)) { cash = run.kind === 'combined' ? 150 : run.kind === 'team' ? 120 : 40; next.prizes = [...progress.prizes, prizeKey]; xp += 80; }
    next.matches = [{ id: run.id, kind: run.kind, results, average: board.find(r => r.player)!.average, placement, cash, finishedAt: new Date().toISOString() }, ...progress.matches].slice(0, 16);
    if (run.kind !== 'practice' && eventCompleted) next.completedAt ??= new Date().toISOString();
    next.active = undefined;
  }
  const keeperXP = s.user.xp + xp, levelReward = checkLevelUp(s.user.xp, keeperXP);
  useGameStore.setState({
    user: { ...s.user, xp: keeperXP, level: getLevelFromXP(keeperXP), cash: s.user.cash + cash + (levelReward?.rewards.cash ?? 0), gems: s.user.gems + (levelReward?.rewards.gems ?? 0), training_skill: Math.min(100, s.user.training_skill + .3) },
    dogs: s.dogs.map(d => d.id === dog.id ? updatedDog : d), selectedDog: s.selectedDog?.id === dog.id ? updatedDog : s.selectedDog,
    tutorialProgress: { ...s.tutorialProgress, fieldClub: next },
  });
  return { success: true, message: `${dog.name} gained ${gain} ${round.discipline} experience and you earned ${xp} keeper XP.` };
}

export function firstUntried(progress: ClubProgress | undefined, dogId: string): Discipline | undefined { return (['search', 'herding', 'water', 'agility'] as Discipline[]).find(d => !(recordFor(progress, dogId, d).clubSessions ?? recordFor(progress, dogId, d).sessions)); }
