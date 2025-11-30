import { useState, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import {
  PUPPY_TRAINING_PROGRAMS,
  getStandardPrograms,
  getPremiumProgram,
  MAX_FREE_PUPPY_TRAINING_SLOTS,
  THIRD_SLOT_GEM_COST,
  canDoPuppyTraining,
  shouldShowAgeWarning,
  getWeeksRemaining,
  getHoursRemaining,
  isTrainingComplete,
  type PuppyTrainingProgram,
} from '../../data/puppyTraining';

// Helper to format bonus display
const formatBonus = (bonuses: PuppyTrainingProgram['bonuses'], unlocks?: PuppyTrainingProgram['unlocks']) => {
  const items: string[] = [];

  if (bonuses.statBonus) items.push(`+${bonuses.statBonus} to all stats`);
  if (bonuses.happinessBaseline) items.push(`+${bonuses.happinessBaseline}% happiness`);
  if (bonuses.bondGainRate) items.push(`+${bonuses.bondGainRate}% bond gain`);
  if (bonuses.trainingEffectiveness) items.push(`+${bonuses.trainingEffectiveness}% training gains`);
  if (bonuses.energyRegen) items.push(`+${bonuses.energyRegen}% energy regen`);
  if (bonuses.competitionBonus) items.push(`+${bonuses.competitionBonus}% competition`);
  if (bonuses.breedingValue) items.push(`+${bonuses.breedingValue}% breeding value`);
  if (bonuses.agilityBonus) items.push(`+${bonuses.agilityBonus}% agility`);
  if (bonuses.obedienceBonus) items.push(`+${bonuses.obedienceBonus}% obedience`);
  if (bonuses.conformationBonus) items.push(`+${bonuses.conformationBonus}% conformation`);
  if (unlocks?.trait) items.push(`Unlocks "${unlocks.trait}" trait`);

  return items;
};

export default function PuppyTrainingPanel() {
  const { selectedDog, startPuppyTraining, unlockThirdTrainingSlot, checkPuppyTrainingCompletion } = useGameStore();
  const [selectedProgram, setSelectedProgram] = useState<PuppyTrainingProgram | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Check for training completion
  useEffect(() => {
    if (selectedDog?.active_puppy_training && selectedDog?.training_completion_time) {
      const interval = setInterval(() => {
        if (isTrainingComplete(selectedDog.training_completion_time!)) {
          checkPuppyTrainingCompletion(selectedDog.id);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [selectedDog, checkPuppyTrainingCompletion]);

  if (!selectedDog) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <p className="text-earth-600">Select a dog to view puppy training</p>
      </div>
    );
  }

  const isPuppy = canDoPuppyTraining(selectedDog.age_weeks);
  const showWarning = shouldShowAgeWarning(selectedDog.age_weeks);
  const weeksRemaining = getWeeksRemaining(selectedDog.age_weeks);
  const completedTrainings = selectedDog.completed_puppy_training || [];
  const hasThirdSlot = selectedDog.has_unlocked_third_slot || false;
  const maxSlots = hasThirdSlot ? 3 : MAX_FREE_PUPPY_TRAINING_SLOTS;
  const availableSlots = maxSlots - completedTrainings.length;
  const standardPrograms = getStandardPrograms();
  const premiumProgram = getPremiumProgram();

  const handleStartTraining = (program: PuppyTrainingProgram) => {
    const result = startPuppyTraining(selectedDog.id, program.id);
    setMessage({ text: result.message, type: result.success ? 'success' : 'error' });
    setTimeout(() => setMessage(null), 3000);
    if (result.success) {
      setSelectedProgram(null);
    }
  };

  const handleUnlockThirdSlot = () => {
    const result = unlockThirdTrainingSlot(selectedDog.id);
    setMessage({ text: result.message, type: result.success ? 'success' : 'error' });
    setTimeout(() => setMessage(null), 3000);
  };

  const getTimeRemaining = (): string => {
    if (!selectedDog.training_completion_time) return '';
    const hours = getHoursRemaining(selectedDog.training_completion_time);
    if (hours < 1) {
      return `${Math.ceil(hours * 60)} minutes remaining`;
    }
    return `${Math.ceil(hours)} hours remaining`;
  };

  if (!isPuppy) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="text-6xl mb-4">🐕</div>
        <h3 className="text-xl font-bold text-earth-900 mb-2">Adult Dog</h3>
        <p className="text-earth-600">
          {selectedDog.name} is now an adult and can no longer receive puppy training.
        </p>
        {completedTrainings.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-kennel-700">Completed Puppy Training:</p>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {completedTrainings.map((id) => {
                const program = PUPPY_TRAINING_PROGRAMS[id];
                return program ? (
                  <span key={id} className="px-3 py-1 bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300 rounded-full text-sm font-medium text-amber-900">
                    {program.icon} {program.name}
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-earth-900 mb-2">🐾 Puppy Training Programs</h3>
        <p className="text-earth-600 text-sm">
          Special training available only for puppies. Provides permanent bonuses!
        </p>
      </div>

      {/* Age Warning */}
      {showWarning && (
        <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg animate-pulse">
          <p className="text-sm font-bold text-yellow-900 flex items-center gap-2">
            ⚠️ Last Chance for Puppy Training!
          </p>
          <p className="text-xs text-yellow-800 mt-1">
            Only {weeksRemaining} weeks remaining before {selectedDog.name} becomes an adult.
          </p>
        </div>
      )}

      {/* Message Display */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-lg border-2 ${
            message.type === 'success'
              ? 'bg-green-50 border-green-300 text-green-800'
              : message.type === 'error'
              ? 'bg-red-50 border-red-300 text-red-800'
              : 'bg-blue-50 border-blue-300 text-blue-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Training Slots */}
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-bold text-purple-900">Training Slots Available</p>
          <p className="text-lg font-bold text-purple-700">
            {availableSlots} / {maxSlots}
          </p>
        </div>
        <div className="flex gap-2 mb-3">
          {Array.from({ length: maxSlots }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-3 rounded-full ${
                i < completedTrainings.length
                  ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                  : 'bg-purple-200'
              }`}
            />
          ))}
        </div>
        {!hasThirdSlot && completedTrainings.length < 2 && (
          <button
            onClick={handleUnlockThirdSlot}
            className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-semibold text-sm flex items-center justify-center gap-2"
          >
            <span>💎</span>
            <span>Unlock 3rd Slot ({THIRD_SLOT_GEM_COST} Gems)</span>
          </button>
        )}
      </div>

      {/* Active Training */}
      {selectedDog.active_puppy_training && (
        <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
          <p className="text-sm font-bold text-blue-900 mb-2">🎓 Training in Progress</p>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-blue-800">
                {PUPPY_TRAINING_PROGRAMS[selectedDog.active_puppy_training]?.icon}{' '}
                {PUPPY_TRAINING_PROGRAMS[selectedDog.active_puppy_training]?.name}
              </p>
              <p className="text-xs text-blue-700">{getTimeRemaining()}</p>
            </div>
            <div className="animate-spin text-2xl">🎓</div>
          </div>
        </div>
      )}

      {/* Completed Trainings */}
      {completedTrainings.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-bold text-kennel-800 mb-2">✅ Completed Trainings</p>
          <div className="flex flex-wrap gap-2">
            {completedTrainings.map((id) => {
              const program = PUPPY_TRAINING_PROGRAMS[id];
              return program ? (
                <span key={id} className="px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 border border-green-300 rounded-full text-sm font-medium text-green-900">
                  {program.icon} {program.name}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Available Programs */}
      {availableSlots > 0 && !selectedDog.active_puppy_training && (
        <>
          {/* Standard Programs */}
          <div className="mb-6">
            <h4 className="text-lg font-bold text-earth-900 mb-3">Standard Programs</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {standardPrograms.map((program) => {
                const isCompleted = completedTrainings.includes(program.id);
                return (
                  <div
                    key={program.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isCompleted
                        ? 'bg-gray-100 border-gray-300 opacity-60'
                        : selectedProgram?.id === program.id
                        ? 'border-kennel-500 bg-kennel-50'
                        : 'border-earth-200 hover:border-kennel-300 cursor-pointer'
                    }`}
                    onClick={() => !isCompleted && setSelectedProgram(program)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-3xl">{program.icon}</span>
                        <div>
                          <h5 className="font-bold text-earth-900">{program.name}</h5>
                          {isCompleted && <span className="text-xs text-green-600 font-semibold">✓ Completed</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-kennel-700">${program.cost}</p>
                        <p className="text-xs text-earth-600">{program.durationHours}h</p>
                      </div>
                    </div>
                    <p className="text-xs text-earth-600 mb-2">{program.description}</p>

                    {/* Bonuses */}
                    <div className="bg-kennel-50/50 rounded p-2 mb-2">
                      <p className="text-xs font-semibold text-kennel-800 mb-1">Bonuses:</p>
                      <ul className="text-xs text-kennel-700 space-y-0.5">
                        {formatBonus(program.bonuses, program.unlocks).map((bonus, i) => (
                          <li key={i}>• {bonus}</li>
                        ))}
                      </ul>
                    </div>

                    {selectedProgram?.id === program.id && !isCompleted && (
                      <button
                        onClick={() => handleStartTraining(program)}
                        className="w-full mt-2 px-4 py-2 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 transition-colors font-semibold text-sm"
                      >
                        Start Training
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Premium Program */}
          <div className="mb-4">
            <h4 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600 mb-3">
              👑 Premium Program
            </h4>
            <div
              className={`p-6 rounded-lg border-2 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 transition-all ${
                completedTrainings.includes(premiumProgram.id)
                  ? 'border-gray-300 opacity-60'
                  : selectedProgram?.id === premiumProgram.id
                  ? 'border-amber-500'
                  : 'border-amber-300 hover:border-amber-400 cursor-pointer'
              }`}
              onClick={() => !completedTrainings.includes(premiumProgram.id) && setSelectedProgram(premiumProgram)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{premiumProgram.icon}</span>
                  <div>
                    <h5 className="font-bold text-xl text-amber-900">{premiumProgram.name}</h5>
                    {completedTrainings.includes(premiumProgram.id) && (
                      <span className="text-sm text-green-600 font-semibold">✓ Elite Training Complete</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-amber-700 flex items-center gap-1">
                    💎 {premiumProgram.gemCost}
                  </p>
                  <p className="text-xs text-amber-600">{premiumProgram.durationHours}h</p>
                </div>
              </div>
              <p className="text-sm text-amber-900 mb-3">{premiumProgram.description}</p>
              <div className="bg-white/60 rounded p-3 mb-3">
                <p className="text-xs font-bold text-amber-900 mb-1">Premium Bonuses:</p>
                <ul className="text-xs text-amber-800 space-y-1">
                  <li>⭐ +10 to ALL base stats</li>
                  <li>⚡ +25% training effectiveness</li>
                  <li>🏆 +20% competition scores</li>
                  <li>💝 +50% breeding value</li>
                  <li>👑 Unlocks "Elite Champion" trait</li>
                </ul>
              </div>
              {selectedProgram?.id === premiumProgram.id && !completedTrainings.includes(premiumProgram.id) && (
                <button
                  onClick={() => handleStartTraining(premiumProgram)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all font-bold"
                >
                  Begin Elite Training
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-900">
          <strong>💡 Tip:</strong> Puppy training bonuses are permanent and stack with regular training!
          Choose wisely - you can only complete {maxSlots} programs before {selectedDog.name} becomes an adult.
        </p>
      </div>
    </div>
  );
}
