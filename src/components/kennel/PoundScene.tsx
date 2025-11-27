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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="inline-block mb-4 px-6 py-2 bg-gradient-to-r from-green-400 to-green-500 text-white rounded-full shadow-md">
              <p className="font-bold">🎉 Almost There!</p>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
              Name Your New Champion
            </h2>
            <p className="text-lg text-slate-600">
              You've chosen to rescue a <span className="font-bold text-kennel-600">{selectedDog.name}</span>.
            </p>
            <p className="text-slate-600 mt-2">
              What will you name your future champion?
            </p>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Dog's Name
            </label>
            <input
              type="text"
              value={dogName}
              onChange={(e) => setDogName(e.target.value)}
              placeholder="Enter a name..."
              className="w-full px-6 py-4 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-kennel-500 focus:ring-4 focus:ring-kennel-100 text-lg transition-all"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && dogName.trim()) {
                  handleAdopt();
                }
              }}
            />
            {dogName.trim() && (
              <p className="mt-2 text-sm text-green-600 font-medium">
                ✓ Great name for a champion!
              </p>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setShowNameInput(false)}
              className="flex-1 px-6 py-4 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-all font-semibold"
            >
              ← Back
            </button>
            <button
              onClick={handleAdopt}
              disabled={!dogName.trim()}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-kennel-600 to-kennel-700 text-white rounded-xl hover:from-kennel-700 hover:to-kennel-800 transition-all font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg transform hover:scale-105 disabled:hover:scale-100"
            >
              🏠 Adopt {dogName.trim() || 'Dog'}
            </button>
          </div>

          <div className="mt-8 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 rounded-lg">
            <p className="text-sm text-slate-700 italic">
              "Every great champion starts with someone who believes in them. Today, that someone is you."
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-block mb-4 px-6 py-2 bg-white rounded-full shadow-md">
            <p className="text-kennel-600 font-semibold">🏠 Second Chance Rescue Center</p>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
            Choose Your First Champion
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            These three dogs are waiting for someone to believe in them.
            <span className="block mt-2 text-kennel-600 font-semibold">
              Which one will you give a second chance?
            </span>
          </p>
          <div className="mt-4 inline-block bg-green-100 border-2 border-green-300 rounded-lg px-6 py-3">
            <p className="text-green-800 font-bold">
              💰 Starting Budget: <span className="text-2xl">${500}</span>
            </p>
            <p className="text-green-700 text-sm mt-1">All adoption fees waived for rescue dogs</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {availableDogs.map((breed, index) => {
            const story = rescueStories[Math.floor(Math.random() * rescueStories.length)];
            const isCenter = index === 1;
            const age = Math.floor(Math.random() * 6) + 4;

            return (
              <div
                key={breed.id}
                className={`bg-white rounded-xl shadow-xl overflow-hidden transition-all hover:shadow-2xl hover:scale-105 cursor-pointer relative group ${
                  isCenter ? 'md:ring-4 md:ring-kennel-500 md:scale-105' : ''
                }`}
                onClick={() => handleSelectDog(breed)}
              >
                {isCenter && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                      ⭐ Recommended
                    </div>
                  </div>
                )}

                <div className="h-56 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center overflow-hidden relative">
                  {breed.img_sitting ? (
                    <img
                      src={breed.img_sitting}
                      alt={breed.name}
                      className="h-full w-full object-contain transform group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-8xl transform group-hover:scale-110 transition-transform duration-300">🐕</div>
                  )}
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
                    <p className="text-xs font-bold text-slate-700">{age} months old</p>
                  </div>
                </div>

                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="text-2xl font-bold text-slate-800 mb-1">
                      {breed.name}
                    </h3>
                    <p className="text-sm text-kennel-600 font-semibold">Rescue Dog</p>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-l-4 border-amber-400 rounded-lg p-4 mb-4">
                    <p className="text-xs text-amber-600 font-semibold mb-1">Their Story</p>
                    <p className="text-sm text-slate-700 italic leading-relaxed">
                      "{story}"
                    </p>
                  </div>

                  <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                    {breed.description}
                  </p>

                  {/* Stats with visual bars */}
                  <div className="space-y-2 mb-5">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600 font-medium">Energy</span>
                        <span className="text-slate-700 font-bold">{breed.energy_min}-{breed.energy_max}</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full"
                          style={{ width: `${((breed.energy_min + breed.energy_max) / 2)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600 font-medium">Intelligence</span>
                        <span className="text-slate-700 font-bold">{breed.intelligence_min}-{breed.intelligence_max}</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"
                          style={{ width: `${((breed.intelligence_min + breed.intelligence_max) / 2)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600 font-medium">Trainability</span>
                        <span className="text-slate-700 font-bold">{breed.trainability_min}-{breed.trainability_max}</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-400 to-purple-500 rounded-full"
                          style={{ width: `${((breed.trainability_min + breed.trainability_max) / 2)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <button className="w-full py-3 bg-gradient-to-r from-kennel-600 to-kennel-700 text-white rounded-lg hover:from-kennel-700 hover:to-kennel-800 transition-all font-bold shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                    🏠 Give Me a Home
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
