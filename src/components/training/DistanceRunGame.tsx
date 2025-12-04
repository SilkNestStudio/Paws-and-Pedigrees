import { useState, useEffect, useCallback, useRef } from 'react';

interface DistanceRunGameProps {
  onComplete: (performanceMultiplier: number) => void;
  dogName: string;
}

type Terrain = 'grass' | 'hill' | 'mud' | 'smooth';

export default function DistanceRunGame({ onComplete, dogName }: DistanceRunGameProps) {
  const [phase, setPhase] = useState<'ready' | 'running' | 'finished'>('ready');
  const [distance, setDistance] = useState(0);
  const [targetPace, setTargetPace] = useState(5);
  const [actualPace, setActualPace] = useState(5);
  const [stamina, setStamina] = useState(100);
  const [currentTerrain, setCurrentTerrain] = useState<Terrain>('grass');
  const [terrainChanges, setTerrainChanges] = useState<Array<{ distance: number; terrain: Terrain }>>([]);
  const [paceZoneScore, setPaceZoneScore] = useState(0);
  const [perfectPaceTime, setPerfectPaceTime] = useState(0);
  const [goodPaceTime, setGoodPaceTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const gameLoopRef = useRef<number>();
  const lastUpdateRef = useRef(Date.now());

  const TARGET_DISTANCE = 3000; // 3km
  const MAX_TIME = 180; // 3 minutes
  const OPTIMAL_PACE_RANGE = 1.5; // How close to target pace is "perfect"
  const GOOD_PACE_RANGE = 3; // How close is "good"

  // Generate terrain changes
  useEffect(() => {
    if (phase === 'running' && terrainChanges.length === 0) {
      const terrains: Terrain[] = ['grass', 'hill', 'mud', 'smooth'];
      const changes: Array<{ distance: number; terrain: Terrain }> = [];

      for (let i = 0; i < 12; i++) {
        changes.push({
          distance: 200 + (i * 250),
          terrain: terrains[Math.floor(Math.random() * terrains.length)]
        });
      }

      setTerrainChanges(changes);
    }
  }, [phase, terrainChanges.length]);

  // Main game loop
  useEffect(() => {
    if (phase !== 'running') return;

    const gameLoop = () => {
      const now = Date.now();
      const deltaTime = (now - lastUpdateRef.current) / 1000;
      lastUpdateRef.current = now;

      // Update total time
      setTotalTime(prev => {
        const newTime = prev + deltaTime;
        if (newTime >= MAX_TIME) {
          setPhase('finished');
          return MAX_TIME;
        }
        return newTime;
      });

      // Check terrain changes
      terrainChanges.forEach(change => {
        if (Math.abs(distance - change.distance) < 5 && currentTerrain !== change.terrain) {
          setCurrentTerrain(change.terrain);
        }
      });

      // Calculate stamina drain/recovery based on pace efficiency
      const paceError = Math.abs(actualPace - targetPace);
      const isInPerfectZone = paceError < OPTIMAL_PACE_RANGE;
      const isInGoodZone = paceError < GOOD_PACE_RANGE;

      setStamina(prev => {
        let staminaChangePerSecond = 0;

        if (isInPerfectZone) {
          // Perfect pace - slow stamina drain with recovery when low
          staminaChangePerSecond = -2 + (prev < 60 ? 4 : 0);
          setPerfectPaceTime(t => t + deltaTime);
        } else if (isInGoodZone) {
          // Good pace - moderate stamina drain
          staminaChangePerSecond = -5;
          setGoodPaceTime(t => t + deltaTime);
        } else {
          // Poor pacing - fast stamina drain
          staminaChangePerSecond = -12 - (paceError * 2);
        }

        // Terrain affects stamina per second
        if (currentTerrain === 'hill') staminaChangePerSecond -= 3;
        else if (currentTerrain === 'mud') staminaChangePerSecond -= 2;
        else if (currentTerrain === 'smooth') staminaChangePerSecond += 2;

        const staminaChange = staminaChangePerSecond * deltaTime;
        const newStamina = Math.max(0, Math.min(100, prev + staminaChange));

        // If stamina is very low, force slower pace
        if (newStamina < 20) {
          setActualPace(p => Math.max(1, p - 0.1));
        }

        return newStamina;
      });

      // Track pace zone performance
      if (isInPerfectZone) {
        setPaceZoneScore(s => s + 2);
      } else if (isInGoodZone) {
        setPaceZoneScore(s => s + 1);
      }

      // Move forward based on actual pace
      setDistance(prev => {
        const terrainMultiplier =
          currentTerrain === 'smooth' ? 1.2 :
          currentTerrain === 'hill' ? 0.7 :
          currentTerrain === 'mud' ? 0.8 :
          1.0;

        const staminaMultiplier = stamina > 20 ? 1 : (stamina / 20);
        const newDistance = prev + (actualPace * terrainMultiplier * staminaMultiplier * deltaTime * 10);

        if (newDistance >= TARGET_DISTANCE) {
          setPhase('finished');
          return TARGET_DISTANCE;
        }

        return newDistance;
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [phase, actualPace, targetPace, stamina, currentTerrain, distance, terrainChanges]);

  const handlePaceChange = useCallback((newPace: number) => {
    if (phase !== 'running') return;
    setActualPace(Math.max(1, Math.min(10, newPace)));
  }, [phase]);

  // Auto-adjust target pace based on terrain
  useEffect(() => {
    if (currentTerrain === 'hill') {
      setTargetPace(4);
    } else if (currentTerrain === 'mud') {
      setTargetPace(5);
    } else if (currentTerrain === 'smooth') {
      setTargetPace(7);
    } else {
      setTargetPace(6);
    }
  }, [currentTerrain]);

  const getTerrainEmoji = (terrain: Terrain): string => {
    switch (terrain) {
      case 'grass': return '🌱';
      case 'hill': return '⛰️';
      case 'mud': return '💦';
      case 'smooth': return '🛣️';
    }
  };

  const getTerrainColor = (terrain: Terrain): string => {
    switch (terrain) {
      case 'grass': return 'from-green-300 to-green-400';
      case 'hill': return 'from-amber-400 to-orange-500';
      case 'mud': return 'from-amber-700 to-amber-900';
      case 'smooth': return 'from-gray-300 to-gray-400';
    }
  };

  const calculatePerformance = () => {
    const completionRatio = Math.min(distance / TARGET_DISTANCE, 1);
    const paceEfficiency = (perfectPaceTime + goodPaceTime * 0.5) / (totalTime || 1);
    const staminaRatio = stamina / 100;

    let performance = 0.3 + (completionRatio * 0.4) + (paceEfficiency * 0.4) + (staminaRatio * 0.2);

    // Time bonus
    if (completionRatio >= 1.0) {
      const timeRatio = totalTime / MAX_TIME;
      if (timeRatio < 0.6) performance += 0.3; // Very fast
      else if (timeRatio < 0.8) performance += 0.2; // Fast
      else if (timeRatio < 1.0) performance += 0.1; // Good
    }

    return Math.min(1.5, Math.max(0.3, performance));
  };

  const handleFinish = () => {
    const performance = calculatePerformance();
    onComplete(performance);
  };

  const handleStart = () => {
    setPhase('running');
    lastUpdateRef.current = Date.now();
  };

  if (phase === 'ready') {
    return (
      <div className="bg-gradient-to-b from-sky-50 to-blue-50 rounded-lg p-8 min-h-[600px]">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏃‍♂️💨</div>
            <h2 className="text-3xl font-bold text-earth-900 mb-2">Endurance Distance Run</h2>
            <p className="text-earth-600 text-lg">Guide {dogName} through a {TARGET_DISTANCE}m run!</p>
          </div>

          <div className="bg-white rounded-lg p-6 mb-6 shadow-lg">
            <h3 className="font-bold text-earth-900 mb-4 text-xl">🎮 How to Play:</h3>
            <div className="space-y-3 text-earth-700">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="text-2xl">🎚️</span>
                <div>
                  <p className="font-semibold text-blue-900">Control the Pace</p>
                  <p className="text-sm">Use the slider to adjust {dogName}'s running speed</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <span className="text-2xl">🎯</span>
                <div>
                  <p className="font-semibold text-green-900">Match the Target Pace</p>
                  <p className="text-sm">Keep the pace indicator in the green zone to conserve stamina!</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                <span className="text-2xl">🌍</span>
                <div>
                  <p className="font-semibold text-orange-900">Adapt to Terrain</p>
                  <p className="text-sm">Hills, mud, and smooth paths require different pacing strategies!</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                <span className="text-2xl">⚡</span>
                <div>
                  <p className="font-semibold text-purple-900">Manage Stamina</p>
                  <p className="text-sm">Poor pacing drains stamina fast - pace yourself to finish strong!</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-400 rounded-lg p-4 mb-6">
            <p className="text-blue-900 font-semibold mb-2">💡 Strategy Tip:</p>
            <p className="text-sm text-blue-800">Different terrains have different optimal paces. Watch the target pace indicator and adjust accordingly. Running too fast or too slow wastes stamina!</p>
          </div>

          <button
            onClick={handleStart}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all transform hover:scale-105 font-bold text-xl shadow-lg"
          >
            🏃 Start Distance Run
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'running' || phase === 'finished') {
    const progress = (distance / TARGET_DISTANCE) * 100;
    const paceError = Math.abs(actualPace - targetPace);
    const isInPerfectZone = paceError < OPTIMAL_PACE_RANGE;
    const isInGoodZone = paceError < GOOD_PACE_RANGE;
    const timeLeft = MAX_TIME - totalTime;

    return (
      <div className="bg-gradient-to-b from-cyan-50 to-blue-50 rounded-lg p-6 min-h-[700px]">
        <div className="max-w-5xl mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-5 gap-3 mb-4">
            <div className="bg-white/90 rounded-lg p-3 text-center shadow">
              <p className="text-xs text-gray-600 mb-1">Distance</p>
              <p className="text-xl font-bold text-blue-700">{distance.toFixed(0)}m</p>
            </div>
            <div className="bg-white/90 rounded-lg p-3 text-center shadow">
              <p className="text-xs text-gray-600 mb-1">Time Left</p>
              <p className={`text-xl font-bold ${timeLeft < 30 ? 'text-red-600' : 'text-green-700'}`}>
                {Math.floor(timeLeft)}s
              </p>
            </div>
            <div className="bg-white/90 rounded-lg p-3 text-center shadow">
              <p className="text-xs text-gray-600 mb-1">Stamina</p>
              <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden mt-1">
                <div
                  className={`absolute inset-0 transition-all ${
                    stamina > 60 ? 'bg-green-500' :
                    stamina > 30 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${stamina}%` }}
                />
              </div>
            </div>
            <div className="bg-white/90 rounded-lg p-3 text-center shadow">
              <p className="text-xs text-gray-600 mb-1">Terrain</p>
              <p className="text-2xl">{getTerrainEmoji(currentTerrain)}</p>
            </div>
            <div className="bg-white/90 rounded-lg p-3 text-center shadow">
              <p className="text-xs text-gray-600 mb-1">Zone Score</p>
              <p className="text-xl font-bold text-purple-700">{paceZoneScore}</p>
            </div>
          </div>

          {/* Running Track */}
          <div className={`relative bg-gradient-to-r ${getTerrainColor(currentTerrain)} rounded-xl overflow-hidden shadow-2xl border-4 border-gray-600 h-48 mb-4`}>
            {/* Distance markers */}
            {[25, 50, 75].map(percent => (
              <div
                key={percent}
                className="absolute top-0 bottom-0 w-px bg-white/50"
                style={{ left: `${percent}%` }}
              >
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-white font-bold drop-shadow">
                  {Math.floor((TARGET_DISTANCE * percent) / 100)}m
                </span>
              </div>
            ))}

            {/* Dog */}
            <div
              className="absolute top-1/2 -translate-y-1/2 transition-all duration-300"
              style={{ left: `${Math.min(progress, 100)}%` }}
            >
              <div
                className="text-6xl"
                style={{
                  transform: `scaleX(${1 + actualPace * 0.05}) ${stamina < 20 ? 'opacity(0.6)' : ''}`,
                  transition: 'transform 0.3s'
                }}
              >
                {stamina < 20 ? '😮‍💨' : actualPace > 7 ? '🏃‍♂️💨' : '🐕'}
              </div>
            </div>

            {/* Finish line */}
            <div className="absolute right-0 top-0 bottom-0 w-4 bg-black/80 flex items-center justify-center">
              <span className="text-white text-xs font-bold transform rotate-90">FINISH</span>
            </div>

            {/* Finish overlay */}
            {phase === 'finished' && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
                <div className="bg-white rounded-xl p-8 text-center max-w-md shadow-2xl">
                  <div className="text-6xl mb-4">
                    {distance >= TARGET_DISTANCE ? '🏆' : '💪'}
                  </div>
                  <h3 className="text-3xl font-bold text-earth-900 mb-4">
                    {distance >= TARGET_DISTANCE ? 'Distance Complete!' : 'Time Up!'}
                  </h3>
                  <div className="space-y-2 text-left mb-6">
                    <p className="text-gray-700">📏 Distance: <span className="font-bold">{distance.toFixed(0)}m / {TARGET_DISTANCE}m</span></p>
                    <p className="text-gray-700">⏱️ Time: <span className="font-bold">{totalTime.toFixed(1)}s</span></p>
                    <p className="text-gray-700">💚 Perfect Pace: <span className="font-bold text-green-600">{perfectPaceTime.toFixed(1)}s</span></p>
                    <p className="text-gray-700">💛 Good Pace: <span className="font-bold text-yellow-600">{goodPaceTime.toFixed(1)}s</span></p>
                    <p className="text-gray-700">⚡ Stamina Left: <span className="font-bold">{stamina.toFixed(0)}%</span></p>
                  </div>
                  <button
                    onClick={handleFinish}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all font-bold text-lg shadow-lg"
                  >
                    Complete Training
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pace Control */}
          <div className="bg-white/90 rounded-lg p-6 mb-4 shadow">
            <div className="flex justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-700">Current Pace</p>
                <p className="text-3xl font-bold text-blue-700">{actualPace.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Target Pace</p>
                <p className="text-3xl font-bold text-green-700">{targetPace.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Status</p>
                <p className={`text-2xl font-bold ${
                  isInPerfectZone ? 'text-green-600' :
                  isInGoodZone ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {isInPerfectZone ? '✓ Perfect!' : isInGoodZone ? '~ Good' : '✗ Adjust!'}
                </p>
              </div>
            </div>

            {/* Pace indicator */}
            <div className="relative w-full h-16 bg-gray-200 rounded-lg overflow-hidden mb-4">
              {/* Target zone */}
              <div
                className="absolute top-0 bottom-0 bg-green-300/50"
                style={{
                  left: `${Math.max(0, ((targetPace - OPTIMAL_PACE_RANGE) / 10) * 100)}%`,
                  width: `${(OPTIMAL_PACE_RANGE * 2 / 10) * 100}%`
                }}
              />
              <div
                className="absolute top-0 bottom-0 bg-yellow-300/30"
                style={{
                  left: `${Math.max(0, ((targetPace - GOOD_PACE_RANGE) / 10) * 100)}%`,
                  width: `${(GOOD_PACE_RANGE * 2 / 10) * 100}%`
                }}
              />

              {/* Actual pace indicator */}
              <div
                className="absolute top-0 bottom-0 w-2 bg-blue-600 transition-all duration-300"
                style={{ left: `${(actualPace / 10) * 100}%` }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-8 border-transparent border-b-blue-600"></div>
              </div>

              {/* Scale */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs text-gray-600">
                {[0, 2, 4, 6, 8, 10].map(n => (
                  <span key={n}>{n}</span>
                ))}
              </div>
            </div>

            {/* Slider */}
            {phase === 'running' && (
              <div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.1"
                  value={actualPace}
                  onChange={(e) => handlePaceChange(Number(e.target.value))}
                  className="w-full h-4 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Slow</span>
                  <span>Fast</span>
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="bg-white/90 rounded-lg p-4 shadow">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Distance Progress</span>
              <span className="text-sm text-gray-600">{progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-400 via-cyan-400 to-green-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
