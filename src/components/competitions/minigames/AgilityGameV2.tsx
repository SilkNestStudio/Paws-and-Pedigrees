import { useState, useEffect, useRef } from 'react';
import type { Dog } from '../../../types';

interface AgilityGameV2Props {
  dog: Dog;
  onComplete: (score: number) => void;
}

type ObstacleType = 'jump' | 'tunnel' | 'weave' | 'a-frame' | 'tire';
type HitQuality = 'perfect' | 'good' | 'miss';

interface Obstacle {
  id: number;
  type: ObstacleType;
  position: number; // 0-100
  completed: boolean;
  quality?: HitQuality;
}

interface BreedModifiers {
  baseSpeed: number; // pixels per frame
  timingWindow: number; // perfect timing window in px
  goodWindow: number; // good timing window in px
  momentumBonus: number; // speed multiplier on perfect hits
}

// Get breed-specific modifiers
const getBreedModifiers = (dog: Dog): BreedModifiers => {
  const agility = dog.agility + dog.agility_trained;
  const speed = dog.speed + dog.speed_trained;

  // Higher agility = tighter timing but more reward
  // Higher speed = faster movement
  return {
    baseSpeed: 0.4 + (speed / 200), // 0.4-1.0 px/frame (much slower for visibility)
    timingWindow: Math.max(20, 40 - (agility / 10)), // 20-40px perfect window (larger)
    goodWindow: Math.max(40, 80 - (agility / 10)), // 40-80px good window (larger)
    momentumBonus: 1 + (agility / 200), // 1.0-1.5x speed boost (less drastic)
  };
};

const OBSTACLE_ICONS: Record<ObstacleType, string> = {
  jump: '🚧',
  tunnel: '🌊',
  weave: '🎯',
  'a-frame': '🏔️',
  tire: '⭕',
};

// Obstacle names for display
// const OBSTACLE_NAMES: Record<ObstacleType, string> = {
//   jump: 'Jump',
//   tunnel: 'Tunnel',
//   weave: 'Weave Poles',
//   'a-frame': 'A-Frame',
//   tire: 'Tire Jump',
// };

