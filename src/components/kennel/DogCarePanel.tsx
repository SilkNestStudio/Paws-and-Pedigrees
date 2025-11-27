import { useGameStore } from '../../stores/gameStore';

export default function DogCarePanel() {
  const { selectedDog, updateDog, updateUserCash } = useGameStore();

  if (!selectedDog) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <p className="text-earth-600">Select a dog to interact with them</p>
      </div>
    );
  }

  const feedDog = (foodType: 'basic' | 'premium' | 'treat') => {
    const foodData = {
      basic: { hunger: 30, happiness: 0, cost: 0, name: 'Basic Kibble' },
      premium: { hunger: 60, happiness: 10, cost: 15, name: 'Premium Food' },
      treat: { hunger: 15, happiness: 20, cost: 5, name: 'Treat' },
    };

    const food = foodData[foodType];
    
    const newHunger = Math.min(100, selectedDog.hunger + food.hunger);
    const newHappiness = Math.min(100, selectedDog.happiness + food.happiness);
    
    updateDog(selectedDog.id, {
      hunger: newHunger,
      happiness: newHappiness,
      last_fed: new Date().toISOString(),
    });
    
    if (food.cost > 0) {
      updateUserCash(-food.cost);
    }
  };

  const playWithDog = (activityType: 'pet' | 'fetch' | 'walk') => {
    const activities = {
      pet: { happiness: 15, energy: 0, cost: 0, name: 'Pet & Cuddle' },
      fetch: { happiness: 30, energy: -20, cost: 0, name: 'Play Fetch' },
      walk: { happiness: 25, energy: -25, cost: 0, name: 'Go for Walk' },
    };

    const activity = activities[activityType];
    
    const newHappiness = Math.min(100, selectedDog.happiness + activity.happiness);
    const newEnergy = Math.max(0, selectedDog.energy_stat + activity.energy);
    
    updateDog(selectedDog.id, {
      happiness: newHappiness,
      energy_stat: newEnergy,
      last_played: new Date().toISOString(),
      bond_xp: selectedDog.bond_xp + 2,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-2xl font-bold text-earth-900 mb-6">
        Care for {selectedDog.name}
      </h3>

      {/* Feeding Section */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-earth-800 mb-3 flex items-center gap-2">
          🍖 Feeding
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => feedDog('basic')}
            className="p-4 border-2 border-earth-300 rounded-lg hover:border-kennel-500 hover:bg-earth-50 transition-all text-left"
          >
            <p className="font-semibold text-earth-900">Basic Kibble</p>
            <p className="text-sm text-earth-600">+30 Hunger</p>
            <p className="text-xs text-green-600 font-semibold mt-1">FREE</p>
          </button>

          <button
            onClick={() => feedDog('premium')}
            className="p-4 border-2 border-earth-300 rounded-lg hover:border-kennel-500 hover:bg-earth-50 transition-all text-left"
          >
            <p className="font-semibold text-earth-900">Premium Food</p>
            <p className="text-sm text-earth-600">+60 Hunger, +10 Happy</p>
            <p className="text-xs text-kennel-700 font-semibold mt-1">$15</p>
          </button>

          <button
            onClick={() => feedDog('treat')}
            className="p-4 border-2 border-earth-300 rounded-lg hover:border-kennel-500 hover:bg-earth-50 transition-all text-left"
          >
            <p className="font-semibold text-earth-900">Treat</p>
            <p className="text-sm text-earth-600">+15 Hunger, +20 Happy</p>
            <p className="text-xs text-kennel-700 font-semibold mt-1">$5</p>
          </button>
        </div>
      </div>

      {/* Playing Section */}
      <div>
        <h4 className="text-lg font-semibold text-earth-800 mb-3 flex items-center gap-2">
          🎾 Activities
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => playWithDog('pet')}
            className="p-4 border-2 border-earth-300 rounded-lg hover:border-kennel-500 hover:bg-earth-50 transition-all text-left"
          >
            <p className="font-semibold text-earth-900">Pet & Cuddle</p>
            <p className="text-sm text-earth-600">+15 Happiness</p>
            <p className="text-xs text-green-600 font-semibold mt-1">FREE</p>
          </button>

          <button
            onClick={() => playWithDog('fetch')}
            disabled={selectedDog.energy_stat < 20}
            className="p-4 border-2 border-earth-300 rounded-lg hover:border-kennel-500 hover:bg-earth-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <p className="font-semibold text-earth-900">Play Fetch</p>
            <p className="text-sm text-earth-600">+30 Happy, -20 Energy</p>
            <p className="text-xs text-green-600 font-semibold mt-1">FREE</p>
          </button>

          <button
            onClick={() => playWithDog('walk')}
            disabled={selectedDog.energy_stat < 25}
            className="p-4 border-2 border-earth-300 rounded-lg hover:border-kennel-500 hover:bg-earth-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <p className="font-semibold text-earth-900">Go for Walk</p>
            <p className="text-sm text-earth-600">+25 Happy, -25 Energy</p>
            <p className="text-xs text-green-600 font-semibold mt-1">FREE</p>
          </button>
        </div>
      </div>

      {/* Bond Progress */}
      <div className="mt-6 p-4 bg-kennel-50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-semibold text-kennel-800">
            Bond Level {selectedDog.bond_level}/10
          </p>
          <p className="text-xs text-kennel-600">
            {selectedDog.bond_xp}/100 XP
          </p>
        </div>
        <div className="w-full bg-kennel-200 rounded-full h-2">
          <div
            className="bg-kennel-600 h-2 rounded-full transition-all"
            style={{ width: `${selectedDog.bond_xp}%` }}
          />
        </div>
      </div>
    </div>
  );
}
