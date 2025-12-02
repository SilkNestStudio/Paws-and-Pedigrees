import { useState, useEffect, useRef } from 'react';
import type { Dog } from '../../../types';
import { getBreedStandard, calculateConformationScore } from '../../../data/breedStandards';
import type { ConformationScore } from '../../../data/breedStandards';

interface ConformationGameV2Props {
  dog: Dog;
  onComplete: (score: number) => void;
}

type GamePhase = 'ready' | 'stacking' | 'gaiting' | 'examination' | 'finished';
type PoseQuality = 'perfect' | 'good' | 'fair' | 'poor';

interface PhaseResult {
  phase: string;
  score: number;
  quality: PoseQuality;
}

export default function ConformationGameV2({ dog, onComplete }: ConformationGameV2Props) {
  const [gameState, setGameState] = useState<GamePhase>('ready');
  const [currentPhase, setCurrentPhase] = useState(0);
  const [phaseResults, setPhaseResults] = useState<PhaseResult[]>([]);

  // Stacking (posing) phase
  const [stackPosition, setStackPosition] = useState(50); // Target is 50
  const [stackTimer, setStackTimer] = useState(3);
  const [isStacking, setIsStacking] = useState(false);

  // Gaiting (movement) phase
  const [gaitPosition, setGaitPosition] = useState(0);
  const [gaitSpeed, setGaitSpeed] = useState(1);
  const [gaitClicks, setGaitClicks] = useState(0);
  const [targetGaitSpeed, setTargetGaitSpeed] = useState(2);

  // Examination phase
  const [examProgress, setExamProgress] = useState(0);
  const [calmness, setCalmness] = useState(100);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [finalConformation, setFinalConformation] = useState<ConformationScore | null>(null);

  const animationRef = useRef<number>();
  const breedStandard = getBreedStandard(dog.breed_id);

  // Phase 1: Stacking (Posing)
  const startStacking = () => {
    setGameState('stacking');
    setIsStacking(true);
    setStackPosition(50);
    setStackTimer(3);

    const timer = setInterval(() => {
      setStackTimer(prev => {
        if (prev <= 0.1) {
          clearInterval(timer);
          finishStacking();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
  };

  const adjustStack = (direction: 'left' | 'right') => {
    if (!isStacking) return;
    setStackPosition(prev => {
      if (direction === 'left') return Math.max(0, prev - 5);
      return Math.min(100, prev + 5);
    });
  };

  const finishStacking = () => {
    setIsStacking(false);

    // Score based on how close to center (50)
    const deviation = Math.abs(stackPosition - 50);
    let score: number;
    let quality: PoseQuality;

    if (deviation <= 5) {
      score = 100;
      quality = 'perfect';
      setFeedback('Perfect stack! Excellent form!');
    } else if (deviation <= 15) {
      score = 80;
      quality = 'good';
      setFeedback('Good stack! Minor adjustments needed.');
    } else if (deviation <= 30) {
      score = 60;
      quality = 'fair';
      setFeedback('Fair stack. Could be better positioned.');
    } else {
      score = 40;
      quality = 'poor';
      setFeedback('Poor stack. Needs work on positioning.');
    }

    setPhaseResults(prev => [...prev, { phase: 'Stacking', score, quality }]);

    setTimeout(() => {
      setFeedback(null);
      startGaiting();
    }, 2000);
  };

  // Phase 2: Gaiting (Movement)
  const startGaiting = () => {
    setGameState('gaiting');
    setGaitPosition(0);
    setGaitSpeed(1);
    setGaitClicks(0);
    setTargetGaitSpeed(1.5 + Math.random()); // 1.5-2.5
  };

  const clickGait = () => {
    if (gameState !== 'gaiting') return;

    setGaitClicks(prev => prev + 1);
    setGaitSpeed(prev => Math.min(3, prev + 0.3));
  };

  useEffect(() => {
    if (gameState !== 'gaiting') return;

    const animate = () => {
      setGaitPosition(prev => {
        const newPos = prev + gaitSpeed;
        if (newPos >= 100) {
          finishGaiting();
          return 100;
        }
        return newPos;
      });

      // Speed naturally decays
      setGaitSpeed(prev => Math.max(0.5, prev - 0.02));

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, gaitSpeed]);

  const finishGaiting = () => {
    // Score based on maintaining target speed
    const avgSpeed = gaitClicks / 10; // Rough average
    const speedDiff = Math.abs(avgSpeed - targetGaitSpeed);

    let score: number;
    let quality: PoseQuality;

    if (speedDiff <= 0.3) {
      score = 100;
      quality = 'perfect';
      setFeedback('Perfect gait! Smooth and consistent!');
    } else if (speedDiff <= 0.6) {
      score = 80;
      quality = 'good';
      setFeedback('Good movement! Nice rhythm.');
    } else if (speedDiff <= 1) {
      score = 60;
      quality = 'fair';
      setFeedback('Fair gait. Work on consistency.');
    } else {
      score = 40;
      quality = 'poor';
      setFeedback('Uneven gait. Needs more practice.');
    }

    setPhaseResults(prev => [...prev, { phase: 'Gaiting', score, quality }]);

    setTimeout(() => {
      setFeedback(null);
      startExamination();
    }, 2000);
  };

  // Phase 3: Examination (Stay calm)
  const startExamination = () => {
    setGameState('examination');
    setExamProgress(0);
    setCalmness(100);

    const duration = 5000; // 5 seconds
    const startTime = Date.now();

    const examine = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / duration) * 100);

      setExamProgress(progress);

      // Calmness slowly decreases
      setCalmness(prev => Math.max(0, prev - 0.3));

      if (progress >= 100) {
        finishExamination();
      } else {
        animationRef.current = requestAnimationFrame(examine);
      }
    };

    animationRef.current = requestAnimationFrame(examine);
  };

  const petDog = () => {
    if (gameState !== 'examination') return;
    setCalmness(prev => Math.min(100, prev + 10));
  };

  const finishExamination = () => {
    let score: number;
    let quality: PoseQuality;

    if (calmness >= 70) {
      score = 100;
      quality = 'perfect';
      setFeedback('Excellent temperament! Calm and confident!');
    } else if (calmness >= 50) {
      score = 80;
      quality = 'good';
      setFeedback('Good behavior during examination.');
    } else if (calmness >= 30) {
      score = 60;
      quality = 'fair';
      setFeedback('Acceptable but slightly nervous.');
    } else {
      score = 40;
      quality = 'poor';
      setFeedback('Too nervous during examination.');
    }

    setPhaseResults(prev => [...prev, { phase: 'Examination', score, quality }]);

    setTimeout(() => {
      setFeedback(null);
      finishGame();
    }, 2000);
  };

  const startGame = () => {
    setGameState('stacking');
    setPhaseResults([]);
    startStacking();
  };

  const finishGame = () => {
    setGameState('finished');

    // Calculate average player performance
    const avgPlayerScore = phaseResults.reduce((sum, r) => sum + r.score, 0) / phaseResults.length;

    // Get conformation score based on dog's attributes + player performance
    const conformationScore = calculateConformationScore(dog, breedStandard, avgPlayerScore);
    setFinalConformation(conformationScore);

    setTimeout(() => onComplete(conformationScore.totalScore), 100);
  };

  const getQualityColor = (quality: PoseQuality) => {
    switch (quality) {
      case 'perfect': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-orange-600';
      case 'poor': return 'text-red-600';
    }
  };

  return (
    <div className="bg-gradient-to-b from-purple-50 to-pink-50 rounded-lg p-6 min-h-[600px]">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-earth-900 mb-2">🏆 Conformation Show</h2>
        <p className="text-earth-600 text-sm">
          Present {dog.name} to the judge - posing, movement, and temperament
        </p>
      </div>

      {/* Phase indicators */}
      {gameState !== 'ready' && gameState !== 'finished' && (
        <div className="flex justify-center gap-4 mb-6">
          <div className={`px-4 py-2 rounded-lg ${gameState === 'stacking' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
            1. Stack
          </div>
          <div className={`px-4 py-2 rounded-lg ${gameState === 'gaiting' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
            2. Gait
          </div>
          <div className={`px-4 py-2 rounded-lg ${gameState === 'examination' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
            3. Exam
          </div>
        </div>
      )}

      {/* Game Area */}
      <div className="relative">
        {gameState === 'ready' && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🐕</div>
            <h3 className="text-2xl font-bold text-earth-900 mb-4">Ready to Show!</h3>
            <div className="bg-purple-50 rounded-lg p-4 mb-6 max-w-md mx-auto">
              <p className="text-sm text-purple-900 mb-2"><strong>Breed Standard:</strong> {breedStandard.breedName}</p>
              <ul className="text-sm text-purple-800 text-left space-y-1">
                {breedStandard.characteristics.map((char, idx) => (
                  <li key={idx}>• {char}</li>
                ))}
              </ul>
              <div className="mt-4 text-xs text-purple-700">
                <p><strong>Phases:</strong></p>
                <p>1. Stack - Position dog perfectly</p>
                <p>2. Gait - Maintain smooth movement</p>
                <p>3. Examination - Keep dog calm</p>
              </div>
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
                Enter Ring!
              </button>
            </div>
          </div>
        )}

        {/* Phase 1: Stacking */}
        {gameState === 'stacking' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-purple-900 mb-2">Stack Your Dog</h3>
              <p className="text-sm text-purple-700">Position {dog.name} in the perfect show stance</p>
              <p className="text-2xl font-bold text-purple-600 mt-2">{stackTimer.toFixed(1)}s</p>
            </div>

            <div className="bg-white rounded-lg p-6">
              <div className="relative h-32 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg mb-4">
                {/* Target zone */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-24 bg-green-400 opacity-30 rounded" />

                {/* Dog position */}
                <div
                  className="absolute bottom-4 text-5xl transition-all duration-200"
                  style={{ left: `${stackPosition}%`, transform: 'translateX(-50%)' }}
                >
                  🐕
                </div>

                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-600">
                  ← Perfect Position →
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => adjustStack('left')}
                  disabled={!isStacking}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-bold"
                >
                  ← Move Left
                </button>
                <button
                  onClick={() => adjustStack('right')}
                  disabled={!isStacking}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-bold"
                >
                  Move Right →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Phase 2: Gaiting */}
        {gameState === 'gaiting' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-purple-900 mb-2">Gait Around the Ring</h3>
              <p className="text-sm text-purple-700">Click to maintain a smooth, steady pace</p>
            </div>

            <div className="bg-white rounded-lg p-6">
              <div className="relative h-32 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg mb-4">
                <div
                  className="absolute top-1/2 transform -translate-y-1/2 text-5xl transition-all duration-100"
                  style={{ left: `${gaitPosition}%` }}
                >
                  🐕💨
                </div>

                <div className="absolute bottom-2 left-2 text-xs text-gray-600">
                  Speed: {gaitSpeed.toFixed(1)} (Target: {targetGaitSpeed.toFixed(1)})
                </div>
              </div>

              <button
                onClick={clickGait}
                className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-xl"
              >
                Click to Move! 🐾
              </button>
            </div>
          </div>
        )}

        {/* Phase 3: Examination */}
        {gameState === 'examination' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-purple-900 mb-2">Judge's Examination</h3>
              <p className="text-sm text-purple-700">Keep {dog.name} calm and confident</p>
            </div>

            <div className="bg-white rounded-lg p-6">
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Examination Progress</span>
                  <span>{examProgress.toFixed(0)}%</span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 transition-all duration-300"
                    style={{ width: `${examProgress}%` }}
                  />
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Calmness</span>
                  <span>{calmness.toFixed(0)}%</span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      calmness >= 70 ? 'bg-green-500' : calmness >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${calmness}%` }}
                  />
                </div>
              </div>

              <div className="text-center text-6xl mb-4">🐕👨‍⚕️</div>

              <button
                onClick={petDog}
                className="w-full py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-xl"
              >
                Reassure {dog.name} 🤝
              </button>
            </div>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg text-center">
            <p className="text-blue-900 font-semibold">{feedback}</p>
          </div>
        )}

        {/* Finished */}
        {gameState === 'finished' && finalConformation && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-3xl font-bold text-earth-900 mb-2">Judging Complete!</h3>
            <p className="text-xl text-purple-700 mb-6">Rating: {finalConformation.rating}</p>

            <div className="bg-white rounded-lg p-6 max-w-md mx-auto mb-6">
              <p className="text-sm text-gray-600 mb-2">Final Score</p>
              <p className="text-4xl font-bold text-purple-700 mb-4">
                {finalConformation.totalScore.toFixed(1)}
              </p>

              <div className="border-t border-gray-200 pt-4 space-y-2 text-sm text-left">
                {phaseResults.map((result, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-gray-600">{result.phase}:</span>
                    <span className={`font-bold ${getQualityColor(result.quality)}`}>
                      {result.score.toFixed(0)} - {result.quality.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-purple-50 rounded border border-purple-200">
                <p className="text-xs text-purple-900">
                  <strong>Judge's Notes:</strong> {dog.name} is a{' '}
                  {finalConformation.rating.toLowerCase()} example of a {breedStandard.breedName}.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
