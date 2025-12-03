import { useState, useEffect, useCallback } from 'react';

interface WeightPullGameProps {
  onComplete: (performanceMultiplier: number) => void;
  dogName: string;
}

export default function WeightPullGame({ onComplete, dogName }: WeightPullGameProps) {
  const [phase, setPhase] = useState<'ready' | 'pulling' | 'finished'>('ready');
  const [currentWeight, setCurrentWeight] = useState(50); // kg
  const [pullProgress, setPullProgress] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [rhythm, setRhythm] = useState<number[]>([]);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [weightsCompleted, setWeightsCompleted] = useState(0);
  const [totalWeight, setTotalWeight] = useState(0);
  const [rhythmQuality, setRhythmQuality] = useState(100);

  const WEIGHTS = [50, 75, 100, 125, 150, 175, 200];
  const CLICKS_NEEDED = 30;
  const IDEAL_RHYTHM_MS = 200; // Ideal time between clicks
  const RHYTHM_TOLERANCE = 50; // ms

  // Monitor rhythm quality
  useEffect(() => {
    if (rhythm.length < 2) return;

    // Calculate rhythm consistency
    const recentRhythm = rhythm.slice(-5);
    const avgRhythm = recentRhythm.reduce((a, b) => a + b, 0) / recentRhythm.length;
    const variance = recentRhythm.reduce((sum, time) => sum + Math.abs(time - avgRhythm), 0) / recentRhythm.length;

    // Good rhythm = close to ideal
    const rhythmDeviation = Math.abs(avgRhythm - IDEAL_RHYTHM_MS);
    const quality = Math.max(0, 100 - (rhythmDeviation / 2) - (variance / 2));
    setRhythmQuality(Math.floor(quality));
  }, [rhythm]);

  // Auto-fail if too slow
  useEffect(() => {
    if (phase !== 'pulling') return;

    const timeout = setTimeout(() => {
      if (pullProgress < 100) {
        // Took too long, weight falls back
        handleWeightFail();
      }
    }, 10000); // 10 seconds per weight

    return () => clearTimeout(timeout);
  }, [phase, currentWeight, pullProgress]);

  const handleClick = useCallback(() => {
    if (phase !== 'pulling') return;

    const now = Date.now();
    const timeSinceLast = now - lastClickTime;

    if (lastClickTime !== 0) {
      setRhythm(prev => [...prev.slice(-9), timeSinceLast]);
    }
    setLastClickTime(now);

    setClicks(prev => {
      const newClicks = prev + 1;
      const progress = (newClicks / CLICKS_NEEDED) * 100;
      setPullProgress(progress);

      if (newClicks >= CLICKS_NEEDED) {
        handleWeightSuccess();
      }

      return newClicks;
    });
  }, [phase, lastClickTime]);

  const handleWeightSuccess = () => {
    setWeightsCompleted(prev => prev + 1);
    setTotalWeight(prev => prev + currentWeight);

    const nextWeightIndex = weightsCompleted + 1;
    if (nextWeightIndex >= WEIGHTS.length) {
      // Completed all weights!
      setTimeout(() => setPhase('finished'), 1000);
    } else {
      // Next weight
      setTimeout(() => {
        setCurrentWeight(WEIGHTS[nextWeightIndex]);
        setPullProgress(0);
        setClicks(0);
        setRhythm([]);
        setLastClickTime(0);
      }, 1500);
    }
  };

  const handleWeightFail = () => {
    // Failed to pull this weight in time
    setPhase('finished');
  };

  const calculatePerformance = () => {
    const weightsRatio = weightsCompleted / WEIGHTS.length;
    const avgRhythmQuality = rhythmQuality / 100;

    let performance = 0.3; // Base performance

    // Bonus for weights completed
    if (weightsRatio === 1.0) {
      performance = 1.2; // Completed all weights
    } else if (weightsRatio >= 0.85) {
      performance = 1.0;
    } else if (weightsRatio >= 0.7) {
      performance = 0.8;
    } else if (weightsRatio >= 0.5) {
      performance = 0.6;
    } else {
      performance = 0.4;
    }

    // Bonus for rhythm quality
    performance += avgRhythmQuality * 0.3;

    return Math.min(1.5, Math.max(0.3, performance));
  };

  const handleFinish = () => {
    const performance = calculatePerformance();
    onComplete(performance);
  };

  const handleStart = () => {
    setPhase('pulling');
    setCurrentWeight(WEIGHTS[0]);
  };

  if (phase === 'ready') {
    return (
      <div className="bg-gradient-to-b from-orange-50 to-red-50 rounded-lg p-8 min-h-[600px]">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">💪</div>
            <h2 className="text-3xl font-bold text-earth-900 mb-2">Weight Pull Training</h2>
            <p className="text-earth-600 text-lg">Build {dogName}'s strength by pulling heavy weights!</p>
          </div>

          <div className="bg-white rounded-lg p-6 mb-6">
            <h3 className="font-bold text-earth-900 mb-4">How to Play:</h3>
            <ul className="space-y-2 text-earth-700">
              <li className="flex items-start gap-2">
                <span className="text-orange-600">1.</span>
                <span>Click the PULL button rhythmically to help {dogName} pull the weight</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600">2.</span>
                <span>Maintain a steady rhythm - clicking too fast or too slow reduces effectiveness</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600">3.</span>
                <span>Complete {CLICKS_NEEDED} clicks to pull each weight</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600">4.</span>
                <span>Weights get progressively heavier: {WEIGHTS[0]}kg → {WEIGHTS[WEIGHTS.length - 1]}kg</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600">5.</span>
                <span>You have 10 seconds per weight - pull it before time runs out!</span>
              </li>
            </ul>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4 mb-6">
            <p className="text-yellow-900 text-sm">
              <strong>💡 Tip:</strong> Find a steady clicking rhythm - about 5 clicks per second works best. Consistent timing is key!
            </p>
          </div>

          <button
            onClick={handleStart}
            className="w-full py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-bold text-lg"
          >
            Start Strength Training
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'pulling' || phase === 'finished') {
    const weightHeight = 100 - pullProgress; // Weight starts at top, pulls down

    return (
      <div className="bg-gradient-to-b from-red-50 to-orange-50 rounded-lg p-8 min-h-[600px]">
        <div className="max-w-4xl mx-auto">
          {phase === 'finished' && (
            <div className="bg-green-100 border-2 border-green-500 rounded-lg p-4 mb-6 text-center">
              <p className="text-green-900 font-bold text-xl">💪 Training Complete!</p>
              <p className="text-green-700">
                {weightsCompleted === WEIGHTS.length
                  ? `Incredible! ${dogName} pulled all ${WEIGHTS.length} weights!`
                  : `Great effort! ${dogName} pulled ${weightsCompleted} weights!`}
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Current Weight</p>
              <p className="text-2xl font-bold text-orange-700">{currentWeight}kg</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Progress</p>
              <p className="text-2xl font-bold text-blue-700">{weightsCompleted}/{WEIGHTS.length}</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Total Weight</p>
              <p className="text-2xl font-bold text-purple-700">{totalWeight}kg</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Rhythm</p>
              <p className={`text-2xl font-bold ${
                rhythmQuality > 80 ? 'text-green-700' :
                rhythmQuality > 60 ? 'text-yellow-700' :
                'text-red-700'
              }`}>
                {rhythmQuality}%
              </p>
            </div>
          </div>

          {/* Weight visualization */}
          <div className="bg-white rounded-lg p-6 mb-6">
            <div className="relative h-64 bg-gradient-to-b from-blue-100 to-gray-100 rounded-lg overflow-hidden border-4 border-gray-400 flex flex-col items-center">
              {/* Rope/Chain */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-2 bg-gray-700" style={{ height: `${weightHeight}%` }}></div>

              {/* Weight */}
              <div
                className="absolute left-1/2 transform -translate-x-1/2 transition-all duration-100"
                style={{ top: `${weightHeight}%` }}
              >
                <div className="text-center">
                  <div className="text-6xl mb-2">🏋️</div>
                  <div className="bg-gray-800 text-white px-4 py-2 rounded font-bold">
                    {currentWeight}kg
                  </div>
                </div>
              </div>

              {/* Ground/Finish line */}
              <div className="absolute bottom-0 left-0 right-0 h-2 bg-green-600"></div>
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-green-700 font-bold">
                PULL HERE
              </div>
            </div>
          </div>

          {/* Progress indicators */}
          <div className="space-y-4 mb-6">
            {/* Pull progress */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Pull Progress</span>
                <span className="text-sm text-gray-600">{clicks}/{CLICKS_NEEDED} clicks</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all"
                  style={{ width: `${pullProgress}%` }}
                ></div>
              </div>
            </div>

            {/* Weight progress */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Weight Progress</span>
                <span className="text-sm text-gray-600">{weightsCompleted}/{WEIGHTS.length} weights</span>
              </div>
              <div className="flex gap-2">
                {WEIGHTS.map((weight, index) => (
                  <div
                    key={weight}
                    className={`flex-1 h-3 rounded ${
                      index < weightsCompleted
                        ? 'bg-green-500'
                        : index === weightsCompleted
                        ? 'bg-orange-500 animate-pulse'
                        : 'bg-gray-300'
                    }`}
                  ></div>
                ))}
              </div>
            </div>

            {/* Rhythm quality indicator */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Rhythm Quality</span>
                <span className={`text-sm font-semibold ${
                  rhythmQuality > 80 ? 'text-green-600' :
                  rhythmQuality > 60 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {rhythmQuality > 80 ? 'Excellent!' : rhythmQuality > 60 ? 'Good' : 'Keep steady!'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    rhythmQuality > 80 ? 'bg-green-500' :
                    rhythmQuality > 60 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${rhythmQuality}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Controls */}
          {phase === 'pulling' && (
            <button
              onClick={handleClick}
              className="w-full py-8 bg-orange-600 text-white rounded-lg hover:bg-orange-700 active:bg-orange-800 transition-colors font-bold text-2xl"
            >
              💪 PULL! (Click Rhythmically)
            </button>
          )}

          {phase === 'finished' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-6 text-center">
                <p className="text-lg text-gray-700 mb-2">Final Results:</p>
                <p className="text-gray-600">Weights Pulled: {weightsCompleted}/{WEIGHTS.length}</p>
                <p className="text-gray-600">Total Weight Pulled: {totalWeight}kg</p>
                <p className="text-2xl font-bold text-orange-700 mt-2">
                  {weightsCompleted === WEIGHTS.length
                    ? '🏆 Perfect! All weights pulled!'
                    : weightsCompleted >= 5
                    ? '⭐ Excellent strength!'
                    : weightsCompleted >= 3
                    ? '💪 Good effort!'
                    : 'Keep building that strength!'}
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
