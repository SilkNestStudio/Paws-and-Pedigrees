import { useState, useEffect, useRef } from 'react';

interface RacingMiniGameProps {
  onComplete: (score: number) => void;
  dogName: string;
}

export default function RacingMiniGame({ onComplete, dogName }: RacingMiniGameProps) {
  const [gameStarted, setGameStarted] = useState(false);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(50); // Current speed (0-100)
  const [targetSpeed, setTargetSpeed] = useState(75);
  const [gameActive, setGameActive] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [mistakes, setMistakes] = useState(0);

  const targetDistance = 100; // Race to 100%
  const gameTime = 15; // 15 seconds to complete
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const speedRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (gameActive) {
      // Update distance based on current speed
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => {
          const newTime = prev + 0.1;
          if (newTime >= gameTime) {
            endGame();
            return gameTime;
          }
          return newTime;
        });

        setDistance(prev => {
          const newDistance = prev + (speed / 100) * 0.67; // Speed affects distance gain
          if (newDistance >= targetDistance) {
            endGame();
            return targetDistance;
          }
          return newDistance;
        });
      }, 100);

      // Change target speed periodically
      speedRef.current = setInterval(() => {
        setTargetSpeed(Math.random() * 40 + 60); // Random between 60-100
      }, 2000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (speedRef.current) clearInterval(speedRef.current);
    };
  }, [gameActive, speed]);

  const startGame = () => {
    setGameStarted(true);
    setDistance(0);
    setSpeed(50);
    setTargetSpeed(75);
    setTimeElapsed(0);
    setMistakes(0);
    setGameActive(true);
  };

  const handleSpeedBoost = () => {
    if (!gameActive) return;

    const diff = Math.abs(speed - targetSpeed);

    if (diff <= 10) {
      // Good timing! Increase speed
      setSpeed(Math.min(100, speed + 15));
    } else {
      // Bad timing! Decrease speed
      setSpeed(Math.max(20, speed - 10));
      setMistakes(mistakes + 1);
    }
  };

  const endGame = () => {
    setGameActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (speedRef.current) clearInterval(speedRef.current);

    // Calculate score
    // Base score from distance
    let score = (distance / targetDistance) * 100;

    // Penalty for mistakes
    score = Math.max(0, score - (mistakes * 5));

    // Bonus for finishing early
    if (distance >= targetDistance) {
      const timeBonus = Math.max(0, (gameTime - timeElapsed) * 2);
      score = Math.min(100, score + timeBonus);
    }

    setTimeout(() => {
      onComplete(Math.round(score));
    }, 1500);
  };

  if (!gameStarted) {
    return (
      <div className="text-center py-12">
        <h2 className="text-3xl font-bold text-earth-900 mb-4">Racing Mini-Game</h2>
        <p className="text-earth-600 mb-6">
          Race {dogName} to the finish line!<br/>
          Match the target speed by clicking at the right time.
        </p>
        <div className="mb-6 text-earth-700 max-w-md mx-auto">
          <div className="bg-earth-50 rounded-lg p-4 mb-4">
            <p className="font-bold mb-2">How to Play:</p>
            <p className="text-sm mb-2">🏁 Race to reach 100% distance</p>
            <p className="text-sm mb-2">⚡ Your speed determines how fast you move</p>
            <p className="text-sm mb-2">🎯 Click when your speed bar matches the target!</p>
            <p className="text-sm">⏱️ Finish as fast as possible for bonus points</p>
          </div>
          <p className="mb-2 text-sm">✅ Good timing = Speed boost</p>
          <p className="text-sm">❌ Bad timing = Slow down & penalty</p>
        </div>
        <button
          onClick={startGame}
          className="px-8 py-4 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 transition-all font-bold text-xl"
        >
          Start Race!
        </button>
      </div>
    );
  }

  const timeRemaining = Math.max(0, gameTime - timeElapsed);

  return (
    <div className="text-center py-8">
      <div className="mb-6">
        <div className="flex justify-center gap-8 mb-6">
          <div className="text-center">
            <p className="text-sm text-earth-600">Time</p>
            <p className="text-3xl font-bold text-earth-900">{timeRemaining.toFixed(1)}s</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-earth-600">Distance</p>
            <p className="text-3xl font-bold text-kennel-600">{Math.round(distance)}%</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-earth-600">Mistakes</p>
            <p className="text-3xl font-bold text-red-600">{mistakes}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-8 mb-6 max-w-4xl mx-auto">
        {!gameActive && (
          <div className="text-4xl font-bold mb-6 text-kennel-700">
            {distance >= targetDistance ? '🏁 Finished!' : '⏱️ Time\'s Up!'}
          </div>
        )}

        {/* Race Track */}
        <div className="mb-8">
          <div className="relative w-full h-24 bg-earth-200 rounded-lg overflow-hidden mb-4">
            {/* Track markings */}
            <div className="absolute top-0 left-0 w-full h-full flex">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex-1 border-r border-earth-300" />
              ))}
            </div>

            {/* Finish line */}
            <div className="absolute right-0 top-0 h-full w-2 bg-gradient-to-r from-black via-white to-black bg-[length:20px_100%] animate-pulse" />

            {/* Racing dog */}
            <div
              className="absolute top-1/2 -translate-y-1/2 transition-all duration-200"
              style={{ left: `${distance}%`, transform: 'translateY(-50%) translateX(-50%)' }}
            >
              <span className="text-6xl drop-shadow-lg animate-bounce">🐕</span>
            </div>
          </div>

          {/* Speed meters */}
          <div className="space-y-4">
            {/* Current Speed */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-earth-600">Your Speed:</span>
                <span className="font-bold text-earth-900">{Math.round(speed)}%</span>
              </div>
              <div className="w-full h-8 bg-earth-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${speed}%` }}
                />
              </div>
            </div>

            {/* Target Speed */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-earth-600">Target Speed:</span>
                <span className="font-bold text-green-700">{Math.round(targetSpeed)}%</span>
              </div>
              <div className="w-full h-8 bg-earth-200 rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-green-500/30"
                  style={{ width: `${targetSpeed}%` }}
                />
                {/* Target indicator */}
                <div
                  className="absolute top-0 h-full w-2 bg-green-600 animate-pulse"
                  style={{ left: `${targetSpeed}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {gameActive ? (
          <>
            <p className="text-earth-600 mb-4 text-lg">
              Click when the bars match! {Math.abs(speed - targetSpeed) <= 10 ? '✅ Close!' : '❌ Not yet...'}
            </p>
            <button
              onClick={handleSpeedBoost}
              className="w-full py-8 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 active:bg-kennel-800 transition-all font-bold text-2xl"
            >
              BOOST! ⚡
            </button>
          </>
        ) : (
          <p className="text-xl text-earth-700">
            Final distance: {Math.round(distance)}%
          </p>
        )}
      </div>
    </div>
  );
}
