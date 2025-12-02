import { useState, useEffect, useRef, useCallback } from 'react';
import type { Dog } from '../../../types';

interface RacingGameV2Props {
  dog: Dog;
  onComplete: (score: number) => void;
}

type Lane = 0 | 1 | 2; // Left, Center, Right

interface Obstacle {
  id: number;
  lane: Lane;
  position: number; // 0-100 (top to bottom)
  type: 'barrier' | 'energy';
}

interface Opponent {
  id: number;
  name: string;
  position: number;
  lane: Lane;
  color: string;
}

interface BreedModifiers {
  baseSpeed: number;
  handling: number; // Lane switch speed
  maxBoost: number;
  boostEfficiency: number; // Energy cost per boost
}

const getBreedModifiers = (dog: Dog): BreedModifiers => {
  const speed = dog.speed + dog.speed_trained;
  const agility = dog.agility + dog.agility_trained;

  return {
    baseSpeed: 0.3 + (speed / 100), // 0.3-1.3 per frame
    handling: 0.15 + (agility / 200), // 0.15-0.65 lane switch speed
    maxBoost: 30 + (speed / 2), // 30-80 max energy
    boostEfficiency: Math.max(0.15, 0.3 - (agility / 500)), // 0.15-0.3 energy per frame
  };
};

