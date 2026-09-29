import { memo, useState, useRef } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { bondingRestriction } from '../../utils/companionLoop';
import { calculateFoodConsumption, getSizeCategoryName } from '../../utils/careCalculations';
import { showToast } from '../../lib/toast';
import RealisticPettingActivity from '../minigames/RealisticPettingActivity';
import RealisticFetchActivity from '../minigames/RealisticFetchActivity';
import RealisticWalkActivity from '../minigames/RealisticWalkActivity';

interface DogCarePanelProps {
  onNavigateToShop: () => void;
}

function DogCarePanel({ onNavigateToShop }: DogCarePanelProps) {
  const { selectedDog, user, feedDog, waterDog, restDog } = useGameStore();
  const activityDogId = useRef<string | null>(null);
  const [activeGame, setActiveGame] = useState<'pet' | 'fetch' | 'walk' | null>(null);

  if (!selectedDog) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <p className="text-earth-600">Select a dog to interact with them</p>
      </div>
    );
  }

  const handleFeed = () => {
    const result = feedDog(selectedDog.id);
    if (result.success) {
      showToast.success(result.message || 'Fed successfully!');
    } else {
      showToast.error(result.message || 'Failed to feed');
    }
  };

  const handleWater = () => {
    const result = waterDog(selectedDog.id);
    if (result.success) {
      showToast.success(result.message || 'Gave water successfully!');
    } else {
      showToast.error(result.message || 'Failed to give water');
    }
  };

  const handleRest = () => {
    const result = restDog(selectedDog.id);
    if (result.success) {
      showToast.success(result.message || 'Rest successful!');
    } else {
      showToast.error(result.message || 'Failed to rest');
    }
  };

  const playWithDog = (activityType: 'pet' | 'fetch' | 'walk') => {
    const reason = bondingRestriction(selectedDog, activityType);
    if (reason) { showToast.error(reason); return; }
    activityDogId.current = selectedDog.id;
    setActiveGame(activityType);
  };
  const handleGameComplete = (activityType: 'pet' | 'fetch' | 'walk') => {
    setActiveGame(null);
    const id = activityDogId.current;
    activityDogId.current = null;
    if (!id) return;
    const result = useGameStore.getState().bondWithDog(id, activityType);
    if (result.success) showToast.success(result.message); else showToast.error(result.message);
  };

  const foodNeeded = calculateFoodConsumption(selectedDog.size);
  const sizeCategory = getSizeCategoryName(selectedDog.size);
  const hasEnoughFood = (user?.food_storage || 0) >= foodNeeded;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-2xl font-bold text-earth-900 mb-4">
        Care for {selectedDog.name}
      </h3>

      {/* Food Storage Display - Click to Shop */}
      {user && (
        <div
          onClick={onNavigateToShop}
          className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg cursor-pointer hover:border-amber-400 hover:shadow-lg transition-all animate-fade-in-up"
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === 'Enter' && onNavigateToShop()}
        >
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-semibold text-amber-900 flex items-center gap-2">
              📦 Food Storage
            </p>
            <p className="text-lg font-bold text-amber-800">
              {(user.food_storage ?? 0).toFixed(1)} / 100 units
            </p>
          </div>
          <div className="w-full bg-amber-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-amber-500 to-orange-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${user.food_storage ?? 0}%` }}
            />
          </div>
          <p className="text-xs text-amber-700 mt-2 flex items-center justify-between">
            <span>💡 Click to buy dog food bags</span>
            <span className="font-semibold">🛒 Go to Shop →</span>
          </p>
        </div>
      )}

      {/* Dog Size Info */}
      <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">{sizeCategory} Dog</span> • Eats{' '}
          <span className="font-bold">{foodNeeded} units</span> per feeding
        </p>
      </div>

      {/* Feeding Section */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-earth-800 mb-3 flex items-center gap-2">
          🍖 Feeding
        </h4>
        <button
          onClick={handleFeed}
          disabled={!hasEnoughFood}
          className={`w-full p-4 border-2 rounded-lg transition-all text-left ${
            hasEnoughFood
              ? 'border-kennel-300 hover:border-kennel-500 hover:bg-kennel-50 cursor-pointer'
              : 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-60'
          }`}
        >
          <p className="font-semibold text-earth-900 flex items-center justify-between">
            Feed from Storage
            {!hasEnoughFood && <span className="text-red-600 text-sm">Not Enough Food!</span>}
          </p>
          <p className="text-sm text-earth-600">
            Uses {foodNeeded} units • Restores hunger & energy
          </p>
          <p className="text-xs text-earth-500 mt-1">
            Size-based consumption • Larger dogs eat more
          </p>
        </button>
      </div>

      {/* Watering Section */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-earth-800 mb-3 flex items-center gap-2">
          💧 Watering
        </h4>
        <button
          onClick={handleWater}
          className="w-full p-4 border-2 border-blue-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
        >
          <p className="font-semibold text-earth-900">Give Water</p>
          <p className="text-sm text-earth-600">Restores thirst</p>
          <p className="text-xs text-green-600 font-semibold mt-1">FREE - Water always available</p>
        </button>
      </div>

      {/* Rest Section */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-earth-800 mb-3 flex items-center gap-2">
          💤 Rest
        </h4>
        <button
          onClick={handleRest}
          className="w-full p-4 border-2 border-indigo-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
        >
          <p className="font-semibold text-earth-900">Let {selectedDog.name} Rest</p>
          <p className="text-sm text-earth-600">Restores energy</p>
          <p className="text-xs text-earth-500 mt-1">Required for training & competition</p>
        </button>
      </div>

      {/* Play Section */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-earth-800 mb-3 flex items-center gap-2">
          🎾 Play & Interact
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => playWithDog('pet')}
            className="p-4 border-2 border-pink-300 rounded-lg hover:border-pink-500 hover:bg-pink-50 transition-all text-left"
          >
            <p className="font-semibold text-earth-900">Pet & Cuddle</p>
            <p className="text-sm text-earth-600">+15 Happiness</p>
            <p className="text-xs text-green-600 font-semibold mt-1">FREE</p>
          </button>

          <button
            onClick={() => playWithDog('fetch')}
            className="p-4 border-2 border-yellow-300 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-all text-left"
          >
            <p className="font-semibold text-earth-900">Play Fetch</p>
            <p className="text-sm text-earth-600">+30 Happy, -20 Energy</p>
            <p className="text-xs text-green-600 font-semibold mt-1">FREE</p>
          </button>

          <button
            onClick={() => playWithDog('walk')}
            className="p-4 border-2 border-green-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left"
          >
            <p className="font-semibold text-earth-900">Go for Walk</p>
            <p className="text-sm text-earth-600">+25 Happy, -25 Energy</p>
            <p className="text-xs text-green-600 font-semibold mt-1">FREE</p>
          </button>
        </div>
      </div>

      {/* Care Tips */}
      <div className="mt-6 p-4 bg-earth-50 border border-earth-200 rounded-lg">
        <h5 className="font-semibold text-earth-900 mb-2">💡 Care Tips</h5>
        <ul className="text-sm text-earth-700 space-y-1">
          <li>• Keep hunger & thirst above 60% for best performance</li>
          <li>• Energy below 30% prevents training</li>
          <li>• Larger dogs consume more food per feeding</li>
          <li>• Buy dog food bags from the shop to refill storage</li>
        </ul>
      </div>

      {/* Realistic Activities */}
      {activeGame === 'pet' && (
        <RealisticPettingActivity
          dog={selectedDog}
          onComplete={() => handleGameComplete('pet')}
          onCancel={() => setActiveGame(null)}
        />
      )}
      {activeGame === 'fetch' && (
        <RealisticFetchActivity
          dog={selectedDog}
          onComplete={() => handleGameComplete('fetch')}
          onCancel={() => setActiveGame(null)}
        />
      )}
      {activeGame === 'walk' && (
        <RealisticWalkActivity
          dog={selectedDog}
          onComplete={() => handleGameComplete('walk')}
          onCancel={() => setActiveGame(null)}
        />
      )}
    </div>
  );
}

export default memo(DogCarePanel);
