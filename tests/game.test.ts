import { bondingRestriction, nextCompanionStep, companionConditionUpdates } from '../src/utils/companionLoop';
import test from 'node:test';
import assert from 'node:assert/strict';
import { SaveQueue } from '../src/utils/saveQueue';
import { createRun, stepRun, surfaceHeight, runPerformance } from '../src/game/agility/simulation';
import { GATES, COURSE, FIELD, FINISH_Z } from '../src/game/agility/course';
import { generateDog } from '../src/utils/dogGenerator';
import { generateLitter, checkBreedingEligibility, calculatePregnancyDueDate } from '../src/utils/breedingCalculations';
import { isAptitudeKnown, activityRestriction } from '../src/utils/dogDevelopment';
import { prizeForPlacement, rankCompetition, leaderboardTier } from '../src/utils/competitionResults';
import { PREGNANCY_HOURS, MS_PER_HOUR, calculateAgeInWeeks } from '../src/utils/timeScaling';
import { useGameStore } from '../src/stores/gameStore';
import { calculateHealthDecay, getHealthStatus, visitVet } from '../src/utils/healthDecay';
import type { Breed, Dog } from '../src/types';
import type { CompetitionEvent } from '../src/types/competition';

const breed = { id: 1, name: 'Test dog', tier: 'rescue', coat_types: ['short'],
  ...Object.fromEntries(['size', 'energy', 'friendliness', 'trainability', 'intelligence', 'speed', 'agility', 'strength', 'endurance', 'prey_drive', 'protectiveness'].flatMap(k => [[k + '_min', 60], [k + '_max', 60]])),
} as Breed;
function dog(name = 'Fern', gender: 'male' | 'female' = 'female'): Dog {
  return { ...generateDog(breed, name, 'owner', true, gender), bond_level: 5, health: 100, hunger: 100, thirst: 100, energy_stat: 100 };
}
const event = { id: 'trial', discipline: 'agility', eventType: 'point_show', name: 'Meadow trial', maxEntries: 20, currentEntries: 10,
  judgeId: 'judge', prizes: { first: 100, second: 60, third: 40, participation: 10 }, pointsAwarded: { first: 2, second: 1, third: 0, fourth: 0 },
} as CompetitionEvent;

