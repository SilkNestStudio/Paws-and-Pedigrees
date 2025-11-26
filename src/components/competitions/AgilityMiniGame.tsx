import { useState, useEffect, useRef } from 'react';

interface AgilityMiniGameProps {
  onComplete: (score: number) => void;
  dogName: string;
}

export default function AgilityMiniGame({ onComplete, dogName }: AgilityMiniGameProps) {
  const [gameStarted, setGameStarted] = useState(false);
  const [currentObstacle, setCurrentObstacle] = useState(0);
  const [score, setScore] = useState(100);
  const [targetPosition, setTargetPosition] = useState(50);
  const [indicatorPosition, setIndicatorPosition] = useState(0);
  const [movingRight, setMovingRight] = useState(true);
  const [waitingForClick, setWaitingForClick] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  
  const totalObstacles = 5;
  const speed = 2; // pixels per frame
  const animationRef = useRef<number | null>(null);

  const obstacles = ['🏃 Jump', '🌀 Weave', '🎯 Tunnel', '⚡ A-Frame', '🎪 See-Saw'];

  useEffect(() => {
    if (gameStarted && waitingForClick) {
      animationRef.current = requestAnimationFrame(moveIndicator);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gameStarted, waitingForClick, indicatorPosition, movingRight]);

  const moveIndicator = () => {
    setIndicatorPosition((prev) => {
      let next = movingRight ? prev + speed : prev - speed;

      if (next >= 100) {
        next = 100;
        setMovingRight(false);
      } else if (next <= 0) {
        next = 0;
        setMovingRight(true);
      }

      return next;
    });

    animationRef.current = requestAnimationFrame(moveIndicator);
  };

  const startGame = () => {
    setGameStarted(true);
    setCurrentObstacle(0);
    setScore(100);
    setTargetPosition(Math.random() * 60 + 20); // Random position between 20-80
    setIndicatorPosition(0);
    setMovingRight(true);
    setWaitingForClick(true);
  };

  const handleClick = () => {
    if (!waitingForClick) return;

    setWaitingForClick(false);

    // Calculate accuracy
    const distance = Math.abs(indicatorPosition - targetPosition);
    let points = 0;
    let feedbackText = '';

    if (distance <= 5) {
      points = 0; // Perfect!
      feedbackText = '🎯 PERFECT!';
    } else if (distance <= 10) {
      points = -5;
      feedbackText = '✓ Good!';
    } else if (distance <= 20) {
      points = -10;
      feedbackText = '~ OK';
    } else {
      points = -20;
      feedbackText = '✗ Miss!';
    }

    setScore(Math.max(0, score + points));
    setFeedback(feedbackText);

    setTimeout(() => {
      setFeedback(null);
      if (currentObstacle + 1 >= totalObstacles) {
        // Game complete
        onComplete(Math.max(0, score + points));
      } else {
        // Next obstacle
        setCurrentObstacle(currentObstacle + 1);
        setTargetPosition(Math.random() * 60 + 20);
        setIndicatorPosition(0);
        setMovingRight(true);
        setWaitingForClick(true);
      }
    }, 1000);
  };

  if (!gameStarted) {
    return (
      <div className="text-center py-12">
        <h2 className="text-3xl font-bold text-earth-900 mb-4">Agility Course Mini-Game</h2>
        <p className="text-earth-600 mb-6">
          Guide {dogName} through 5 obstacles!<br/>
          Click when the moving bar hits the target zone.
        </p>
        <div className="mb-6 text-earth-700 max-w-md mx-auto">
          <div className="bg-earth-50 rounded-lg p-4 mb-4">
            <p className="font-bold mb-2">How to Play:</p>
            <p className="text-sm mb-2">🎯 A bar will move left and right across the track</p>
            <p className="text-sm mb-2">🎨 The green zone is your target</p>
            <p className="text-sm mb-2">👆 Click anywhere when the bar is in the green zone!</p>
          </div>
          <p className="mb-2 text-sm">🎯 Perfect (±5%) = No penalty</p>
          <p className="mb-2 text-sm">✓ Good (±10%) = -5 points</p>
          <p className="mb-2 text-sm">~ OK (±20%) = -10 points</p>
          <p className="text-sm">✗ Miss = -20 points</p>
        </div>
        <button
          onClick={startGame}
          className="px-8 py-4 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 transition-all font-bold text-xl"
        >
          Start Course!
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <div className="mb-6">
        <div className="flex justify-center gap-2 mb-4">
          {obstacles.map((_, index) => (
            <div
              key={index}
              className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                index < currentObstacle
                  ? 'bg-green-500 text-white'
                  : index === currentObstacle
                  ? 'bg-kennel-500 text-white animate-pulse'
                  : 'bg-earth-300 text-earth-600'
              }`}
            >
              {index + 1}
            </div>
          ))}
        </div>
        <p className="text-2xl font-bold text-earth-900">Score: {score}/100</p>
      </div>

      <div className="bg-white rounded-lg p-8 mb-6 max-w-2xl mx-auto">
        <h3 className="text-3xl font-bold text-earth-900 mb-6">
          {obstacles[currentObstacle]}
        </h3>

        {feedback ? (
          <div className="text-6xl font-bold mb-6 animate-bounce">
            {feedback}
          </div>
        ) : (
          <>
            <div 
              className="relative w-full h-20 bg-earth-200 rounded-lg mb-6 cursor-pointer"
              onClick={handleClick}
            >
              {/* Target Zone */}
              <div
                className="absolute top-0 h-full bg-green-400/40 rounded"
                style={{
                  left: `${Math.max(0, targetPosition - 5)}%`,
                  width: '10%',
                }}
              />
              
              {/* Moving Indicator */}
              <div
                className="absolute top-0 w-1 h-full bg-kennel-700 transition-none"
                style={{ left: `${indicatorPosition}%` }}
              >
                <div className="absolute -top-2 -left-3 w-8 h-8 bg-kennel-700 rounded-full flex items-center justify-center text-white font-bold">
                  ↓
                </div>
              </div>
            </div>

            <p className="text-earth-600 mb-4">Click when the arrow is in the green zone!</p>
            <button
              onClick={handleClick}
              className="w-full py-4 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 transition-all font-bold text-xl"
            >
              CLICK NOW!
            </button>
          </>
        )}
      </div>

      <p className="text-earth-600">
        Obstacle {currentObstacle + 1} of {totalObstacles}
      </p>
    </div>
  );
}