export default function RacingGameV2({ dog, onComplete }: RacingGameV2Props) {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'finished'>('ready');
  const [playerLane, setPlayerLane] = useState<Lane>(1);
  const [targetLane, setTargetLane] = useState<Lane>(1);
  const [position, setPosition] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [energy, setEnergy] = useState(50);
  const [isBoosting, setIsBoosting] = useState(false);
  const [distance, setDistance] = useState(0);
  const [collisions, setCollisions] = useState(0);
  const [energyCollected, setEnergyCollected] = useState(0);
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const gameLoopRef = useRef<number>();
  const nextObstacleId = useRef(0);
  const modifiers = getBreedModifiers(dog);

  // Initialize opponents
  useEffect(() => {
    setOpponents([
      { id: 1, name: 'Bolt', position: 0, lane: 0, color: 'bg-blue-400' },
      { id: 2, name: 'Flash', position: 0, lane: 1, color: 'bg-red-400' },
      { id: 3, name: 'Zoom', position: 0, lane: 2, color: 'bg-yellow-400' },
    ]);
  }, []);

  // Spawn obstacles
  const spawnObstacle = useCallback(() => {
    const isEnergy = Math.random() < 0.3; // 30% chance of energy pickup
    const lane = Math.floor(Math.random() * 3) as Lane;

    const newObstacle: Obstacle = {
      id: nextObstacleId.current++,
      lane,
      position: -10,
      type: isEnergy ? 'energy' : 'barrier',
    };

    setObstacles(prev => [...prev, newObstacle]);
  }, []);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    let lastSpawn = 0;
    const SPAWN_INTERVAL = 80; // Spawn every 80 frames (~1.3 seconds at 60fps)

    const gameLoop = () => {
      // Move player toward target lane
      setPlayerLane(prev => {
        if (prev < targetLane) {
          return Math.min(targetLane, (prev + modifiers.handling) as Lane);
        } else if (prev > targetLane) {
          return Math.max(targetLane, (prev - modifiers.handling) as Lane);
        }
        return prev;
      });

      // Calculate speed
      const currentSpeed = isBoosting
        ? modifiers.baseSpeed * 2
        : modifiers.baseSpeed;

      // Update distance
      setDistance(prev => prev + currentSpeed);

      // Move obstacles
      setObstacles(prev => {
        const updated = prev
          .map(obs => ({ ...obs, position: obs.position + currentSpeed * 1.5 }))
          .filter(obs => obs.position < 110); // Remove off-screen obstacles

        return updated;
      });

      // Check collisions
      setObstacles(prev => {
        const playerLaneRounded = Math.round(playerLane);
        const inRange = prev.filter(
          obs => obs.position > 85 && obs.position < 95 && obs.lane === playerLaneRounded
        );

        inRange.forEach(obs => {
          if (obs.type === 'barrier') {
            setCollisions(c => c + 1);
            setEnergy(e => Math.max(0, e - 10));
          } else if (obs.type === 'energy') {
            setEnergyCollected(e => e + 1);
            setEnergy(e => Math.min(modifiers.maxBoost, e + 15));
          }
        });

        return prev.filter(obs => !inRange.includes(obs));
      });

      // Update boost energy
      if (isBoosting) {
        setEnergy(prev => {
          const newEnergy = prev - modifiers.boostEfficiency;
          if (newEnergy <= 0) {
            setIsBoosting(false);
            return 0;
          }
          return newEnergy;
        });
      }

      // Update opponents (simple AI)
      setOpponents(prev =>
        prev.map(opp => ({
          ...opp,
          position: opp.position + (modifiers.baseSpeed * (0.8 + Math.random() * 0.4)),
        }))
      );

      // Spawn obstacles
      if (lastSpawn >= SPAWN_INTERVAL) {
        spawnObstacle();
        lastSpawn = 0;
      } else {
        lastSpawn++;
      }

      // Update time
      setTimeElapsed(prev => prev + 1/60);

      // Check finish (race to 1000 distance)
      if (distance >= 1000) {
        finishGame();
        return;
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, playerLane, targetLane, isBoosting, modifiers, spawnObstacle, distance]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;

      if (e.key === 'ArrowLeft') {
        setTargetLane(prev => Math.max(0, prev - 1) as Lane);
      } else if (e.key === 'ArrowRight') {
        setTargetLane(prev => Math.min(2, prev + 1) as Lane);
      } else if (e.key === ' ' || e.key === 'ArrowUp') {
        if (energy > 5) {
          setIsBoosting(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp') {
        setIsBoosting(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, energy]);

  const startGame = () => {
    setGameState('playing');
    setPlayerLane(1);
    setTargetLane(1);
    setPosition(0);
    setObstacles([]);
    setEnergy(50);
    setIsBoosting(false);
    setDistance(0);
    setCollisions(0);
    setEnergyCollected(0);
    setTimeElapsed(0);
    nextObstacleId.current = 0;
    setOpponents(prev => prev.map(opp => ({ ...opp, position: 0 })));
  };

  const finishGame = () => {
    setGameState('finished');

    // Calculate final score
    const baseScore = Math.floor(distance);
    const timeBonus = Math.max(0, Math.floor((60 - timeElapsed) * 10));
    const collisionPenalty = collisions * 50;
    const energyBonus = energyCollected * 20;
    const boostEfficiencyBonus = Math.floor((energy / modifiers.maxBoost) * 100); // Bonus for efficient boost use

    // Placement bonus (compare to opponents)
    const playerPos = distance;
    const opponentsAhead = opponents.filter(opp => opp.position > playerPos).length;
    const placementBonus = [300, 200, 100, 0][opponentsAhead] || 0;

    const finalScore = Math.max(0,
      baseScore + timeBonus + energyBonus + boostEfficiencyBonus + placementBonus - collisionPenalty
    );

    setTimeout(() => onComplete(finalScore), 100);
  };

  const getLanePosition = (lane: number) => {
    return 25 + (lane * 25); // 25%, 50%, 75%
  };

  return (
    <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg p-6 min-h-[600px] text-white">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">⚡ Racing Competition</h2>
        <p className="text-gray-300 text-sm">
          Switch lanes to avoid obstacles and collect energy. Use boost wisely!
        </p>
      </div>

      {/* Stats Display */}
      {gameState === 'playing' && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-gray-700 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-400">Distance</p>
            <p className="text-lg font-bold">{Math.floor(distance)}</p>
          </div>
          <div className="bg-blue-900 rounded-lg p-2 text-center">
            <p className="text-xs text-blue-300">Energy</p>
            <p className="text-lg font-bold">{Math.floor(energy)}</p>
          </div>
          <div className="bg-green-900 rounded-lg p-2 text-center">
            <p className="text-xs text-green-300">Pickups</p>
            <p className="text-lg font-bold">{energyCollected}</p>
          </div>
          <div className="bg-red-900 rounded-lg p-2 text-center">
            <p className="text-xs text-red-300">Hits</p>
            <p className="text-lg font-bold">{collisions}</p>
          </div>
        </div>
      )}

      {/* Game Area */}
      <div className="relative">
        {gameState === 'ready' && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏁</div>
            <h3 className="text-2xl font-bold mb-4">Ready to Race!</h3>
            <div className="bg-gray-800 rounded-lg p-4 mb-6 max-w-md mx-auto">
              <p className="text-sm mb-2"><strong>Controls:</strong></p>
              <ul className="text-sm text-gray-300 text-left space-y-1">
                <li>• <strong>← →</strong> or click lanes to switch</li>
                <li>• <strong>SPACE / ↑</strong> or hold button to boost</li>
                <li>• Avoid 🚧 barriers (lose energy)</li>
                <li>• Collect ⚡ energy pickups</li>
                <li>• Beat your opponents to the finish!</li>
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
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-bold text-lg"
              >
                Start Race!
              </button>
            </div>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="relative bg-gray-700 rounded-lg h-[500px] overflow-hidden">
            {/* Track Lanes */}
            <div className="absolute inset-0 grid grid-cols-3">
              <div className="border-r border-gray-600" />
              <div className="border-r border-gray-600" />
              <div />
            </div>

            {/* Obstacles */}
            {obstacles.map(obs => (
              <div
                key={obs.id}
                className="absolute transform -translate-x-1/2 transition-all duration-100"
                style={{
                  left: `${getLanePosition(obs.lane)}%`,
                  top: `${obs.position}%`,
                }}
              >
                <div className={`text-3xl ${obs.type === 'barrier' ? '' : 'animate-pulse'}`}>
                  {obs.type === 'barrier' ? '🚧' : '⚡'}
                </div>
              </div>
            ))}

            {/* Player Dog */}
            <div
              className="absolute bottom-12 transform -translate-x-1/2 transition-all duration-200"
              style={{ left: `${getLanePosition(playerLane)}%` }}
            >
              <div className={`text-5xl ${isBoosting ? 'animate-pulse' : ''}`}>
                🐕
              </div>
              {isBoosting && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-2xl">
                  🔥
                </div>
              )}
            </div>

            {/* Opponents */}
            {opponents.map(opp => (
              <div
                key={opp.id}
                className="absolute transform -translate-x-1/2 transition-all duration-300"
                style={{
                  left: `${getLanePosition(opp.lane)}%`,
                  top: `${Math.min(90, 90 - (opp.position / distance) * 70)}%`,
                }}
              >
                <div className={`w-8 h-8 ${opp.color} rounded-full opacity-60`} />
              </div>
            ))}

            {/* Lane Switch Buttons */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <button
                onClick={() => setTargetLane(prev => Math.max(0, prev - 1) as Lane)}
                className="px-6 py-3 bg-gray-600 bg-opacity-50 hover:bg-opacity-80 rounded-lg font-bold transition-all"
              >
                ← LEFT
              </button>
              <button
                onMouseDown={() => energy > 5 && setIsBoosting(true)}
                onMouseUp={() => setIsBoosting(false)}
                onMouseLeave={() => setIsBoosting(false)}
                disabled={energy <= 5}
                className={`px-6 py-3 rounded-lg font-bold transition-all ${
                  energy > 5
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-600 opacity-50 cursor-not-allowed'
                }`}
              >
                🚀 BOOST
              </button>
              <button
                onClick={() => setTargetLane(prev => Math.min(2, prev + 1) as Lane)}
                className="px-6 py-3 bg-gray-600 bg-opacity-50 hover:bg-opacity-80 rounded-lg font-bold transition-all"
              >
                RIGHT →
              </button>
            </div>

            {/* Energy Bar */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-64">
              <div className="bg-gray-800 rounded-full h-4 overflow-hidden border-2 border-gray-600">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-200"
                  style={{ width: `${(energy / modifiers.maxBoost) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {gameState === 'finished' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-3xl font-bold mb-6">Race Complete!</h3>

            <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-auto mb-6">
              <p className="text-2xl font-bold text-yellow-400 mb-4">
                Final Time: {timeElapsed.toFixed(2)}s
              </p>

              <div className="border-t border-gray-700 pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Distance:</span>
                  <span className="font-bold">{Math.floor(distance)}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-400">Energy Collected:</span>
                  <span className="font-bold">{energyCollected}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-400">Collisions:</span>
                  <span className="font-bold">{collisions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-400">Energy Remaining:</span>
                  <span className="font-bold">{Math.floor(energy)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
