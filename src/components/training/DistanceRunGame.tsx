import { useState, useEffect } from 'react';

interface DistanceRunGameProps {
  onComplete: (performanceMultiplier: number) => void;
  dogName: string;
}

export default function DistanceRunGame({ onComplete, dogName }: DistanceRunGameProps) {
  const [gameStarted, setGameStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [stamina, setStamina] = useState(100);
  const [distance, setDistance] = useState(0);
  const [pace, setPace] = useState(50);
  const [gameOver, setGameOver] = useState(false);

  const targetDistance = 2000; // 2km target
  const maxTime = 20; // 20 seconds

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

    const runInterval = setInterval(() => {
      // Move forward based on pace
      setDistance((prev) => {
        const newDistance = prev + (pace / 5);
        if (newDistance >= targetDistance) {
          endGame();
          return targetDistance;
        }
        return newDistance;
      });

      // Stamina drains based on pace
      setStamina((prev) => {
        const drain = (pace / 100) * 0.8; // Faster = more drain
        const newStamina = Math.max(0, prev - drain);

        if (newStamina === 0) {
          endGame(); // Exhausted!
        }

        return newStamina;
      });
    }, 100);

    return () => clearInterval(runInterval);
  }, [gameStarted, gameOver, pace]);

  const handlePaceChange = (newPace: number) => {
    if (gameOver) return;
    setPace(newPace);
  };

  const handleRest = () => {
    if (gameOver) return;

    // Resting recovers stamina but stops movement
    setPace(0);

    const restInterval = setInterval(() => {
      setStamina((prev) => Math.min(100, prev + 3));
    }, 100);

    setTimeout(() => {
      clearInterval(restInterval);
      setPace(50); // Resume at medium pace
    }, 1000);
  };

  const endGame = () => {
    setGameOver(true);

    // Calculate performance multiplier
    const completionRatio = Math.min(distance / targetDistance, 1);
    const timeRatio = timeLeft / maxTime;
    const staminaRatio = stamina / 100;

    // Bonus for completing with good time and stamina
    let multiplier: number;

    if (completionRatio >= 1.0) {
      // Completed the distance
      if (staminaRatio > 0.5 && timeRatio > 0.3) {
        multiplier = 1.5; // Perfect - finished with stamina and time to spare
      } else if (staminaRatio > 0.3 || timeRatio > 0.2) {
        multiplier = 1.3; // Great
      } else {
        multiplier = 1.2; // Good - finished but barely
      }
    } else if (completionRatio >= 0.8) {
      multiplier = 1.1; // Good attempt
    } else if (completionRatio >= 0.6) {
      multiplier = 1.0; // Decent
    } else if (completionRatio >= 0.4) {
      multiplier = 0.8; // Okay
    } else {
      multiplier = 0.6; // Poor
    }

    setTimeout(() => onComplete(multiplier), 2000);
  };

  const startGame = () => {
    setGameStarted(true);
  };

  if (!gameStarted) {
    return (
      <div className="text-center py-8">
        <h2 className="text-3xl font-bold text-earth-900 mb-4">Distance Run Training</h2>
        <p className="text-earth-600 mb-6">
          Help {dogName} run {targetDistance}m while managing stamina!
        </p>
        <div className="mb-6 text-earth-700 max-w-md mx-auto">
          <div className="bg-earth-50 rounded-lg p-4 mb-4">
            <p className="font-bold mb-2">How to Play:</p>
            <p className="text-sm mb-2">🏃 Adjust pace to balance speed and stamina</p>
            <p className="text-sm mb-2">💚 Running drains stamina - don't run out!</p>
            <p className="text-sm mb-2">😴 Use REST to recover stamina (but you stop moving)</p>
            <p className="text-sm">⏱️ Complete {targetDistance}m in {maxTime} seconds</p>
          </div>
          <p className="mb-2 text-sm">🏆 Finish with stamina & time = 1.5x bonus</p>
          <p className="mb-2 text-sm">⭐ Finish efficiently = 1.3x bonus</p>
          <p className="text-sm">💪 Run out of stamina = Poor bonus</p>
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
          <p className="text-earth-600 text-sm">Stamina</p>
          <p className={`text-3xl font-bold ${
            stamina > 60 ? 'text-green-600' : stamina > 30 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {Math.floor(stamina)}%
          </p>
        </div>
      </div>

      {/* Track */}
      <div className="bg-white rounded-lg p-8 mb-6 max-w-3xl mx-auto">
        <div className="relative h-32 bg-gradient-to-r from-green-200 via-yellow-100 to-green-300 rounded-lg border-4 border-earth-400 overflow-hidden mb-6">
          {/* Finish Line */}
          <div className="absolute right-0 top-0 bottom-0 w-2 bg-red-500">
            <div className="text-xs text-red-600 absolute -top-6 right-0 font-bold">FINISH</div>
          </div>

          {/* Running Dog */}
          <div
            className="absolute top-1/2 -translate-y-1/2 transition-all duration-200"
            style={{ left: `${distancePercent}%` }}
          >
            <div className={`text-6xl ${pace > 70 ? 'animate-bounce' : ''}`}>
              {stamina > 30 ? '🐕' : '🐕‍🦺'}
            </div>
          </div>
        </div>

        {/* Stamina Bar */}
        <div className="mb-6">
          <p className="text-sm text-earth-600 mb-2">Stamina</p>
          <div className="h-8 bg-earth-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${
                stamina > 60 ? 'bg-green-500' : stamina > 30 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${stamina}%` }}
            />
          </div>
        </div>

        {!gameOver && (
          <>
            {/* Pace Controls */}
            <div className="mb-4">
              <p className="text-sm text-earth-600 mb-2">Pace: {pace}%</p>
              <input
                type="range"
                min="0"
                max="100"
                value={pace}
                onChange={(e) => handlePaceChange(Number(e.target.value))}
                className="w-full h-4 rounded-lg appearance-none cursor-pointer bg-earth-200"
                style={{
                  background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${pace}%, #e5e7eb ${pace}%, #e5e7eb 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-earth-500 mt-1">
                <span>Slow (Save stamina)</span>
                <span>Fast (Drain stamina)</span>
              </div>
            </div>

            <button
              onClick={handleRest}
              className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all font-bold text-xl"
            >
              REST (Recover Stamina) 😴
            </button>
          </>
        )}

        {gameOver && (
          <div className="text-center">
            <p className="text-2xl font-bold text-earth-900 mb-2">
              {distance >= targetDistance
                ? stamina > 50
                  ? '🏆 Perfect! Great endurance!'
                  : '⭐ Completed! Well done!'
                : distance >= 1600
                ? '👍 Good effort!'
                : stamina === 0
                ? '😅 Ran out of stamina!'
                : '💪 Keep building endurance!'}
            </p>
            <p className="text-earth-600">Final Distance: {Math.floor(distance)}m</p>
            <p className="text-earth-600">Remaining Stamina: {Math.floor(stamina)}%</p>
            <p className="text-earth-600">Time Remaining: {timeLeft}s</p>
          </div>
        )}
      </div>
    </div>
  );
}
