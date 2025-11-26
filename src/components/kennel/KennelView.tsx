import { useGameStore } from '../../stores/gameStore';
import { rescueBreeds } from '../../data/rescueBreeds';

export default function KennelView() {
  const { user, dogs, selectedDog, selectDog } = useGameStore();

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
        <div>
          <h2 className="text-2xl font-bold text-earth-900">Your Kennel</h2>
          <p className="text-earth-600">Level {user?.kennel_level} • {dogs.length}/{user?.kennel_level === 1 ? 1 : user?.kennel_level === 2 ? 2 : 4} dogs</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-earth-600">Cash</p>
          <p className="text-2xl font-bold text-kennel-700">${user?.cash}</p>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {dogs.map((dog) => {
        const breedData = rescueBreeds.find(b => b.id === dog.breed_id);
        
        return (
          <div
            key={dog.id}
            onClick={() => selectDog(dog)}
            className={`relative bg-white/95 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden cursor-pointer transition-all hover:shadow-2xl hover:scale-[1.02] ${
              selectedDog?.id === dog.id ? 'ring-4 ring-kennel-500' : ''
            }`}
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
                  src={breedData?.img_sitting || ''} 
                  alt={dog.name}
                  className="w-full h-full object-contain drop-shadow-lg"
                />
              </div>

              {/* Status Indicators */}
              <div className="absolute top-3 right-3 flex flex-col gap-2">
                {dog.hunger < 30 && (
                  <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                    🍖 Hungry!
                  </div>
                )}
                {dog.happiness < 30 && (
                  <div className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                    😢 Sad
                  </div>
                )}
                {dog.energy_stat < 20 && (
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
                  <p className="text-xs text-kennel-600">{dog.bond_xp}/100 XP</p>
                </div>
                <div className="w-full bg-kennel-200 rounded-full h-1.5 mt-1">
                  <div
                    className="bg-kennel-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${dog.bond_xp}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>

    {selectedDog && (
      <div className="mt-6 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-earth-900 mb-4">{selectedDog.name}'s Performance Stats</h3>
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

        {selectedDog.is_rescue && selectedDog.rescue_story && (
          <div className="mt-4 p-4 bg-kennel-50 rounded-lg border-l-4 border-kennel-500">
            <p className="text-xs font-semibold text-kennel-800 mb-1">Rescue Story:</p>
            <p className="text-sm text-earth-700 italic">"{selectedDog.rescue_story}"</p>
          </div>
        )}
      </div>
    )}
  </div>
);
}