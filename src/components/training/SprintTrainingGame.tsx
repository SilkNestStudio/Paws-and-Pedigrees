import { useState, useEffect, useCallback, useRef } from 'react';

interface SprintTrainingGameProps {
  onComplete: (performanceMultiplier: number) => void;
  dogName: string;
}

export default function SprintTrainingGame({ onComplete, dogName }: SprintTrainingGameProps) {
  const [phase, setPhase] = useState<'ready' | 'running' | 'finished'>('ready');
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [energy, setEnergy] = useState(100);
  const [motivation, setMotivation] = useState(100);
  const [mouseY, setMouseY] = useState(0);
  const [treats, setTreats] = useState<Array<{ id: number; position: number; collected: boolean }>>([]);
  const [obstacles, setObstacles] = useState<Array<{ id: number; position: number; type: 'puddle' | 'squirrel' | 'stick' }>>([]);
  const [collectedTreats, setCollectedTreats] = useState(0);
  const [dodgedObstacles, setDodgedObstacles] = useState(0);
  const [hitObstacles, setHitObstacles] = useState(0);
  const [encouragements, setEncouragements] = useState<Array<{ id: number; text: string; x: number; y: number }>>([]);
  const gameLoopRef = useRef<number>();
  const lastObstacleRef = useRef(0);
  const lastTreatRef = useRef(0);
  const startTimeRef = useRef(0);

  const SPRINT_DISTANCE = 100;
  const TRACK_HEIGHT = 400;
  const DOG_POSITION_X = 100;

  // Generate initial obstacles and treats
  useEffect(() => {
    if (phase === 'running' && obstacles.length === 0) {
      const newObstacles = [];
      const newTreats = [];
      const types: Array<'puddle' | 'squirrel' | 'stick'> = ['puddle', 'squirrel', 'stick'];

      for (let i = 0; i < 8; i++) {
        newObstacles.push({
          id: i,
          position: 15 + (i * 12) + Math.random() * 5,
          type: types[Math.floor(Math.random() * types.length)]
        });
      }

      for (let i = 0; i < 6; i++) {
        newTreats.push({
          id: i,
          position: 20 + (i * 15) + Math.random() * 5,
          collected: false
        });
      }

      setObstacles(newObstacles);
      setTreats(newTreats);
      startTimeRef.current = Date.now();
    }
  }, [phase, obstacles.length]);

  // Main game loop
  useEffect(() => {
    if (phase !== 'running') return;

    const gameLoop = () => {
      // Update speed based on energy and motivation
      setSpeed(prev => {
        const targetSpeed = (energy / 100) * (motivation / 100) * 8 + 2;
        const newSpeed = prev + (targetSpeed - prev) * 0.1; // Smooth acceleration
        return newSpeed;
      });

      // Move forward
      setDistance(prev => {
        const newDistance = prev + (speed * 0.016); // 60fps
        if (newDistance >= SPRINT_DISTANCE) {
          setPhase('finished');
          return SPRINT_DISTANCE;
        }
        return newDistance;
      });

      // Drain energy over time
      setEnergy(prev => Math.max(0, prev - 0.05));

      // Motivation slowly decreases
      setMotivation(prev => Math.max(20, prev - 0.02));

      // Check treat collection
      setTreats(prevTreats => {
        return prevTreats.map(treat => {
          if (!treat.collected && Math.abs(distance - treat.position) < 1) {
            const dogY = mouseY;
            const treatY = getTreatY(treat.id);

            if (Math.abs(dogY - treatY) < 60) {
              // Collected!
              setCollectedTreats(c => c + 1);
              setMotivation(m => Math.min(100, m + 15));
              setEnergy(e => Math.min(100, e + 10));
              showEncouragement('Good boy!', DOG_POSITION_X + 50, dogY);
              return { ...treat, collected: true };
            }
          }
          return treat;
        });
      });

      // Check obstacle collision
      obstacles.forEach(obstacle => {
        if (Math.abs(distance - obstacle.position) < 0.5 && Math.abs(distance - obstacle.position) > 0.1) {
          const dogY = mouseY;
          const obstacleY = getObstacleY(obstacle.id);

          if (Math.abs(dogY - obstacleY) < 60) {
            // Hit obstacle!
            if (!lastObstacleRef.current || Date.now() - lastObstacleRef.current > 500) {
              setHitObstacles(h => h + 1);
              setSpeed(s => s * 0.6);
              setMotivation(m => Math.max(0, m - 20));
              showEncouragement('Oops!', DOG_POSITION_X + 50, dogY);
              lastObstacleRef.current = Date.now();
            }
          } else if (Math.abs(distance - obstacle.position) < 0.3) {
            // Successfully dodged
            if (!lastObstacleRef.current || Date.now() - lastObstacleRef.current > 500) {
              setDodgedObstacles(d => d + 1);
              showEncouragement('Nice!', DOG_POSITION_X + 50, dogY);
              lastObstacleRef.current = Date.now();
            }
          }
        }
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [phase, speed, distance, mouseY, obstacles]);

  // Handle mouse movement
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    setMouseY(Math.max(50, Math.min(TRACK_HEIGHT - 50, y)));
  }, []);

  const getTreatY = (id: number) => {
    return 100 + (id % 3) * 120;
  };

  const getObstacleY = (id: number) => {
    return 80 + ((id * 7) % 3) * 120;
  };

  const showEncouragement = (text: string, x: number, y: number) => {
    const id = Date.now();
    setEncouragements(prev => [...prev, { id, text, x, y }]);
    setTimeout(() => {
      setEncouragements(prev => prev.filter(e => e.id !== id));
    }, 1000);
  };

  const calculatePerformance = () => {
    const completionRatio = distance / SPRINT_DISTANCE;
    const treatBonus = (collectedTreats / treats.length) * 0.3;
    const dodgeBonus = (dodgedObstacles / obstacles.length) * 0.2;
    const penaltyFromHits = (hitObstacles * 0.1);

    let performance = 0.5 + (completionRatio * 0.5) + treatBonus + dodgeBonus - penaltyFromHits;

    // Time bonus
    const timeElapsed = (Date.now() - startTimeRef.current) / 1000;
    if (completionRatio >= 1.0 && timeElapsed < 20) {
      performance += 0.3;
    }

    return Math.min(1.5, Math.max(0.3, performance));
  };

  const handleFinish = () => {
    const performance = calculatePerformance();
    onComplete(performance);
  };

  const handleStart = () => {
    setPhase('running');
  };

  if (phase === 'ready') {
    return (
      <div className="bg-gradient-to-b from-green-50 to-blue-50 rounded-lg p-8 min-h-[600px]">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏃‍♂️🐕</div>
            <h2 className="text-3xl font-bold text-earth-900 mb-2">Sprint Training</h2>
            <p className="text-earth-600 text-lg">Guide {dogName} through the 100m sprint!</p>
          </div>

          <div className="bg-white rounded-lg p-6 mb-6 shadow-lg">
            <h3 className="font-bold text-earth-900 mb-4 text-xl">🎮 How to Play:</h3>
            <div className="space-y-3 text-earth-700">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="text-2xl">🖱️</span>
                <div>
                  <p className="font-semibold text-blue-900">Move Your Mouse</p>
                  <p className="text-sm">Guide {dogName} up and down the track by moving your mouse vertically</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <span className="text-2xl">🦴</span>
                <div>
                  <p className="font-semibold text-green-900">Collect Treats</p>
                  <p className="text-sm">Grab treats to boost {dogName}'s motivation and energy!</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-semibold text-orange-900">Avoid Obstacles</p>
                  <p className="text-sm">Dodge puddles, squirrels, and sticks - they slow {dogName} down!</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                <span className="text-2xl">⚡</span>
                <div>
                  <p className="font-semibold text-purple-900">Watch Energy & Motivation</p>
                  <p className="text-sm">Keep them high for maximum speed!</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-6">
            <p className="text-yellow-900 text-sm font-semibold">
              💡 Pro Tip: Smooth movements work best! Guide {dogName} in flowing paths to collect treats while avoiding obstacles.
            </p>
          </div>

          <button
            onClick={handleStart}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:from-green-600 hover:to-blue-600 transition-all transform hover:scale-105 font-bold text-xl shadow-lg"
          >
            🏁 Start Sprint Training
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'running' || phase === 'finished') {
    const progress = (distance / SPRINT_DISTANCE) * 100;

    return (
      <div className="bg-gradient-to-b from-sky-100 to-green-100 rounded-lg p-6 min-h-[700px]">
        <div className="max-w-5xl mx-auto">
          {/* Stats Header */}
          <div className="grid grid-cols-5 gap-3 mb-4">
            <div className="bg-white/90 backdrop-blur rounded-lg p-3 text-center shadow">
              <p className="text-xs text-gray-600 mb-1">Distance</p>
              <p className="text-xl font-bold text-blue-700">{distance.toFixed(0)}m</p>
            </div>
            <div className="bg-white/90 backdrop-blur rounded-lg p-3 text-center shadow">
              <p className="text-xs text-gray-600 mb-1">Speed</p>
              <p className="text-xl font-bold text-green-700">{speed.toFixed(1)} m/s</p>
            </div>
            <div className="bg-white/90 backdrop-blur rounded-lg p-3 text-center shadow">
              <p className="text-xs text-gray-600 mb-1">Energy</p>
              <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`absolute inset-0 transition-all ${energy > 50 ? 'bg-green-500' : energy > 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${energy}%` }}
                />
              </div>
            </div>
            <div className="bg-white/90 backdrop-blur rounded-lg p-3 text-center shadow">
              <p className="text-xs text-gray-600 mb-1">Motivation</p>
              <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`absolute inset-0 transition-all ${motivation > 60 ? 'bg-purple-500' : motivation > 30 ? 'bg-orange-500' : 'bg-gray-500'}`}
                  style={{ width: `${motivation}%` }}
                />
              </div>
            </div>
            <div className="bg-white/90 backdrop-blur rounded-lg p-3 text-center shadow">
              <p className="text-xs text-gray-600 mb-1">Treats</p>
              <p className="text-xl font-bold text-amber-700">🦴 {collectedTreats}</p>
            </div>
          </div>

          {/* Game Area */}
          <div
            className="relative bg-gradient-to-r from-green-200 via-green-300 to-green-200 rounded-xl overflow-hidden shadow-2xl border-4 border-green-600"
            style={{ height: TRACK_HEIGHT }}
            onMouseMove={phase === 'running' ? handleMouseMove : undefined}
          >
            {/* Track lanes */}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 right-0 h-px bg-white/30" style={{ top: '25%' }}></div>
              <div className="absolute top-0 left-0 right-0 h-px bg-white/30" style={{ top: '50%' }}></div>
              <div className="absolute top-0 left-0 right-0 h-px bg-white/30" style={{ top: '75%' }}></div>
            </div>

            {/* Finish line */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent via-white to-black opacity-50"></div>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-2xl font-bold text-white drop-shadow-lg rotate-90">
              FINISH
            </div>

            {/* Treats */}
            {treats.map(treat => {
              const x = ((treat.position - distance) / SPRINT_DISTANCE) * 100;
              if (x < -5 || x > 105 || treat.collected) return null;

              return (
                <div
                  key={`treat-${treat.id}`}
                  className="absolute transition-all duration-100"
                  style={{
                    left: `${x}%`,
                    top: getTreatY(treat.id),
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="text-4xl animate-bounce">🦴</div>
                </div>
              );
            })}

            {/* Obstacles */}
            {obstacles.map(obstacle => {
              const x = ((obstacle.position - distance) / SPRINT_DISTANCE) * 100;
              if (x < -5 || x > 105) return null;

              const emoji = obstacle.type === 'puddle' ? '💦' : obstacle.type === 'squirrel' ? '🐿️' : '🪵';

              return (
                <div
                  key={`obstacle-${obstacle.id}`}
                  className="absolute transition-all duration-100"
                  style={{
                    left: `${x}%`,
                    top: getObstacleY(obstacle.id),
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="text-4xl">{emoji}</div>
                </div>
              );
            })}

            {/* Dog */}
            {phase === 'running' && (
              <div
                className="absolute transition-all duration-100"
                style={{
                  left: DOG_POSITION_X,
                  top: mouseY,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="text-5xl" style={{
                  transform: `scaleX(${speed > 5 ? 1.2 : 1})`,
                  transition: 'transform 0.2s'
                }}>
                  🐕
                </div>
              </div>
            )}

            {/* Encouragements */}
            {encouragements.map(enc => (
              <div
                key={enc.id}
                className="absolute text-xl font-bold text-white drop-shadow-lg animate-ping"
                style={{ left: enc.x, top: enc.y }}
              >
                {enc.text}
              </div>
            ))}

            {/* Finish screen overlay */}
            {phase === 'finished' && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                <div className="bg-white rounded-xl p-8 text-center max-w-md shadow-2xl">
                  <div className="text-6xl mb-4">
                    {distance >= SPRINT_DISTANCE ? '🏆' : '😅'}
                  </div>
                  <h3 className="text-3xl font-bold text-earth-900 mb-4">
                    {distance >= SPRINT_DISTANCE ? 'Sprint Complete!' : 'Great Effort!'}
                  </h3>
                  <div className="space-y-2 text-left mb-6">
                    <p className="text-gray-700">📏 Distance: <span className="font-bold">{distance.toFixed(1)}m / {SPRINT_DISTANCE}m</span></p>
                    <p className="text-gray-700">🦴 Treats Collected: <span className="font-bold">{collectedTreats} / {treats.length}</span></p>
                    <p className="text-gray-700">✨ Obstacles Dodged: <span className="font-bold">{dodgedObstacles}</span></p>
                    <p className="text-gray-700">💥 Obstacles Hit: <span className="font-bold text-red-600">{hitObstacles}</span></p>
                  </div>
                  <button
                    onClick={handleFinish}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all font-bold text-lg shadow-lg"
                  >
                    Complete Training
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-4 bg-white/90 rounded-lg p-4 shadow">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Progress</span>
              <span className="text-sm text-gray-600">{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 via-blue-400 to-purple-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {phase === 'running' && (
            <div className="mt-4 text-center">
              <p className="text-lg font-semibold text-gray-700">
                {speed < 3 ? '💨 Encourage faster!' : speed > 7 ? '🚀 Amazing speed!' : '👍 Keep going!'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
