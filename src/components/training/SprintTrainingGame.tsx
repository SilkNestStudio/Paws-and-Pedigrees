import { useState, useEffect, useCallback } from 'react';

interface SprintTrainingGameProps {
  onComplete: (performanceMultiplier: number) => void;
  dogName: string;
}

export default function SprintTrainingGame({ onComplete, dogName }: SprintTrainingGameProps) {
  const [phase, setPhase] = useState<'ready' | 'countdown' | 'running' | 'finished'>('ready');
  const [countdown, setCountdown] = useState(3);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [stamina, setStamina] = useState(100);
  const [acceleration, setAcceleration] = useState(0);
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [countdownStartTime, setCountdownStartTime] = useState<number>(0);
  const [earlyStart, setEarlyStart] = useState(false);

  const SPRINT_DISTANCE = 100; // meters
  const MAX_SPEED = 15; // m/s
  const STAMINA_DRAIN_RATE = 1.5; // per frame when sprinting

  // Countdown phase
  useEffect(() => {
    if (phase === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => {
        if (countdown === 3) {
          setCountdownStartTime(Date.now());
        }
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'countdown' && countdown === 0) {
      setPhase('running');
    }
  }, [phase, countdown]);

  // Game loop for running phase
  useEffect(() => {
    if (phase !== 'running' || earlyStart) return;

    const gameLoop = setInterval(() => {
      setDistance(prev => {
        const newDistance = prev + speed / 60; // 60 FPS
        if (newDistance >= SPRINT_DISTANCE) {
          setPhase('finished');
          return SPRINT_DISTANCE;
        }
        return newDistance;
      });

      // Speed decays slightly over time as stamina depletes
      setSpeed(prev => {
        if (stamina <= 0) return Math.max(0, prev - 0.3);
        return prev;
      });

      // Drain stamina when sprinting
      if (speed > 5) {
        setStamina(prev => Math.max(0, prev - STAMINA_DRAIN_RATE));
      }
    }, 1000 / 60);

    return () => clearInterval(gameLoop);
  }, [phase, speed, stamina, earlyStart]);

  const handleStart = useCallback(() => {
    if (phase === 'ready') {
      setPhase('countdown');
    } else if (phase === 'countdown') {
      // Early start - penalty
      setEarlyStart(true);
      setReactionTime(-1);
    } else if (phase === 'running' && reactionTime === null) {
      // Measure reaction time
      const reaction = Date.now() - (countdownStartTime + 3000);
      setReactionTime(reaction);
    }
  }, [phase, countdownStartTime, reactionTime]);

  const handleAccelerate = useCallback(() => {
    if (phase !== 'running' || earlyStart) return;

    setAcceleration(prev => {
      const newAccel = Math.min(prev + 0.5, 3);
      return newAccel;
    });

    setSpeed(prev => {
      const staminaMultiplier = stamina > 20 ? 1 : stamina / 20;
      const newSpeed = Math.min(prev + acceleration * staminaMultiplier, MAX_SPEED);
      return newSpeed;
    });
  }, [phase, acceleration, stamina, earlyStart]);

  const handleDecelerate = useCallback(() => {
    if (phase !== 'running') return;

    setAcceleration(0);
    setSpeed(prev => Math.max(0, prev - 0.3));
  }, [phase]);

  const calculatePerformance = () => {
    if (earlyStart) return 0.3; // Major penalty for early start

    let performance = 0.5; // Base performance

    // Bonus for fast reaction time
    if (reactionTime !== null && reactionTime < 200) performance += 0.1;
    else if (reactionTime !== null && reactionTime < 300) performance += 0.05;

    // Bonus for completion percentage
    const completionRatio = distance / SPRINT_DISTANCE;
    performance += completionRatio * 0.4;

    // Bonus for remaining stamina (efficient running)
    performance += (stamina / 100) * 0.1;

    return Math.min(1.5, Math.max(0.3, performance));
  };

  const handleFinish = () => {
    const performance = calculatePerformance();
    onComplete(performance);
  };

  if (phase === 'ready') {
    return (
      <div className="bg-gradient-to-b from-green-50 to-blue-50 rounded-lg p-8 min-h-[600px]">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏃</div>
            <h2 className="text-3xl font-bold text-earth-900 mb-2">Sprint Training</h2>
            <p className="text-earth-600 text-lg">Teach {dogName} to run fast!</p>
          </div>

          <div className="bg-white rounded-lg p-6 mb-6">
            <h3 className="font-bold text-earth-900 mb-4">How to Play:</h3>
            <ul className="space-y-2 text-earth-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600">1.</span>
                <span>Wait for the countdown (3, 2, 1, GO!)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">2.</span>
                <span>Click START as soon as you see "GO!" for best reaction time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">3.</span>
                <span>Rapidly click ACCELERATE to build speed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">4.</span>
                <span>Watch your stamina - running too hard will slow you down!</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">5.</span>
                <span>Complete the 100m sprint as fast as possible</span>
              </li>
            </ul>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4 mb-6">
            <p className="text-yellow-900 text-sm">
              <strong>⚠️ Warning:</strong> Don't click before "GO!" or you'll get a penalty for a false start!
            </p>
          </div>

          <button
            onClick={handleStart}
            className="w-full py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold text-lg"
          >
            Start Sprint Training
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'countdown') {
    return (
      <div className="bg-gradient-to-b from-yellow-50 to-orange-50 rounded-lg p-8 min-h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-9xl font-bold text-orange-600 mb-8">
            {countdown === 0 ? 'GO!' : countdown}
          </div>
          <p className="text-2xl text-earth-700">
            {countdown === 0 ? 'Click START NOW!' : 'Get ready...'}
          </p>
          {countdown === 0 && (
            <button
              onClick={handleStart}
              className="mt-8 px-12 py-6 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold text-2xl animate-pulse"
            >
              START!
            </button>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'running' || phase === 'finished') {
    const progress = (distance / SPRINT_DISTANCE) * 100;

    return (
      <div className="bg-gradient-to-b from-blue-50 to-purple-50 rounded-lg p-8 min-h-[600px]">
        <div className="max-w-4xl mx-auto">
          {earlyStart && (
            <div className="bg-red-100 border-2 border-red-500 rounded-lg p-4 mb-6 text-center">
              <p className="text-red-900 font-bold text-xl">FALSE START!</p>
              <p className="text-red-700">You started before the signal. Performance penalty applied.</p>
            </div>
          )}

          {phase === 'finished' && !earlyStart && (
            <div className="bg-green-100 border-2 border-green-500 rounded-lg p-4 mb-6 text-center">
              <p className="text-green-900 font-bold text-xl">🏁 Sprint Complete!</p>
              <p className="text-green-700">Great job, {dogName}!</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Distance</p>
              <p className="text-2xl font-bold text-blue-700">{distance.toFixed(1)}m</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Speed</p>
              <p className="text-2xl font-bold text-green-700">{speed.toFixed(1)} m/s</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Stamina</p>
              <p className="text-2xl font-bold text-orange-700">{stamina.toFixed(0)}%</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Reaction</p>
              <p className="text-2xl font-bold text-purple-700">
                {reactionTime === null ? '--' : reactionTime === -1 ? 'EARLY' : `${reactionTime}ms`}
              </p>
            </div>
          </div>

          {/* Track visualization */}
          <div className="bg-white rounded-lg p-6 mb-6">
            <div className="relative h-24 bg-gradient-to-r from-green-200 to-blue-200 rounded-lg overflow-hidden">
              {/* Finish line */}
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-black"></div>

              {/* Dog position */}
              <div
                className="absolute top-1/2 transform -translate-y-1/2 transition-all duration-100"
                style={{ left: `${progress}%` }}
              >
                <div className="text-4xl">🐕</div>
              </div>

              {/* Distance markers */}
              {[25, 50, 75].map(marker => (
                <div
                  key={marker}
                  className="absolute top-0 bottom-0 w-px bg-gray-400"
                  style={{ left: `${marker}%` }}
                >
                  <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600">
                    {marker}m
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stamina bar */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Stamina</span>
              <span className="text-sm text-gray-600">{stamina.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
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

          {/* Controls */}
          {phase === 'running' && !earlyStart && (
            <div className="flex gap-4 justify-center">
              <button
                onMouseDown={handleAccelerate}
                onMouseUp={handleDecelerate}
                onTouchStart={handleAccelerate}
                onTouchEnd={handleDecelerate}
                className="px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors font-bold text-lg"
              >
                🏃 ACCELERATE (Click Rapidly!)
              </button>
            </div>
          )}

          {phase === 'finished' && (
            <button
              onClick={handleFinish}
              className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold text-lg"
            >
              Complete Training
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
