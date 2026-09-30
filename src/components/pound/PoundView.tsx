import { useState } from 'react';
import { rescueBreeds } from '../../data/rescueBreeds';
import { useGameStore } from '../../stores/gameStore';
import { generateDog } from '../../utils/dogGenerator';
import { Breed } from '../../types';
import { showToast } from '../../lib/toast';

const ADOPTION_FEE = 100; // Small fee to adopt from pound

interface PoundDog {
  breed: Breed;
  gender: 'male' | 'female';
}

export default function PoundView() {
  const { user, purchaseBreed } = useGameStore();
  const [availableDogs, setAvailableDogs] = useState(() => getThreeDogs());

  function getThreeDogs(): PoundDog[] {
    // Shuffle rescue breeds and pick 3, assigning random genders
    const shuffled = [...rescueBreeds].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3).map(breed => ({
      breed,
      gender: Math.random() > 0.5 ? 'male' : 'female'
    }));
  }

  const handleAdopt = (poundDog: PoundDog) => {
    if (!user) return;

    // Check if user has enough cash
    if (user.cash < ADOPTION_FEE) {
      showToast.error(`Not enough cash! Adoption fee is $${ADOPTION_FEE}`);
      return;
    }

    const { breed, gender } = poundDog;

    // Ask for dog name
    const dogName = prompt(
      `What would you like to name your ${gender} ${breed.name}?`,
      breed.name
    );
    if (!dogName?.trim()) return;

    // Generate rescue dog with pre-assigned gender
    const newDog = generateDog(breed, dogName.trim().slice(0, 40), user.id, true, gender);

    // Add dog and deduct fee
    const result = purchaseBreed(newDog, ADOPTION_FEE, 0);
    if (!result.success) { showToast.error(result.message ?? "Adoption could not be completed."); return; }

    showToast.success(`🎉 You adopted ${dogName} (${gender === 'male' ? '♂️ Male' : '♀️ Female'})! Welcome to your kennel.`);

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
          ℹ️ Every rescue has potential. Discover their strengths through care and practice.
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-4 mb-6">
        <h3 className="font-bold text-blue-900 mb-2">🏠 About Pound Adoptions</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Rescue dogs keep their breed potential; their talents begin undiscovered</li>
          <li>• Each dog has a unique rescue story</li>
          <li>• Bond starts at 0 - build trust through care and training</li>
          <li>• Much cheaper than buying from shop ($100 vs $800+)</li>
          <li>• New dogs available each time you refresh</li>
        </ul>
      </div>

      {/* Available Dogs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {availableDogs.map((poundDog, index) => (
          <div
            key={`${poundDog.breed.id}-${index}`}
            className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-6 hover:shadow-2xl transition-all transform hover:scale-105"
          >
            {/* Dog Image */}
            {poundDog.breed.img_sitting && (
              <div className="h-48 mb-4 bg-earth-100 rounded-lg flex items-center justify-center overflow-hidden">
                <img
                  src={poundDog.breed.img_sitting}
                  alt={poundDog.breed.name}
                  className="h-full w-full object-contain"
                />
              </div>
            )}

            {/* Dog Info */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-earth-900">{poundDog.breed.name}</h3>
              <span
                className={`text-2xl ${
                  poundDog.gender === 'male' ? 'text-blue-600' : 'text-pink-600'
                }`}
                title={poundDog.gender === 'male' ? 'Male' : 'Female'}
              >
                {poundDog.gender === 'male' ? '♂️' : '♀️'}
              </span>
            </div>
            <p className="text-sm text-earth-600 mb-4">{poundDog.breed.description}</p>

            <div className="bg-earth-50 p-3 rounded-lg mb-4 text-sm text-earth-700">
              Aptitudes undiscovered. Try the Field Club disciplines together to find this dog's place on your team.
            </div>

            {/* Adopt Button */}
            <button
              onClick={() => handleAdopt(poundDog)}
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
