import { useState, useEffect } from 'react';

interface SprintTrainingGameProps {
  onComplete: (performanceMultiplier: number) => void;
  dogName: string;
}

export default function SprintTrainingGame({ onComplete, dogName }: SprintTrainingGameProps) {
  const [gameStarted, setGameStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [speed, setSpeed] = useState(50);
  const [distance, setDistance] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const targetDistance = 1000; // Target distance to run

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStarted, gameOver]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const moveInterval = setInterval(() => {
      // Dog moves based on current speed
      setDistance((prev) => {
        const newDistance = prev + (speed / 10);
        if (newDistance >= targetDistance) {
          endGame();
          return targetDistance;
        }
        return newDistance;
      });

      // Speed naturally decreases over time
      setSpeed((prev) => Math.max(20, prev - 2));
    }, 100);

    return () => clearInterval(moveInterval);
  }, [gameStarted, gameOver, speed]);

  const handleClick = () => {
    if (!gameStarted || gameOver) return;

    // Increase speed on click
    setSpeed((prev) => Math.min(100, prev + 15));
    setClicks((c) => c + 1);
  };

  const endGame = () => {
    setGameOver(true);

    // Calculate performance multiplier based on distance covered
    const completionRatio = Math.min(distance / targetDistance, 1);
    let multiplier: number;

    if (completionRatio >= 1.0) {
      multiplier = 1.5; // Perfect - reached target!
    } else if (completionRatio >= 0.8) {
      multiplier = 1.2; // Great
    } else if (completionRatio >= 0.6) {
      multiplier = 1.0; // Good
    } else if (completionRatio >= 0.4) {
      multiplier = 0.8; // Okay
    } else {
      multiplier = 0.5; // Poor
    }

    setTimeout(() => onComplete(multiplier), 2000);
  };

  const startGame = () => {
    setGameStarted(true);
  };

  if (!gameStarted) {
    return (
      <div className="text-center py-8">
        <h2 className="text-3xl font-bold text-earth-900 mb-4">Sprint Training</h2>
        <p className="text-earth-600 mb-6">
          Help {dogName} run as far as possible!
        </p>
        <div className="mb-6 text-earth-700 max-w-md mx-auto">
          <div className="bg-earth-50 rounded-lg p-4 mb-4">
            <p className="font-bold mb-2">How to Play:</p>
            <p className="text-sm mb-2">⚡ Click rapidly to maintain speed</p>
            <p className="text-sm mb-2">🏃 Speed decreases over time - keep clicking!</p>
            <p className="text-sm mb-2">🎯 Try to reach {targetDistance}m in 15 seconds</p>
          </div>
          <p className="mb-2 text-sm">🏆 Reach target = 1.5x training bonus</p>
          <p className="mb-2 text-sm">⭐ 800m+ = 1.2x bonus</p>
          <p className="text-sm">💪 Less than 400m = 0.5x penalty</p>
        </div>
        <button
          onClick={startGame}
          className="px-8 py-4 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 transition-all font-bold text-xl"
        >
          Start Training!
        </button>
      </div>
    );
  }

  const distancePercent = Math.min((distance / targetDistance) * 100, 100);

  return (
    <div className="text-center py-8">
      {/* Stats */}
      <div className="mb-6 flex justify-center gap-8">
        <div>
          <p className="text-earth-600 text-sm">Time Left</p>
          <p className="text-3xl font-bold text-earth-900">{timeLeft}s</p>
        </div>
        <div>
          <p className="text-earth-600 text-sm">Distance</p>
          <p className="text-3xl font-bold text-kennel-700">{Math.floor(distance)}m</p>
        </div>
        <div>
          <p className="text-earth-600 text-sm">Speed</p>
          <p className="text-3xl font-bold text-blue-600">{speed}%</p>
        </div>
      </div>

      {/* Track */}
      <div className="bg-white rounded-lg p-8 mb-6 max-w-3xl mx-auto">
        <div className="relative h-32 bg-gradient-to-r from-green-200 via-yellow-100 to-green-300 rounded-lg border-4 border-earth-400 overflow-hidden">
          {/* Finish Line */}
          <div className="absolute right-0 top-0 bottom-0 w-2 bg-red-500">
            <div className="text-xs text-red-600 absolute -top-6 right-0 font-bold">FINISH</div>
          </div>

          {/* Distance markers */}
          <div className="absolute top-0 bottom-0 left-1/4 w-px bg-earth-300" />
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-earth-300" />
          <div className="absolute top-0 bottom-0 left-3/4 w-px bg-earth-300" />

          {/* Running Dog */}
          <div
            className="absolute top-1/2 -translate-y-1/2 transition-all duration-100"
            style={{ left: `${distancePercent}%` }}
          >
            <div className={`text-6xl ${speed > 60 ? 'animate-bounce' : ''}`}>🐕</div>
          </div>
        </div>

        {/* Speed Bar */}
        <div className="mt-6">
          <p className="text-sm text-earth-600 mb-2">Current Speed</p>
          <div className="h-8 bg-earth-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${
                speed > 70 ? 'bg-green-500' : speed > 40 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${speed}%` }}
            />
          </div>
        </div>

        {!gameOver && (
          <button
            onClick={handleClick}
            className="mt-6 w-full py-6 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 active:scale-95 transition-all font-bold text-2xl"
          >
            ACCELERATE! ⚡
          </button>
        )}

        {gameOver && (
          <div className="mt-6 text-center">
            <p className="text-2xl font-bold text-earth-900 mb-2">
              {distance >= targetDistance
                ? '🏆 Perfect! Reached the finish line!'
                : distance >= 800
                ? '⭐ Great job!'
                : distance >= 600
                ? '👍 Good effort!'
                : distance >= 400
                ? '💪 Keep practicing!'
                : '😅 Need more work!'}
            </p>
            <p className="text-earth-600">Final Distance: {Math.floor(distance)}m</p>
            <p className="text-earth-600">Total Clicks: {clicks}</p>
          </div>
        )}
      </div>
    </div>
  );
}
