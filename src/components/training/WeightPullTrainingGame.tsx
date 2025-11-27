import { useState, useEffect } from 'react';

interface WeightPullTrainingGameProps {
  onComplete: (performanceMultiplier: number) => void;
  dogName: string;
}

export default function WeightPullTrainingGame({ onComplete, dogName }: WeightPullTrainingGameProps) {
  const [gameStarted, setGameStarted] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [clicks, setClicks] = useState(0);
  const [liftProgress, setLiftProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(8);
  const [roundComplete, setRoundComplete] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [roundsCompleted, setRoundsCompleted] = useState(0);

  const totalRounds = 5;
  const roundRequirements = [20, 30, 40, 50, 60]; // Clicks needed per round

  const currentRequirement = roundRequirements[currentRound - 1];

  useEffect(() => {
    if (!gameStarted || roundComplete || gameOver) return;

    const timer = setInterval(() => {
      setTimeLeft((time) => {
        if (time <= 1) {
          // Time's up for this round
          handleRoundEnd(false);
          return 0;
        }
        return time - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStarted, roundComplete, gameOver, currentRound]);

  useEffect(() => {
    if (clicks >= currentRequirement && !roundComplete) {
      handleRoundEnd(true);
    }
  }, [clicks, currentRequirement, roundComplete]);

  const handleClick = () => {
    if (roundComplete || gameOver) return;

    setClicks((c) => c + 1);
    setLiftProgress(() => Math.min((clicks + 1) / currentRequirement * 100, 100));
  };

  const handleRoundEnd = (success: boolean) => {
    setRoundComplete(true);

    if (success) {
      setRoundsCompleted((r) => r + 1);

      if (currentRound >= totalRounds) {
        // Game complete!
        setTimeout(() => endGame(), 1500);
      } else {
        // Next round
        setTimeout(() => {
          setCurrentRound((r) => r + 1);
          setClicks(0);
          setLiftProgress(0);
          setTimeLeft(8);
          setRoundComplete(false);
        }, 1500);
      }
    } else {
      // Failed this round - game over
      setTimeout(() => endGame(), 1500);
    }
  };

  const endGame = () => {
    setGameOver(true);

    // Calculate performance multiplier
    const completionRatio = roundsCompleted / totalRounds;
    let multiplier: number;

    if (completionRatio === 1.0) {
      multiplier = 1.5; // Perfect - all rounds!
    } else if (completionRatio >= 0.8) {
      multiplier = 1.3; // Great
    } else if (completionRatio >= 0.6) {
      multiplier = 1.1; // Good
    } else if (completionRatio >= 0.4) {
      multiplier = 0.9; // Okay
    } else if (completionRatio >= 0.2) {
      multiplier = 0.7; // Poor
    } else {
      multiplier = 0.5; // Very poor
    }

    setTimeout(() => onComplete(multiplier), 2000);
  };

  const startGame = () => {
    setGameStarted(true);
  };

  if (!gameStarted) {
    return (
      <div className="text-center py-8">
        <h2 className="text-3xl font-bold text-earth-900 mb-4">Weight Pull Training</h2>
        <p className="text-earth-600 mb-6">
          Help {dogName} lift progressively heavier weights!
        </p>
        <div className="mb-6 text-earth-700 max-w-md mx-auto">
          <div className="bg-earth-50 rounded-lg p-4 mb-4">
            <p className="font-bold mb-2">How to Play:</p>
            <p className="text-sm mb-2">💪 Click rapidly to lift each weight</p>
            <p className="text-sm mb-2">📈 Each round gets harder (more clicks needed)</p>
            <p className="text-sm mb-2">⏱️ Complete each lift within 8 seconds</p>
            <p className="text-sm">🎯 Complete all {totalRounds} rounds for max bonus!</p>
          </div>
          <p className="mb-2 text-sm">🏆 All rounds = 1.5x bonus</p>
          <p className="mb-2 text-sm">⭐ 4 rounds = 1.3x bonus</p>
          <p className="text-sm">💪 Fail early = reduced bonus</p>
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

  return (
    <div className="text-center py-8">
      {/* Stats */}
      <div className="mb-6 flex justify-center gap-8">
        <div>
          <p className="text-earth-600 text-sm">Round</p>
          <p className="text-3xl font-bold text-earth-900">
            {currentRound}/{totalRounds}
          </p>
        </div>
        <div>
          <p className="text-earth-600 text-sm">Time Left</p>
          <p className="text-3xl font-bold text-red-600">{timeLeft}s</p>
        </div>
        <div>
          <p className="text-earth-600 text-sm">Clicks</p>
          <p className="text-3xl font-bold text-kennel-700">
            {clicks}/{currentRequirement}
          </p>
        </div>
      </div>

      {/* Round Progress */}
      <div className="mb-6 flex justify-center gap-2">
        {Array.from({ length: totalRounds }).map((_, index) => (
          <div
            key={index}
            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
              index < roundsCompleted
                ? 'bg-green-500 text-white'
                : index === currentRound - 1
                ? 'bg-kennel-500 text-white animate-pulse'
                : 'bg-earth-300 text-earth-600'
            }`}
          >
            {index + 1}
          </div>
        ))}
      </div>

      {/* Game Area */}
      <div className="bg-white rounded-lg p-8 mb-6 max-w-2xl mx-auto">
        {/* Weight Visual */}
        <div className="relative h-64 flex flex-col items-center justify-end mb-6">
          {/* Weight */}
          <div
            className="transition-all duration-200"
            style={{
              transform: `translateY(-${liftProgress}%)`,
            }}
          >
            <div className="text-8xl mb-4">🏋️</div>
            <p className="text-2xl font-bold text-earth-900">
              {currentRound * 20}kg
            </p>
          </div>

          {/* Ground */}
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-earth-600" />
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <p className="text-sm text-earth-600 mb-2">Lift Progress</p>
          <div className="h-8 bg-earth-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 transition-all duration-200"
              style={{ width: `${liftProgress}%` }}
            />
          </div>
        </div>

        {!roundComplete && !gameOver && (
          <button
            onClick={handleClick}
            className="w-full py-8 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 active:scale-95 transition-all font-bold text-3xl"
          >
            LIFT! 💪
          </button>
        )}

        {roundComplete && !gameOver && (
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600 mb-2 animate-bounce">
              ✅ Weight Lifted!
            </p>
            {currentRound < totalRounds && (
              <p className="text-earth-600">Get ready for round {currentRound + 1}...</p>
            )}
          </div>
        )}

        {gameOver && (
          <div className="text-center">
            <p className="text-2xl font-bold text-earth-900 mb-2">
              {roundsCompleted === totalRounds
                ? '🏆 Perfect! All weights lifted!'
                : roundsCompleted >= 4
                ? '⭐ Great strength training!'
                : roundsCompleted >= 3
                ? '👍 Good effort!'
                : '💪 Keep building that strength!'}
            </p>
            <p className="text-earth-600">Rounds Completed: {roundsCompleted}/{totalRounds}</p>
          </div>
        )}
      </div>
    </div>
  );
}
