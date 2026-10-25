import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server.browser';
import type { Breed, Dog } from '../src/types';
import { generateDog } from '../src/utils/dogGenerator';
import { companionFieldProgress, companionMilestones, clubNextStep } from '../src/utils/companionProgress';
import { nextCompanionStep } from '../src/utils/companionLoop';
import { DISCIPLINES, newClubProgress, type ClubMatch, type ClubProgress } from '../src/game/club/model';
import { useGameStore } from '../src/stores/gameStore';
import DevelopmentPanel from '../src/components/dog/DevelopmentPanel';
import CompanionView from '../src/components/kennel/CompanionView';
import KennelBriefing from '../src/components/office/KennelBriefing';
import { completeClubRound, enrollClub, startClubRun } from '../src/game/club/progress';

const breed = { id: 1, name: 'Test dog', tier: 'rescue', coat_types: ['short'],
  ...Object.fromEntries(['size', 'energy', 'friendliness', 'trainability', 'intelligence', 'speed', 'agility', 'strength', 'endurance', 'prey_drive', 'protectiveness'].flatMap(key => [[key + '_min', 60], [key + '_max', 60]])),
} as Breed;
function companion(name = 'Fern'): Dog {
  return { ...generateDog(breed, name, 'owner', true), bond_level: 5, health: 100, hunger: 100, thirst: 100, energy_stat: 100, training_points: 100 };
}
function explored(dog: Dog): ClubProgress {
  return { ...newClubProgress(), records: { [dog.id]: Object.fromEntries(DISCIPLINES.map(discipline => [discipline, { xp: 100, sessions: 4, best: 80, last: 70 }])) } };
}
function report(dog: Dog, kind: ClubMatch['kind'] = 'combined', other?: Dog): ClubMatch {
  return { id: crypto.randomUUID(), kind, results: DISCIPLINES.map((discipline, index) => ({ discipline, dogId: other && index % 2 ? other.id : dog.id, dogName: other && index % 2 ? other.name : dog.name, score: 40 + index * 10, gain: 12 })), average: 55, placement: 3, cash: 0, finishedAt: new Date().toISOString() };
}
function renderSave(element: ReactElement, dog: Dog, progress?: ClubProgress, syncEnabled = false) {
  useGameStore.setState({ dogs: [dog], selectedDog: dog, syncEnabled, eventRegistrations: [],
    tutorialProgress: { completedTutorials: [], skippedTutorials: [], dismissedHelp: [], showHelpIcons: true, fieldClub: progress } });
  const initial = useGameStore.getInitialState(), previous = { ...initial };
  Object.assign(initial, useGameStore.getState());
  try { return renderToStaticMarkup(element); }
  finally { Object.assign(initial, previous); }
}

test('legacy-only companions retain separate stat and event progress with no invented club experience', () => {
  const dog = { ...companion(), agility_trained: 12 };
  const before = JSON.stringify(dog);
  const milestones = companionMilestones(dog, undefined, [{ dogId: dog.id, status: 'competed' }]);
  assert.equal(milestones.find(item => item.title === 'Foundation training')?.done, true);
  assert.equal(milestones.find(item => item.title === 'Step into the ring')?.done, true);
  assert.equal(milestones.some(item => /combined/.test(item.title)), false);
  assert.equal(companionFieldProgress(dog).explored, 0);
  assert.equal(companionFieldProgress(dog).bestLearned, 0);
  assert.equal(nextCompanionStep(dog).destination, 'training');
  assert.equal(JSON.stringify(dog), before);
});

test('Field Club discovery and learned ability use club records, not bond or legacy trained points', () => {
  const dog = { ...companion(), agility_trained: 100 };
  const progress = newClubProgress();
  assert.match(companionFieldProgress(dog, progress).disciplines[0].discovery, /Undiscovered/);
  progress.records[dog.id] = { search: { xp: 14, sessions: 1, best: 72, last: 72 } };
  let field = companionFieldProgress(dog, progress);
  assert.equal(field.explored, 1); assert.equal(field.bestLearned, 1.4);
  assert.match(field.disciplines.find(item => item.discipline === 'search')!.discovery, /early indication/);
  progress.records[dog.id]!.search = { xp: 100, sessions: 3, best: 85, last: 70 };
  field = companionFieldProgress(dog, progress);
  assert.match(field.disciplines.find(item => item.discipline === 'search')!.discovery, /aptitude \d+/);
  assert.equal(companionMilestones(dog, progress).find(item => item.title === 'A field skill to build on')?.done, true);
  assert.equal(field.disciplines[0].learned, 0);
  assert.equal(dog.obedience_trained, 0);
});

