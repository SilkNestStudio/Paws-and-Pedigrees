import { useState, useEffect, useCallback } from 'react';

interface DistanceRunGameProps {
  onComplete: (performanceMultiplier: number) => void;
  dogName: string;
}

export default function DistanceRunGame({ onComplete, dogName }: DistanceRunGameProps) {
  const [phase, setPhase] = useState<'ready' | 'running' | 'finished'>('ready');
  const [distance, setDistance] = useState(0);
  const [stamina, setStamina] = useState(100);
  const [pace, setPace] = useState(5); // 1-10 scale
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isResting, setIsResting] = useState(false);

  const TARGET_DISTANCE = 3000; // 3km
  const MAX_TIME = 120; // 2 minutes
  const OPTIMAL_PACE = 6; // Sweet spot for stamina efficiency

  // Game loop
  useEffect(() => {
    if (phase !== 'running') return;

    const gameLoop = setInterval(() => {
      // Update time
      setTimeElapsed(prev => {
        const newTime = prev + 1;
        if (newTime >= MAX_TIME) {
          setPhase('finished');
          return MAX_TIME;
        }
        return newTime;
      });

      // Update distance based on pace
      if (!isResting) {
        setDistance(prev => {
          const newDistance = prev + (pace * 2.5); // meters per second
          if (newDistance >= TARGET_DISTANCE) {
            setPhase('finished');
            return TARGET_DISTANCE;
          }
          return newDistance;
        });

        // Update stamina based on pace
        setStamina(prev => {
          // Stamina drains faster the further from optimal pace
          const paceDeviation = Math.abs(pace - OPTIMAL_PACE);
          const drainRate = 0.15 + (paceDeviation * 0.08);

          const newStamina = Math.max(0, prev - drainRate);

          if (newStamina === 0) {
            // Out of stamina - slow to minimum pace
            setPace(1);
          }

          return newStamina;
        });
      } else {
        // Resting recovers stamina
        setStamina(prev => Math.min(100, prev + 1.5));
      }
    }, 1000);

    return () => clearInterval(gameLoop);
  }, [phase, pace, isResting]);

  const handlePaceChange = useCallback((newPace: number) => {
    if (phase !== 'running' || isResting) return;

    // Can't run fast without stamina
    if (stamina < 10 && newPace > 3) {
      setPace(3);
    } else {
      setPace(newPace);
    }
  }, [phase, stamina, isResting]);

  const handleRest = useCallback(() => {
    if (phase !== 'running' || isResting) return;

    setIsResting(true);
    setPace(0);

    // Rest for 3 seconds
    setTimeout(() => {
      setIsResting(false);
      setPace(4); // Resume at moderate pace
    }, 3000);
  }, [phase, isResting]);

  const calculatePerformance = () => {
    const distanceRatio = Math.min(distance / TARGET_DISTANCE, 1);
    const timeRatio = Math.max(0, (MAX_TIME - timeElapsed) / MAX_TIME);
    const staminaRatio = stamina / 100;

    let performance = 0.3; // Base performance

    // Bonus for completing the distance
    if (distanceRatio >= 1.0) {
      performance = 1.0; // Completed

      // Additional bonuses
      if (staminaRatio > 0.5 && timeRatio > 0.4) {
        performance = 1.5; // Perfect - finished with great time and stamina
      } else if (staminaRatio > 0.3 || timeRatio > 0.3) {
        performance = 1.3; // Excellent
      } else if (staminaRatio > 0.1 || timeRatio > 0.2) {
        performance = 1.2; // Great
      }
    } else if (distanceRatio >= 0.8) {
      performance = 1.0; // Good effort
    } else if (distanceRatio >= 0.6) {
      performance = 0.8; // Decent
    } else if (distanceRatio >= 0.4) {
      performance = 0.6; // Okay
    } else {
      performance = 0.4; // Poor
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
      <div className="bg-gradient-to-b from-sky-50 to-blue-50 rounded-lg p-8 min-h-[600px]">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏃</div>
            <h2 className="text-3xl font-bold text-earth-900 mb-2">Endurance Run Training</h2>
            <p className="text-earth-600 text-lg">
              Build {dogName}'s endurance with a {TARGET_DISTANCE}m distance run!
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 mb-6">
            <h3 className="font-bold text-earth-900 mb-4">How to Play:</h3>
            <ul className="space-y-2 text-earth-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">1.</span>
                <span>Use the pace slider to control {dogName}'s running speed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">2.</span>
                <span>Watch the stamina bar - running too fast drains stamina quickly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">3.</span>
                <span>Click REST to recover stamina (but you'll stop moving!)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">4.</span>
                <span>Complete {TARGET_DISTANCE}m in under {MAX_TIME} seconds</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">5.</span>
                <span>Running out of stamina forces you to walk slowly</span>
              </li>
            </ul>
          </div>

          <div className="bg-green-50 rounded-lg p-4 mb-6">
            <p className="text-green-900 text-sm">
              <strong>💡 Tip:</strong> Find the right balance! Running at a steady, moderate pace (around 6) is most efficient. Too fast and you'll burn out!
            </p>
          </div>

          <button
            onClick={handleStart}
            className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold text-lg"
          >
            Start Endurance Training
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'running' || phase === 'finished') {
    const distanceProgress = (distance / TARGET_DISTANCE) * 100;
    const timeRemaining = MAX_TIME - timeElapsed;

    return (
      <div className="bg-gradient-to-b from-blue-50 to-cyan-50 rounded-lg p-8 min-h-[600px]">
        <div className="max-w-4xl mx-auto">
          {phase === 'finished' && (
            <div className={`${
              distance >= TARGET_DISTANCE
                ? 'bg-green-100 border-green-500'
                : 'bg-yellow-100 border-yellow-500'
            } border-2 rounded-lg p-4 mb-6 text-center`}>
              <p className={`${
                distance >= TARGET_DISTANCE ? 'text-green-900' : 'text-yellow-900'
              } font-bold text-xl`}>
                {distance >= TARGET_DISTANCE ? '🏁 Distance Complete!' : '⏱️ Time\'s Up!'}
              </p>
              <p className={distance >= TARGET_DISTANCE ? 'text-green-700' : 'text-yellow-700'}>
                {distance >= TARGET_DISTANCE
                  ? `Excellent endurance, ${dogName}!`
                  : `You ran ${distance.toFixed(0)}m - keep training!`}
              </p>
            </div>
          )}

          {isResting && phase === 'running' && (
            <div className="bg-purple-100 border-2 border-purple-500 rounded-lg p-4 mb-6 text-center">
              <p className="text-purple-900 font-bold text-xl">💤 Resting...</p>
              <p className="text-purple-700">Recovering stamina</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Distance</p>
              <p className="text-2xl font-bold text-blue-700">{Math.floor(distance)}m</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Time Left</p>
              <p className="text-2xl font-bold text-orange-700">{timeRemaining}s</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Pace</p>
              <p className="text-2xl font-bold text-green-700">{pace}/10</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Stamina</p>
              <p className={`text-2xl font-bold ${
                stamina > 60 ? 'text-green-700' :
                stamina > 30 ? 'text-yellow-700' :
                'text-red-700'
              }`}>
                {Math.floor(stamina)}%
              </p>
            </div>
          </div>

          {/* Track visualization */}
          <div className="bg-white rounded-lg p-6 mb-6">
            <div className="relative h-32 bg-gradient-to-r from-green-200 via-blue-100 to-green-300 rounded-lg overflow-hidden border-4 border-blue-300">
              {/* Finish line */}
              <div className="absolute right-0 top-0 bottom-0 w-3 bg-black">
                <div className="absolute -top-6 right-0 text-xs font-bold text-black">FINISH</div>
              </div>

              {/* Distance markers */}
              {[25, 50, 75].map(percent => (
                <div
                  key={percent}
                  className="absolute top-0 bottom-0 w-px bg-gray-400"
                  style={{ left: `${percent}%` }}
                >
                  <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600">
                    {Math.floor((TARGET_DISTANCE * percent) / 100)}m
                  </span>
                </div>
              ))}

              {/* Dog */}
              <div
                className="absolute top-1/2 transform -translate-y-1/2 transition-all duration-200"
                style={{ left: `${Math.min(distanceProgress, 100)}%` }}
              >
                <div className={`text-5xl ${pace > 7 ? 'animate-bounce' : ''}`}>
                  {isResting ? '😴' : stamina > 30 ? '🐕' : '🐕‍🦺'}
                </div>
              </div>
            </div>
          </div>

          {/* Stamina bar */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Stamina</span>
              <span className="text-sm text-gray-600">{Math.floor(stamina)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  stamina > 60 ? 'bg-green-500' :
                  stamina > 30 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${stamina}%` }}
              ></div>
            </div>
          </div>

          {/* Distance progress */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Distance Progress</span>
              <span className="text-sm text-gray-600">
                {Math.floor(distance)}m / {TARGET_DISTANCE}m
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                style={{ width: `${distanceProgress}%` }}
              ></div>
            </div>
          </div>

          {/* Controls */}
          {phase === 'running' && (
            <div className="space-y-4">
              {/* Pace control */}
              <div className="bg-white rounded-lg p-6">
                <label className="block mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Running Pace</span>
                    <span className={`text-sm font-semibold ${
                      Math.abs(pace - OPTIMAL_PACE) < 2 ? 'text-green-600' :
                      Math.abs(pace - OPTIMAL_PACE) < 4 ? 'text-yellow-600' :
                      'text-orange-600'
                    }`}>
                      {pace === 0 ? 'Resting' :
                       pace < 3 ? 'Walking' :
                       pace < 5 ? 'Jogging' :
                       pace < 7 ? 'Running' :
                       'Sprinting'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={pace}
                    onChange={(e) => handlePaceChange(Number(e.target.value))}
                    disabled={isResting}
                    className="w-full h-4 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    style={{
                      background: `linear-gradient(to right,
                        #3b82f6 0%,
                        #10b981 ${OPTIMAL_PACE * 10}%,
                        #f59e0b ${(OPTIMAL_PACE + 2) * 10}%,
                        #ef4444 100%)`,
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Slow (Save stamina)</span>
                    <span className="text-green-600 font-semibold">Optimal: {OPTIMAL_PACE}</span>
                    <span>Fast (Drain stamina)</span>
                  </div>
                </label>
              </div>

              {/* Rest button */}
              <button
                onClick={handleRest}
                disabled={isResting || stamina > 90}
                className="w-full py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold text-lg"
              >
                {isResting ? '💤 Resting...' : '💤 REST (Recover Stamina)'}
              </button>
            </div>
          )}

          {phase === 'finished' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-6 text-center">
                <p className="text-lg text-gray-700 mb-2">Final Results:</p>
                <p className="text-gray-600">Distance Covered: {Math.floor(distance)}m / {TARGET_DISTANCE}m</p>
                <p className="text-gray-600">Time Taken: {timeElapsed}s / {MAX_TIME}s</p>
                <p className="text-gray-600">Remaining Stamina: {Math.floor(stamina)}%</p>
                <p className="text-2xl font-bold text-blue-700 mt-2">
                  {distance >= TARGET_DISTANCE && stamina > 50
                    ? '🏆 Perfect! Great endurance!'
                    : distance >= TARGET_DISTANCE
                    ? '⭐ Completed! Excellent!'
                    : distance >= TARGET_DISTANCE * 0.8
                    ? '💪 Good effort!'
                    : 'Keep building endurance!'}
                </p>
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