test('queued saves coalesce per record, preserve separate dogs and profiles', async () => {
  const q = new SaveQueue(), saved: string[] = [];
  q.schedule('dog:a', async () => { saved.push('old'); });
  q.schedule('dog:a', async () => { saved.push('new'); });
  q.schedule('dog:b', async () => { saved.push('other'); });
  q.schedule('profile:a', async () => { saved.push('profile'); });
  assert.equal(await q.flush(), true); assert.deepEqual(saved, ['new', 'other', 'profile']);
});
test('failed saves can retry without overwriting a newer snapshot', async () => {
  const q = new SaveQueue(); let count = 0;
  q.schedule('dog', async () => { count++; return false; });
  assert.equal(await q.flush(), false);
  q.schedule('dog', async () => { count += 10; return true; });
  assert.equal(await q.flush(), true); assert.equal(count, 11);
});
test('a newer save waits for an in-flight write', async () => {
  const q = new SaveQueue(), order: number[] = [];
  let release!: () => void;
  const blocker = new Promise<void>(resolve => { release = resolve; });
  q.schedule('dog', async () => { await blocker; order.push(1); });
  const first = q.flush();
  q.schedule('dog', async () => { order.push(2); });
  const second = q.flush(); release();
  await Promise.all([first, second]); assert.deepEqual(order, [1, 2]);
});
test('rescues keep breed potential and start as adults', () => {
  const rescue = generateDog(breed, 'Fern', 'owner', true);
  assert.equal(rescue.speed, 60); assert.equal(rescue.size, 60);
  assert.equal(calculateAgeInWeeks(rescue.birth_date), 52);
  assert.equal(isAptitudeKnown(rescue, 'agility'), false);
  assert.equal(isAptitudeKnown({ ...rescue, bond_level: 1, agility_trained: 1 }, 'agility'), true);
  assert.equal(isAptitudeKnown({ ...rescue, bond_level: 1, agility_trained: 1 }, 'speed'), false);
});
test('dead, pregnant, recovering and underfed dogs cannot train', () => {
  const d = dog(); assert.equal(activityRestriction(d), null);
  for (const changes of [{ is_dead: true }, { is_pregnant: true }, { recovering_from: 'injury' }, { thirst: 0 }]) assert.ok(activityRestriction({ ...d, ...changes }));
});
test('litter respects conception count, ancestry, and resets earned training/titles', () => {
  const sire = { ...dog('Oak', 'male'), speed_trained: 100, championship_title: 'champion' };
  const dam = { ...dog(), litter_size: 5, agility_trained: 100, championship_title: 'champion' };
  const litter = generateLitter(sire, dam, breed, breed, 'owner', [sire, dam]);
  assert.equal(litter.length, 5); assert.equal(new Set(litter.map(p => p.id)).size, 5);
  for (const puppy of litter) {
    assert.equal(puppy.parent1_id, sire.id); assert.equal(puppy.parent2_id, dam.id);
    assert.equal(puppy.speed_trained, 0); assert.equal(puppy.agility_trained, 0);
    assert.equal(puppy.championship_title, undefined); assert.ok(puppy.speed >= 1 && puppy.speed <= 100);
  }
});
test('pregnancy helpers use the same configured clock and reject unhealthy parents', () => {
  const duration = Date.parse(calculatePregnancyDueDate()) - Date.now();
  assert.ok(Math.abs(duration - PREGNANCY_HOURS * MS_PER_HOUR) < 100);
  const sire = dog('Oak', 'male'), dam = dog();
  assert.equal(checkBreedingEligibility(sire, dam, 1000, [sire, dam]).canBreed, true);
  assert.equal(checkBreedingEligibility(sire, { ...dam, is_dead: true }, 1000).canBreed, false);
});
test('ranking identifies the player by identity, keeps every placement, maps valid tiers', () => {
  const results = rankCompetition({ name: 'Fern', score: 1 }, Array.from({ length: 12 }, () => ({ name: 'Fern', score: 10, breed: 'Lab' })));
  assert.equal(results.length, 13); assert.equal(results.find(r => r.isPlayer)?.placement, 13);
  assert.equal(prizeForPlacement(event, 13), 10); assert.equal(prizeForPlacement(event, NaN), 0);
  assert.equal(leaderboardTier('championship'), 'national');
});
function setupStore(dogs: Dog[]) {
  useGameStore.getState().resetGame();
  const user = { ...useGameStore.getState().user!, id: 'owner', cash: 1000, kennel_level: 4 };
  useGameStore.setState({ tutorialProgress:{completedTutorials:['kennel-basics'],skippedTutorials:[],dismissedHelp:[],showHelpIcons:true,firstRibbon:{dogId:dogs[0].id,status:'complete',completed:RIBBON_STEPS.map(s=>s.id),graduatedAt:new Date(0).toISOString()}}, dogs, user, syncEnabled: false, competitionEvents: [event], eventRegistrations: dogs.map(d => ({ id: d.id, eventId: event.id, userId: 'owner', dogId: d.id, status: 'registered', registeredAt: new Date().toISOString() })) });
}
test('competition completion pays exactly once, including below fourth place', () => {
  const d = dog(); setupStore([d]);
  assert.equal(useGameStore.getState().awardChampionshipPoints(d.id, event.id, 10, 50).success, true);
  assert.equal(useGameStore.getState().user!.cash, 1010);
  assert.equal(useGameStore.getState().eventRegistrations[0].status, 'competed');
  assert.equal(useGameStore.getState().awardChampionshipPoints(d.id, event.id, 1, 100).success, false);
  assert.equal(useGameStore.getState().user!.cash, 1010);
  setupStore([d]);
  useGameStore.getState().awardChampionshipPoints(d.id, event.id, 1, 100);
  assert.equal(useGameStore.getState().user!.cash, 1100);
});
test('breeding charges once, reserves litter space, and birth cannot duplicate puppies', () => {
  const sire = dog('Oak', 'male'), dam = dog(); setupStore([sire, dam]);
  assert.equal(useGameStore.getState().breedDogs(sire.id, dam.id, 3).success, true);
  assert.equal(useGameStore.getState().user!.cash, 650);
  assert.equal(useGameStore.getState().breedDogs(sire.id, dam.id, 3).success, false);
  assert.equal(useGameStore.getState().sellDog(sire.id).success, false);
  useGameStore.getState().updateDog(dam.id, { pregnancy_due: new Date(0).toISOString() });
  const mother = useGameStore.getState().dogs.find(d => d.id === dam.id)!;
  const puppies = generateLitter(sire, mother, breed, breed, 'owner');
  assert.equal(useGameStore.getState().giveBirth(dam.id, puppies), true);
  assert.equal(useGameStore.getState().giveBirth(dam.id, puppies), false);
  assert.equal(useGameStore.getState().dogs.length, 5);
});

