import { useState, useEffect, useRef } from 'react';

interface WeightPullMiniGameProps {
  onComplete: (score: number) => void;
  dogName: string;
}

export default function WeightPullMiniGame({ onComplete, dogName }: WeightPullMiniGameProps) {
  const [gameStarted, setGameStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10); // 10 seconds to pull
  const [clicks, setClicks] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const targetClicks = 50; // Need 50 clicks to get 100% score

  useEffect(() => {
    if (gameActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 0.1);
      }, 100);
    } else if (timeLeft <= 0 && gameActive) {
      endGame();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, gameActive]);

  const startGame = () => {
    setGameStarted(true);
    setProgress(0);
    setClicks(0);
    setTimeLeft(10);
    setGameActive(true);
  };

  const handleClick = () => {
    if (!gameActive) return;

    const newClicks = clicks + 1;
    setClicks(newClicks);

    // Calculate progress (100% = targetClicks)
    const newProgress = Math.min(100, (newClicks / targetClicks) * 100);
    setProgress(newProgress);

    // Check if reached 100%
    if (newProgress >= 100) {
      endGame();
    }
  };

  const endGame = () => {
    setGameActive(false);
    if (timerRef.current) clearTimeout(timerRef.current);

    // Calculate score based on progress
    const score = Math.min(100, Math.round(progress));

    setTimeout(() => {
      onComplete(score);
    }, 1500);
  };

  if (!gameStarted) {
    return (
      <div className="text-center py-12">
        <h2 className="text-3xl font-bold text-earth-900 mb-4">Weight Pull Mini-Game</h2>
        <p className="text-earth-600 mb-6">
          Test {dogName}'s pulling strength!<br/>
          Click rapidly to pull the weight across the finish line.
        </p>
        <div className="mb-6 text-earth-700 max-w-md mx-auto">
          <div className="bg-earth-50 rounded-lg p-4 mb-4">
            <p className="font-bold mb-2">How to Play:</p>
            <p className="text-sm mb-2">⏱️ You have 10 seconds</p>
            <p className="text-sm mb-2">👆 Click the button as fast as you can!</p>
            <p className="text-sm mb-2">💪 Each click moves the weight forward</p>
            <p className="text-sm">🎯 Reach 100% to get maximum score</p>
          </div>
          <p className="text-sm">Your score is based on how far you pull the weight!</p>
        </div>
        <button
          onClick={startGame}
          className="px-8 py-4 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 transition-all font-bold text-xl"
        >
          Start Pulling!
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <div className="mb-6">
        <div className="flex justify-center gap-8 mb-6">
          <div className="text-center">
            <p className="text-sm text-earth-600">Time Left</p>
            <p className="text-4xl font-bold text-earth-900">{timeLeft.toFixed(1)}s</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-earth-600">Clicks</p>
            <p className="text-4xl font-bold text-kennel-600">{clicks}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-8 mb-6 max-w-4xl mx-auto">
        {!gameActive && (
          <div className="text-5xl font-bold mb-6 text-kennel-700">
            Final Score: {Math.round(progress)}%
          </div>
        )}

        {/* Visual representation */}
        <div className="mb-8">
          <div className="relative w-full h-32 bg-earth-200 rounded-lg overflow-hidden mb-4">
            {/* Track */}
            <div className="absolute top-0 left-0 w-full h-full flex items-center px-4">
              {/* Start line */}
              <div className="absolute left-0 h-full w-1 bg-red-500" />

              {/* Finish line */}
              <div className="absolute right-0 h-full w-2 bg-green-500" />

              {/* Dog pulling sled */}
              <div
                className="absolute flex items-center transition-all duration-200"
                style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
              >
                <span className="text-6xl drop-shadow-lg">🐕</span>
                <span className="text-4xl">🛷</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-8 bg-earth-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-2xl font-bold text-earth-900 mt-2">{Math.round(progress)}%</p>
        </div>

        {gameActive ? (
          <>
            <p className="text-earth-600 mb-4 text-xl font-bold animate-pulse">
              CLICK FAST! 👇
            </p>
            <button
              onClick={handleClick}
              onMouseDown={handleClick}
              className="w-full py-12 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 active:bg-kennel-800 transition-all font-bold text-3xl select-none"
            >
              PULL! 💪
            </button>
            <p className="text-sm text-earth-500 mt-3">
              Tip: Click rapidly or hold and tap to pull faster!
            </p>
          </>
        ) : (
          <p className="text-xl text-earth-700">
            {progress >= 100 ? '🎉 Full pull! Maximum strength!' : `Pulled ${Math.round(progress)}% of the way!`}
          </p>
        )}
      </div>
    </div>
  );
}
