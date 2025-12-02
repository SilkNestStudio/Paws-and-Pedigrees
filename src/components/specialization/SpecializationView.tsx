import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { Dog } from '../../types';
import { SPECIALIZATIONS, getAvailableSpecializations, canSpecialize } from '../../data/specializations';
import { Specialization, SpecializationType } from '../../types/specialization';
import { showToast } from '../../lib/toast';

export default function SpecializationView() {
  const { dogs, selectedDog, user } = useGameStore();
  const [selectedSpec, setSelectedSpec] = useState<Specialization | null>(null);

  if (!selectedDog) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <span className="text-6xl mb-4 block">🎯</span>
        <h2 className="text-2xl font-bold text-earth-900 mb-2">Dog Specializations</h2>
        <p className="text-earth-600">Select a dog to view available specializations</p>
      </div>
    );
  }

  const dog = selectedDog as Dog;

  // Check if dog can specialize
  const eligibleToSpecialize = canSpecialize(user?.level || 1, dog.bond_level);

  // Get available specializations (mock competition wins for now)
  const mockCompWins = {
    agility: 5,
    obedience: 5,
    racing: 3,
    weight_pull: 3,
  };

  const availableSpecs = getAvailableSpecializations(
    dog,
    user?.level || 1,
    dog.bond_level,
    mockCompWins
  );

  const handleSelectSpecialization = (spec: Specialization) => {
    // TODO: Implement specialization selection in game store
    showToast.success(`${dog.name} is now specializing as a ${spec.name}!`);
  };

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 1: return 'from-green-400 to-green-600';
      case 2: return 'from-blue-400 to-blue-600';
      case 3: return 'from-purple-400 to-purple-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getTierBadge = (tier: number) => {
    switch (tier) {
      case 1: return 'Tier I - Foundation';
      case 2: return 'Tier II - Advanced';
      case 3: return 'Tier III - Master';
      default: return 'Unknown';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-4xl">🎯</span>
          <div>
            <h2 className="text-2xl font-bold text-earth-900">Specializations for {dog.name}</h2>
            <p className="text-earth-600">Choose a career path to unlock special bonuses and abilities</p>
          </div>
        </div>

        {/* Current Specialization */}
        {dog.specialization && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border-l-4 border-amber-500">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{SPECIALIZATIONS[dog.specialization.specializationType].icon}</span>
              <div>
                <h3 className="font-bold text-earth-900">
                  Current: {SPECIALIZATIONS[dog.specialization.specializationType].name}
                </h3>
                <p className="text-sm text-earth-600">
                  Tier {dog.specialization.tier} • {dog.specialization.experiencePoints} XP
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Eligibility Warning */}
        {!eligibleToSpecialize && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mt-4">
            <p className="text-red-800 font-semibold">Not Yet Eligible</p>
            <p className="text-sm text-red-600">
              Dogs must be at least level 5 with a bond level of 3 to specialize
            </p>
          </div>
        )}
      </div>

      {/* Available Specializations */}
      {eligibleToSpecialize && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-earth-900 mb-4">Available Specializations</h3>

          {availableSpecs.length === 0 ? (
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-12 text-center">
              <span className="text-6xl mb-4 block">🔒</span>
              <h3 className="text-xl font-bold text-earth-900 mb-2">No Specializations Available</h3>
              <p className="text-earth-600">
                Train your dog and win competitions to unlock specializations!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableSpecs.map(spec => (
                <div
                  key={spec.id}
                  onClick={() => setSelectedSpec(spec)}
                  className={`bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-5 cursor-pointer transition-all hover:shadow-2xl border-2 ${
                    selectedSpec?.id === spec.id ? 'border-kennel-500' : 'border-transparent'
                  }`}
                >
                  {/* Tier Badge */}
                  <div className={`bg-gradient-to-r ${getTierColor(spec.tier)} text-white text-xs px-3 py-1 rounded-full inline-block mb-3 font-bold`}>
                    {getTierBadge(spec.tier)}
                  </div>

                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-4xl">{spec.icon}</span>
                    <div>
                      <h4 className="font-bold text-earth-900 text-lg">{spec.name}</h4>
                      <p className="text-sm text-earth-600">{spec.description}</p>
                    </div>
                  </div>

                  {/* Benefits */}
                  <div className="bg-green-50 rounded-lg p-3 mb-3">
                    <p className="text-xs font-semibold text-green-800 mb-2">Benefits:</p>
                    <div className="space-y-1 text-sm">
                      {spec.benefits.statBonus && (
                        <div className="text-green-700">
                          📊 Stat Bonuses: +{Object.values(spec.benefits.statBonus).reduce((a, b) => a + b, 0)} total stats
                        </div>
                      )}
                      {spec.benefits.trainingMultiplier && (
                        <div className="text-blue-700">
                          🎓 Training: {((spec.benefits.trainingMultiplier - 1) * 100).toFixed(0)}% faster
                        </div>
                      )}
                      {spec.benefits.competitionBonus && (
                        <div className="text-purple-700">
                          🏆 Competition Bonus: Up to {Math.max(...Object.values(spec.benefits.competitionBonus)) * 100}%
                        </div>
                      )}
                      {spec.benefits.specialAbility && (
                        <div className="text-amber-700">
                          ⭐ {spec.benefits.specialAbility}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Requirements */}
                  <div className="bg-earth-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-earth-700 mb-2">Requirements:</p>
                    <div className="space-y-1 text-xs text-earth-600">
                      {spec.requirements.minLevel && (
                        <div>• Level {spec.requirements.minLevel}+</div>
                      )}
                      {spec.requirements.minBondLevel && (
                        <div>• Bond Level {spec.requirements.minBondLevel}+</div>
                      )}
                      {spec.requirements.minStats && (
                        <div>• Specific stat requirements</div>
                      )}
                      {spec.requirements.minCompetitionWins && (
                        <div>• Competition victories required</div>
                      )}
                    </div>
                  </div>

                  {/* Select Button */}
                  {!dog.specialization && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectSpecialization(spec);
                      }}
                      className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-kennel-500 to-kennel-600 text-white rounded-lg hover:from-kennel-600 hover:to-kennel-700 transition-all font-semibold"
                    >
                      Select Specialization
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* All Specializations Info */}
          <div className="mt-8">
            <h3 className="text-xl font-bold text-earth-900 mb-4">All Specializations</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.values(SPECIALIZATIONS).map(spec => (
                <div
                  key={spec.id}
                  className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-earth-200"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{spec.icon}</span>
                    <div>
                      <h5 className="font-bold text-earth-900 text-sm">{spec.name}</h5>
                      <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${getTierColor(spec.tier)} text-white`}>
                        Tier {spec.tier}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-earth-600">{spec.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