test('absence consequences are capped and consider water as well as food', () => {
  const d = dog();
  const away = { ...d, last_watered: new Date(Date.now() - 30 * 24 * MS_PER_HOUR).toISOString() };
  assert.equal(calculateHealthDecay(away), 10);
  assert.equal(getHealthStatus(away).isDead, false);
  assert.equal(getHealthStatus(away).needsVet, true);
  const recovering = { ...away, ...visitVet(away) };
  assert.equal(recovering.speed, away.speed);
  assert.ok(activityRestriction(recovering));
  assert.equal(activityRestriction({ ...recovering, recovery_due: new Date(0).toISOString() }), null);
});
test('community care works with no money and legacy recovery never charges gems', () => {
  const d = { ...dog(), health: 10 }; setupStore([d]);
  useGameStore.setState({ user: { ...useGameStore.getState().user!, cash: 0, gems: 0 } });
  assert.equal(useGameStore.getState().takeToVet(d.id).success, true);
  assert.equal(useGameStore.getState().user!.cash, 0);
  assert.equal(useGameStore.getState().dogs[0].recovering_from, 'care_recovery');
  useGameStore.getState().updateDog(d.id, { is_dead: true, death_cause: 'neglect', revival_count: 5 });
  assert.equal(useGameStore.getState().reviveDeadDog(d.id).success, true);
  assert.equal(useGameStore.getState().user!.gems, 0);
  useGameStore.getState().updateDog(d.id, { is_dead: true, death_cause: 'old_age' });
  assert.equal(useGameStore.getState().reviveDeadDog(d.id).success, false);
});
test('repeated care clicks cannot farm unlimited bond XP', () => {
  const d = { ...dog(), thirst: 50 }; setupStore([d]);
  assert.equal(useGameStore.getState().waterDog(d.id).success, true);
  const xp = useGameStore.getState().dogs[0].bond_xp;
  assert.equal(useGameStore.getState().waterDog(d.id).success, false);
  assert.equal(useGameStore.getState().dogs[0].bond_xp, xp);
});
test('movement is consistent at 30/60/120 fps and diagonal input is normalized', () => {
  const distances = [30, 60, 120].map(fps => { const r = createRun(); for (let i = 0; i < fps; i++) stepRun(r, { x: 1, z: 0, jump: false }, 1 / fps); return r.x; });
  assert.ok(Math.max(...distances) - Math.min(...distances) < 0.01);
  const r = createRun(); for (let i = 0; i < 120; i++) stepRun(r, { x: 1, z: 1, jump: false }, 1 / 120);
  assert.ok(Math.hypot(r.vx, r.vz) <= 6.0001);
});
test('uncleared jumps block progress and charge only one fault per gate', () => {
  const r = createRun(); r.z = 5.2;
  for (let i = 0; i < 120; i++) stepRun(r, { x: 0, z: -1, jump: false }, 1 / 60);
  assert.equal(r.gate, 0); assert.equal(r.faults, 1); assert.ok(r.z > 5);
});
test('swept gate checks reject bypasses, weaving on wrong side, and airborne seesaw', () => {
  for (const index of [0, 2, 4, 10]) {
    const g = GATES[index], r = createRun();
    Object.assign(r, { gate: index, x: g.x + 3, z: g.z + 0.01, vz: -6 });
    stepRun(r, { x: 0, z: -1, jump: false }, 0.1);
    assert.equal(r.gate, index);
  }
});
test('every gate can be cleared in order and finishing requires the final line', () => {
  const r = createRun();
  for (let i = 0; i < GATES.length; i++) {
    const g = GATES[i];
    Object.assign(r, { x: g.x, z: g.z + 0.02, vx: 0, vz: -6, vy: 0, y: g.clearance ? 1 : surfaceHeight(g.x, g.z + 0.02), grounded: !g.clearance });
    stepRun(r, { x: 0, z: -1, jump: false }, 1 / 60);
    assert.equal(r.gate, i + 1, `gate ${i} (${COURSE[g.obstacle].kind})`);
  }
  assert.equal(r.finished, false); r.z = FINISH_Z + 0.01;
  stepRun(r, { x: 0, z: -1, jump: false }, 1 / 60); assert.equal(r.finished, true);
  assert.ok(runPerformance(r) >= 0.4 && runPerformance(r) <= 1.5);
});
test('course geometry stays within playable bounds and holding jump cannot auto-repeat', () => {
  assert.ok(COURSE.every(o => o.z >= FIELD.minZ && o.z <= FIELD.maxZ));
  const r = createRun(); for (let i = 0; i < 180; i++) stepRun(r, { x: 0, z: 0, jump: true }, 1 / 60);
  assert.equal(r.grounded, true); assert.equal(r.y, 0);
});

