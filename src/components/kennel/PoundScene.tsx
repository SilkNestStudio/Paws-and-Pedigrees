import { useState } from 'react';
import { rescueBreeds } from '../../data/rescueBreeds';
import { Breed } from '../../types';

interface PoundSceneProps {
  onDogSelected: (breed: Breed, name: string) => void;
}

export default function PoundScene({ onDogSelected }: PoundSceneProps) {
  const [selectedDog, setSelectedDog] = useState<Breed | null>(null);
  const [dogName, setDogName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);

  // Always show Staffy in center, plus 2 random others
  const getThreeDogs = () => {
    const staffy = rescueBreeds[0]; // American Staffordshire Terrier
    const others = rescueBreeds.slice(1);
    const shuffled = others.sort(() => 0.5 - Math.random());
    return [shuffled[0], staffy, shuffled[1]];
  };

  const [availableDogs] = useState(getThreeDogs());

  const rescueStories = [
    "Found as a stray, wandering the streets alone.",
    "Owner had to move and couldn't take me.",
    "Rescued from a neglectful situation.",
    "My family lost their home.",
    "Breed restrictions forced my surrender.",
    "Found abandoned in a parking lot.",
    "Previous owner passed away."
  ];

  const handleSelectDog = (breed: Breed) => {
    setSelectedDog(breed);
    setShowNameInput(true);
  };

  const handleAdopt = () => {
    if (selectedDog && dogName.trim()) {
      onDogSelected(selectedDog, dogName.trim());
    }
  };

  if (showNameInput && selectedDog) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-earth-100 to-earth-200 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-3xl font-bold text-earth-800 mb-4 text-center">
            Name Your New Companion
          </h2>
          <p className="text-earth-600 mb-6 text-center">
            You've chosen to rescue a {selectedDog.name}. What will you name them?
          </p>
          <div className="mb-6">
            <input
              type="text"
              value={dogName}
              onChange={(e) => setDogName(e.target.value)}
              placeholder="Enter dog's name..."
              className="w-full px-4 py-3 border-2 border-earth-300 rounded-lg focus:outline-none focus:border-kennel-500 text-lg"
              autoFocus
            />
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setShowNameInput(false)}
              className="flex-1 px-6 py-3 bg-earth-300 text-earth-800 rounded-lg hover:bg-earth-400 transition-colors font-semibold"
            >
              Back
            </button>
            <button
              onClick={handleAdopt}
              disabled={!dogName.trim()}
              className="flex-1 px-6 py-3 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Adopt {dogName.trim() || 'Dog'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-earth-200 to-earth-300 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-2xl text-earth-700 italic mb-2">
            "Every dog deserves a second chance..."
          </p>
          <h1 className="text-4xl font-bold text-earth-900 mb-4">
            The Pound
          </h1>
          <p className="text-lg text-earth-700 max-w-2xl mx-auto">
            Your grandfather's final wish: Save one dog from the local shelter and build a legacy of champions.
          </p>
          <p className="text-earth-600 mt-2">
            You have <span className="font-bold text-kennel-700">$500</span> and one kennel space.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {availableDogs.map((breed, index) => {
            const story = rescueStories[Math.floor(Math.random() * rescueStories.length)];
            const isCenter = index === 1;

            return (
              <div
                key={breed.id}
                className={`bg-white rounded-lg shadow-lg overflow-hidden transition-all hover:shadow-2xl hover:scale-105 cursor-pointer ${
                  isCenter ? 'md:ring-4 md:ring-kennel-500' : ''
                }`}
                onClick={() => handleSelectDog(breed)}
              >
                <div className="h-48 bg-gradient-to-br from-earth-200 to-earth-300 flex items-center justify-center overflow-hidden">
                  {breed.img_sitting ? (
                    <img
                      src={breed.img_sitting}
                      alt={breed.name}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="text-6xl">🐕</div>
                  )}
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-earth-900">
                        {breed.name}
                      </h3>
                      <p className="text-sm text-earth-600">
                        Age: {Math.floor(Math.random() * 6) + 4} months
                      </p>
                    </div>
                  </div>

                  <div className="bg-earth-50 rounded p-3 mb-4">
                    <p className="text-sm text-earth-700 italic">
                      "{story}"
                    </p>
                  </div>

                  <p className="text-sm text-earth-700 mb-4">
                    {breed.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                    <div className="flex justify-between">
                      <span className="text-earth-600">Energy:</span>
                      <span className="font-semibold text-earth-800">
                        {breed.energy_min}-{breed.energy_max}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-earth-600">Friendly:</span>
                      <span className="font-semibold text-earth-800">
                        {breed.friendliness_min}-{breed.friendliness_max}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-earth-600">Smart:</span>
                      <span className="font-semibold text-earth-800">
                        {breed.intelligence_min}-{breed.intelligence_max}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-earth-600">Trainable:</span>
                      <span className="font-semibold text-earth-800">
                        {breed.trainability_min}-{breed.trainability_max}
                      </span>
                    </div>
                  </div>

                  <button className="w-full py-2 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 transition-colors font-semibold">
                    Choose Me
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
