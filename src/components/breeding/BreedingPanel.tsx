import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import {
  checkBreedingEligibility,
  previewGenetics,
} from '../../utils/breedingCalculations';
import { BREEDING_CONSTANTS } from '../../data/breedingConstants';
import HelpButton from '../tutorial/HelpButton';

export default function BreedingPanel() {
  const { dogs, user, updateUserCash, breedDogs } = useGameStore();
  const [selectedDog1, setSelectedDog1] = useState<string | null>(null);
  const [selectedDog2, setSelectedDog2] = useState<string | null>(null);

  const dog1 = dogs.find(d => d.id === selectedDog1);
  const dog2 = dogs.find(d => d.id === selectedDog2);

  // Check eligibility
  const eligibility = dog1 && dog2 && user
    ? checkBreedingEligibility(dog1, dog2, user.cash, dogs)
    : { canBreed: false, reasons: ['Select two dogs'] };

  // Get genetics preview
  const genetics = dog1 && dog2 ? previewGenetics(dog1, dog2, dogs) : null;

  const handleBreed = () => {
    if (!dog1 || !dog2 || !eligibility.canBreed || !user) return;

    // Deduct breeding fee
    updateUserCash(-BREEDING_CONSTANTS.BREEDING_FEE);

    // Calculate litter size
    const litterSize =
      BREEDING_CONSTANTS.LITTER_SIZE_MIN +
      Math.floor(
        Math.random() * (BREEDING_CONSTANTS.LITTER_SIZE_MAX - BREEDING_CONSTANTS.LITTER_SIZE_MIN + 1)
      );

    // Determine which is sire/dam
    const sire = dog1.gender === 'male' ? dog1 : dog2;
    const dam = dog1.gender === 'female' ? dog1 : dog2;

    // Update dogs in store (pregnancy due date is calculated automatically)
    breedDogs(sire.id, dam.id, litterSize);

    // Show success message
    alert(
      `Breeding successful! ${dam.name} is now pregnant with ${litterSize} puppies. They'll be born in ${BREEDING_CONSTANTS.PREGNANCY_DURATION} weeks.`
    );

    // Reset selection
    setSelectedDog1(null);
    setSelectedDog2(null);
  };

  // Filter dogs for selection
  const availableDogs = dogs.filter(d => !d.is_pregnant && d.age_weeks >= BREEDING_CONSTANTS.MIN_BREEDING_AGE);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-2xl font-bold text-earth-900">Breeding Center</h2>
          <HelpButton helpId="breeding-genetics" tooltip="Learn about breeding" />
        </div>
        <p className="text-earth-600">
          Breed your dogs to create puppies with inherited traits. Breeding fee: ${BREEDING_CONSTANTS.BREEDING_FEE}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Parent Selection */}
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-earth-900 mb-4">Select Parents</h3>

          {/* Dog 1 Selection */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-earth-700 mb-2">Parent 1</label>
            <select
              value={selectedDog1 || ''}
              onChange={(e) => setSelectedDog1(e.target.value || null)}
              className="w-full p-3 border-2 border-earth-300 rounded-lg focus:border-kennel-500 focus:outline-none"
            >
              <option value="">Choose a dog...</option>
              {availableDogs.map((dog) => (
                <option key={dog.id} value={dog.id} disabled={dog.id === selectedDog2}>
                  {dog.name} ({dog.gender}, {dog.age_weeks} weeks) - Bond: {dog.bond_level}
                </option>
              ))}
            </select>
          </div>

          {/* Dog 2 Selection */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-earth-700 mb-2">Parent 2</label>
            <select
              value={selectedDog2 || ''}
              onChange={(e) => setSelectedDog2(e.target.value || null)}
              className="w-full p-3 border-2 border-earth-300 rounded-lg focus:border-kennel-500 focus:outline-none"
            >
              <option value="">Choose a dog...</option>
              {availableDogs.map((dog) => (
                <option key={dog.id} value={dog.id} disabled={dog.id === selectedDog1}>
                  {dog.name} ({dog.gender}, {dog.age_weeks} weeks) - Bond: {dog.bond_level}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Dogs Display */}
          {dog1 && (
            <div className="bg-earth-50 p-4 rounded-lg mb-3">
              <p className="font-bold text-earth-900">{dog1.name}</p>
              <p className="text-sm text-earth-600">
                {dog1.gender === 'male' ? '♂️' : '♀️'} {dog1.gender.toUpperCase()} • {dog1.age_weeks} weeks old
              </p>
              <p className="text-xs text-earth-500 mt-1">
                Speed: {dog1.speed} | Agility: {dog1.agility} | Strength: {dog1.strength}
              </p>
            </div>
          )}

          {dog2 && (
            <div className="bg-earth-50 p-4 rounded-lg">
              <p className="font-bold text-earth-900">{dog2.name}</p>
              <p className="text-sm text-earth-600">
                {dog2.gender === 'male' ? '♂️' : '♀️'} {dog2.gender.toUpperCase()} • {dog2.age_weeks} weeks old
              </p>
              <p className="text-xs text-earth-500 mt-1">
                Speed: {dog2.speed} | Agility: {dog2.agility} | Strength: {dog2.strength}
              </p>
            </div>
          )}
        </div>

        {/* Genetics Preview */}
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-earth-900 mb-4">Puppy Preview</h3>

          {genetics ? (
            <div className="space-y-4">
              {/* Stat Ranges */}
              <div>
                <h4 className="font-semibold text-earth-800 mb-2">Expected Stats Range:</h4>
                <div className="space-y-1 text-sm">
                  {Object.entries(genetics.statRanges).map(([stat, range]) => (
                    <div key={stat} className="flex justify-between">
                      <span className="text-earth-600 capitalize">{stat}:</span>
                      <span className="text-earth-900 font-mono">
                        {range.min}-{range.max}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Appearance */}
              <div>
                <h4 className="font-semibold text-earth-800 mb-2">Possible Colors:</h4>
                <div className="flex gap-2 flex-wrap">
                  {genetics.possibleColors.map((color) => (
                    <span
                      key={color}
                      className="px-3 py-1 bg-earth-200 text-earth-800 rounded-full text-sm capitalize"
                    >
                      {color}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-earth-800 mb-2">Possible Patterns:</h4>
                <div className="flex gap-2 flex-wrap">
                  {genetics.possiblePatterns.map((pattern) => (
                    <span
                      key={pattern}
                      className="px-3 py-1 bg-earth-200 text-earth-800 rounded-full text-sm capitalize"
                    >
                      {pattern}
                    </span>
                  ))}
                </div>
              </div>

              {/* Litter Size */}
              <div>
                <h4 className="font-semibold text-earth-800 mb-2">Litter Size:</h4>
                <p className="text-earth-600">
                  {genetics.litterSize.min}-{genetics.litterSize.max} puppies
                </p>
              </div>

              {/* Inbreeding Warning */}
              {genetics.inbreeding && (
                <div className={`p-4 rounded-lg border-2 ${
                  genetics.inbreeding.coefficient > 0.5
                    ? 'bg-red-50 border-red-300'
                    : 'bg-yellow-50 border-yellow-300'
                }`}>
                  <h4 className={`font-semibold mb-2 ${
                    genetics.inbreeding.coefficient > 0.5 ? 'text-red-800' : 'text-yellow-800'
                  }`}>
                    ⚠️ Inbreeding Detected
                  </h4>
                  <p className={`text-sm ${
                    genetics.inbreeding.coefficient > 0.5 ? 'text-red-700' : 'text-yellow-700'
                  }`}>
                    These dogs are {genetics.inbreeding.relationship}
                  </p>
                  <p className={`text-sm ${
                    genetics.inbreeding.coefficient > 0.5 ? 'text-red-700' : 'text-yellow-700'
                  }`}>
                    Coefficient: {(genetics.inbreeding.coefficient * 100).toFixed(1)}%
                  </p>
                  <p className={`text-sm font-semibold mt-1 ${
                    genetics.inbreeding.coefficient > 0.5 ? 'text-red-800' : 'text-yellow-800'
                  }`}>
                    Puppies will have {genetics.inbreeding.penalty}% reduced stats
                  </p>
                </div>
              )}

              {/* Pregnancy Info */}
              <div className="bg-kennel-50 p-4 rounded-lg">
                <h4 className="font-semibold text-kennel-800 mb-2">Breeding Info:</h4>
                <ul className="text-sm text-kennel-700 space-y-1">
                  <li>• Cost: ${BREEDING_CONSTANTS.BREEDING_FEE}</li>
                  <li>• Pregnancy: {BREEDING_CONSTANTS.PREGNANCY_DURATION} weeks</li>
                  <li>• Female cooldown: {BREEDING_CONSTANTS.FEMALE_COOLDOWN} weeks</li>
                  <li>• Male cooldown: {BREEDING_CONSTANTS.MALE_COOLDOWN} weeks</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-earth-400">
              <p>Select two dogs to see puppy preview</p>
            </div>
          )}
        </div>
      </div>

      {/* Eligibility & Breed Button */}
      <div className="mt-6 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6">
        {!eligibility.canBreed && eligibility.reasons.length > 0 && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-semibold text-red-800 mb-2">Cannot Breed:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              {eligibility.reasons.map((reason, i) => (
                <li key={i}>• {reason}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={handleBreed}
          disabled={!eligibility.canBreed}
          className="w-full py-4 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-lg"
        >
          {eligibility.canBreed
            ? `Breed for $${BREEDING_CONSTANTS.BREEDING_FEE}`
            : 'Select Eligible Parents'}
        </button>
      </div>
    </div>
  );
}
