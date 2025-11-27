import { useState, useEffect } from 'react';

interface Obstacle {
  id: number;
  position: number;
  type: 'low' | 'high';
}

interface ObstacleCourseGameProps {
  onComplete: (performanceMultiplier: number) => void;
  dogName: string;
}

export default function ObstacleCourseGame({ onComplete, dogName }: ObstacleCourseGameProps) {
  const [gameStarted, setGameStarted] = useState(false);
  const [dogHeight, setDogHeight] = useState(50); // % from bottom
  const [isJumping, setIsJumping] = useState(false);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [obstaclesPassed, setObstaclesPassed] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const maxObstacles = 15;
  const maxHits = 3;

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    // Move obstacles
    const moveInterval = setInterval(() => {
      setObstacles((prev) => {
        const updated = prev
          .map((obs) => ({ ...obs, position: obs.position - 2 }))
          .filter((obs) => {
            if (obs.position < -10) {
              // Obstacle passed
              setObstaclesPassed((p) => p + 1);
              setScore((s) => s + 10);
              return false;
            }
            return true;
          });

        return updated;
      });
    }, 50);

    return () => clearInterval(moveInterval);
  }, [gameStarted, gameOver]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    // Spawn new obstacles
    const spawnInterval = setInterval(() => {
      if (obstaclesPassed >= maxObstacles) {
        endGame();
        return;
      }

      setObstacles((prev) => {
        // Don't spawn if there's already an obstacle near the spawn point
        if (prev.some((obs) => obs.position > 80)) return prev;

        return [
          ...prev,
          {
            id: Date.now(),
            position: 100,
            type: Math.random() > 0.5 ? 'low' : 'high',
          },
        ];
      });
    }, 1500);

    return () => clearInterval(spawnInterval);
  }, [gameStarted, gameOver, obstaclesPassed]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    // Check collisions
    obstacles.forEach((obs) => {
      // Dog is at position 20% from left
      if (obs.position >= 15 && obs.position <= 25) {
        // Collision zone
        const dogIsHigh = dogHeight > 50;
        const hit =
          (obs.type === 'low' && !dogIsHigh) || (obs.type === 'high' && dogIsHigh);

        if (hit) {
          setHits((h) => {
            const newHits = h + 1;
            if (newHits >= maxHits) {
              endGame();
            }
            return newHits;
          });
          // Remove this obstacle to prevent multiple hits
          setObstacles((prev) => prev.filter((o) => o.id !== obs.id));
        }
      }
    });
  }, [obstacles, dogHeight, gameStarted, gameOver]);

  const handleJump = () => {
    if (isJumping || gameOver) return;

    setIsJumping(true);
    setDogHeight(80);

    setTimeout(() => {
      setDogHeight(50);
      setIsJumping(false);
    }, 400);
  };

  const handleDuck = () => {
    if (isJumping || gameOver) return;

    setIsJumping(true);
    setDogHeight(20);

    setTimeout(() => {
      setDogHeight(50);
      setIsJumping(false);
    }, 400);
  };

  const endGame = () => {
    setGameOver(true);

    // Calculate performance multiplier
    const successRate = obstaclesPassed / maxObstacles;
    let multiplier: number;

    if (hits === 0 && obstaclesPassed === maxObstacles) {
      multiplier = 1.5; // Perfect run!
    } else if (hits <= 1 && successRate >= 0.9) {
      multiplier = 1.3; // Excellent
    } else if (hits <= 2 && successRate >= 0.8) {
      multiplier = 1.1; // Great
    } else if (successRate >= 0.6) {
      multiplier = 1.0; // Good
    } else if (successRate >= 0.4) {
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
        <h2 className="text-3xl font-bold text-earth-900 mb-4">Obstacle Course Training</h2>
        <p className="text-earth-600 mb-6">
          Help {dogName} navigate through {maxObstacles} obstacles!
        </p>
        <div className="mb-6 text-earth-700 max-w-md mx-auto">
          <div className="bg-earth-50 rounded-lg p-4 mb-4">
            <p className="font-bold mb-2">How to Play:</p>
            <p className="text-sm mb-2">⬆️ Click JUMP to jump over low barriers</p>
            <p className="text-sm mb-2">⬇️ Click DUCK to duck under high bars</p>
            <p className="text-sm mb-2">❤️ You have 3 lives - avoid hitting obstacles!</p>
            <p className="text-sm">🎯 Complete all {maxObstacles} obstacles</p>
          </div>
          <p className="mb-2 text-sm">🏆 Perfect run = 1.5x bonus</p>
          <p className="mb-2 text-sm">⭐ 1 hit = 1.3x bonus</p>
          <p className="text-sm">💪 3 hits = Game over!</p>
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
          <p className="text-earth-600 text-sm">Obstacles Cleared</p>
          <p className="text-3xl font-bold text-kennel-700">
            {obstaclesPassed}/{maxObstacles}
          </p>
        </div>
        <div>
          <p className="text-earth-600 text-sm">Lives</p>
          <p className="text-3xl font-bold text-red-600">
            {'❤️'.repeat(maxHits - hits)}
            {'🖤'.repeat(hits)}
          </p>
        </div>
        <div>
          <p className="text-earth-600 text-sm">Score</p>
          <p className="text-3xl font-bold text-earth-900">{score}</p>
        </div>
      </div>

      {/* Game Area */}
      <div className="bg-gradient-to-b from-sky-300 to-green-200 rounded-lg p-8 mb-6 max-w-3xl mx-auto">
        <div className="relative h-64 bg-gradient-to-b from-transparent to-green-300 rounded-lg border-4 border-earth-400 overflow-hidden">
          {/* Ground */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-green-600" />

          {/* Dog */}
          <div
            className="absolute left-[20%] transition-all duration-200"
            style={{ bottom: `${dogHeight}%` }}
          >
            <div className="text-6xl">🐕</div>
          </div>

          {/* Obstacles */}
          {obstacles.map((obs) => (
            <div
              key={obs.id}
              className="absolute transition-none"
              style={{
                left: `${obs.position}%`,
                bottom: obs.type === 'low' ? '8%' : '50%',
              }}
            >
              {obs.type === 'low' ? (
                <div className="text-5xl">🚧</div>
              ) : (
                <div className="text-5xl rotate-90">🚧</div>
              )}
            </div>
          ))}
        </div>

        {!gameOver && (
          <div className="mt-6 flex gap-4 justify-center">
            <button
              onClick={handleJump}
              disabled={isJumping}
              className="flex-1 max-w-xs py-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all font-bold text-2xl"
            >
              JUMP ⬆️
            </button>
            <button
              onClick={handleDuck}
              disabled={isJumping}
              className="flex-1 max-w-xs py-6 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 active:scale-95 disabled:opacity-50 transition-all font-bold text-2xl"
            >
              DUCK ⬇️
            </button>
          </div>
        )}

        {gameOver && (
          <div className="mt-6 text-center">
            <p className="text-2xl font-bold text-earth-900 mb-2">
              {hits === 0 && obstaclesPassed === maxObstacles
                ? '🏆 Perfect! Flawless run!'
                : hits <= 1
                ? '⭐ Excellent!'
                : hits <= 2
                ? '👍 Good job!'
                : '💪 Keep practicing!'}
            </p>
            <p className="text-earth-600">Obstacles Cleared: {obstaclesPassed}/{maxObstacles}</p>
            <p className="text-earth-600">Hits: {hits}</p>
            <p className="text-earth-600">Final Score: {score}</p>
          </div>
        )}
      </div>
    </div>
  );
}
