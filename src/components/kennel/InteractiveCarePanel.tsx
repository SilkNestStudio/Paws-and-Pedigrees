import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { calculateFoodConsumption, getSizeCategoryName } from '../../utils/careCalculations';
import { checkBondLevelUp, calculateBondXpGain } from '../../utils/bondSystem';
import { getHealthStatus, VET_COST, EMERGENCY_VET_COST, REVIVAL_GEM_COST } from '../../utils/healthDecay';
import RealisticPettingActivity from '../minigames/RealisticPettingActivity';
import RealisticFetchActivity from '../minigames/RealisticFetchActivity';
import RealisticWalkActivity from '../minigames/RealisticWalkActivity';

type DragItem = 'bowl' | 'water-bowl' | null;
type DropZone = 'spigot' | 'food-bin' | 'dog' | null;

interface Position {
  x: number;
  y: number;
}

interface InteractiveCarePanelProps {
  onNavigateToShop: () => void;
}

export default function InteractiveCarePanel({ onNavigateToShop }: InteractiveCarePanelProps) {
  const { selectedDog, user, feedDog, waterDog, updateDog, takeToVet, takeToEmergencyVet, reviveDeadDog } = useGameStore();
  const [activeGame, setActiveGame] = useState<'pet' | 'fetch' | 'walk' | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragItem, setDragItem] = useState<DragItem>(null);
  const [dragPosition, setDragPosition] = useState<Position>({ x: 0, y: 0 });
  const [bowlFilled, setBowlFilled] = useState(false);
  const [activeDropZone, setActiveDropZone] = useState<DropZone>(null);

  // Refs for drop zones
  const spigotRef = useRef<HTMLDivElement>(null);
  const foodBinRef = useRef<HTMLDivElement>(null);
  const dogRef = useRef<HTMLDivElement>(null);

  if (!selectedDog) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <p className="text-earth-600">Select a dog to interact with them</p>
      </div>
    );
  }

  const foodNeeded = calculateFoodConsumption(selectedDog.size);
  const sizeCategory = getSizeCategoryName(selectedDog.size);
  const hasEnoughFood = (user?.food_storage || 0) >= foodNeeded;

  const handleMouseDown = (item: DragItem) => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragItem(item);
    setBowlFilled(false);
    setDragPosition({ x: e.clientX, y: e.clientY });
  };

  const handleTouchStart = (item: DragItem) => (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    setIsDragging(true);
    setDragItem(item);
    setBowlFilled(false);
    setDragPosition({ x: touch.clientX, y: touch.clientY });
  };

  const checkDropZones = (clientX: number, clientY: number) => {
    const dropZones = [
      { ref: spigotRef, zone: 'spigot' as DropZone, validItems: ['water-bowl'] },
      { ref: foodBinRef, zone: 'food-bin' as DropZone, validItems: ['bowl'] },
      { ref: dogRef, zone: 'dog' as DropZone, validItems: ['bowl', 'water-bowl'] },
    ];

    let foundZone = false;
    for (const { ref, zone, validItems } of dropZones) {
      if (ref.current && dragItem && validItems.includes(dragItem)) {
        const rect = ref.current.getBoundingClientRect();
        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          setActiveDropZone(zone);
          foundZone = true;
          break;
        }
      }
    }
    if (!foundZone) {
      setActiveDropZone(null);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setDragPosition({ x: e.clientX, y: e.clientY });
    checkDropZones(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    setDragPosition({ x: touch.clientX, y: touch.clientY });
    checkDropZones(touch.clientX, touch.clientY);
  };

  const handleMouseUp = () => {
    if (!isDragging || !dragItem) {
      setIsDragging(false);
      return;
    }

    // Handle dropping
    if (activeDropZone === 'spigot' && dragItem === 'water-bowl') {
      // Fill water bowl
      setBowlFilled(true);
      setMessage({ text: '💧 Bowl filled with fresh water!', type: 'success' });
      setTimeout(() => setMessage(null), 2000);
    } else if (activeDropZone === 'food-bin' && dragItem === 'bowl') {
      // Fill food bowl
      if (hasEnoughFood) {
        setBowlFilled(true);
        setMessage({ text: '🍖 Bowl filled with food!', type: 'success' });
        setTimeout(() => setMessage(null), 2000);
      } else {
        setMessage({ text: 'Not enough food in storage! Buy dog food from the shop.', type: 'error' });
        setTimeout(() => setMessage(null), 3000);
      }
    } else if (activeDropZone === 'dog' && bowlFilled) {
      // Give to dog
      if (dragItem === 'water-bowl') {
        const result = waterDog(selectedDog.id);
        setMessage({ text: result.message || 'Unknown error', type: result.success ? 'success' : 'error' });
      } else if (dragItem === 'bowl') {
        const result = feedDog(selectedDog.id);
        setMessage({ text: result.message || 'Unknown error', type: result.success ? 'success' : 'error' });
      }
      setTimeout(() => setMessage(null), 3000);
      setBowlFilled(false);
    }

    setIsDragging(false);
    setDragItem(null);
    setActiveDropZone(null);
  };

  const handleTouchEnd = () => {
    handleMouseUp(); // Reuse the same logic
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, activeDropZone, bowlFilled, dragItem]);

  const playWithDog = (activityType: 'pet' | 'fetch' | 'walk') => {
    // Check last interaction time for this specific activity (1 hour cooldown per activity)
    const lastPlayedTime = selectedDog.last_played ? new Date(selectedDog.last_played).getTime() : 0;
    const now = Date.now();
    const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour in milliseconds

    if (now - lastPlayedTime < COOLDOWN_MS) {
      const remainingMs = COOLDOWN_MS - (now - lastPlayedTime);
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
      setMessage({
        text: `${selectedDog.name} needs rest! Please wait ${remainingMinutes} minutes before playing again`,
        type: 'error',
      });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    // Launch the appropriate mini-game
    setActiveGame(activityType);
  };

  const handleGameComplete = (activityType: 'pet' | 'fetch' | 'walk') => {
    setActiveGame(null);

    const activities = {
      pet: { happiness: 15, energy: 0, cost: 0, name: 'Pet & Cuddle' },
      fetch: { happiness: 30, energy: -20, cost: 0, name: 'Play Fetch' },
      walk: { happiness: 25, energy: -25, cost: 0, name: 'Go for Walk' },
    };

    const activity = activities[activityType];
    const newHappiness = Math.min(100, selectedDog.happiness + activity.happiness);
    const newEnergy = Math.max(0, selectedDog.energy_stat + activity.energy);

    // Calculate bond XP gain (more XP now that requirements are higher)
    // Base XP: pet=10, fetch=15, walk=20
    const baseXpMap = { pet: 10, fetch: 15, walk: 20 };
    const bondXpGain = calculateBondXpGain(baseXpMap[activityType], selectedDog.is_rescue || false);
    const newBondXp = selectedDog.bond_xp + bondXpGain;

    const updates: any = {
      happiness: newHappiness,
      energy_stat: newEnergy,
      last_played: new Date().toISOString(),
      bond_xp: newBondXp,
    };

    const bondLevelUp = checkBondLevelUp({ ...selectedDog, bond_xp: newBondXp });
    if (bondLevelUp) {
      Object.assign(updates, bondLevelUp);
    }

    updateDog(selectedDog.id, updates);

    setMessage({
      text: `${activity.name} with ${selectedDog.name}! +${activity.happiness} happiness, +${bondXpGain} bond`,
      type: 'success',
    });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 relative">
      <h3 className="text-2xl font-bold text-earth-900 mb-4">
        Interactive Care for {selectedDog.name}
      </h3>

      {/* Food Storage Display - Click to Shop */}
      {user && (
        <div
          onClick={onNavigateToShop}
          className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg cursor-pointer hover:border-amber-400 hover:shadow-lg transition-all"
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
              className="bg-gradient-to-r from-amber-500 to-orange-500 h-3 rounded-full transition-all"
              style={{ width: `${user.food_storage ?? 0}%` }}
            />
          </div>
          <p className="text-xs text-amber-700 mt-2 flex items-center justify-between">
            <span>💡 Click to buy dog food bags</span>
            <span className="font-semibold">🛒 Go to Shop →</span>
          </p>
        </div>
      )}

      {/* Message Display */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-lg border-2 ${
            message.type === 'success'
              ? 'bg-green-50 border-green-300 text-green-800'
              : 'bg-red-50 border-red-300 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Instructions */}
      <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900 font-semibold mb-1">🎮 How to Play:</p>
        <p className="text-xs text-blue-800">
          1. Drag the <strong>water bowl 💧</strong> to the spigot to fill it<br/>
          2. Drag the <strong>food bowl 🍖</strong> to the food bin to fill it<br/>
          3. Drag the <strong>filled bowl</strong> to {selectedDog.name} to give them food/water!
        </p>
      </div>

      {/* Interactive Area */}
      <div className="relative min-h-[400px] bg-gradient-to-b from-earth-50 to-earth-100 rounded-lg p-6 mb-6 border-2 border-earth-200">

        {/* Spigot */}
        <div
          ref={spigotRef}
          className={`absolute top-4 right-4 w-20 h-20 transition-all ${
            activeDropZone === 'spigot' ? 'scale-110 ring-4 ring-blue-400' : ''
          }`}
        >
          <div className="text-6xl">🚰</div>
          <p className="text-xs text-center text-earth-700 font-semibold">Spigot</p>
        </div>

        {/* Food Bin */}
        <div
          ref={foodBinRef}
          className={`absolute top-4 left-4 w-24 h-24 transition-all ${
            activeDropZone === 'food-bin' ? 'scale-110 ring-4 ring-amber-400' : ''
          }`}
        >
          <div className="text-7xl">📦</div>
          <p className="text-xs text-center text-earth-700 font-semibold">Food Bin</p>
          <p className="text-xs text-center text-earth-600">{(user?.food_storage ?? 0).toFixed(1)} units</p>
        </div>

        {/* Dog Area */}
        <div
          ref={dogRef}
          className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 w-40 h-40 transition-all ${
            activeDropZone === 'dog' && bowlFilled ? 'scale-110 ring-4 ring-green-400' : ''
          }`}
        >
          <div className="text-8xl mb-2 animate-bounce">🐕</div>
          <p className="text-sm text-center text-earth-900 font-bold">{selectedDog.name}</p>
          <p className="text-xs text-center text-earth-600">{sizeCategory} Dog</p>
        </div>

        {/* Bowls at bottom */}
        {!isDragging && (
          <div className="absolute bottom-4 right-4 flex gap-4">
            {/* Water Bowl */}
            <div
              onMouseDown={handleMouseDown('water-bowl')}
              onTouchStart={handleTouchStart('water-bowl')}
              className="cursor-grab active:cursor-grabbing p-3 bg-white rounded-lg border-2 border-blue-300 hover:border-blue-500 hover:scale-105 transition-all shadow-lg"
              title="Drag to spigot to fill with water"
            >
              <div className="text-5xl">🥣</div>
              <p className="text-xs text-center text-blue-700 font-semibold mt-1">Water Bowl</p>
            </div>

            {/* Food Bowl */}
            <div
              onMouseDown={handleMouseDown('bowl')}
              onTouchStart={handleTouchStart('bowl')}
              className="cursor-grab active:cursor-grabbing p-3 bg-white rounded-lg border-2 border-amber-300 hover:border-amber-500 hover:scale-105 transition-all shadow-lg"
              title="Drag to food bin to fill with food"
            >
              <div className="text-5xl">🍽️</div>
              <p className="text-xs text-center text-amber-700 font-semibold mt-1">Food Bowl</p>
            </div>
          </div>
        )}

        {/* Dragging Bowl */}
        {isDragging && dragItem && (
          <div
            className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: dragPosition.x, top: dragPosition.y }}
          >
            <div className={`text-6xl ${bowlFilled ? 'animate-bounce' : ''}`}>
              {dragItem === 'water-bowl' ? (bowlFilled ? '💧' : '🥣') : (bowlFilled ? '🍲' : '🍽️')}
            </div>
          </div>
        )}

        {/* Hint when bowl is filled */}
        {bowlFilled && isDragging && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
              <p className="text-sm font-bold">Now drag to {selectedDog.name}! 🐕</p>
            </div>
          </div>
        )}
      </div>

      {/* Rest Section */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-earth-800 mb-3 flex items-center gap-2">
          💤 Rest & Play
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => {
              const result = useGameStore.getState().restDog(selectedDog.id);
              setMessage({ text: result.message || 'Unknown error', type: result.success ? 'success' : 'error' });
              setTimeout(() => setMessage(null), 3000);
            }}
            className="p-3 border-2 border-indigo-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
          >
            <p className="font-semibold text-earth-900">Rest</p>
            <p className="text-xs text-earth-600">+30 Energy</p>
          </button>

          <button
            onClick={() => playWithDog('pet')}
            className="p-3 border-2 border-pink-300 rounded-lg hover:border-pink-500 hover:bg-pink-50 transition-all text-left"
          >
            <p className="font-semibold text-earth-900">Pet</p>
            <p className="text-xs text-earth-600">+15 Happy</p>
          </button>

          <button
            onClick={() => playWithDog('fetch')}
            className="p-3 border-2 border-yellow-300 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-all text-left"
          >
            <p className="font-semibold text-earth-900">Fetch</p>
            <p className="text-xs text-earth-600">+30 Happy, -20 Energy</p>
          </button>

          <button
            onClick={() => playWithDog('walk')}
            className="p-3 border-2 border-green-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left"
          >
            <p className="font-semibold text-earth-900">Walk</p>
            <p className="text-xs text-earth-600">+25 Happy, -25 Energy</p>
          </button>
        </div>
      </div>

      {/* Health & Vet Section */}
      {(() => {
        const healthStatus = getHealthStatus(selectedDog);

        return (
          <div className="mb-6">
            {/* Health Warning */}
            {healthStatus.warningMessage && (
              <div className={`mb-4 p-4 rounded-lg border-2 ${
                healthStatus.status === 'dead' ? 'bg-black/10 border-black' :
                healthStatus.status === 'emergency' ? 'bg-red-50 border-red-500' :
                healthStatus.status === 'critical' ? 'bg-orange-50 border-orange-500' :
                'bg-yellow-50 border-yellow-500'
              }`}>
                <p className={`font-bold ${
                  healthStatus.status === 'dead' ? 'text-black' :
                  healthStatus.status === 'emergency' ? 'text-red-800' :
                  healthStatus.status === 'critical' ? 'text-orange-800' :
                  'text-yellow-800'
                }`}>
                  {healthStatus.warningMessage}
                </p>
                {healthStatus.daysWithoutCare > 0 && (
                  <p className="text-sm text-gray-700 mt-1">
                    Days without care: {healthStatus.daysWithoutCare}
                  </p>
                )}
              </div>
            )}

            {/* Vet Actions */}
            {(healthStatus.needsVet || healthStatus.needsEmergencyVet || healthStatus.isDead) && (
              <div>
                <h4 className="text-lg font-semibold text-earth-800 mb-3 flex items-center gap-2">
                  🏥 Veterinary Care
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Regular Vet */}
                  {healthStatus.needsVet && !healthStatus.needsEmergencyVet && !healthStatus.isDead && (
                    <button
                      onClick={() => {
                        const result = takeToVet(selectedDog.id);
                        setMessage({ text: result.message || 'Unknown error', type: result.success ? 'success' : 'error' });
                        setTimeout(() => setMessage(null), 4000);
                      }}
                      disabled={!user || user.cash < VET_COST}
                      className="p-4 border-2 border-orange-400 rounded-lg hover:border-orange-600 hover:bg-orange-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <p className="font-semibold text-earth-900 flex items-center gap-2">
                        🏥 Visit Vet
                      </p>
                      <p className="text-xs text-earth-600 mt-1">Restore health to 100%</p>
                      <p className="text-sm font-bold text-orange-700 mt-2">${VET_COST}</p>
                      {user && user.cash < VET_COST && (
                        <p className="text-xs text-red-600 mt-1">Not enough cash!</p>
                      )}
                    </button>
                  )}

                  {/* Emergency Vet */}
                  {healthStatus.needsEmergencyVet && !healthStatus.isDead && (
                    <button
                      onClick={() => {
                        const result = takeToEmergencyVet(selectedDog.id);
                        setMessage({ text: result.message || 'Unknown error', type: result.success ? 'success' : 'error' });
                        setTimeout(() => setMessage(null), 4000);
                      }}
                      disabled={!user || user.cash < EMERGENCY_VET_COST}
                      className="p-4 border-2 border-red-500 rounded-lg hover:border-red-700 hover:bg-red-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed animate-pulse"
                    >
                      <p className="font-semibold text-earth-900 flex items-center gap-2">
                        🚨 Emergency Vet
                      </p>
                      <p className="text-xs text-earth-600 mt-1">Restore health (reduces stats by 5)</p>
                      <p className="text-sm font-bold text-red-700 mt-2">${EMERGENCY_VET_COST}</p>
                      {user && user.cash < EMERGENCY_VET_COST && (
                        <p className="text-xs text-red-600 mt-1">Not enough cash!</p>
                      )}
                    </button>
                  )}

                  {/* Revival */}
                  {healthStatus.isDead && healthStatus.canRevive && (
                    <button
                      onClick={() => {
                        const result = reviveDeadDog(selectedDog.id);
                        setMessage({ text: result.message || 'Unknown error', type: result.success ? 'success' : 'error' });
                        setTimeout(() => setMessage(null), 4000);
                      }}
                      disabled={!user || user.gems < REVIVAL_GEM_COST}
                      className="p-4 border-2 border-purple-500 rounded-lg hover:border-purple-700 hover:bg-purple-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed animate-pulse"
                    >
                      <p className="font-semibold text-earth-900 flex items-center gap-2">
                        ✨ Revive Dog
                      </p>
                      <p className="text-xs text-earth-600 mt-1">Bring back to 50% health (reduces stats)</p>
                      <p className="text-sm font-bold text-purple-700 mt-2">{REVIVAL_GEM_COST} 💎 Gems</p>
                      {user && user.gems < REVIVAL_GEM_COST && (
                        <p className="text-xs text-red-600 mt-1">Not enough gems!</p>
                      )}
                    </button>
                  )}

                  {/* Cannot Revive */}
                  {healthStatus.isDead && !healthStatus.canRevive && (
                    <div className="p-4 border-2 border-gray-400 rounded-lg bg-gray-50 text-left opacity-50">
                      <p className="font-semibold text-gray-900 flex items-center gap-2">
                        💀 Cannot Revive
                      </p>
                      <p className="text-xs text-gray-600 mt-1">Too much time has passed</p>
                      <p className="text-sm font-bold text-gray-700 mt-2">Adopt a new dog</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Care Tips */}
      <div className="p-4 bg-earth-50 border border-earth-200 rounded-lg">
        <h5 className="font-semibold text-earth-900 mb-2">💡 Care Tips</h5>
        <ul className="text-sm text-earth-700 space-y-1">
          <li>• Drag the water bowl to the spigot to fill it with water</li>
          <li>• Drag the food bowl to the food bin to fill it with food</li>
          <li>• {sizeCategory} dogs eat {foodNeeded} units per feeding</li>
          <li>• Buy dog food bags from the shop to refill storage</li>
          <li>• Keep hunger & thirst above 60% for best performance</li>
          <li>• <strong>Feed and water daily to prevent health decay!</strong></li>
          <li>• Dogs lose 10% health per day without care</li>
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