export default function AgilityGameV2({ dog, onComplete }: AgilityGameV2Props) {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'finished'>('ready');
  const [dogPosition, setDogPosition] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [currentObstacle, setCurrentObstacle] = useState(0);
  const [momentum, setMomentum] = useState(1);
  const [score, setScore] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [perfectHits, setPerfectHits] = useState(0);
  const [goodHits, setGoodHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [showFeedback, setShowFeedback] = useState<HitQuality | null>(null);

  const gameLoopRef = useRef<number>();
  const modifiers = getBreedModifiers(dog);

  // Initialize obstacles
  useEffect(() => {
    const obstacleTypes: ObstacleType[] = ['jump', 'tunnel', 'weave', 'a-frame', 'tire'];
    const newObstacles: Obstacle[] = obstacleTypes.map((type, index) => ({
      id: index,
      type,
      position: 20 + (index * 16), // Evenly spaced
      completed: false,
    }));
    setObstacles(newObstacles);
  }, []);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = () => {
      setDogPosition(prev => {
        const newPos = prev + (modifiers.baseSpeed * momentum);

        // Check if passed all obstacles
        if (newPos >= 100) {
          finishGame();
          return 100;
        }

        return newPos;
      });

      setTimeElapsed(prev => prev + 1/60); // 60 FPS

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, momentum, modifiers.baseSpeed]);

  // Check for auto-miss (passed obstacle without clicking)
  useEffect(() => {
    if (gameState !== 'playing' || currentObstacle >= obstacles.length) return;

    const currentObs = obstacles[currentObstacle];
    if (!currentObs || currentObs.completed) return;

    // Auto-miss if dog passed the obstacle
    if (dogPosition > currentObs.position + modifiers.goodWindow / 2) {
      handleObstacleAttempt('miss');
    }
  }, [dogPosition, currentObstacle, obstacles, gameState]);

  const handleObstacleAttempt = (quality: HitQuality) => {
    if (currentObstacle >= obstacles.length) return;

    setObstacles(prev => {
      const updated = [...prev];
      updated[currentObstacle] = {
        ...updated[currentObstacle],
        completed: true,
        quality,
      };
      return updated;
    });

    // Update stats and momentum
    if (quality === 'perfect') {
      setPerfectHits(prev => prev + 1);
      setScore(prev => prev + 100);
      setMomentum(modifiers.momentumBonus); // Speed boost!
      setShowFeedback('perfect');
    } else if (quality === 'good') {
      setGoodHits(prev => prev + 1);
      setScore(prev => prev + 50);
      setMomentum(1); // Normal speed
      setShowFeedback('good');
    } else {
      setMisses(prev => prev + 1);
      setScore(prev => Math.max(0, prev - 25));
      setMomentum(0.7); // Slow down
      setShowFeedback('miss');
    }

    setTimeout(() => setShowFeedback(null), 500);
    setCurrentObstacle(prev => prev + 1);
  };

  const handleClick = () => {
    if (gameState !== 'playing' || currentObstacle >= obstacles.length) return;

    const currentObs = obstacles[currentObstacle];
    if (!currentObs || currentObs.completed) return;

    const distance = Math.abs(dogPosition - currentObs.position);

    if (distance <= modifiers.timingWindow) {
      handleObstacleAttempt('perfect');
    } else if (distance <= modifiers.goodWindow) {
      handleObstacleAttempt('good');
    } else {
      handleObstacleAttempt('miss');
    }
  };

  const startGame = () => {
    setGameState('playing');
    setDogPosition(0);
    setCurrentObstacle(0);
    setMomentum(1);
    setScore(0);
    setTimeElapsed(0);
    setPerfectHits(0);
    setGoodHits(0);
    setMisses(0);
    setObstacles(prev => prev.map(obs => ({ ...obs, completed: false, quality: undefined })));
  };

  const finishGame = () => {
    setGameState('finished');

    // Calculate final score
    const timeBonus = Math.max(0, Math.floor((30 - timeElapsed) * 10));
    const perfectionBonus = perfectHits === obstacles.length ? 200 : 0;
    const finalScore = score + timeBonus + perfectionBonus;

    setTimeout(() => onComplete(finalScore), 100);
  };

  return (
    <div className="bg-gradient-to-b from-green-50 to-blue-50 rounded-lg p-6 min-h-[500px]">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-earth-900 mb-2">🏃 Agility Trial</h2>
        <p className="text-earth-600 text-sm">
          Click at the perfect moment as {dog.name} reaches each obstacle!
        </p>
      </div>

      {/* Stats Display */}
      {gameState === 'playing' && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-xs text-gray-600">Score</p>
            <p className="text-2xl font-bold text-kennel-700">{score}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-green-600">Perfect</p>
            <p className="text-2xl font-bold text-green-700">{perfectHits}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-600">Good</p>
            <p className="text-2xl font-bold text-blue-700">{goodHits}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-xs text-red-600">Misses</p>
            <p className="text-2xl font-bold text-red-700">{misses}</p>
          </div>
        </div>
      )}

      {/* Game Area */}
      <div className="relative">
        {gameState === 'ready' && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🐕</div>
            <h3 className="text-2xl font-bold text-earth-900 mb-4">Ready to Run!</h3>
            <div className="bg-blue-50 rounded-lg p-4 mb-6 max-w-md mx-auto">
              <p className="text-sm text-blue-900 mb-2"><strong>How to Play:</strong></p>
              <ul className="text-sm text-blue-800 text-left space-y-1">
                <li>• Click as {dog.name} reaches each obstacle</li>
                <li>• <strong className="text-green-700">Perfect timing</strong> = Speed boost!</li>
                <li>• <strong className="text-blue-700">Good timing</strong> = Normal speed</li>
                <li>• <strong className="text-red-700">Miss/Late</strong> = Slow down</li>
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
                Start Course!
              </button>
            </div>
          </div>
        )}

        {gameState === 'playing' && (
          <div
            onClick={handleClick}
            className="relative bg-gradient-to-r from-green-100 to-green-200 rounded-lg h-48 cursor-pointer overflow-hidden border-4 border-green-300"
          >
            {/* Course Track */}
            <div className="absolute bottom-16 left-0 right-0 h-2 bg-brown-400 opacity-50" />

            {/* Obstacles */}
            {obstacles.map((obstacle) => (
              <div
                key={obstacle.id}
                className="absolute bottom-12 transform -translate-x-1/2"
                style={{ left: `${obstacle.position}%` }}
              >
                <div className="text-center">
                  <div className={`text-4xl ${obstacle.completed ? 'opacity-30' : ''}`}>
                    {OBSTACLE_ICONS[obstacle.type]}
                  </div>
                  {obstacle.quality && (
                    <div className={`text-xs font-bold mt-1 ${
                      obstacle.quality === 'perfect' ? 'text-green-600' :
                      obstacle.quality === 'good' ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {obstacle.quality === 'perfect' ? '★ PERFECT' :
                       obstacle.quality === 'good' ? '✓ GOOD' : '✗ MISS'}
                    </div>
                  )}
                </div>

                {/* Timing Indicator for current obstacle */}
                {!obstacle.completed && obstacle.id === currentObstacle && (
                  <>
                    {/* Perfect zone */}
                    <div
                      className="absolute top-1/2 bg-green-400 opacity-30 h-24"
                      style={{
                        left: `-${modifiers.timingWindow}px`,
                        width: `${modifiers.timingWindow * 2}px`,
                        transform: 'translateY(-50%)',
                      }}
                    />
                    {/* Good zone */}
                    <div
                      className="absolute top-1/2 bg-blue-300 opacity-20 h-24"
                      style={{
                        left: `-${modifiers.goodWindow}px`,
                        width: `${modifiers.goodWindow * 2}px`,
                        transform: 'translateY(-50%)',
                      }}
                    />
                  </>
                )}
              </div>
            ))}

            {/* Dog */}
            <div
              className="absolute bottom-12 transform -translate-x-1/2 transition-all duration-100"
              style={{ left: `${dogPosition}%` }}
            >
              <div className="text-5xl animate-bounce-slow">
                🐕
              </div>
              {momentum > 1 && (
                <div className="absolute -top-2 -right-2 text-2xl animate-pulse">
                  ⚡
                </div>
              )}
            </div>

            {/* Feedback */}
            {showFeedback && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                <div className={`text-4xl font-bold animate-ping ${
                  showFeedback === 'perfect' ? 'text-green-500' :
                  showFeedback === 'good' ? 'text-blue-500' : 'text-red-500'
                }`}>
                  {showFeedback === 'perfect' ? '★ PERFECT!' :
                   showFeedback === 'good' ? '✓ GOOD!' : '✗ MISS!'}
                </div>
              </div>
            )}

            {/* Click Prompt */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-sm font-bold text-earth-700 animate-pulse">
              CLICK WHEN CLOSE! 👆
            </div>
          </div>
        )}

        {gameState === 'finished' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-3xl font-bold text-earth-900 mb-6">Course Complete!</h3>

            <div className="bg-white rounded-lg p-6 max-w-md mx-auto mb-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Final Score</p>
                  <p className="text-3xl font-bold text-kennel-700">{score}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Time</p>
                  <p className="text-2xl font-bold text-blue-700">{timeElapsed.toFixed(1)}s</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-600">Perfect Hits:</span>
                  <span className="font-bold">{perfectHits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-600">Good Hits:</span>
                  <span className="font-bold">{goodHits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">Misses:</span>
                  <span className="font-bold">{misses}</span>
                </div>
                {perfectHits === obstacles.length && (
                  <div className="mt-4 p-3 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-lg border-2 border-yellow-400">
                    <p className="font-bold text-amber-900">🌟 PERFECT RUN! +200 Bonus!</p>
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