test('a continuous run can traverse the whole course without teleporting', () => {
  const r = createRun();
  for (let i = 0; i < 120 * 180 && !r.finished; i++) {
    const gate = GATES[r.gate];
    const dx = (gate?.x ?? 0) - r.x;
    const distance = r.z - (gate?.z ?? FINISH_Z);
    const x = Math.max(-1, Math.min(1, dx * 2));
    const align = gate && distance < 3 && Math.abs(dx) > gate.halfWidth * 0.65;
    stepRun(r, { x, z: align ? 0 : -1, jump: Boolean(gate?.clearance && distance < 1.9 && distance > 0.1) }, 1 / 120);
  }
  assert.equal(r.finished, true, `stopped at gate ${r.gate}, x=${r.x}, z=${r.z}`);
  assert.equal(r.faults, 0);
});


test('bonding uses per-activity cooldowns, rechecks live condition, and pays only once', () => {
 const companion = { ...dog(), last_played: new Date(0).toISOString() };
 useGameStore.setState({ dogs: [companion], selectedDog: companion, syncEnabled: false });
 const before = companion.bond_xp;
 assert.equal(useGameStore.getState().bondWithDog(companion.id, 'pet').success, true);
 const earned = useGameStore.getState().dogs[0].bond_xp;
 assert.ok(earned > before);
 assert.equal(useGameStore.getState().bondWithDog(companion.id, 'pet').success, false);
 assert.equal(useGameStore.getState().dogs[0].bond_xp, earned);
 assert.equal(useGameStore.getState().bondWithDog(companion.id, 'fetch').success, true);
 assert.equal(useGameStore.getState().dogs[0].energy_stat, 80);
 useGameStore.getState().updateDog(companion.id, { is_pregnant: true });
 assert.equal(useGameStore.getState().bondWithDog(companion.id, 'walk').success, false);
 assert.equal(useGameStore.getState().bondWithDog('missing', 'pet').success, false);
});
test('new rescues can bond immediately, recovery permits quiet company but not exercise', () => {
 const newcomer = generateDog(breed, 'Hope', 'owner', true);
 assert.equal(bondingRestriction(newcomer, 'pet'), null);
 const recovering = { ...dog(), last_played: new Date(0).toISOString(), recovering_from: 'care_recovery', recovery_due: new Date(Date.now()+86400000).toISOString() };
 assert.equal(bondingRestriction(recovering, 'pet'), null);
 assert.ok(bondingRestriction(recovering, 'walk'));
 assert.ok(bondingRestriction({ ...recovering, is_dead: true }, 'pet'));
});
test('kennel guidance prioritizes veterinary care, essentials, recovery and development', () => {
 const companion = dog();
 assert.equal(nextCompanionStep({ ...companion, health: 20 }).destination, 'vet');
 assert.equal(nextCompanionStep({ ...companion, thirst: 10 }).priority, 1);
 assert.equal(nextCompanionStep({ ...companion, bond_level: 0 }).destination, 'dogDetail');
 assert.equal(nextCompanionStep(companion).destination, 'training');
 assert.equal(nextCompanionStep({ ...companion, training_points: 0 }).destination, 'dogDetail');
});

test('condition refresh is idempotent and does not multiply absence penalties', () => {
 const companion = { ...dog(), last_fed: new Date(Date.now()-3*86400000).toISOString(), last_watered: new Date(Date.now()-3*86400000).toISOString() };
 const once = { ...companion, ...companionConditionUpdates(companion) };
 const twice = { ...once, ...companionConditionUpdates(once) };
 assert.equal(twice.health, once.health);
 assert.equal(twice.energy_stat, once.energy_stat);
 assert.equal(twice.happiness, once.happiness);
 assert.ok(once.hunger < companion.hunger);
 assert.deepEqual(companionConditionUpdates({ ...companion, is_dead: true }), {});
});

import { moveInYard, nearbyStation } from '../src/game/yard/simulation';
test('yard movement respects buildings and bounds without faster diagonal movement', () => {
  const straight = moveInYard({x:0,z:0},1,0,.04);
  const diagonal = moveInYard({x:0,z:0},1,1,.04);
  assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.z)-straight.x)<1e-10);
  let p={x:0,z:0};for(let i=0;i<500;i++)p=moveInYard(p,1,0,.05);
  assert.ok(p.x<10.5);
  p={x:-1.5,z:-5};for(let i=0;i<100;i++)p=moveInYard(p,-1,0,.05);
  assert.ok(p.x>=-1.7);
  assert.equal(nearbyStation({x:3,z:-2})?.id,'water');
  assert.equal(nearbyStation({x:0,z:6}),undefined);
});

