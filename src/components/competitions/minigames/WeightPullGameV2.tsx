import { useState, useEffect, useRef } from 'react';
import type { Dog } from '../../../types';

interface WeightPullGameV2Props {
  dog: Dog;
  onComplete: (score: number) => void;
}

interface BreedModifiers {
  maxWeight: number; // Maximum weight the dog can pull
  stamina: number; // Total pulls available
  powerWindow: number; // Perfect timing window size (px)
  recoveryTime: number; // Time between pulls (ms)
}

const getBreedModifiers = (dog: Dog): BreedModifiers => {
  const strength = dog.strength + (dog.strength_trained || 0);
  const endurance = dog.endurance + (dog.endurance_trained || 0);

  return {
    maxWeight: 500 + (strength * 10), // 500-1500 lbs
    stamina: Math.min(12, 6 + Math.floor(endurance / 20)), // 6-12 pulls
    powerWindow: Math.max(15, 25 - (strength / 10)), // 15-25px perfect zone (reduced for difficulty)
    recoveryTime: Math.max(800, 1500 - (endurance * 5)), // 0.8-1.5s recovery
  };
};

type PullResult = 'perfect' | 'good' | 'weak' | 'miss';

interface PullHistory {
  result: PullResult;
  power: number;
}

export default function WeightPullGameV2({ dog, onComplete }: WeightPullGameV2Props) {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'finished'>('ready');
  const [currentWeight, setCurrentWeight] = useState(0);
  const [pullsRemaining, setPullsRemaining] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const [currentPull, setCurrentPull] = useState(0);
  const [markerPosition, setMarkerPosition] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [canPull, setCanPull] = useState(false);
  const [pullHistory, setPullHistory] = useState<PullHistory[]>([]);
  const [feedback, setFeedback] = useState<{ result: PullResult; power: number } | null>(null);

  const animationRef = useRef<number>();
  const modifiers = getBreedModifiers(dog);

  const TARGET_POSITION = 50; // Center of the power meter (%)

  // Marker animation
  useEffect(() => {
    if (!isMoving || !canPull) return;

    let direction = 1;
    let position = markerPosition;
    const speed = 0.8; // Speed of marker movement

    const animate = () => {
      position += direction * speed;

      // Bounce at edges
      if (position >= 100) {
        position = 100;
        direction = -1;
      } else if (position <= 0) {
        position = 0;
        direction = 1;
      }

      setMarkerPosition(position);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isMoving, canPull]);

  const startPull = () => {
    setIsMoving(true);
    setCanPull(true);
    setMarkerPosition(50);
  };

  const executePull = () => {
    if (!canPull) return;

    setCanPull(false);
    setIsMoving(false);

    // Calculate power based on how close to target
    const distance = Math.abs(markerPosition - TARGET_POSITION);
    let result: PullResult;
    let power: number;

    if (distance <= modifiers.powerWindow / 2) {
      // Perfect
      result = 'perfect';
      power = 100;
    } else if (distance <= modifiers.powerWindow) {
      // Good
      result = 'good';
      power = 70 + (30 * (1 - distance / modifiers.powerWindow));
    } else if (distance <= modifiers.powerWindow * 2) {
      // Weak
      result = 'weak';
      power = 30 + (40 * (1 - distance / (modifiers.powerWindow * 2)));
    } else {
      // Miss
      result = 'miss';
      power = 10;
    }

    // Calculate distance pulled
    const weightFactor = 1 - (currentWeight / modifiers.maxWeight);
    const distancePulled = (power / 100) * 10 * (1 + weightFactor); // 0-20 feet

    setTotalDistance(prev => prev + distancePulled);
    setPullHistory(prev => [...prev, { result, power }]);
    setFeedback({ result, power });

    setTimeout(() => {
      setFeedback(null);
      const newPullsRemaining = pullsRemaining - 1;
      setPullsRemaining(newPullsRemaining);

      if (newPullsRemaining > 0) {
        // Next pull
        setTimeout(() => {
          setCurrentPull(prev => prev + 1);
          startPull();
        }, modifiers.recoveryTime);
      } else {
        // Round complete - finish game (simplified to not reset)
        finishGame();
      }
    }, 1000);
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      executePull();
    }
  };

  useEffect(() => {
    if (gameState === 'playing' && canPull) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [gameState, canPull]);

  const startGame = () => {
    setGameState('playing');
    setCurrentWeight(200); // Start at 200 lbs
    setPullsRemaining(modifiers.stamina);
    setTotalDistance(0);
    setCurrentPull(0);
    setPullHistory([]);
    setFeedback(null);
    startPull();
  };

  const finishGame = () => {
    setGameState('finished');

    // Calculate final score
    const baseScore = Math.floor(totalDistance * 10);
    const weightBonus = Math.floor((currentWeight / modifiers.maxWeight) * 500);
    const perfectCount = pullHistory.filter(p => p.result === 'perfect').length;
    const perfectBonus = perfectCount * 50;
    const finalScore = baseScore + weightBonus + perfectBonus;

    setTimeout(() => onComplete(finalScore), 100);
  };

  const getPullResultDisplay = (result: PullResult) => {
    switch (result) {
      case 'perfect':
        return { text: '★ PERFECT', color: 'text-green-500' };
      case 'good':
        return { text: '✓ GOOD', color: 'text-blue-500' };
      case 'weak':
        return { text: '~ WEAK', color: 'text-orange-500' };
      case 'miss':
        return { text: '✗ MISS', color: 'text-red-500' };
    }
  };

  return (
    <div className="bg-gradient-to-b from-orange-50 to-red-50 rounded-lg p-6 min-h-[600px]">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-earth-900 mb-2">💪 Weight Pull Competition</h2>
        <p className="text-earth-600 text-sm">
          Hit the perfect timing to pull maximum weight!
        </p>
      </div>

      {/* Stats Display */}
      {gameState === 'playing' && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-xs text-gray-600">Weight</p>
            <p className="text-2xl font-bold text-red-700">{currentWeight} lbs</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <p className="text-xs text-orange-600">Distance</p>
            <p className="text-2xl font-bold text-orange-700">{totalDistance.toFixed(1)} ft</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-600">Pulls Left</p>
            <p className="text-2xl font-bold text-blue-700">{pullsRemaining}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-green-600">Perfect</p>
            <p className="text-2xl font-bold text-green-700">
              {pullHistory.filter(p => p.result === 'perfect').length}
            </p>
          </div>
        </div>
      )}

      {/* Game Area */}
      <div className="relative">
        {gameState === 'ready' && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🦮</div>
            <h3 className="text-2xl font-bold text-earth-900 mb-4">Ready to Pull!</h3>
            <div className="bg-orange-50 rounded-lg p-4 mb-6 max-w-md mx-auto">
              <p className="text-sm text-orange-900 mb-2"><strong>How to Play:</strong></p>
              <ul className="text-sm text-orange-800 text-left space-y-1">
                <li>• Watch the power marker move across the meter</li>
                <li>• Click or press SPACE when it's in the center</li>
                <li>• <strong className="text-green-700">Perfect timing</strong> = Maximum pull!</li>
                <li>• Pull as far as you can with {modifiers.stamina} attempts</li>
                <li>• Max weight: {modifiers.maxWeight} lbs</li>
              </ul>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => onComplete(0)}
                className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-bold text-lg"
              >
                Cancel
              </button>
              <button
                onClick={startGame}
                className="px-8 py-3 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 transition-colors font-bold text-lg"
              >
                Start Pull!
              </button>
            </div>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="space-y-6">
            {/* Power Meter */}
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-bold text-earth-900 mb-4 text-center">
                Pull #{currentPull + 1} - Click when in the green zone!
              </h3>

              <div className="relative h-32 bg-gray-200 rounded-lg overflow-hidden mb-4">
                {/* Perfect zone */}
                <div
                  className="absolute top-0 bottom-0 bg-green-400 opacity-50"
                  style={{
                    left: `${TARGET_POSITION - modifiers.powerWindow / 2}%`,
                    width: `${modifiers.powerWindow}%`,
                  }}
                />

                {/* Good zone */}
                <div
                  className="absolute top-0 bottom-0 bg-blue-300 opacity-30"
                  style={{
                    left: `${TARGET_POSITION - modifiers.powerWindow}%`,
                    width: `${modifiers.powerWindow * 2}%`,
                  }}
                />

                {/* Center line */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-green-700"
                  style={{ left: `${TARGET_POSITION}%` }}
                />

                {/* Moving marker */}
                {isMoving && (
                  <div
                    className="absolute top-0 bottom-0 w-2 bg-red-600 transition-all duration-75"
                    style={{ left: `${markerPosition}%` }}
                  >
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl">
                      ▼
                    </div>
                  </div>
                )}

                {/* Labels */}
                <div className="absolute bottom-2 left-2 text-xs text-gray-600">0%</div>
                <div className="absolute bottom-2 right-2 text-xs text-gray-600">100%</div>
              </div>

              <button
                onClick={executePull}
                disabled={!canPull}
                className="w-full py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {canPull ? '🦮 PULL! (SPACE)' : 'Recovering...'}
              </button>
            </div>

            {/* Feedback */}
            {feedback && (
              <div className="bg-white rounded-lg p-4 text-center animate-bounce">
                <div className={`text-3xl font-bold ${getPullResultDisplay(feedback.result).color}`}>
                  {getPullResultDisplay(feedback.result).text}
                </div>
                <div className="text-xl text-gray-700 mt-2">
                  {feedback.power.toFixed(0)}% Power
                </div>
              </div>
            )}

            {/* Pull History */}
            {pullHistory.length > 0 && (
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-bold text-earth-900 mb-2">Current Round</h4>
                <div className="flex gap-2 flex-wrap">
                  {pullHistory.map((pull, index) => (
                    <div
                      key={index}
                      className={`px-3 py-2 rounded ${
                        pull.result === 'perfect'
                          ? 'bg-green-500'
                          : pull.result === 'good'
                          ? 'bg-blue-500'
                          : pull.result === 'weak'
                          ? 'bg-orange-500'
                          : 'bg-red-500'
                      } text-white text-sm font-bold`}
                    >
                      {pull.power.toFixed(0)}%
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {gameState === 'finished' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-3xl font-bold text-earth-900 mb-6">Competition Complete!</h3>

            <div className="bg-white rounded-lg p-6 max-w-md mx-auto mb-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Total Distance</p>
                  <p className="text-3xl font-bold text-orange-700">{totalDistance.toFixed(1)} ft</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Max Weight</p>
                  <p className="text-2xl font-bold text-red-700">{currentWeight} lbs</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-600">Perfect Pulls:</span>
                  <span className="font-bold">
                    {pullHistory.filter(p => p.result === 'perfect').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-600">Good Pulls:</span>
                  <span className="font-bold">
                    {pullHistory.filter(p => p.result === 'good').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-600">Weak Pulls:</span>
                  <span className="font-bold">
                    {pullHistory.filter(p => p.result === 'weak').length}
                  </span>
                </div>
                {currentWeight >= modifiers.maxWeight && (
                  <div className="mt-4 p-3 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-lg border-2 border-yellow-400">
                    <p className="font-bold text-amber-900">🌟 MAX WEIGHT PULLED!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
