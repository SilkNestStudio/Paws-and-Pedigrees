import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { rescueBreeds } from '../../data/rescueBreeds';
import HelpButton from '../tutorial/HelpButton';
import { getKennelCapacityInfo } from '../../utils/kennelCapacity';
import { getHealthStatus } from '../../utils/healthDecay';
import KennelUpgradeView from './KennelUpgradeView';
import { PUPPY_TRAINING_PROGRAMS } from '../../data/puppyTraining';

interface KennelViewProps {
  onViewDog: () => void;
}

export default function KennelView({ onViewDog }: KennelViewProps) {
  const { user, dogs, selectDog } = useGameStore();
  const capacityInfo = getKennelCapacityInfo(dogs.length, user?.kennel_level || 1);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const handleDogClick = (dog: typeof dogs[0]) => {
    selectDog(dog);
    onViewDog();
  };

  // If showing upgrade panel, render that instead
  if (showUpgrade) {
    return (
      <div>
        <button
          onClick={() => setShowUpgrade(false)}
          className="mb-4 px-4 py-2 bg-earth-600 text-white rounded-lg hover:bg-earth-700 transition-all"
        >
          ← Back to Kennel
        </button>
        <KennelUpgradeView />
      </div>
    );
  }

  if (dogs.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-earth-600 text-lg">No dogs in your kennel yet.</p>
      </div>
    );
  }

  return (
  <div className="max-w-6xl mx-auto">
    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6">
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-earth-900">Your Kennel</h2>
            <HelpButton helpId="kennel-management" tooltip="Learn about kennel management" />
          </div>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-earth-600">Level {user?.kennel_level}</p>
            <span className="text-earth-400">•</span>
            <p className={`font-semibold ${!capacityInfo.canAddMore ? 'text-red-600' : 'text-earth-700'}`}>
              {capacityInfo.current}/{capacityInfo.max} dogs
            </p>
            {!capacityInfo.canAddMore && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Full</span>
            )}
            {capacityInfo.nextLevelCapacity && (
              <span className="text-xs text-earth-500">
                (Next: {capacityInfo.nextLevelCapacity})
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowUpgrade(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all font-semibold shadow-md flex items-center gap-2"
          >
            <span>⬆️</span>
            <span>Upgrade Kennel</span>
          </button>
          <div className="text-right">
            <p className="text-sm text-earth-600">Cash</p>
            <p className="text-2xl font-bold text-kennel-700">${user?.cash}</p>
          </div>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {dogs.map((dog: any) => {
        const breedData = rescueBreeds.find(b => b.id === dog.breed_id);
        const healthStatus = getHealthStatus(dog);

        // Dynamic image selection based on dog's status
        const getDogImageByStatus = () => {
          // Dead dogs
          if (healthStatus.isDead) {
            return breedData?.img_playing || ''; // Laying down
          }
          // Tired or sick dogs lay down
          if (dog.energy_stat < 30 || dog.health < 50) {
            return breedData?.img_playing || '';
          }
          // Energetic and happy dogs stand
          if (dog.energy_stat > 70 && dog.happiness > 70) {
            return breedData?.img_standing || '';
          }
          // Default: sitting
          return breedData?.img_sitting || '';
        };

        return (
          <div
            key={dog.id}
            onClick={() => handleDogClick(dog)}
            className="relative bg-white/95 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden cursor-pointer transition-all hover:shadow-2xl hover:scale-[1.02]"
          >
            {/* Kennel Pen Frame */}
            <div className="relative h-64 bg-gradient-to-b from-earth-100 to-earth-200 overflow-hidden">
              {/* Chain-link fence overlay */}
              <div className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, #8a6d47 10px, #8a6d47 11px),
                                   repeating-linear-gradient(-45deg, transparent, transparent 10px, #8a6d47 10px, #8a6d47 11px)`
                }}
              />
              
              {/* Dog Image */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-48 h-48 flex items-end justify-center">
                <img
                  src={getDogImageByStatus()}
                  alt={dog.name}
                  className="w-full h-full object-contain drop-shadow-lg"
                />
              </div>

              {/* Status Indicators */}
              <div className="absolute top-3 right-3 flex flex-col gap-2">
                {healthStatus.isDead && (
                  <div className="bg-black text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                    ☠️ DEAD
                  </div>
                )}
                {healthStatus.needsEmergencyVet && (
                  <div className="bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                    🚨 EMERGENCY!
                  </div>
                )}
                {healthStatus.needsVet && !healthStatus.needsEmergencyVet && (
                  <div className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                    🏥 Needs Vet
                  </div>
                )}
                {dog.hunger < 30 && !healthStatus.isDead && (
                  <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                    🍖 Hungry!
                  </div>
                )}
                {dog.happiness < 30 && !healthStatus.isDead && (
                  <div className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                    😢 Sad
                  </div>
                )}
                {dog.energy_stat < 20 && !healthStatus.isDead && (
                  <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                    💤 Tired
                  </div>
                )}
              </div>

              {/* Nameplate */}
              <div className="absolute bottom-3 left-3 bg-kennel-700 text-white px-3 py-1 rounded-lg shadow-lg">
                <p className="font-bold">{dog.name}</p>
                <p className="text-xs opacity-90 capitalize">{dog.gender} • {breedData?.name}</p>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-earth-600 w-16">Hunger:</span>
                <div className="flex-1 bg-earth-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      dog.hunger > 70 ? 'bg-green-500' : dog.hunger > 30 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${dog.hunger}%` }}
                  />
                </div>
                <span className="text-xs text-earth-700 w-8">{dog.hunger}%</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-earth-600 w-16">Happy:</span>
                <div className="flex-1 bg-earth-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      dog.happiness > 70 ? 'bg-green-500' : dog.happiness > 30 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${dog.happiness}%` }}
                  />
                </div>
                <span className="text-xs text-earth-700 w-8">{dog.happiness}%</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-earth-600 w-16">Energy:</span>
                <div className="flex-1 bg-earth-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${dog.energy_stat}%` }}
                  />
                </div>
                <span className="text-xs text-earth-700 w-8">{dog.energy_stat}%</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-earth-600 w-16">Health:</span>
                <div className="flex-1 bg-earth-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${dog.health}%` }}
                  />
                </div>
                <span className="text-xs text-earth-700 w-8">{dog.health}%</span>
              </div>

              <div className="pt-2 border-t border-earth-200">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-semibold text-kennel-800">Bond Level {dog.bond_level}/10</p>
                  <p className="text-xs text-kennel-600">{dog.bond_xp}/50 XP</p>
                </div>
                <div className="w-full bg-kennel-200 rounded-full h-1.5 mt-1">
                  <div
                    className="bg-kennel-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${(dog.bond_xp / 50) * 100}%` }}
                  />
                </div>
              </div>

              {/* Puppy Training Badges */}
              {dog.completed_puppy_training && dog.completed_puppy_training.length > 0 && (
                <div className="pt-2 border-t border-earth-200">
                  <p className="text-xs font-semibold text-amber-800 mb-1.5">🎓 Puppy Training</p>
                  <div className="flex flex-wrap gap-1">
                    {dog.completed_puppy_training.slice(0, 3).map((trainingId: string) => {
                      const program = PUPPY_TRAINING_PROGRAMS[trainingId];
                      if (!program) return null;
                      return (
                        <span
                          key={trainingId}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            program.isPremium
                              ? 'bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300 text-amber-900'
                              : 'bg-gradient-to-r from-green-100 to-emerald-100 border border-green-300 text-green-900'
                          }`}
                          title={program.name}
                        >
                          {program.icon}
                        </span>
                      );
                    })}
                    {dog.completed_puppy_training.length > 3 && (
                      <span className="text-xs text-earth-600">+{dog.completed_puppy_training.length - 3}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
}