import { createActivity, commandActivity, stepActivity, aimActivity, activityPerformance } from '../src/game/yard/activities';
test('fetch requires three throws, pickups and recalls before completion',()=>{
 const s=createActivity('fetch');commandActivity(s,'recall');assert.equal(s.phase,'aim');
 assert.equal(aimActivity(s,{x:100,z:-100}),false);assert.deepEqual(s.aim,{x:1,z:2});assert.ok(s.aimError);aimActivity(s,{x:9,z:-8});
 for(let round=0;round<3;round++){
  commandActivity(s,'throw');commandActivity(s,'throw');commandActivity(s,'recall');assert.equal(s.phase,'flight');
  for(let i=0;i<300;i++)stepActivity(s,.05);
  assert.equal(s.phase,'recall');assert.equal(s.rounds,round);assert.ok(s.ball.y>.5);
  commandActivity(s,'recall');for(let i=0;i<300;i++)stepActivity(s,.05);
 }
 assert.equal(s.phase,'complete');assert.equal(s.rounds,3);
 commandActivity(s,'throw');assert.equal(s.rounds,3);
});
test('obedience rejects early recall and requires a completed stay each repetition',()=>{
 const s=createActivity('obedience');assert.equal(activityPerformance(s),0);
 commandActivity(s,'sit');stepActivity(s,.05);commandActivity(s,'recall');assert.equal(s.phase,'sit');assert.equal(s.mistakes,1);
 for(let round=0;round<3;round++){
  commandActivity(s,'sit');for(let i=0;i<110;i++)stepActivity(s,.05);assert.equal(s.phase,'cue');
  commandActivity(s,'recall');for(let i=0;i<200;i++)stepActivity(s,.05);
 }
 assert.equal(s.phase,'complete');assert.ok(activityPerformance(s)<1.2);
});

