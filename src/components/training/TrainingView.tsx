import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { trainingTypes } from '../../data/trainingTypes';
import { rescueBreeds } from '../../data/rescueBreeds';
import { calculateTrainingGain, canTrain, getUserTrainingMultiplier } from '../../utils/trainingCalculations';
import { Dog } from '../../types';
import SprintTrainingGame from './SprintTrainingGame';
import ObstacleCourseGame from './ObstacleCourseGame';
import WeightPullTrainingGame from './WeightPullTrainingGame';
import DistanceRunGame from './DistanceRunGame';
import CommandDrillsGame from './CommandDrillsGame';


export default function TrainingView() {
  const { dogs, selectedDog, selectDog, updateDog, user, updateUserCash } = useGameStore();
  const [isTraining] = useState(false);
  const [currentTraining, setCurrentTraining] = useState<string | null>(null);
  const [showMinigame, setShowMinigame] = useState(false);

  if (dogs.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-white drop-shadow-lg text-xl">You need a dog to train!</p>
      </div>
    );
  }

  const handleSelfTrain = (trainingId: string) => {
    if (!selectedDog || isTraining) return;

    const training = trainingTypes.find(t => t.id === trainingId);
    if (!training) return;

    if (!canTrain(selectedDog, training.tpCost)) {
      alert(`Not enough Training Points! Need ${training.tpCost} TP.`);
      return;
    }

    setCurrentTraining(trainingId);
    setShowMinigame(true);
  };

  const handleMinigameComplete = (performanceMultiplier: number) => {
    if (!selectedDog || !currentTraining) return;

    const training = trainingTypes.find(t => t.id === currentTraining);
    if (!training) return;

    const userMultiplier = getUserTrainingMultiplier(user?.training_skill || 1);

    // Apply performance multiplier from minigame
    const baseGain = calculateTrainingGain(
      selectedDog,
      training.statImproved,
      userMultiplier,
      user?.training_skill || 1
    );

    const finalGain = baseGain * performanceMultiplier;

    // Update dog's trained stat
    const updates: Partial<Dog> = {
      training_points: selectedDog.training_points - training.tpCost,
      bond_xp: selectedDog.bond_xp + 3,
    };

    switch(training.statImproved) {
      case 'speed':
        updates.speed_trained = (selectedDog.speed_trained || 0) + finalGain;
        break;
      case 'agility':
        updates.agility_trained = (selectedDog.agility_trained || 0) + finalGain;
        break;
      case 'strength':
        updates.strength_trained = (selectedDog.strength_trained || 0) + finalGain;
        break;
      case 'endurance':
        updates.endurance_trained = (selectedDog.endurance_trained || 0) + finalGain;
        break;
      case 'obedience':
        updates.obedience_trained = (selectedDog.obedience_trained || 0) + finalGain;
        break;
    }

    updateDog(selectedDog.id, updates);

    setShowMinigame(false);
    setCurrentTraining(null);

    const performanceText = performanceMultiplier >= 1.5
      ? 'Perfect performance! '
      : performanceMultiplier >= 1.2
      ? 'Great performance! '
      : performanceMultiplier >= 1.0
      ? 'Good job! '
      : '';

    alert(`${performanceText}${selectedDog.name} gained +${finalGain.toFixed(1)} ${training.statImproved}!`);
  };

  const handleNpcTrain = (trainingId: string, trainerType: 'basic' | 'pro') => {
    if (!selectedDog || isTraining) return;

    const training = trainingTypes.find(t => t.id === trainingId);
    if (!training) return;

    const cost = trainerType === 'basic' ? training.npcBasicCost : training.npcProCost;
    
    if ((user?.cash || 0) < cost) {
      alert(`Not enough cash! Need $${cost}.`);
      return;
    }

    if (!canTrain(selectedDog, training.tpCost)) {
      alert(`Not enough Training Points! Need ${training.tpCost} TP.`);
      return;
    }

    const multiplier = trainerType === 'basic' ? training.npcBasicMultiplier : training.npcProMultiplier;
    const gain = calculateTrainingGain(
      selectedDog,
      training.statImproved,
      multiplier,
      user?.training_skill || 1
    );

    const updates: Partial<Dog> = {
  training_points: selectedDog.training_points - training.tpCost,
};

switch(training.statImproved) {
  case 'speed':
    updates.speed_trained = (selectedDog.speed_trained || 0) + gain;
    break;
  case 'agility':
    updates.agility_trained = (selectedDog.agility_trained || 0) + gain;
    break;
  case 'strength':
    updates.strength_trained = (selectedDog.strength_trained || 0) + gain;
    break;
  case 'endurance':
    updates.endurance_trained = (selectedDog.endurance_trained || 0) + gain;
    break;
  case 'obedience':
    updates.obedience_trained = (selectedDog.obedience_trained || 0) + gain;
    break;
}

updateDog(selectedDog.id, updates);

    updateUserCash(-cost);
    alert(`${selectedDog.name} gained +${gain} ${training.statImproved} from ${trainerType} trainer!`);
  };

  const breedData = selectedDog ? rescueBreeds.find(b => b.id === selectedDog.breed_id) : null;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Dog Selection */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-earth-900 mb-4">Select Dog to Train</h2>
        <div className="flex gap-4 overflow-x-auto">
          {dogs.map((dog) => (
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
                    <p className="text-earth-600">Training Points</p>
                    <p className="text-xl font-bold text-kennel-700">{selectedDog.training_points}/100</p>
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
                        <p className="text-2xl font-bold text-earth-900">{totalStat.toFixed(1)}</p>
                        {trainedStat > 0 && (
                          <p className="text-xs text-green-600">+{trainedStat.toFixed(1)} trained</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => handleSelfTrain(training.id)}
                        disabled={isTraining || !canTrain(selectedDog, training.tpCost)}
                        className="p-3 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <p className="font-semibold">Train Yourself</p>
                        <p className="text-xs">FREE • {training.tpCost} TP</p>
                        <p className="text-xs">{training.duration}s</p>
                      </button>

                      <button
                        onClick={() => handleNpcTrain(training.id, 'basic')}
                        disabled={isTraining || !canTrain(selectedDog, training.tpCost) || (user?.cash || 0) < training.npcBasicCost}
                        className="p-3 bg-earth-600 text-white rounded-lg hover:bg-earth-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <p className="font-semibold">Basic Trainer</p>
                        <p className="text-xs">${training.npcBasicCost} • {training.tpCost} TP</p>
                        <p className="text-xs">Instant • 1.2x gain</p>
                      </button>

                      <button
                        onClick={() => handleNpcTrain(training.id, 'pro')}
                        disabled={isTraining || !canTrain(selectedDog, training.tpCost) || (user?.cash || 0) < training.npcProCost}
                        className="p-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <p className="font-semibold">Pro Trainer</p>
                        <p className="text-xs">${training.npcProCost} • {training.tpCost} TP</p>
                        <p className="text-xs">Instant • 1.5x gain</p>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {showMinigame && currentTraining && selectedDog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                {currentTraining === 'speed' && (
                  <SprintTrainingGame
                    onComplete={handleMinigameComplete}
                    dogName={selectedDog.name}
                  />
                )}
                {currentTraining === 'agility' && (
                  <ObstacleCourseGame
                    onComplete={handleMinigameComplete}
                    dogName={selectedDog.name}
                  />
                )}
                {currentTraining === 'strength' && (
                  <WeightPullTrainingGame
                    onComplete={handleMinigameComplete}
                    dogName={selectedDog.name}
                  />
                )}
                {currentTraining === 'endurance' && (
                  <DistanceRunGame
                    onComplete={handleMinigameComplete}
                    dogName={selectedDog.name}
                  />
                )}
                {currentTraining === 'obedience' && (
                  <CommandDrillsGame
                    onComplete={handleMinigameComplete}
                    dogName={selectedDog.name}
                  />
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}