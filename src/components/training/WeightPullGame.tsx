import { useState, useEffect, useCallback, useRef } from 'react';

interface WeightPullGameProps {
  onComplete: (performanceMultiplier: number) => void;
  dogName: string;
}

export default function WeightPullGame({ onComplete, dogName }: WeightPullGameProps) {
  const [phase, setPhase] = useState<'ready' | 'pulling' | 'finished'>('ready');
  const [currentWeight, setCurrentWeight] = useState(50);
  const [pullProgress, setPullProgress] = useState(0);
  const [rhythmPhase, setRhythmPhase] = useState(0); // 0 to 1, oscillating
  const [rhythmDirection, setRhythmDirection] = useState(1);
  const [weightsCompleted, setWeightsCompleted] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [perfectPulls, setPerfectPulls] = useState(0);
  const [goodPulls, setGoodPulls] = useState(0);
  const [earlyPulls, setEarlyPulls] = useState(0);
  const [latePulls, setLatePulls] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; color: string; score: number } | null>(null);
  const [canClick, setCanClick] = useState(true);
  const gameLoopRef = useRef<number>();
  const lastClickTimeRef = useRef(0);

  const WEIGHTS = [50, 75, 100, 125, 150, 175, 200];
  const PULLS_PER_WEIGHT = 8;
  const PERFECT_ZONE_SIZE = 0.15; // How close to peak for perfect
  const GOOD_ZONE_SIZE = 0.3; // How close to peak for good
  const RHYTHM_SPEED = 0.012; // How fast the rhythm oscillates

  // Update max combo
  useEffect(() => {
    if (combo > maxCombo) {
      setMaxCombo(combo);
    }
  }, [combo, maxCombo]);

  // Rhythm oscillation loop
  useEffect(() => {
    if (phase !== 'pulling') return;

    const rhythmLoop = () => {
      setRhythmPhase(prev => {
        let newPhase = prev + (RHYTHM_SPEED * rhythmDirection);

        // Bounce at edges
        if (newPhase >= 1) {
          setRhythmDirection(-1);
          newPhase = 1;
        } else if (newPhase <= 0) {
          setRhythmDirection(1);
          newPhase = 0;
        }

        return newPhase;
      });

      gameLoopRef.current = requestAnimationFrame(rhythmLoop);
    };

    gameLoopRef.current = requestAnimationFrame(rhythmLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [phase, rhythmDirection]);

  const handlePull = useCallback(() => {
    if (!canClick || phase !== 'pulling') return;

    const now = Date.now();
    if (now - lastClickTimeRef.current < 200) return; // Prevent spam clicking
    lastClickTimeRef.current = now;

    setCanClick(false);
    setTimeout(() => setCanClick(true), 150);

    // Check if click is in the rhythm zone (near peak = 1.0)
    const distanceFromPeak = Math.abs(rhythmPhase - 1.0);

    let score = 0;
    let feedbackText = '';
    let feedbackColor = '';
    let isSuccess = false;

    if (distanceFromPeak < PERFECT_ZONE_SIZE) {
      // Perfect timing!
      score = 100;
      feedbackText = 'PERFECT! 💎';
      feedbackColor = 'text-yellow-400';
      setPerfectPulls(p => p + 1);
      setCombo(c => c + 1);
      isSuccess = true;
    } else if (distanceFromPeak < GOOD_ZONE_SIZE) {
      // Good timing
      score = 50;
      feedbackText = 'GOOD! ✓';
      feedbackColor = 'text-green-400';
      setGoodPulls(g => g + 1);
      setCombo(c => c + 1);
      isSuccess = true;
    } else if (rhythmPhase < 0.5) {
      // Too early
      score = 10;
      feedbackText = 'Too Early!';
      feedbackColor = 'text-orange-400';
      setEarlyPulls(e => e + 1);
      setCombo(0);
    } else {
      // Too late
      score = 10;
      feedbackText = 'Too Late!';
      feedbackColor = 'text-red-400';
      setLatePulls(l => l + 1);
      setCombo(0);
    }

    // Add combo bonus
    const comboBonus = combo * 5;
    const totalScoreThisPull = score + comboBonus;

    setTotalScore(prev => prev + totalScoreThisPull);
    setFeedback({ text: feedbackText, color: feedbackColor, score: totalScoreThisPull });

    setTimeout(() => setFeedback(null), 600);

    if (isSuccess) {
      // Advance progress
      setPullProgress(prev => {
        const newProgress = prev + (100 / PULLS_PER_WEIGHT);

        if (newProgress >= 100) {
          // Completed this weight!
          setTimeout(() => {
            const nextWeightIndex = weightsCompleted + 1;

            if (nextWeightIndex >= WEIGHTS.length) {
              // Finished all weights!
              setPhase('finished');
            } else {
              // Next weight
              setCurrentWeight(WEIGHTS[nextWeightIndex]);
              setPullProgress(0);
              setWeightsCompleted(nextWeightIndex);
            }
          }, 500);

          setWeightsCompleted(prev => prev + 1);
          return 100;
        }

        return newProgress;
      });
    }
  }, [canClick, phase, rhythmPhase, combo, weightsCompleted]);

  // Handle spacebar
  useEffect(() => {
    if (phase !== 'pulling') return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handlePull();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [phase, handlePull]);

  const calculatePerformance = () => {
    const totalPulls = perfectPulls + goodPulls + earlyPulls + latePulls;
    const successRate = (perfectPulls + goodPulls) / (totalPulls || 1);
    const perfectRate = perfectPulls / (totalPulls || 1);
    const completionRate = weightsCompleted / WEIGHTS.length;

    let performance = 0.3 + (completionRate * 0.4) + (successRate * 0.3) + (perfectRate * 0.3);

    // Combo bonus
    if (maxCombo >= 15) performance += 0.3;
    else if (maxCombo >= 10) performance += 0.2;
    else if (maxCombo >= 5) performance += 0.1;

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
            <div className="text-6xl mb-4">🐕💪</div>
            <h2 className="text-3xl font-bold text-earth-900 mb-2">Weight Pull Training</h2>
            <p className="text-earth-600 text-lg">Build {dogName}'s pulling strength!</p>
          </div>

          <div className="bg-white rounded-lg p-6 mb-6 shadow-lg">
            <h3 className="font-bold text-earth-900 mb-4 text-xl">🎮 How to Play:</h3>
            <div className="space-y-3 text-earth-700">
              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                <span className="text-2xl">🎵</span>
                <div>
                  <p className="font-semibold text-purple-900">Watch the Rhythm Bar</p>
                  <p className="text-sm">The indicator moves up and down - this is {dogName}'s pulling motion</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                <span className="text-2xl">💎</span>
                <div>
                  <p className="font-semibold text-yellow-900">Click at the Peak</p>
                  <p className="text-sm">Click SPACE or the button when the indicator reaches the top for PERFECT pulls!</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <span className="text-2xl">🔥</span>
                <div>
                  <p className="font-semibold text-green-900">Build Combos</p>
                  <p className="text-sm">Successful pulls build combos for bonus points!</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                <span className="text-2xl">🧱</span>
                <div>
                  <p className="font-semibold text-orange-900">Progress Through Weights</p>
                  <p className="text-sm">Complete {PULLS_PER_WEIGHT} successful pulls to move to heavier sleds!</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-400 rounded-lg p-4 mb-6">
            <p className="text-red-900 font-semibold mb-2">💡 Pro Tip:</p>
            <p className="text-sm text-red-800">Find the rhythm! Listen for the beat and time your clicks to {dogName}'s natural pulling motion. Perfect timing = maximum strength gains!</p>
          </div>

          <button
            onClick={handleStart}
            className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-all transform hover:scale-105 font-bold text-xl shadow-lg"
          >
            💪 Start Strength Training
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'pulling' || phase === 'finished') {
    // Calculate rhythm bar position (vertical)
    const rhythmBarHeight = rhythmPhase * 100;
    const isPerfectZone = Math.abs(rhythmPhase - 1.0) < PERFECT_ZONE_SIZE;
    const isGoodZone = Math.abs(rhythmPhase - 1.0) < GOOD_ZONE_SIZE;

    return (
      <div className="bg-gradient-to-b from-red-50 to-orange-50 rounded-lg p-6 min-h-[700px]">
        <div className="max-w-5xl mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-5 gap-3 mb-4">
            <div className="bg-white/90 rounded-lg p-3 text-center shadow">
              <p className="text-xs text-gray-600 mb-1">Weight</p>
              <p className="text-xl font-bold text-orange-700">{currentWeight}kg</p>
            </div>
            <div className="bg-white/90 rounded-lg p-3 text-center shadow">
              <p className="text-xs text-gray-600 mb-1">Progress</p>
              <p className="text-xl font-bold text-blue-700">{weightsCompleted}/{WEIGHTS.length}</p>
            </div>
            <div className="bg-white/90 rounded-lg p-3 text-center shadow">
              <p className="text-xs text-gray-600 mb-1">Combo</p>
              <p className={`text-2xl font-bold ${combo >= 5 ? 'text-yellow-500' : 'text-gray-700'}`}>
                {combo > 0 ? `${combo}x 🔥` : '-'}
              </p>
            </div>
            <div className="bg-white/90 rounded-lg p-3 text-center shadow">
              <p className="text-xs text-gray-600 mb-1">Perfect</p>
              <p className="text-xl font-bold text-yellow-600">💎 {perfectPulls}</p>
            </div>
            <div className="bg-white/90 rounded-lg p-3 text-center shadow">
              <p className="text-xs text-gray-600 mb-1">Score</p>
              <p className="text-xl font-bold text-purple-700">{totalScore}</p>
            </div>
          </div>

          {/* Game Area */}
          <div className="relative bg-gradient-to-b from-blue-100 to-green-100 rounded-xl overflow-hidden shadow-2xl border-4 border-green-700 h-96 flex items-center justify-center">
            {/* Rhythm Bar Container */}
            <div className="flex items-center gap-8">
              {/* Rhythm Bar */}
              <div className="relative w-32 h-80 bg-gray-700 rounded-lg overflow-hidden border-4 border-gray-600">
                {/* Perfect Zone (top) */}
                <div className="absolute top-0 left-0 right-0 h-16 bg-yellow-400/30 border-b-2 border-yellow-500">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-yellow-200 font-bold text-xs">PERFECT</span>
                  </div>
                </div>

                {/* Good Zone */}
                <div className="absolute top-16 left-0 right-0 h-12 bg-green-400/20 border-b-2 border-green-600">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-green-200 font-bold text-xs">GOOD</span>
                  </div>
                </div>

                {/* Moving indicator */}
                <div
                  className="absolute left-0 right-0 h-4 transition-all duration-75"
                  style={{
                    bottom: `${rhythmBarHeight}%`,
                    transform: 'translateY(50%)'
                  }}
                >
                  <div className={`w-full h-full ${
                    isPerfectZone ? 'bg-yellow-400' :
                    isGoodZone ? 'bg-green-400' :
                    'bg-red-400'
                  } shadow-lg`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-white"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dog pulling sled visualization */}
              <div className="flex flex-col items-center relative">
                {/* Pulling effort indicator */}
                <div className="mb-4 text-white text-sm font-semibold bg-black/50 px-3 py-1 rounded">
                  {rhythmPhase > 0.7 ? 'PULLING HARD! 💪' : 'Building Power...'}
                </div>

                {/* Dog and sled scene */}
                <div className="flex items-center gap-2">
                  {/* Dog */}
                  <div
                    className="text-7xl transition-transform duration-100"
                    style={{
                      transform: `scale(${0.9 + rhythmPhase * 0.2}) translateX(${rhythmPhase * 5}px)`,
                    }}
                  >
                    🐕
                  </div>

                  {/* Harness/rope connection */}
                  <div
                    className="h-1 bg-gray-800 transition-all"
                    style={{
                      width: `${40 - rhythmPhase * 10}px`,
                    }}
                  />

                  {/* Weighted sled */}
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      {/* Weight blocks on sled */}
                      <div
                        className="text-5xl transition-transform duration-100"
                        style={{
                          transform: `translateX(${-rhythmPhase * 3}px)`,
                        }}
                      >
                        🧱
                      </div>
                      {/* Weight label */}
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                        {currentWeight}kg
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ground line */}
                <div className="w-full h-1 bg-green-700 mt-4 rounded"></div>
              </div>
            </div>

            {/* Feedback overlay */}
            {feedback && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className={`text-5xl font-bold ${feedback.color} drop-shadow-lg animate-ping`}>
                  {feedback.text}
                </div>
                {feedback.score > 50 && (
                  <div className="text-3xl font-bold text-white text-center mt-2">
                    +{feedback.score}
                  </div>
                )}
              </div>
            )}

            {/* Finish overlay */}
            {phase === 'finished' && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
                <div className="bg-white rounded-xl p-8 text-center max-w-md shadow-2xl">
                  <div className="text-6xl mb-4">
                    {weightsCompleted >= WEIGHTS.length ? '🏆' : '💪'}
                  </div>
                  <h3 className="text-3xl font-bold text-earth-900 mb-4">
                    {weightsCompleted >= WEIGHTS.length ? 'All Weights Pulled!' : 'Great Strength!'}
                  </h3>
                  <div className="space-y-2 text-left mb-6">
                    <p className="text-gray-700">🧱 Sleds Pulled: <span className="font-bold">{weightsCompleted} / {WEIGHTS.length}</span></p>
                    <p className="text-gray-700">💎 Perfect Pulls: <span className="font-bold text-yellow-600">{perfectPulls}</span></p>
                    <p className="text-gray-700">✓ Good Pulls: <span className="font-bold text-green-600">{goodPulls}</span></p>
                    <p className="text-gray-700">🔥 Max Combo: <span className="font-bold text-orange-600">{maxCombo}x</span></p>
                    <p className="text-gray-700">⭐ Total Score: <span className="font-bold text-purple-600">{totalScore}</span></p>
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

          {/* Pull progress bar */}
          <div className="mt-4 bg-white/90 rounded-lg p-4 shadow">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Current Weight Progress</span>
              <span className="text-sm text-gray-600">{pullProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 via-red-400 to-orange-500 transition-all duration-300"
                style={{ width: `${pullProgress}%` }}
              />
            </div>
          </div>

          {/* Weight progress indicators */}
          <div className="mt-4 bg-white/90 rounded-lg p-4 shadow">
            <p className="text-sm font-semibold text-gray-700 mb-3">Weight Progression</p>
            <div className="flex gap-2">
              {WEIGHTS.map((weight, index) => (
                <div
                  key={weight}
                  className={`flex-1 h-3 rounded transition-all ${
                    index < weightsCompleted
                      ? 'bg-green-500'
                      : index === weightsCompleted
                      ? 'bg-orange-500 animate-pulse'
                      : 'bg-gray-300'
                  }`}
                  title={`${weight}kg`}
                />
              ))}
            </div>
          </div>

          {/* Pull button */}
          {phase === 'pulling' && (
            <div className="mt-4 text-center">
              <button
                onClick={handlePull}
                disabled={!canClick}
                className="px-12 py-6 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 active:scale-95 disabled:opacity-50 transition-all font-bold text-2xl shadow-2xl"
              >
                💪 PULL! (SPACE)
              </button>
              <p className="text-sm text-gray-600 mt-2">Click when indicator is at the top!</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