import { nextRibbonStep, recordRibbonStep, RIBBON_STEPS } from '../src/utils/firstRibbon';
test('playable guide keeps progress on its companion, resumes and cannot award a ribbon early',()=>{
 const first=dog('Guide dog'),other=dog('Other');
 useGameStore.setState({dogs:[first,other],selectedDog:first,tutorialProgress:{completedTutorials:[],skippedTutorials:[],dismissedHelp:[],showHelpIcons:true}});
 const state=useGameStore.getState();state.startTutorial('kennel-basics');
 assert.equal(nextRibbonStep(useGameStore.getState().tutorialProgress.firstRibbon)?.id,'yard');
 state.recordRibbon(other.id,'yard');assert.equal(useGameStore.getState().tutorialProgress.firstRibbon?.completed.length,0);
 state.recordRibbon(first.id,'meet');state.finishRibbon(first.id);assert.equal(useGameStore.getState().tutorialProgress.firstRibbon?.ribbonEarned,undefined);
 state.recordRibbon(first.id,'yard');state.recordRibbon(first.id,'yard');assert.equal(useGameStore.getState().tutorialProgress.firstRibbon?.completed.length,1);
 state.pauseRibbon();state.recordRibbon(first.id,'move');assert.equal(useGameStore.getState().tutorialProgress.firstRibbon?.completed.length,1);
 state.startTutorial('kennel-basics');assert.equal(nextRibbonStep(useGameStore.getState().tutorialProgress.firstRibbon)?.id,'move');
 for(const step of RIBBON_STEPS)state.recordRibbon(first.id,step.id);
 state.finishRibbon(first.id);state.finishRibbon(first.id);
 assert.equal(useGameStore.getState().tutorialProgress.firstRibbon?.ribbonEarned,true);
 assert.equal(useGameStore.getState().tutorialProgress.completedTutorials.filter(t=>t==='kennel-basics').length,1);
 state.startTutorial('kennel-basics');assert.equal(useGameStore.getState().tutorialProgress.firstRibbon?.ribbonEarned,true);
 assert.equal(useGameStore.getState().tutorialProgress.firstRibbon?.completed.length,0);
});
test('tutorial care counts successful actions and validates already-satisfied needs',()=>{
 const first={...dog(),hunger:40,thirst:40,energy_stat:50};
 useGameStore.setState({dogs:[first],selectedDog:first,user:{...useGameStore.getState().user!,id:'test',food_storage:50},tutorialProgress:{completedTutorials:[],skippedTutorials:[],dismissedHelp:[],showHelpIcons:true}});
 const state=useGameStore.getState();state.startTutorial('kennel-basics');
 state.acknowledgeRibbonCare(first.id,'water');assert.equal(useGameStore.getState().tutorialProgress.firstRibbon?.completed.includes('water'),false);
 state.waterDog(first.id);state.feedDog(first.id);state.restDog(first.id);
 const completed=useGameStore.getState().tutorialProgress.firstRibbon!.completed;
 for(const step of ['water','feed','rest'])assert.ok(completed.includes(step));
 state.waterDog(first.id);assert.equal(useGameStore.getState().tutorialProgress.firstRibbon?.completed.length,completed.length);
 const legacy={completedTutorials:['kennel-basics'],skippedTutorials:[],dismissedHelp:[],showHelpIcons:true};
 assert.equal(recordRibbonStep(legacy,first.id,'yard'),legacy);
});
import { yardPath, walkable } from '../src/game/yard/handler';
test('handler routes around cottage and bench without crossing occupied ground',()=>{for(const target of [{x:-10,z:-8},{x:-4,z:.5},{x:6,z:-8.8},{x:5,z:-2.3}]){const start={x:0,z:6};const route=yardPath(start,target);assert.ok(route);let previous=start;for(const point of route){for(let i=0;i<=100;i++)assert.ok(walkable({x:previous.x+(point.x-previous.x)*i/100,z:previous.z+(point.z-previous.z)*i/100}));previous=point;}assert.deepEqual(previous,target);}assert.equal(yardPath({x:0,z:6},{x:-5,z:-5}),null);assert.equal(yardPath({x:0,z:6},{x:20,z:0}),null);});
import { apprenticeshipComplete, STARTING_CASH, lessonViewUnlocked } from '../src/utils/firstRibbon';
import { dailyRewardUnlocked, getDailyReward } from '../src/utils/dailyRewards';
test('new kennel budget cannot buy an upgrade; tutorial gates cannot be bypassed by action calls',()=>{
 useGameStore.getState().resetGame();const state=useGameStore.getState();assert.equal(state.user!.cash,STARTING_CASH);assert.equal(state.user!.gems,0);assert.ok(STARTING_CASH<500);state.claimDailyReward();assert.equal(useGameStore.getState().user!.cash,STARTING_CASH);
 useGameStore.setState({user:{...state.user!,cash:10000}});assert.equal(state.upgradeKennel().success,false);assert.equal(state.breedDogs('a','b',3).success,false);assert.equal(state.registerForEvent('event','dog').success,false);assert.equal(state.claimChapterRewards('ch1_new_beginning').success,false);assert.equal(useGameStore.getState().user!.cash,10000);
 assert.equal(lessonViewUnlocked(state.tutorialProgress,'competition'),false);assert.equal(lessonViewUnlocked(state.tutorialProgress,'shop'),true);
});
test('graduation requires all lessons, rewards start later and duplicate daily claims do not pay',()=>{
 const companion=dog();useGameStore.getState().resetGame();useGameStore.setState({dogs:[companion],selectedDog:companion});const state=useGameStore.getState();state.startTutorial('kennel-basics');
 for(const step of RIBBON_STEPS.slice(0,9))state.recordRibbon(companion.id,step.id);state.finishRibbon(companion.id);assert.equal(apprenticeshipComplete(useGameStore.getState().tutorialProgress),false);
 for(const step of RIBBON_STEPS.slice(9))state.recordRibbon(companion.id,step.id);state.finishRibbon(companion.id);let progress=useGameStore.getState().tutorialProgress;assert.equal(apprenticeshipComplete(progress),true);assert.equal(dailyRewardUnlocked(progress),false);state.claimDailyReward();assert.equal(useGameStore.getState().user!.cash,STARTING_CASH);
 progress={...progress,firstRibbon:{...progress.firstRibbon!,graduatedAt:new Date(Date.now()-2*86400000).toISOString()}};useGameStore.setState({tutorialProgress:progress});state.claimDailyReward();const cash=useGameStore.getState().user!.cash;assert.equal(cash,STARTING_CASH+getDailyReward(1).cash);state.claimDailyReward();assert.equal(useGameStore.getState().user!.cash,cash);assert.ok(getDailyReward(30).cash<=75);
});
test('incomplete ribbon saves resume missing play without erasing their dog or keepsake',()=>{
 const companion=dog();useGameStore.setState({dogs:[companion],selectedDog:companion,tutorialProgress:{completedTutorials:['kennel-basics'],skippedTutorials:[],dismissedHelp:[],showHelpIcons:true,firstRibbon:{dogId:companion.id,status:'complete',completed:RIBBON_STEPS.slice(0,9).map(s=>s.id),ribbonEarned:true}}});useGameStore.getState().startTutorial('kennel-basics');const journey=useGameStore.getState().tutorialProgress.firstRibbon!;assert.equal(journey.status,'active');assert.equal(nextRibbonStep(journey)?.id,'meet');assert.equal(journey.ribbonEarned,true);assert.equal(journey.dogId,companion.id);
});
import { createRoaming, resetRoaming, stepRoaming } from '../src/game/yard/roaming';
test('ambient roaming stays on safe ground, alternates walking and sniffing, and can be reset',()=>{
 const state=createRoaming();let p={x:.8,z:5.2};const phases=new Set<string>();let travel=0;let seed=27;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<6000;i++){const next=stepRoaming(state,p,.05,random);assert.ok(walkable(next.position));travel+=Math.hypot(next.position.x-p.x,next.position.z-p.z);if(state.phase==='sniffing')assert.equal(next.sniffing,true);p=next.position;phases.add(state.phase);}
 assert.ok(travel>20);assert.deepEqual([...phases].sort(),['idle','sniffing','walking']);resetRoaming(state,5);assert.equal(state.path.length,0);const before={...p};for(let i=0;i<90;i++)p=stepRoaming(state,p,.05,random).position;assert.deepEqual(p,before);
});

