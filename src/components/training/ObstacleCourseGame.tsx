import { useState, useEffect, useCallback } from 'react';

interface ObstacleCourseGameProps {
  onComplete: (performanceMultiplier: number) => void;
  dogName: string;
}

type ObstacleType = 'jump' | 'tunnel' | 'weave';

interface Obstacle {
  id: number;
  type: ObstacleType;
  position: number;
}

export default function ObstacleCourseGame({ onComplete, dogName }: ObstacleCourseGameProps) {
  const [phase, setPhase] = useState<'ready' | 'running' | 'finished'>('ready');
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [dogPosition, setDogPosition] = useState(0);
  const [dogState, setDogState] = useState<'normal' | 'jumping' | 'crouching' | 'weaving'>('normal');
  const [obstaclesPassed, setObstaclesPassed] = useState(0);
  const [obstaclesHit, setObstaclesHit] = useState(0);
  const [score, setScore] = useState(0);
  const [courseProgress, setCourseProgress] = useState(0);

  const TOTAL_OBSTACLES = 12;
  const COURSE_LENGTH = 100;
  const MOVE_SPEED = 0.5;

  // Initialize obstacles
  useEffect(() => {
    if (phase === 'running' && obstacles.length === 0) {
      const newObstacles: Obstacle[] = [];
      const types: ObstacleType[] = ['jump', 'tunnel', 'weave'];

      for (let i = 0; i < TOTAL_OBSTACLES; i++) {
        newObstacles.push({
          id: i,
          type: types[Math.floor(Math.random() * types.length)],
          position: 10 + (i * (COURSE_LENGTH - 20) / TOTAL_OBSTACLES),
        });
      }
      setObstacles(newObstacles);
    }
  }, [phase, obstacles.length]);

  // Game loop - move dog forward
  useEffect(() => {
    if (phase !== 'running') return;

    const gameLoop = setInterval(() => {
      setDogPosition(prev => {
        const newPos = prev + MOVE_SPEED;
        setCourseProgress((newPos / COURSE_LENGTH) * 100);

        if (newPos >= COURSE_LENGTH) {
          setPhase('finished');
          return COURSE_LENGTH;
        }
        return newPos;
      });
    }, 1000 / 60);

    return () => clearInterval(gameLoop);
  }, [phase]);

  // Collision detection
  useEffect(() => {
    if (phase !== 'running') return;

    obstacles.forEach(obstacle => {
      const distance = Math.abs(dogPosition - obstacle.position);

      if (distance < 2 && !obstacle.id.toString().includes('passed')) {
        // Dog is at obstacle
        const correctAction =
          (obstacle.type === 'jump' && dogState === 'jumping') ||
          (obstacle.type === 'tunnel' && dogState === 'crouching') ||
          (obstacle.type === 'weave' && dogState === 'weaving');

        if (correctAction || dogState === 'normal') {
          // Mark as evaluated
          if (correctAction) {
            // Perfect navigation
            setObstaclesPassed(prev => prev + 1);
            setScore(prev => prev + 100);
          } else {
            // Hit obstacle
            setObstaclesHit(prev => prev + 1);
            setScore(prev => Math.max(0, prev - 50));
          }
          // Mark obstacle as passed
          setObstacles(prev => prev.map(obs =>
            obs.id === obstacle.id
              ? { ...obs, id: parseInt(obs.id + 'passed') }
              : obs
          ));
        }
      }
    });
  }, [dogPosition, obstacles, dogState, phase]);

  const handleAction = useCallback((action: 'jump' | 'crouch' | 'weave') => {
    if (phase !== 'running' || dogState !== 'normal') return;

    const stateMap = {
      jump: 'jumping',
      crouch: 'crouching',
      weave: 'weaving',
    } as const;

    setDogState(stateMap[action]);

    setTimeout(() => {
      setDogState('normal');
    }, 600);
  }, [phase, dogState]);

  const calculatePerformance = () => {
    const accuracy = obstaclesPassed / TOTAL_OBSTACLES;
    const hitRatio = obstaclesHit / TOTAL_OBSTACLES;

    let performance = 0.5; // Base performance

    // Bonus for accuracy
    if (accuracy === 1.0 && obstaclesHit === 0) {
      performance = 1.5; // Perfect run
    } else if (accuracy >= 0.9 && hitRatio <= 0.1) {
      performance = 1.3; // Excellent
    } else if (accuracy >= 0.75 && hitRatio <= 0.2) {
      performance = 1.1; // Great
    } else if (accuracy >= 0.6) {
      performance = 0.9; // Good
    } else if (accuracy >= 0.4) {
      performance = 0.7; // Okay
    } else {
      performance = 0.5; // Poor
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
      <div className="bg-gradient-to-b from-green-50 to-yellow-50 rounded-lg p-8 min-h-[600px]">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏃‍♂️</div>
            <h2 className="text-3xl font-bold text-earth-900 mb-2">Agility Course Training</h2>
            <p className="text-earth-600 text-lg">Navigate {dogName} through the obstacle course!</p>
          </div>

          <div className="bg-white rounded-lg p-6 mb-6">
            <h3 className="font-bold text-earth-900 mb-4">How to Play:</h3>
            <ul className="space-y-2 text-earth-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600">1.</span>
                <span>{dogName} will run automatically through the course</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">2.</span>
                <span>When approaching an obstacle, press the correct button:</span>
              </li>
              <li className="flex items-start gap-4 ml-6">
                <span>🏃 JUMP - for hurdles and jumps</span>
              </li>
              <li className="flex items-start gap-4 ml-6">
                <span>🚇 TUNNEL - for tunnels (crouch down)</span>
              </li>
              <li className="flex items-start gap-4 ml-6">
                <span>〰️ WEAVE - for weave poles (zigzag through)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">3.</span>
                <span>Complete all {TOTAL_OBSTACLES} obstacles for maximum score</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">4.</span>
                <span>Hitting obstacles will reduce your score</span>
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-blue-900 text-sm">
              <strong>💡 Tip:</strong> Watch ahead to see what obstacle is coming and be ready to press the right button at the right time!
            </p>
          </div>

          <button
            onClick={handleStart}
            className="w-full py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold text-lg"
          >
            Start Agility Training
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'running' || phase === 'finished') {
    const getObstacleEmoji = (type: ObstacleType) => {
      switch (type) {
        case 'jump': return '🏃';
        case 'tunnel': return '🚇';
        case 'weave': return '〰️';
      }
    };

    const getDogEmoji = () => {
      switch (dogState) {
        case 'jumping': return '🦘';
        case 'crouching': return '🐾';
        case 'weaving': return '💨';
        default: return '🐕';
      }
    };

    return (
      <div className="bg-gradient-to-b from-blue-50 to-green-50 rounded-lg p-8 min-h-[600px]">
        <div className="max-w-4xl mx-auto">
          {phase === 'finished' && (
            <div className="bg-green-100 border-2 border-green-500 rounded-lg p-4 mb-6 text-center">
              <p className="text-green-900 font-bold text-xl">🏁 Course Complete!</p>
              <p className="text-green-700">
                {obstaclesHit === 0 ? 'Perfect run! No obstacles hit!' : `Great effort, ${dogName}!`}
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Progress</p>
              <p className="text-2xl font-bold text-blue-700">{courseProgress.toFixed(0)}%</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Cleared</p>
              <p className="text-2xl font-bold text-green-700">{obstaclesPassed}/{TOTAL_OBSTACLES}</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Hits</p>
              <p className="text-2xl font-bold text-red-700">{obstaclesHit}</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Score</p>
              <p className="text-2xl font-bold text-purple-700">{score}</p>
            </div>
          </div>

          {/* Course visualization */}
          <div className="bg-white rounded-lg p-6 mb-6">
            <div className="relative h-32 bg-gradient-to-r from-green-100 via-yellow-50 to-green-200 rounded-lg overflow-hidden border-4 border-green-300">
              {/* Finish line */}
              <div className="absolute right-0 top-0 bottom-0 w-3 bg-black flex items-center justify-center">
                <span className="text-white text-xs transform rotate-90">FINISH</span>
              </div>

              {/* Dog */}
              <div
                className="absolute top-1/2 transform -translate-y-1/2 transition-all duration-100"
                style={{ left: `${(dogPosition / COURSE_LENGTH) * 100}%` }}
              >
                <div className="text-4xl">{getDogEmoji()}</div>
              </div>

              {/* Obstacles */}
              {obstacles.map(obstacle => {
                const isNear = Math.abs(dogPosition - obstacle.position) < 10;
                return (
                  <div
                    key={obstacle.id}
                    className={`absolute top-1/2 transform -translate-y-1/2 transition-all ${
                      isNear ? 'scale-125' : 'scale-100'
                    }`}
                    style={{ left: `${(obstacle.position / COURSE_LENGTH) * 100}%` }}
                  >
                    <div className="text-3xl">{getObstacleEmoji(obstacle.type)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Course Progress</span>
              <span className="text-sm text-gray-600">{courseProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-green-600 transition-all"
                style={{ width: `${courseProgress}%` }}
              ></div>
            </div>
          </div>

          {/* Controls */}
          {phase === 'running' && (
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => handleAction('jump')}
                disabled={dogState !== 'normal'}
                className="px-6 py-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold text-lg"
              >
                🏃 JUMP
              </button>
              <button
                onClick={() => handleAction('crouch')}
                disabled={dogState !== 'normal'}
                className="px-6 py-6 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 active:bg-yellow-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold text-lg"
              >
                🚇 TUNNEL
              </button>
              <button
                onClick={() => handleAction('weave')}
                disabled={dogState !== 'normal'}
                className="px-6 py-6 bg-purple-600 text-white rounded-lg hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold text-lg"
              >
                〰️ WEAVE
              </button>
            </div>
          )}

          {phase === 'finished' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-6 text-center">
                <p className="text-lg text-gray-700 mb-2">Final Results:</p>
                <p className="text-gray-600">Obstacles Cleared: {obstaclesPassed}/{TOTAL_OBSTACLES}</p>
                <p className="text-gray-600">Obstacles Hit: {obstaclesHit}</p>
                <p className="text-2xl font-bold text-green-700 mt-2">Final Score: {score}</p>
              </div>
              <button
                onClick={handleFinish}
                className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold text-lg"
              >
                Complete Training
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
