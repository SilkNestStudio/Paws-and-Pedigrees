import { useState, useEffect, useCallback, useRef } from 'react';

interface ObstacleCourseGameProps {
  onComplete: (performanceMultiplier: number) => void;
  dogName: string;
}

type ObstacleType = 'jump' | 'tunnel' | 'weave';

interface Obstacle {
  id: number;
  type: ObstacleType;
  position: number;
  cleared: boolean;
}

export default function ObstacleCourseGame({ onComplete, dogName }: ObstacleCourseGameProps) {
  const [phase, setPhase] = useState<'ready' | 'running' | 'finished'>('ready');
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [currentAction, setCurrentAction] = useState<ObstacleType | null>(null);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(5);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [perfectClears, setPerfectClears] = useState(0);
  const [goodClears, setGoodClears] = useState(0);
  const [missed, setMissed] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; color: string; id: number } | null>(null);
  const gameLoopRef = useRef<number>();
  const lastActionTimeRef = useRef(0);
  const actionCooldownRef = useRef(false);

  const COURSE_LENGTH = 100;
  const OBSTACLE_APPROACH_ZONE = 3;
  const PERFECT_TIMING_ZONE = 0.8;

  // Generate obstacles
  useEffect(() => {
    if (phase === 'running' && obstacles.length === 0) {
      const types: ObstacleType[] = ['jump', 'tunnel', 'weave'];
      const newObstacles: Obstacle[] = [];

      for (let i = 0; i < 15; i++) {
        newObstacles.push({
          id: i,
          type: types[Math.floor(Math.random() * types.length)],
          position: 10 + (i * 6),
          cleared: false
        });
      }

      setObstacles(newObstacles);
    }
  }, [phase, obstacles.length]);

  // Handle keyboard input
  useEffect(() => {
    if (phase !== 'running') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (actionCooldownRef.current) return;

      let action: ObstacleType | null = null;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        action = 'jump';
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        action = 'tunnel';
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'a' || e.key === 'A' || e.key === 'd' || e.key === 'D') {
        action = 'weave';
      }

      if (action) {
        e.preventDefault();
        performAction(action);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, distance, obstacles]);

  const performAction = (action: ObstacleType) => {
    setCurrentAction(action);
    actionCooldownRef.current = true;

    // Find the nearest upcoming obstacle
    const upcomingObstacle = obstacles.find(
      obs => !obs.cleared && obs.position > distance && obs.position - distance < OBSTACLE_APPROACH_ZONE
    );

    if (upcomingObstacle) {
      const distanceToObstacle = upcomingObstacle.position - distance;
      const isCorrectAction = action === upcomingObstacle.type;

      if (isCorrectAction) {
        // Check timing
        if (distanceToObstacle < PERFECT_TIMING_ZONE) {
          // Perfect!
          showFeedback('PERFECT! 🌟', 'text-yellow-400');
          setPerfectClears(p => p + 1);
          setCombo(c => c + 1);
          setSpeed(s => Math.min(s + 0.3, 8));
        } else {
          // Good timing
          showFeedback('Good! ✓', 'text-green-400');
          setGoodClears(g => g + 1);
          setCombo(c => c + 1);
          setSpeed(s => Math.min(s + 0.1, 8));
        }

        // Mark obstacle as cleared
        setObstacles(prev =>
          prev.map(obs =>
            obs.id === upcomingObstacle.id ? { ...obs, cleared: true } : obs
          )
        );
      } else {
        // Wrong action!
        showFeedback('Wrong Move! ✗', 'text-red-400');
        setCombo(0);
        setSpeed(s => Math.max(s - 0.5, 3));
      }
    } else {
      // No obstacle nearby - wasted action
      showFeedback('Too Early!', 'text-orange-400');
      setCombo(0);
    }

    setTimeout(() => {
      setCurrentAction(null);
      actionCooldownRef.current = false;
    }, 300);
  };

  // Update max combo
  useEffect(() => {
    if (combo > maxCombo) {
      setMaxCombo(combo);
    }
  }, [combo, maxCombo]);

  // Main game loop
  useEffect(() => {
    if (phase !== 'running') return;

    const gameLoop = () => {
      // Move forward
      setDistance(prev => {
        const newDistance = prev + (speed * 0.016);
        if (newDistance >= COURSE_LENGTH) {
          setPhase('finished');
          return COURSE_LENGTH;
        }
        return newDistance;
      });

      // Check for missed obstacles
      setObstacles(prev =>
        prev.map(obs => {
          if (!obs.cleared && distance > obs.position + 1) {
            // Missed this obstacle!
            if (obs.position + 1 <= distance && obs.position + 1.1 > distance) {
              setMissed(m => m + 1);
              setCombo(0);
              setSpeed(s => Math.max(s - 0.4, 3));
              showFeedback('MISSED! 💥', 'text-red-600');
            }
            return { ...obs, cleared: true };
          }
          return obs;
        })
      );

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [phase, speed, distance]);

  const showFeedback = (text: string, color: string) => {
    const id = Date.now();
    setFeedback({ text, color, id });
    setTimeout(() => {
      setFeedback(null);
    }, 800);
  };

  const getObstacleIcon = (type: ObstacleType): string => {
    switch (type) {
      case 'jump': return '🏃';
      case 'tunnel': return '🚇';
      case 'weave': return '〰️';
    }
  };

  const getObstacleKey = (type: ObstacleType): string => {
    switch (type) {
      case 'jump': return '↑';
      case 'tunnel': return '↓';
      case 'weave': return '← →';
    }
  };

  const calculatePerformance = () => {
    const totalObstacles = obstacles.length;
    const cleared = perfectClears + goodClears;
    const clearRate = cleared / totalObstacles;
    const perfectRate = perfectClears / totalObstacles;

    let performance = 0.3 + (clearRate * 0.5) + (perfectRate * 0.4);

    // Combo bonus
    if (maxCombo >= 10) performance += 0.3;
    else if (maxCombo >= 5) performance += 0.15;

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
      <div className="bg-gradient-to-b from-orange-50 to-yellow-50 rounded-lg p-8 min-h-[600px]">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏃‍♂️🎯</div>
            <h2 className="text-3xl font-bold text-earth-900 mb-2">Agility Obstacle Course</h2>
            <p className="text-earth-600 text-lg">Help {dogName} navigate through the course!</p>
          </div>

          <div className="bg-white rounded-lg p-6 mb-6 shadow-lg">
            <h3 className="font-bold text-earth-900 mb-4 text-xl">⌨️ Controls:</h3>
            <div className="space-y-3 text-earth-700">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🏃</span>
                  <div>
                    <p className="font-semibold text-blue-900">Jump Over Hurdles</p>
                    <p className="text-sm">Press when the hurdle is close!</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-blue-700">↑ or W</div>
              </div>

              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🚇</span>
                  <div>
                    <p className="font-semibold text-yellow-900">Duck Under Tunnel</p>
                    <p className="text-sm">Crouch down to go through!</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-yellow-700">↓ or S</div>
              </div>

              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">〰️</span>
                  <div>
                    <p className="font-semibold text-purple-900">Weave Through Poles</p>
                    <p className="text-sm">Zigzag left and right!</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-purple-700">← → or A/D</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-orange-400 rounded-lg p-4 mb-6">
            <p className="text-orange-900 font-semibold mb-2">🎯 Timing is Everything!</p>
            <ul className="text-sm text-orange-800 space-y-1">
              <li>• Press the right key when obstacles are close for PERFECT timing</li>
              <li>• Build combos to increase {dogName}'s speed!</li>
              <li>• Missing obstacles or wrong moves break your combo</li>
            </ul>
          </div>

          <button
            onClick={handleStart}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all transform hover:scale-105 font-bold text-xl shadow-lg"
          >
            🏁 Start Agility Course
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'running' || phase === 'finished') {
    const progress = (distance / COURSE_LENGTH) * 100;
    const upcomingObstacles = obstacles.filter(
      obs => !obs.cleared && obs.position > distance && obs.position - distance < 15
    );

    return (
      <div className="bg-gradient-to-b from-orange-100 to-yellow-100 rounded-lg p-6 min-h-[700px]">
        <div className="max-w-5xl mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-5 gap-3 mb-4">
            <div className="bg-white/90 rounded-lg p-3 text-center shadow">
              <p className="text-xs text-gray-600 mb-1">Distance</p>
              <p className="text-xl font-bold text-blue-700">{distance.toFixed(0)}m</p>
            </div>
            <div className="bg-white/90 rounded-lg p-3 text-center shadow">
              <p className="text-xs text-gray-600 mb-1">Speed</p>
              <p className="text-xl font-bold text-green-700">{speed.toFixed(1)} m/s</p>
            </div>
            <div className="bg-white/90 rounded-lg p-3 text-center shadow">
              <p className="text-xs text-gray-600 mb-1">Combo</p>
              <p className={`text-2xl font-bold ${combo >= 5 ? 'text-yellow-500' : 'text-gray-700'}`}>
                {combo > 0 ? `${combo}x 🔥` : '-'}
              </p>
            </div>
            <div className="bg-white/90 rounded-lg p-3 text-center shadow">
              <p className="text-xs text-gray-600 mb-1">Perfect</p>
              <p className="text-xl font-bold text-yellow-600">⭐ {perfectClears}</p>
            </div>
            <div className="bg-white/90 rounded-lg p-3 text-center shadow">
              <p className="text-xs text-gray-600 mb-1">Missed</p>
              <p className="text-xl font-bold text-red-600">✗ {missed}</p>
            </div>
          </div>

          {/* Game Area */}
          <div className="relative bg-gradient-to-r from-green-300 via-green-400 to-green-300 rounded-xl overflow-hidden shadow-2xl border-4 border-green-700 h-96">
            {/* Ground line */}
            <div className="absolute bottom-20 left-0 right-0 h-1 bg-brown-600"></div>

            {/* Dog */}
            <div
              className="absolute left-16 transition-all duration-150"
              style={{
                bottom: currentAction === 'jump' ? '180px' : currentAction === 'tunnel' ? '60px' : '120px',
              }}
            >
              <div className="text-6xl">
                {currentAction === 'jump' ? '🦘' : currentAction === 'tunnel' ? '🐾' : currentAction === 'weave' ? '💨' : '🐕'}
              </div>
            </div>

            {/* Obstacles on track */}
            {upcomingObstacles.slice(0, 5).map(obstacle => {
              const distanceToObstacle = obstacle.position - distance;
              const screenX = 200 + (distanceToObstacle * 60);

              if (screenX < -100 || screenX > 900) return null;

              const isInTimingZone = distanceToObstacle < OBSTACLE_APPROACH_ZONE;
              const isPerfectZone = distanceToObstacle < PERFECT_TIMING_ZONE;

              return (
                <div
                  key={obstacle.id}
                  className="absolute transition-all duration-100"
                  style={{
                    left: `${screenX}px`,
                    bottom: '120px',
                  }}
                >
                  <div className={`text-5xl ${isPerfectZone ? 'animate-bounce' : ''}`}>
                    {getObstacleIcon(obstacle.type)}
                  </div>
                  {isInTimingZone && (
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-2xl font-bold text-white drop-shadow-lg">
                      {getObstacleKey(obstacle.type)}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Feedback */}
            {feedback && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className={`text-4xl font-bold ${feedback.color} drop-shadow-lg animate-ping`}>
                  {feedback.text}
                </div>
              </div>
            )}

            {/* Finish overlay */}
            {phase === 'finished' && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                <div className="bg-white rounded-xl p-8 text-center max-w-md shadow-2xl">
                  <div className="text-6xl mb-4">
                    {perfectClears + goodClears >= obstacles.length * 0.8 ? '🏆' : '💪'}
                  </div>
                  <h3 className="text-3xl font-bold text-earth-900 mb-4">Course Complete!</h3>
                  <div className="space-y-2 text-left mb-6">
                    <p className="text-gray-700">⭐ Perfect Clears: <span className="font-bold text-yellow-600">{perfectClears}</span></p>
                    <p className="text-gray-700">✓ Good Clears: <span className="font-bold text-green-600">{goodClears}</span></p>
                    <p className="text-gray-700">✗ Missed: <span className="font-bold text-red-600">{missed}</span></p>
                    <p className="text-gray-700">🔥 Max Combo: <span className="font-bold text-orange-600">{maxCombo}x</span></p>
                  </div>
                  <button
                    onClick={handleFinish}
                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all font-bold text-lg shadow-lg"
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
              <span className="text-sm font-semibold text-gray-700">Course Progress</span>
              <span className="text-sm text-gray-600">{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 via-yellow-400 to-green-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Next obstacle hint */}
          {phase === 'running' && upcomingObstacles.length > 0 && (
            <div className="mt-4 text-center">
              <p className="text-lg font-semibold text-gray-700 mb-2">Next: {getObstacleIcon(upcomingObstacles[0].type)}</p>
              <div className="inline-flex gap-2 bg-white/90 rounded-lg p-3 shadow">
                <span className="text-sm text-gray-600">Press:</span>
                <span className="text-sm font-bold text-orange-700">{getObstacleKey(upcomingObstacles[0].type)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
