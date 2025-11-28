import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { rescueBreeds } from '../../data/rescueBreeds';
import DogCarePanel from './DogCarePanel';
import InteractiveCarePanel from './InteractiveCarePanel';
import HelpButton from '../tutorial/HelpButton';
import {
  getCompositionSummary,
  getCompositionColor,
  getCompositionEmoji,
  getSimplifiedComposition,
} from '../../data/breedComposition';

interface DogDetailViewProps {
  onBack: () => void;
}

export default function DogDetailView({ onBack }: DogDetailViewProps) {
  const { selectedDog } = useGameStore();
  const [interactiveMode, setInteractiveMode] = useState(false);

  if (!selectedDog) {
    return (
      <div className="max-w-6xl mx-auto text-center py-20">
        <p className="text-earth-600 text-lg">No dog selected</p>
        <button
          onClick={onBack}
          className="mt-4 px-6 py-2 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 transition-all"
        >
          Back to Kennel
        </button>
      </div>
    );
  }

  const breedData = rescueBreeds.find(b => b.id === selectedDog.breed_id);

  // Dynamic image selection based on dog's status
  const getDogImageByStatus = () => {
    if (selectedDog.energy_stat < 30 || selectedDog.health < 50) {
      return breedData?.img_playing || '';
    }
    if (selectedDog.energy_stat > 70 && selectedDog.happiness > 70) {
      return breedData?.img_standing || '';
    }
    return breedData?.img_sitting || '';
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="mb-4 px-4 py-2 bg-white/90 backdrop-blur-sm text-earth-900 rounded-lg hover:bg-white shadow-lg transition-all flex items-center gap-2"
      >
        ← Back to Kennel
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Dog Display */}
        <div className="lg:col-span-2">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden">
            {/* Dog Display Area */}
            <div className="relative h-96 bg-gradient-to-b from-earth-100 to-earth-200">
              {/* Chain-link fence overlay */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, #8a6d47 10px, #8a6d47 11px),
                                   repeating-linear-gradient(-45deg, transparent, transparent 10px, #8a6d47 10px, #8a6d47 11px)`
                }}
              />

              {/* Dog Image */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-64 h-64 flex items-end justify-center">
                <img
                  src={getDogImageByStatus()}
                  alt={selectedDog.name}
                  className="w-full h-full object-contain drop-shadow-2xl"
                />
              </div>

              {/* Status Indicators */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                {selectedDog.hunger < 30 && (
                  <div className="bg-red-500 text-white px-3 py-1.5 rounded-full text-sm font-bold animate-pulse">
                    🍖 Hungry!
                  </div>
                )}
                {selectedDog.happiness < 30 && (
                  <div className="bg-yellow-500 text-white px-3 py-1.5 rounded-full text-sm font-bold animate-pulse">
                    😢 Sad
                  </div>
                )}
                {selectedDog.energy_stat < 20 && (
                  <div className="bg-blue-500 text-white px-3 py-1.5 rounded-full text-sm font-bold">
                    💤 Tired
                  </div>
                )}
                {selectedDog.is_pregnant && (
                  <div className="bg-pink-500 text-white px-3 py-1.5 rounded-full text-sm font-bold">
                    🤰 Pregnant
                  </div>
                )}
              </div>

              {/* Name & Breed */}
              <div className="absolute bottom-4 left-4 bg-kennel-700 text-white px-4 py-2 rounded-lg shadow-xl max-w-md">
                <h2 className="text-2xl font-bold">{selectedDog.name}</h2>
                <p className="text-sm opacity-90 capitalize">
                  {selectedDog.gender === 'male' ? '♂️' : '♀️'} {breedData?.name}
                </p>

                {/* Breed Composition Badge */}
                {selectedDog.breed_composition && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-lg">
                      {getCompositionEmoji(selectedDog.breed_composition)}
                    </span>
                    <span className="text-xs opacity-90">
                      {selectedDog.breed_composition.isDesignerBreed && selectedDog.breed_composition.designerBreedInfo
                        ? selectedDog.breed_composition.designerBreedInfo.name
                        : selectedDog.breed_composition.isPurebred
                        ? 'Purebred'
                        : selectedDog.breed_composition.isFirstGeneration
                        ? 'F1 Cross'
                        : `F${selectedDog.breed_composition.generation} Mix`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Care Stats */}
            <div className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-earth-600 w-20">Hunger:</span>
                <div className="flex-1 bg-earth-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      selectedDog.hunger > 70 ? 'bg-green-500' : selectedDog.hunger > 30 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${selectedDog.hunger}%` }}
                  />
                </div>
                <span className="text-sm text-earth-700 w-12">{selectedDog.hunger}%</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-earth-600 w-20">Thirst:</span>
                <div className="flex-1 bg-earth-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      selectedDog.thirst > 70 ? 'bg-blue-500' : selectedDog.thirst > 30 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${selectedDog.thirst}%` }}
                  />
                </div>
                <span className="text-sm text-earth-700 w-12">{selectedDog.thirst}%</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-earth-600 w-20">Happiness:</span>
                <div className="flex-1 bg-earth-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      selectedDog.happiness > 70 ? 'bg-green-500' : selectedDog.happiness > 30 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${selectedDog.happiness}%` }}
                  />
                </div>
                <span className="text-sm text-earth-700 w-12">{selectedDog.happiness}%</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-earth-600 w-20">Energy:</span>
                <div className="flex-1 bg-earth-200 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all"
                    style={{ width: `${selectedDog.energy_stat}%` }}
                  />
                </div>
                <span className="text-sm text-earth-700 w-12">{selectedDog.energy_stat}%</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-earth-600 w-20">Health:</span>
                <div className="flex-1 bg-earth-200 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full transition-all"
                    style={{ width: `${selectedDog.health}%` }}
                  />
                </div>
                <span className="text-sm text-earth-700 w-12">{selectedDog.health}%</span>
              </div>

              {/* Bond Level */}
              <div className="pt-3 border-t border-earth-200">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-semibold text-kennel-800">Bond Level {selectedDog.bond_level}/10</p>
                    <HelpButton helpId="bond-level" size="small" tooltip="What is Bond Level?" />
                  </div>
                  <p className="text-sm text-kennel-600">{selectedDog.bond_xp}/50 XP</p>
                </div>
                <div className="w-full bg-kennel-200 rounded-full h-2">
                  <div
                    className="bg-kennel-600 h-2 rounded-full transition-all"
                    style={{ width: `${(selectedDog.bond_xp / 50) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="mt-6 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-earth-900 mb-4">Performance Stats</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-sm text-earth-600">Speed</p>
                <p className="text-3xl font-bold text-earth-900">{selectedDog.speed}</p>
                {selectedDog.speed_trained > 0 && (
                  <p className="text-xs text-green-600">+{selectedDog.speed_trained.toFixed(1)} trained</p>
                )}
              </div>
              <div className="text-center">
                <p className="text-sm text-earth-600">Agility</p>
                <p className="text-3xl font-bold text-earth-900">{selectedDog.agility}</p>
                {selectedDog.agility_trained > 0 && (
                  <p className="text-xs text-green-600">+{selectedDog.agility_trained.toFixed(1)} trained</p>
                )}
              </div>
              <div className="text-center">
                <p className="text-sm text-earth-600">Strength</p>
                <p className="text-3xl font-bold text-earth-900">{selectedDog.strength}</p>
                {selectedDog.strength_trained > 0 && (
                  <p className="text-xs text-green-600">+{selectedDog.strength_trained.toFixed(1)} trained</p>
                )}
              </div>
              <div className="text-center">
                <p className="text-sm text-earth-600">Intelligence</p>
                <p className="text-3xl font-bold text-earth-900">{selectedDog.intelligence}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-earth-600">Trainability</p>
                <p className="text-3xl font-bold text-earth-900">{selectedDog.trainability}</p>
              </div>
            </div>

            {/* Training Points */}
            <div className="mt-4 pt-4 border-t border-earth-200">
              <div className="flex justify-between items-center">
                <span className="text-sm text-earth-600">Training Points:</span>
                <span className="text-lg font-bold text-blue-700">{selectedDog.training_points}/100 TP</span>
              </div>
            </div>
          </div>

          {/* Rescue Story */}
          {selectedDog.is_rescue && selectedDog.rescue_story && (
            <div className="mt-6 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-earth-900 mb-3">🏠 Rescue Story</h3>
              <p className="text-sm text-earth-700 italic">"{selectedDog.rescue_story}"</p>
            </div>
          )}

          {/* Age & Breeding Info */}
          <div className="mt-6 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-earth-900 mb-3">📋 Additional Info</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-earth-600">Age:</span>
                <span className="ml-2 font-semibold text-earth-900">{selectedDog.age_weeks} weeks</span>
              </div>
              <div>
                <span className="text-earth-600">Size:</span>
                <span className="ml-2 font-semibold text-earth-900">{selectedDog.size}</span>
              </div>
              <div>
                <span className="text-earth-600">Energy Level:</span>
                <span className="ml-2 font-semibold text-earth-900">{selectedDog.energy}</span>
              </div>
              <div>
                <span className="text-earth-600">Friendliness:</span>
                <span className="ml-2 font-semibold text-earth-900">{selectedDog.friendliness}</span>
              </div>
            </div>
          </div>

          {/* Breed Composition Details */}
          {selectedDog.breed_composition && !selectedDog.breed_composition.isPurebred && (
            <div className="mt-6 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-earth-900 mb-3 flex items-center gap-2">
                {getCompositionEmoji(selectedDog.breed_composition)} Breed Composition
              </h3>

              {/* Designer Breed Info */}
              {selectedDog.breed_composition.isDesignerBreed && selectedDog.breed_composition.designerBreedInfo && (
                <div className={`mb-4 p-3 rounded-lg border-2 ${getCompositionColor(selectedDog.breed_composition)}`}>
                  <p className="font-bold text-sm mb-1">
                    {selectedDog.breed_composition.designerBreedInfo.name}
                  </p>
                  <p className="text-xs opacity-80">
                    {selectedDog.breed_composition.designerBreedInfo.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedDog.breed_composition.designerBreedInfo.characteristics.map(char => (
                      <span key={char} className="text-xs px-2 py-1 bg-white/50 rounded">
                        {char}
                      </span>
                    ))}
                  </div>
                  {selectedDog.breed_composition.designerBreedInfo.hybridVigorBonus > 0 && (
                    <p className="text-xs mt-2 font-semibold text-green-700">
                      ⚡ Hybrid Vigor: +{selectedDog.breed_composition.designerBreedInfo.hybridVigorBonus}% stats
                    </p>
                  )}
                </div>
              )}

              {/* Breed Percentages */}
              <div className="space-y-2">
                {getSimplifiedComposition(selectedDog.breed_composition).map(portion => (
                  <div key={portion.breedId} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-earth-900">{portion.breedName}</span>
                        <span className="text-earth-600">{portion.percentage}%</span>
                      </div>
                      <div className="w-full bg-earth-200 rounded-full h-2">
                        <div
                          className="bg-kennel-600 h-2 rounded-full transition-all"
                          style={{ width: `${portion.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Generation Info */}
              {selectedDog.breed_composition.generation && (
                <p className="text-xs text-earth-600 mt-3">
                  Generation: F{selectedDog.breed_composition.generation}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Care Panel */}
        <div>
          {/* Toggle Button */}
          <div className="mb-4">
            <button
              onClick={() => setInteractiveMode(!interactiveMode)}
              className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                interactiveMode
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700'
              }`}
            >
              {interactiveMode ? '🎮 Interactive Mode (Drag & Drop)' : '📋 Switch to Interactive Mode'}
            </button>
          </div>

          {/* Render appropriate panel */}
          {interactiveMode ? <InteractiveCarePanel /> : <DogCarePanel />}
        </div>
      </div>
    </div>
  );
}