test('combined and team milestones belong to the participating dog, not kennel-wide membership', () => {
  const dog = companion(), other = companion('Oak'), progress = explored(dog);
  progress.completedAt = new Date().toISOString();
  progress.matches = [report(other)];
  assert.equal(companionFieldProgress(dog, progress).combined, undefined);
  assert.equal(companionMilestones(dog, progress).find(item => item.title === 'A combined trial together')?.done, false);
  progress.matches.unshift(report(dog, 'team', other));
  assert.ok(companionFieldProgress(dog, progress).team);
  assert.equal(companionFieldProgress(dog, progress).combined, undefined);
  progress.matches.unshift(report(dog));
  assert.ok(companionFieldProgress(dog, progress).combined);
  assert.equal(companionMilestones(dog, progress).find(item => item.title === 'Step into the ring'), undefined);
  progress.matches = [report(dog, 'combined', other)];
  assert.equal(companionFieldProgress(dog, progress).combined, undefined, 'a mixed roster is not an individual combined trial');
});

test('expired reports never erase accumulated development or imply another dog earned a trial', () => {
  const dog = companion(), other = companion('Oak'), progress = explored(dog);
  progress.completedAt = new Date().toISOString();
  progress.matches = Array.from({ length: 16 }, () => report(other));
  const before = JSON.stringify({ dog, progress });
  const field = companionFieldProgress(dog, progress), milestones = companionMilestones(dog, progress);
  assert.equal(field.latest, undefined); assert.equal(field.combined, undefined);
  assert.equal(field.explored, 4); assert.equal(field.bestLearned, 10);
  assert.match(milestones.find(item => item.title === 'A combined trial together')!.text, /latest 16/);
  clubNextStep(dog, progress); nextCompanionStep(dog, progress);
  assert.equal(JSON.stringify({ dog, progress }), before);
});

test('club next actions advance discovery and honor care, recovery and the four-TP round cost', () => {
  const dog = companion(), progress = newClubProgress();
  assert.match(nextCompanionStep({ ...dog, bond_level: 0, training_points: 4 }, progress).title, /scent search/);
  assert.equal(nextCompanionStep({ ...dog, training_points: 3 }, progress).destination, 'dogDetail');
  assert.equal(nextCompanionStep({ ...dog, health: 20 }, progress).destination, 'vet');
  assert.equal(nextCompanionStep({ ...dog, thirst: 10 }, progress).priority, 1);
  assert.equal(nextCompanionStep({ ...dog, energy_stat: 20 }, progress).destination, 'dogDetail');
  assert.equal(nextCompanionStep({ ...dog, energy_stat: 26 }, progress).destination, 'fieldClub');
  assert.equal(nextCompanionStep({ ...dog, recovering_from: 'injury' }, progress).destination, 'dogDetail');
  assert.equal(nextCompanionStep({ ...dog, is_pregnant: true }, progress).destination, 'dogDetail');
  progress.records[dog.id] = { search: { xp: 14, sessions: 1, best: 70, last: 70 } };
  assert.match(nextCompanionStep(dog, progress).title, /herding/);
  assert.match(nextCompanionStep(dog, explored(dog)).detail, /16 training points.*44% energy.*60% food/);
});