import { neededBowl, YARD_CARE_THRESHOLD } from '../src/game/yard/care';
import { calculateFoodConsumption } from '../src/utils/careCalculations';
test('prepared bowls reserve supplies once and only reward completed consumption', () => {
  const d={...dog(),hunger:40,thirst:40};
  const state=useGameStore.getState();
  useGameStore.setState({dogs:[d],selectedDog:d,user:{...state.user!,food_storage:10},syncEnabled:false,tutorialProgress:{...state.tutorialProgress,firstRibbon:{dogId:d.id,status:'active',completed:['yard','move']}}});
  assert.equal(neededBowl(d),null);
  assert.equal(state.prepareYardBowl(d.id,'food').success,true);
  const remaining=10-calculateFoodConsumption(d.size);
  assert.equal(useGameStore.getState().user!.food_storage,remaining);
  assert.equal(state.prepareYardBowl(d.id,'food').success,false);
  assert.equal(useGameStore.getState().dogs[0].hunger,40);
  assert.equal(useGameStore.getState().dogs[0].bond_xp,d.bond_xp);
  assert.ok(!useGameStore.getState().tutorialProgress.firstRibbon!.completed.includes('feed'));
  assert.equal(state.prepareYardBowl(d.id,'water').success,true);
  assert.equal(neededBowl(useGameStore.getState().dogs[0]),'water');
  assert.equal(state.waterDog(d.id,'bowl').success,true);
  assert.equal(state.waterDog(d.id,'bowl').success,false);
  assert.equal(neededBowl(useGameStore.getState().dogs[0]),'food');
  assert.equal(state.feedDog(d.id,'bowl').success,true);
  assert.equal(state.feedDog(d.id,'bowl').success,false);
  assert.equal(useGameStore.getState().user!.food_storage,remaining);
  assert.equal(neededBowl(useGameStore.getState().dogs[0]),null);
  assert.ok(useGameStore.getState().tutorialProgress.firstRibbon!.completed.includes('feed'));
});
test('full dogs leave prepared meals intact; other care consumes the reserved portion first', () => {
  const d=dog();const state=useGameStore.getState();
  useGameStore.setState({dogs:[d],user:{...state.user!,food_storage:10}});
  state.prepareYardBowl(d.id,'food');
  const pantry=useGameStore.getState().user!.food_storage;
  assert.equal(state.feedDog(d.id,'bowl').success,false);
  assert.equal(neededBowl(useGameStore.getState().dogs[0]),null);
  state.updateDog(d.id,{hunger:YARD_CARE_THRESHOLD+1});
  assert.equal(state.feedDog(d.id,'bowl').success,false);
  assert.equal(state.feedDog(d.id).success,true);
  assert.equal(useGameStore.getState().user!.food_storage,pantry);
  assert.equal(useGameStore.getState().dogs[0].yard_bowls?.food,false);
  useGameStore.setState({user:{...useGameStore.getState().user!,food_storage:0}});
  assert.equal(state.prepareYardBowl(d.id,'food').success,false);
  state.updateDog(d.id,{is_dead:true});
  assert.equal(state.prepareYardBowl(d.id,'water').success,false);
});

import { interiorStyle, HUB_DESTINATIONS, insideAisle } from '../src/game/kennel/interior';
test('kennel identity validates input and preserves economy and companions', () => {
  const state=useGameStore.getState(),before=state.user!;
  assert.equal(state.setKennelIdentity(' ', 'paw','navy').success,false);
  assert.equal(state.setKennelIdentity('A'.repeat(37), 'paw','navy').success,false);
  assert.equal(state.setKennelIdentity('Oak Kennel', 'unknown','navy').success,false);
  assert.equal(state.setKennelIdentity('  Copper   Oak  ', 'oak','plum').success,true);
  const after=useGameStore.getState().user!;
  assert.equal(after.kennel_name,'Copper Oak');assert.equal(after.kennel_emblem,'oak');assert.equal(after.kennel_color,'plum');
  assert.equal(after.cash,before.cash);assert.equal(after.kennel_level,before.kennel_level);assert.equal(after.food_storage,before.food_storage);
});
test('interior destinations remain in the aisle and upgrades reflect existing kennel tiers', () => {
  assert.ok(HUB_DESTINATIONS.every(insideAisle));
  assert.equal(insideAisle({x:6,z:0}),false);
  assert.equal(interiorStyle(1).runs,2);assert.equal(interiorStyle(2).runs,4);
  assert.equal(interiorStyle(3).nursery,true);assert.equal(interiorStyle(10).runs,6);
  assert.notEqual(interiorStyle(1).floor,interiorStyle(5).floor);
});


