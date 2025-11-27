import { useState } from 'react';
import { rescueBreeds } from '../../data/rescueBreeds';
import { useGameStore } from '../../stores/gameStore';
import { generateDog } from '../../utils/dogGenerator';
import { Breed } from '../../types';

const ADOPTION_FEE = 100; // Small fee to adopt from pound

export default function PoundView() {
  const { user, addDog } = useGameStore();
  const [availableDogs, setAvailableDogs] = useState(() => getThreeDogs());

  function getThreeDogs(): Breed[] {
    // Shuffle rescue breeds and pick 3
    const shuffled = [...rescueBreeds].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }

  const handleAdopt = (breed: Breed) => {
    if (!user) return;

    // Check if user has enough cash
    if (user.cash < ADOPTION_FEE) {
      alert(`Not enough cash! Adoption fee is $${ADOPTION_FEE}`);
      return;
    }

    // Ask for gender
    const genderChoice = prompt(
      `Choose gender for your ${breed.name}:\nType "male" or "female"`,
      'male'
    )?.toLowerCase();

    if (!genderChoice || (genderChoice !== 'male' && genderChoice !== 'female')) {
      alert('Invalid gender choice. Please type "male" or "female".');
      return;
    }

    // Ask for dog name
    const dogName = prompt(
      `What would you like to name your ${genderChoice} ${breed.name}?`,
      breed.name
    );
    if (!dogName) return;

    // Generate rescue dog with chosen gender
    const newDog = generateDog(breed, dogName, user.id, true, genderChoice as 'male' | 'female');

    // Add dog and deduct fee
    addDog(newDog);
    useGameStore.getState().updateUserCash(-ADOPTION_FEE);

    alert(`🎉 You adopted ${dogName} (${genderChoice === 'male' ? '♂️ Male' : '♀️ Female'})! Welcome to your kennel.`);

    // Refresh available dogs
    setAvailableDogs(getThreeDogs());
  };

  const handleRefresh = () => {
    setAvailableDogs(getThreeDogs());
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-3xl font-bold text-earth-900 mb-2">Dog Pound</h2>
        <p className="text-earth-600">
          Give a rescue dog a second chance! Adoption fee: ${ADOPTION_FEE}
        </p>
        <p className="text-sm text-earth-500 mt-2">
          ℹ️ Rescue dogs have lower stats but good hearts. They deserve love too!
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-4 mb-6">
        <h3 className="font-bold text-blue-900 mb-2">🏠 About Pound Adoptions</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Rescue dogs start with 60% of breed potential (lower stats)</li>
          <li>• Each dog has a unique rescue story</li>
          <li>• Bond starts at 0 - build trust through care and training</li>
          <li>• Much cheaper than buying from shop ($100 vs $800+)</li>
          <li>• New dogs available each time you refresh</li>
        </ul>
      </div>

      {/* Available Dogs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {availableDogs.map((breed, index) => (
          <div
            key={`${breed.id}-${index}`}
            className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-6 hover:shadow-2xl transition-all transform hover:scale-105"
          >
            {/* Dog Image */}
            {breed.img_sitting && (
              <div className="h-48 mb-4 bg-earth-100 rounded-lg flex items-center justify-center overflow-hidden">
                <img
                  src={breed.img_sitting}
                  alt={breed.name}
                  className="h-full w-full object-contain"
                />
              </div>
            )}

            {/* Dog Info */}
            <h3 className="text-xl font-bold text-earth-900 mb-2">{breed.name}</h3>
            <p className="text-sm text-earth-600 mb-4">{breed.description}</p>

            {/* Stats Preview (60% of breed ranges) */}
            <div className="bg-earth-50 p-3 rounded-lg mb-4 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-earth-600">Speed:</span>
                <span className="font-mono text-earth-900">
                  {Math.round(breed.speed_min * 0.6)}-{Math.round(breed.speed_max * 0.6)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-earth-600">Agility:</span>
                <span className="font-mono text-earth-900">
                  {Math.round(breed.agility_min * 0.6)}-{Math.round(breed.agility_max * 0.6)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-earth-600">Intelligence:</span>
                <span className="font-mono text-earth-900">
                  {Math.round(breed.intelligence_min * 0.6)}-{Math.round(breed.intelligence_max * 0.6)}
                </span>
              </div>
              <p className="text-xs text-earth-500 text-center mt-2">
                (Rescue stats - 60% of breed potential)
              </p>
            </div>

            {/* Adopt Button */}
            <button
              onClick={() => handleAdopt(breed)}
              disabled={!user || user.cash < ADOPTION_FEE}
              className="w-full py-3 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold"
            >
              Adopt for ${ADOPTION_FEE}
            </button>
          </div>
        ))}
      </div>

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={handleRefresh}
          className="px-8 py-3 bg-earth-600 text-white rounded-lg hover:bg-earth-700 transition-all font-bold"
        >
          🔄 See Different Dogs
        </button>
        <p className="text-sm text-earth-500 mt-2">
          Not finding the right match? Refresh to see 3 new rescue dogs
        </p>
      </div>
    </div>
  );
}
