import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { trainingTypes } from '../../data/trainingTypes';
import { rescueBreeds } from '../../data/rescueBreeds';
import { calculateTrainingGain, canTrain, getUserTrainingMultiplier } from '../../utils/trainingCalculations';
import { Dog } from '../../types';
import SprintTrainingGame from './SprintTrainingGame';
const AgilityGame = lazy(() => import('../../game/agility/AgilityGame'));
import WeightPullTrainingGame from './WeightPullTrainingGame';
import DistanceRunGame from './DistanceRunGame';
const YardActivity = lazy(() => import('../../game/yard/YardActivity'));
import { checkBondLevelUp, getRescueDogTrainingBonus, calculateBondXpGain } from '../../utils/bondSystem';
import HelpButton from '../tutorial/HelpButton';
import { ENERGY_THRESHOLDS } from '../../utils/careCalculations';
import { trackStoryAction } from '../../utils/storyObjectiveTracking';
import { showToast } from '../../lib/toast';
import { activityRestriction, isAptitudeKnown, type Aptitude } from '../../utils/dogDevelopment';


interface SessionReport { dogId: string; dog: string; session: string; stat: string; before: number; after: number; bond: number; energy: number; points: number; }
export default function TrainingView({ onReturnToDog, initialTraining, onCancelSession }: { onReturnToDog?: () => void; initialTraining?: string; onCancelSession?: () => void }) {
  const { dogs, selectedDog, selectDog, updateDog, user, updateUserCash, setUser, refillTrainingPoints } = useGameStore();
  const [report, setReport] = useState<SessionReport | null>(null);
  const reportRef = useRef<HTMLElement>(null);
  useEffect(() => { if (report) reportRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' }); }, [report]);
  const [isTraining] = useState(false);
  const [currentTraining, setCurrentTraining] = useState<string | null>(null);
  const [showMinigame, setShowMinigame] = useState(false);
  const sessionDogId = useRef<string | null>(null);
  const sessionComplete = useRef(false);
  const sessionGeneration = useRef(0);
  const activeSession = sessionGeneration.current;
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const cancelSession=()=>{sessionComplete.current=true;sessionGeneration.current++;sessionDogId.current=null;setShowMinigame(false);setCurrentTraining(null);onCancelSession?.();};

  const initialStarted = useRef(false);
  useEffect(() => { if (initialTraining && !initialStarted.current && selectedDog) { initialStarted.current = true; handleSelfTrain(initialTraining); } }, [initialTraining, selectedDog]);

  if (dogs.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-white drop-shadow-lg text-xl">You need a dog to train!</p>
      </div>
    );
  }

  const handleSelfTrain = (trainingId: string) => {
    if (!selectedDog || isTraining) return;
    const restriction = activityRestriction(selectedDog);
    if (restriction) { showToast.warning(restriction); return; }

    const training = trainingTypes.find(t => t.id === trainingId);
    if (!training) return;

    // Check if dog is in puppy training
    if (selectedDog.active_puppy_training) {
      showToast.warning(`${selectedDog.name} is currently in puppy training and cannot do regular training sessions!`);
      return;
    }

    // Check energy level
    if (selectedDog.energy_stat < ENERGY_THRESHOLDS.MIN_FOR_TRAINING) {
      showToast.error(`${selectedDog.name} is too tired to train! Energy must be at least ${ENERGY_THRESHOLDS.MIN_FOR_TRAINING}%. Feed or rest your dog first.`);
      return;
    }

    if (!canTrain(selectedDog, training.tpCost)) {
      showToast.error(`Not enough Training Points! Need ${training.tpCost} TP.`);
      return;
    }

    setCurrentTraining(trainingId);
    sessionDogId.current = selectedDog.id;
    sessionComplete.current = false;
    sessionGeneration.current++;
    setShowMinigame(true);
  };

  const handleMinigameComplete = (performanceMultiplier: number) => {
    if (!mounted.current || sessionComplete.current || !currentTraining || !Number.isFinite(performanceMultiplier)) return;
    const selectedDog = useGameStore.getState().dogs.find(d => d.id === sessionDogId.current);
    if (!selectedDog) return;

    const training = trainingTypes.find(t => t.id === currentTraining);
    if (!training) return;
    if (!canTrain(selectedDog, training.tpCost)) {
      setShowMinigame(false);
      showToast.warning('Your dog needs rest or care before completing training.');
      return;
    }
    sessionComplete.current = true;
    performanceMultiplier = Math.max(0.3, Math.min(1.5, performanceMultiplier));

    const userMultiplier = getUserTrainingMultiplier(user?.training_skill || 1);

    // Apply performance multiplier from minigame (with kennel bonus)
    const baseGain = calculateTrainingGain(
      selectedDog,
      training.statImproved,
      userMultiplier,
      user?.training_skill || 1,
      user?.kennel_level || 1
    );

    // Apply rescue dog bonus!
    const rescueBonus = getRescueDogTrainingBonus(selectedDog);
    const rescueBonusedGain = baseGain * (1 + rescueBonus);
    const finalGain = rescueBonusedGain * performanceMultiplier;

    // Calculate bond XP gain - training together builds strong bonds!
    // Give 5 XP base (more for difficult training sessions)
    const bondXpGain = calculateBondXpGain(5, selectedDog.is_rescue || false);
    const newBondXp = selectedDog.bond_xp + bondXpGain;

    // Update dog's trained stat
    const updates: Partial<Dog> = {
      training_points: selectedDog.training_points - training.tpCost,
      energy_stat: Math.max(0, selectedDog.energy_stat - 10),
      training_sessions_today: selectedDog.training_sessions_today + 1,
      bond_xp: newBondXp,
    };

    // Check if dog should level up bond
    const bondLevelUp = checkBondLevelUp({ ...selectedDog, bond_xp: newBondXp });
    if (bondLevelUp) {
      Object.assign(updates, bondLevelUp);
    }

    switch(training.statImproved) {
      case 'speed':
        updates.speed_trained = Math.min(100, (selectedDog.speed_trained || 0) + finalGain);
        break;
      case 'agility':
        updates.agility_trained = Math.min(100, (selectedDog.agility_trained || 0) + finalGain);
        break;
      case 'strength':
        updates.strength_trained = Math.min(100, (selectedDog.strength_trained || 0) + finalGain);
        break;
      case 'endurance':
        updates.endurance_trained = Math.min(100, (selectedDog.endurance_trained || 0) + finalGain);
        break;
      case 'obedience':
        updates.obedience_trained = Math.min(100, (selectedDog.obedience_trained || 0) + finalGain);
        break;
    }

    updateDog(selectedDog.id, updates);
    const statKey = (training.statImproved + '_trained') as 'speed_trained' | 'agility_trained' | 'strength_trained' | 'endurance_trained' | 'obedience_trained';
    setReport({ dogId: selectedDog.id, dog: selectedDog.name, session: training.name, stat: training.statImproved, before: selectedDog[statKey] || 0, after: updates[statKey] ?? selectedDog[statKey], bond: bondXpGain, energy: updates.energy_stat ?? selectedDog.energy_stat, points: updates.training_points ?? selectedDog.training_points });

    // Check if any TOTAL stat (base + trained) reached milestone for story objective
    const maxTotalStat = Math.max(
      selectedDog.speed + (updates.speed_trained || selectedDog.speed_trained || 0),
      selectedDog.agility + (updates.agility_trained || selectedDog.agility_trained || 0),
      selectedDog.strength + (updates.strength_trained || selectedDog.strength_trained || 0),
      selectedDog.endurance + (updates.endurance_trained || selectedDog.endurance_trained || 0),
      selectedDog.intelligence + (updates.obedience_trained || selectedDog.obedience_trained || 0)
    );
    if (maxTotalStat >= 30) {
      trackStoryAction('custom', { customId: 'trained_stat_milestone', amount: 30 });
    }

    // Increase user training skill (max 100)
    if (user && user.training_skill < 100) {
      // Gain 0.5 skill per training session (slower at higher levels)
      const skillGainRate = user.training_skill < 50 ? 0.5 : user.training_skill < 80 ? 0.3 : 0.1;
      const newSkill = Math.min(100, user.training_skill + skillGainRate);

      const updatedUser = { ...useGameStore.getState().user!, training_skill: newSkill };
      setUser(updatedUser);

      // Show level up message at certain milestones
      if (Math.floor(newSkill / 10) > Math.floor(user.training_skill / 10)) {
        const skillLevel = Math.floor(newSkill / 10) * 10;
        setTimeout(() => {
          showToast.success(`🎓 Training Skill improved to level ${skillLevel}!\nYour self-training effectiveness increased!`);
        }, 500);
      }
    }

    // Track story objective for training
    if (currentTraining === 'obedience' || currentTraining === 'agility') useGameStore.getState().recordRibbon(selectedDog.id, currentTraining);
    trackStoryAction('train');

    setShowMinigame(false);
    setCurrentTraining(null);

    const performanceText = performanceMultiplier >= 1.5
      ? 'Perfect performance! '
      : performanceMultiplier >= 1.2
      ? 'Great performance! '
      : performanceMultiplier >= 1.0
      ? 'Good job! '
      : '';

    const rescueBonusText = rescueBonus > 0
      ? ` (${Math.round(rescueBonus * 100)}% rescue bond bonus!)`
      : '';

    // Show training success
    showToast.success(`${performanceText}${selectedDog.name} gained +${finalGain.toFixed(1)} ${training.statImproved}!${rescueBonusText}`);

    // Show bond increase notification
    showToast.bondIncrease(`${selectedDog.name} gained +${bondXpGain} bond XP!${selectedDog.is_rescue ? ' (Rescue bonus)' : ''}`);

    // Show bond level up notification
    if (bondLevelUp) {
      setTimeout(() => {
        showToast.levelUp(`${selectedDog.name} bond level increased to ${bondLevelUp.bond_level}!`);
      }, 300);
    }
  };

  const handleNpcTrain = (trainingId: string, trainerType: 'basic' | 'pro') => {
    if (!selectedDog || isTraining) return;
    const restriction = activityRestriction(selectedDog);
    if (restriction) { showToast.warning(restriction); return; }

    const training = trainingTypes.find(t => t.id === trainingId);
    if (!training) return;

    // Check if dog is in puppy training
    if (selectedDog.active_puppy_training) {
      showToast.warning(`${selectedDog.name} is currently in puppy training and cannot do regular training sessions!`);
      return;
    }

    // Check energy level
    if (selectedDog.energy_stat < ENERGY_THRESHOLDS.MIN_FOR_TRAINING) {
      showToast.error(`${selectedDog.name} is too tired to train! Energy must be at least ${ENERGY_THRESHOLDS.MIN_FOR_TRAINING}%. Feed or rest your dog first.`);
      return;
    }

    const cost = trainerType === 'basic' ? training.npcBasicCost : training.npcProCost;

    if ((user?.cash || 0) < cost) {
      showToast.error(`Not enough cash! Need $${cost}.`);
      return;
    }

    if (!canTrain(selectedDog, training.tpCost)) {
      showToast.error(`Not enough Training Points! Need ${training.tpCost} TP.`);
      return;
    }

    const multiplier = trainerType === 'basic' ? training.npcBasicMultiplier : training.npcProMultiplier;
    const gain = calculateTrainingGain(
      selectedDog,
      training.statImproved,
      multiplier,
      user?.training_skill || 1,
      user?.kennel_level || 1
    );

    // Calculate bond XP gain - even with NPC trainers, you're there supporting them!
    const bondXpGain = calculateBondXpGain(3, selectedDog.is_rescue || false);
    const newBondXp = selectedDog.bond_xp + bondXpGain;

    const updates: Partial<Dog> = {
  training_points: selectedDog.training_points - training.tpCost,
  energy_stat: Math.max(0, selectedDog.energy_stat - 10),
  training_sessions_today: selectedDog.training_sessions_today + 1,
  bond_xp: newBondXp,
};

// Check if dog should level up bond
const bondLevelUp = checkBondLevelUp({ ...selectedDog, bond_xp: newBondXp });
if (bondLevelUp) {
  Object.assign(updates, bondLevelUp);
}

switch(training.statImproved) {
  case 'speed':
    updates.speed_trained = Math.min(100, (selectedDog.speed_trained || 0) + gain);
    break;
  case 'agility':
    updates.agility_trained = Math.min(100, (selectedDog.agility_trained || 0) + gain);
    break;
  case 'strength':
    updates.strength_trained = Math.min(100, (selectedDog.strength_trained || 0) + gain);
    break;
  case 'endurance':
    updates.endurance_trained = Math.min(100, (selectedDog.endurance_trained || 0) + gain);
    break;
  case 'obedience':
    updates.obedience_trained = Math.min(100, (selectedDog.obedience_trained || 0) + gain);
    break;
}

updateDog(selectedDog.id, updates);
const statKey = (training.statImproved + '_trained') as 'speed_trained' | 'agility_trained' | 'strength_trained' | 'endurance_trained' | 'obedience_trained';
setReport({ dogId: selectedDog.id, dog: selectedDog.name, session: training.name + ' with a trainer', stat: training.statImproved, before: selectedDog[statKey] || 0, after: updates[statKey] ?? selectedDog[statKey], bond: bondXpGain, energy: updates.energy_stat ?? selectedDog.energy_stat, points: updates.training_points ?? selectedDog.training_points });

    // Check if any TOTAL stat (base + trained) reached milestone for story objective
    const maxTotalStatTrainer = Math.max(
      selectedDog.speed + (updates.speed_trained || selectedDog.speed_trained || 0),
      selectedDog.agility + (updates.agility_trained || selectedDog.agility_trained || 0),
      selectedDog.strength + (updates.strength_trained || selectedDog.strength_trained || 0),
      selectedDog.endurance + (updates.endurance_trained || selectedDog.endurance_trained || 0),
      selectedDog.intelligence + (updates.obedience_trained || selectedDog.obedience_trained || 0)
    );
    if (maxTotalStatTrainer >= 30) {
      trackStoryAction('custom', { customId: 'trained_stat_milestone', amount: 30 });
    }

    // Track story objective for training
    trackStoryAction('train');

    updateUserCash(-cost);
    showToast.success(`${selectedDog.name} gained +${gain} ${training.statImproved} from ${trainerType} trainer!`);
  };

  const breedData = selectedDog ? rescueBreeds.find(b => b.id === selectedDog.breed_id) : null;

  return (
    <div className="max-w-6xl mx-auto">
      {report && <section ref={reportRef} className="session-report" role="status"><div><p className="club-eyebrow">SESSION COMPLETE</p><h2>A step forward for {report.dog}.</h2><p>{report.session}</p></div><div className="session-report-stats"><div><strong>+{(report.after-report.before).toFixed(1)}</strong><span>{report.stat} developed</span><small>{report.before.toFixed(1)} to {report.after.toFixed(1)} trained points</small></div><div><strong>+{report.bond}</strong><span>bond XP earned</span></div><div><strong>{report.energy}%</strong><span>energy remaining</span><small>{report.points} training points left</small></div></div><p>Progress comes from good sessions and time to recover. Check in with your companion before choosing what comes next.</p><div className="session-report-actions">{onReturnToDog && <button className="club-button" onClick={() => { const companion = useGameStore.getState().dogs.find(d => d.id === report.dogId); if (companion) selectDog(companion); onReturnToDog(); }}>Back to your companion</button>}<button className="club-text-button" onClick={() => setReport(null)}>Continue at the training grounds</button></div></section>}
      {/* Dog Selection */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-earth-900 mb-4">Select Dog to Train</h2>
        <div className="flex gap-4 overflow-x-auto">
          {dogs.map((dog: any) => (
            <button
              key={dog.id}
              onClick={() => selectDog(dog)}
              className={`flex-shrink-0 p-4 rounded-lg border-2 transition-all ${
                selectedDog?.id === dog.id
                  ? 'border-kennel-500 bg-kennel-50'
                  : 'border-earth-300 bg-white hover:border-kennel-400'
              }`}
            >
              <p className="font-bold text-earth-900">{dog.name}</p>
              <p className="text-sm text-earth-600">TP: {dog.training_points}/100</p>
            </button>
          ))}
        </div>
      </div>

      {selectedDog && (
        <>
          {/* Selected Dog Info */}
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center gap-6">
              <div className="w-32 h-32">
                <img 
                  src={breedData?.img_sitting || ''} 
                  alt={selectedDog.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-earth-900">{selectedDog.name}</h3>
                <p className="text-earth-600 mb-4">{breedData?.name}</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-earth-600">Training Points</p>
                      <HelpButton helpId="training-points" size="small" tooltip="What are Training Points?" />
                    </div>
                    <p className="text-xl font-bold text-kennel-700">{selectedDog.training_points}/100</p>
                    {selectedDog.training_points < 100 && (
                      <button
                        onClick={() => {
                          const BASE_GEM_COST = 10;
                          const refillCount = selectedDog.tp_refills_today || 0;
                          const gemCost = BASE_GEM_COST * (refillCount + 1);
                          if (confirm(`Refill Training Points for ${gemCost} gems?${refillCount > 0 ? ` (${refillCount} refills today)` : ''}`)) {
                            const result = refillTrainingPoints(selectedDog.id);
                            if (result.success) {
                              showToast.success(result.message || 'Training points refilled');
                            } else {
                              showToast.error(result.message || 'Failed to refill training points');
                            }
                          }
                        }}
                        className="mt-2 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-semibold flex items-center justify-center gap-1"
                      >
                        💎 Refill ({10 * ((selectedDog.tp_refills_today || 0) + 1)} gems)
                      </button>
                    )}
                  </div>
                  <div>
                    <p className="text-earth-600">Trainability</p>
                    <p className="text-xl font-bold text-earth-900">{selectedDog.trainability}/10</p>
                  </div>
                  <div>
                    <p className="text-earth-600">Your Skill</p>
                    <p className="text-xl font-bold text-earth-900">{user?.training_skill}/100</p>
                  </div>
                </div>
                {selectedDog.is_rescue && getRescueDogTrainingBonus(selectedDog) > 0 && (
                  <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg">
                    <p className="text-sm font-bold text-green-700 flex items-center gap-2">
                      <span className="text-lg">🏠</span>
                      Rescue Dog Bonus: +{Math.round(getRescueDogTrainingBonus(selectedDog) * 100)}% Training Gains!
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      {selectedDog.bond_level >= 9
                        ? 'Unbreakable bond - Your rescue dog trains better than any purchased dog!'
                        : selectedDog.bond_level >= 6
                        ? 'Strong bond forming - Keep building your relationship!'
                        : 'Bond growing - Continue training and playing together!'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Training Options */}
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-earth-900 mb-6">Training Programs</h3>
            <div className="space-y-4">
              {trainingTypes.map((training) => {
                const getStatValue = (stat: string): number => {
                switch(stat) {
                    case 'speed': return selectedDog.speed || 0;
                    case 'agility': return selectedDog.agility || 0;
                    case 'strength': return selectedDog.strength || 0;
                    case 'endurance': return selectedDog.endurance || 0;
                    case 'obedience': return 0; // Obedience is only trained, no base stat
                    default: return 0;
                }
                };

                const getTrainedValue = (stat: string): number => {
                switch(stat) {
                    case 'speed': return selectedDog.speed_trained || 0;
                    case 'agility': return selectedDog.agility_trained || 0;
                    case 'strength': return selectedDog.strength_trained || 0;
                    case 'endurance': return selectedDog.endurance_trained || 0;
                    case 'obedience': return selectedDog.obedience_trained || 0;
                    default: return 0;
                }
                };

                const currentStat = getStatValue(training.statImproved);
                const trainedStat = getTrainedValue(training.statImproved);
                const totalStat = currentStat + trainedStat;

                return (
                  <div key={training.id} className="border-2 border-earth-300 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{training.icon}</span>
                        <div>
                          <h4 className="font-bold text-earth-900">{training.name}</h4>
                          <p className="text-sm text-earth-600">{training.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-earth-600">Current {training.statImproved}</p>
                        <p className="text-2xl font-bold text-earth-900">{training.statImproved === 'obedience' || isAptitudeKnown(selectedDog, training.statImproved as Aptitude) ? totalStat.toFixed(1) : 'Discovering'}</p>
                        {trainedStat > 0 && (
                          <p className="text-xs text-green-600">+{trainedStat.toFixed(1)} trained</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => handleSelfTrain(training.id)}
                        disabled={isTraining || !canTrain(selectedDog, training.tpCost) || selectedDog.energy_stat < ENERGY_THRESHOLDS.MIN_FOR_TRAINING}
                        className="p-3 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <p className="font-semibold">Train Yourself</p>
                        <p className="text-xs">FREE • {training.tpCost} TP</p>
                        <p className="text-xs">{training.duration}s</p>
                        {selectedDog.energy_stat < ENERGY_THRESHOLDS.MIN_FOR_TRAINING && (
                          <p className="text-xs text-red-300 mt-1">⚠️ Too tired!</p>
                        )}
                      </button>

                      <button
                        onClick={() => handleNpcTrain(training.id, 'basic')}
                        disabled={isTraining || !canTrain(selectedDog, training.tpCost) || (user?.cash || 0) < training.npcBasicCost || selectedDog.energy_stat < ENERGY_THRESHOLDS.MIN_FOR_TRAINING}
                        className="p-3 bg-earth-600 text-white rounded-lg hover:bg-earth-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <p className="font-semibold">Basic Trainer</p>
                        <p className="text-xs">${training.npcBasicCost} • {training.tpCost} TP</p>
                        <p className="text-xs">Instant • 1.2x gain</p>
                        {selectedDog.energy_stat < ENERGY_THRESHOLDS.MIN_FOR_TRAINING && (
                          <p className="text-xs text-red-300 mt-1">⚠️ Too tired!</p>
                        )}
                      </button>

                      <button
                        onClick={() => handleNpcTrain(training.id, 'pro')}
                        disabled={isTraining || !canTrain(selectedDog, training.tpCost) || (user?.cash || 0) < training.npcProCost || selectedDog.energy_stat < ENERGY_THRESHOLDS.MIN_FOR_TRAINING}
                        className="p-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <p className="font-semibold">Pro Trainer</p>
                        <p className="text-xs">${training.npcProCost} • {training.tpCost} TP</p>
                        <p className="text-xs">Instant • 1.5x gain</p>
                        {selectedDog.energy_stat < ENERGY_THRESHOLDS.MIN_FOR_TRAINING && (
                          <p className="text-xs text-red-300 mt-1">⚠️ Too tired!</p>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {showMinigame && currentTraining && selectedDog && (
            <div role="dialog" aria-modal="true" aria-label="Training session" className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80] p-4">
              <div className="bg-white rounded-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto"><div className="nested-return"><button onClick={cancelSession}>Cancel session and return</button></div>
                {currentTraining === 'speed' && (
                  <SprintTrainingGame
                    onComplete={score=>{if(sessionGeneration.current===activeSession)handleMinigameComplete(score);}}
                    dogName={selectedDog.name}
                  />
                )}
                {currentTraining === 'agility' && (
                  <Suspense fallback={<p>Preparing your agility course…</p>}><AgilityGame
                    onComplete={score=>{if(sessionGeneration.current===activeSession)handleMinigameComplete(score);}}
                    onCancel={cancelSession}
                    dogName={selectedDog.name}
                    dog={selectedDog}
                    agility={selectedDog.agility + selectedDog.agility_trained}
                  /></Suspense>
                )}
                {currentTraining === 'strength' && (
                  <WeightPullTrainingGame
                    onComplete={score=>{if(sessionGeneration.current===activeSession)handleMinigameComplete(score);}}
                    dogName={selectedDog.name}
                  />
                )}
                {currentTraining === 'endurance' && (
                  <DistanceRunGame
                    onComplete={score=>{if(sessionGeneration.current===activeSession)handleMinigameComplete(score);}}
                    dogName={selectedDog.name}
                  />
                )}
                {currentTraining === 'obedience' && (
                  <Suspense fallback={<p>Preparing the training yard...</p>}><YardActivity
                    dog={selectedDog} mode="obedience" onComplete={score=>{if(sessionGeneration.current===activeSession)handleMinigameComplete(score);}}
                    onCancel={cancelSession}
                  /></Suspense>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