test('pantry purchases need no dog and use upgraded storage capacity without false success', () => {
 const state=useGameStore.getState();useGameStore.setState({dogs:[],selectedDog:null,user:{...state.user!,cash:500,gems:0,kennel_level:1,food_storage:0}});
 assert.equal(state.purchaseItem(null,{food_storage:10},40,0).success,true);
 assert.equal(useGameStore.getState().user!.food_storage,10);assert.equal(useGameStore.getState().user!.cash,460);
 assert.equal(state.purchaseItem(null,{health:10},40,0).success,false);assert.equal(useGameStore.getState().user!.cash,460);
 assert.equal(state.purchaseItem(null,{food_storage:100},40,0).success,false);assert.equal(useGameStore.getState().user!.cash,460);
 useGameStore.setState({user:{...useGameStore.getState().user!,kennel_level:2,food_storage:100}});
 assert.equal(state.purchaseItem(null,{food_storage:40},40,0).success,true);assert.equal(useGameStore.getState().user!.food_storage,140);
 assert.equal(state.purchaseItem(null,{food_storage:10},-40,0).success,false);
 assert.equal(state.purchaseItem(null,{food_storage:10},1000,0).success,false);
});
test('fetch reaches distant yard areas and routes around the cottage, bench, storage and hurdle', () => {
 for(const target of [{x:-9,z:8},{x:-9.7,z:-9.7},{x:9.7,z:-9.7},{x:9,z:8},{x:-1,z:-8},{x:-8,z:.2},{x:8.5,z:-4.7}]){
  const s=createActivity('fetch');assert.equal(aimActivity(s,target),true);assert.deepEqual(s.aim,target);commandActivity(s,'throw');
  for(let i=0;i<1000&&s.phase!=='recall';i++){stepActivity(s,.05);assert.ok(walkable(s.dog),JSON.stringify({target,dog:s.dog,phase:s.phase}));if(s.phase==='flight'&&s.ball.x>-9.3&&s.ball.x<-1.7&&s.ball.z>-9.3&&s.ball.z<-1.7)assert.ok(s.ball.y>=4.3,JSON.stringify({target,ball:s.ball}));}
  assert.equal(s.phase,'recall');assert.ok(Math.hypot(s.dog.x-target.x,s.dog.z-target.z)<.1);
  commandActivity(s,'recall');for(let i=0;i<1000&&s.phase!=='aim';i++){stepActivity(s,.05);assert.ok(walkable(s.dog),JSON.stringify({target,dog:s.dog,phase:s.phase}));}assert.equal(s.rounds,1);
 }
 const s=createActivity('fetch');for(const p of [{x:-5,z:-5},{x:-5,z:2},{x:7,z:-3},{x:8,z:3.3},{x:11,z:0},{x:0,z:6},{x:NaN,z:2}]){assert.equal(aimActivity(s,p),false);commandActivity(s,'throw');assert.equal(s.phase,'aim');}
});


import { initialNavigation, navigateTo, navigateBack } from '../src/utils/navigation';
test('nested returns preserve origin, collapse explicit returns and avoid navigation loops', () => {
 let nav = navigateTo(initialNavigation, 'kennel');
 nav = navigateTo(nav, 'dogDetail');
 nav = navigateTo(nav, 'shop');
 nav = navigateBack(nav); assert.equal(nav.current, 'dogDetail');
 nav = navigateBack(nav); assert.equal(nav.current, 'kennel');
 nav = navigateTo(nav, 'expansion');
 nav = navigateTo(nav, 'kennel');
 assert.deepEqual(nav.history, ['hub']);
 assert.equal(navigateTo(nav, 'kennel'), nav);
 nav = navigateBack(nav); assert.deepEqual(nav, initialNavigation);
 nav = navigateTo(navigateTo(nav, 'demo3d'), 'shop');
 assert.equal(navigateBack(nav).current, 'demo3d');
 assert.deepEqual(navigateTo(nav, 'hub'), initialNavigation);
 assert.deepEqual(navigateBack(initialNavigation), initialNavigation);
});