test('saved team visits explain whose round is next and advice uses only this dog’s event scores', () => {
  const dog = companion(), other = companion('Oak'), progress = explored(dog);
  const team = report(dog, 'team', other);
  progress.active = { id: 'visit', kind: 'team', rounds: team.results.map(({ dogId, discipline }) => ({ dogId, discipline })), results: team.results.slice(0, 1), seed: 1, startedAt: new Date().toISOString() };
  assert.match(clubNextStep(dog, progress).detail, /1\/4 rounds saved.*Scent search.*assigned teammate/);
  assert.match(clubNextStep(companion('Willow'), progress).detail, /Another companion has a visit in progress/);
  progress.active = undefined;
  team.results[1].score = 1;
  progress.matches = [report(other), team];
  assert.match(clubNextStep(dog, progress).title, /agility/);
  assert.match(clubNextStep(dog, progress).detail, /40\/100/);
});

test('saving an actual Field Club round updates progress feedback without writing legacy trained stats', () => {
  const dog = companion();
  useGameStore.getState().resetGame();
  useGameStore.setState({ dogs: [dog], selectedDog: dog, syncEnabled: false,
    user: { ...useGameStore.getState().user!, id: 'owner', level: 1, xp: 0, training_skill: 0 },
    tutorialProgress: { completedTutorials: [], skippedTutorials: [], dismissedHelp: [], showHelpIcons: true } });
  enrollClub();
  assert.equal(startClubRun('practice', [{ discipline: 'search', dogId: dog.id }]).success, true);
  const run = useGameStore.getState().tutorialProgress.fieldClub!.active!;
  assert.equal(completeClubRound(run.id, 0, 80).success, true);
  const saved = useGameStore.getState(), updated = saved.dogs[0], progress = saved.tutorialProgress.fieldClub!;
  const before = JSON.stringify({ updated, progress });
  const field = companionFieldProgress(updated, progress);
  assert.equal(field.explored, 1); assert.ok(field.bestLearned > 0);
  assert.equal(field.latest?.results[0].score, 80);
  assert.match(nextCompanionStep(updated, progress).title, /herding/);
  assert.equal(updated.obedience_trained, dog.obedience_trained);
  companionMilestones(updated, progress); companionFieldProgress(updated, progress);
  assert.equal(JSON.stringify({ updated, progress }), before);
});

test('development UI renders dog-specific Field Club learning and keeps stat training clearly separate', () => {
  const dog = companion(), other = companion('Oak'), progress = explored(dog);
  progress.records[dog.id]!.search = { xp: 14, sessions: 1, best: 72, last: 72 };
  progress.matches = [report(other), report(dog, 'team', other)];
  const html = renderSave(createElement(DevelopmentPanel, { dog }), dog, progress);
  assert.match(html, /Field Club strengths &amp; learned ability/);
  assert.match(html, /1\.4\/100/);
  assert.match(html, /last 72\/100 · best 72\/100/);
  assert.match(html, /early indication/);
  assert.match(html, /Foundation traits &amp; stat training/);
  assert.match(html, /0\.0.*stat-training points/);
  assert.match(html, /Latest saved team trial.*Fern/);
  assert.match(html, /Kennel team.*overall/);
  assert.doesNotMatch(html, /Scent search: 50\/100/, 'another teammate’s result must not be credited to this dog');
});

test('companion and briefing routes point club members toward playable sports and show recovery timing', () => {
  const dog = companion(), progress = newClubProgress();
  const html = renderSave(createElement(CompanionView, { onNavigate: () => {} }), dog, progress);
  assert.match(html, /Try scent search/); assert.match(html, /Visit the Field Club/);
  assert.match(html, /Practice at the Field Club/); assert.match(html, /Explore club trials/);
  assert.match(html, /100.*TP/); assert.match(html, /TP refresh in/);
  assert.match(html, /Passive recovery: about.*energy\/hour/);
  const briefing = renderSave(createElement(KennelBriefing, { onNavigate: () => {} }), dog, progress);
  assert.match(briefing, /try scent search/);
  const legacy = renderSave(createElement(DevelopmentPanel, { dog }), dog);
  assert.doesNotMatch(legacy, /Field Club strengths/);
  assert.match(legacy, /Foundation traits &amp; stat training/);
  const cloud = renderSave(createElement(DevelopmentPanel, { dog }), dog, progress, true);
  assert.doesNotMatch(cloud, /Field Club strengths/);
  assert.doesNotMatch(renderSave(createElement(CompanionView, { onNavigate: () => {} }), dog, progress, true), /Visit the Field Club/);
});
