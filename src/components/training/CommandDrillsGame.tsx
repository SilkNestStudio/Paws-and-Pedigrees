import { useState, useEffect } from 'react';

interface CommandDrillsGameProps {
  onComplete: (performanceMultiplier: number) => void;
  dogName: string;
}

const COMMANDS = ['Sit', 'Stay', 'Down', 'Come', 'Heel', 'Leave It', 'Drop It', 'Wait'];

export default function CommandDrillsGame({ onComplete, dogName }: CommandDrillsGameProps) {
  const [gameStarted, setGameStarted] = useState(false);
  const [currentCommand, setCurrentCommand] = useState<string | null>(null);
  const [commandStartTime, setCommandStartTime] = useState<number>(0);
  const [commandsCompleted, setCommandsCompleted] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [totalResponseTime, setTotalResponseTime] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const totalCommands = 10;
  const fastResponseTime = 1500; // ms - fast if under 1.5s
  const slowResponseTime = 3000; // ms - slow if over 3s

  useEffect(() => {
    if (gameStarted && !gameOver && currentCommand === null) {
      // Issue next command after a brief delay
      setTimeout(() => {
        issueNextCommand();
      }, 1000);
    }
  }, [gameStarted, gameOver, currentCommand]);

  const issueNextCommand = () => {
    if (commandsCompleted >= totalCommands) {
      endGame();
      return;
    }

    const randomCommand = COMMANDS[Math.floor(Math.random() * COMMANDS.length)];
    setCurrentCommand(randomCommand);
    setCommandStartTime(Date.now());
    setFeedback(null);
  };

  const handleCommandResponse = (response: string) => {
    if (!currentCommand || gameOver) return;

    const responseTime = Date.now() - commandStartTime;
    const isCorrect = response === currentCommand;

    if (isCorrect) {
      // Correct response!
      setCommandsCompleted((c) => c + 1);
      setTotalResponseTime((t) => t + responseTime);

      if (responseTime < fastResponseTime) {
        setFeedback('⚡ Lightning fast!');
      } else if (responseTime < slowResponseTime) {
        setFeedback('✅ Good!');
      } else {
        setFeedback('⏱️ Correct, but slow...');
      }
    } else {
      // Wrong command!
      setMistakes((m) => m + 1);
      setCommandsCompleted((c) => c + 1); // Still counts as completed
      setFeedback('❌ Wrong command!');
    }

    setCurrentCommand(null);
  };

  const endGame = () => {
    setGameOver(true);

    // Calculate performance multiplier
    const accuracy = ((totalCommands - mistakes) / totalCommands);
    const avgResponseTime = totalResponseTime / (totalCommands - mistakes || 1);

    let multiplier: number;

    if (mistakes === 0 && avgResponseTime < fastResponseTime) {
      multiplier = 1.5; // Perfect - fast and accurate!
    } else if (mistakes <= 1 && avgResponseTime < slowResponseTime) {
      multiplier = 1.3; // Excellent
    } else if (mistakes <= 2 && accuracy >= 0.8) {
      multiplier = 1.2; // Great
    } else if (accuracy >= 0.7) {
      multiplier = 1.0; // Good
    } else if (accuracy >= 0.5) {
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
        <h2 className="text-3xl font-bold text-earth-900 mb-4">Command Drills Training</h2>
        <p className="text-earth-600 mb-6">
          Test {dogName}'s obedience - respond to {totalCommands} commands quickly!
        </p>
        <div className="mb-6 text-earth-700 max-w-md mx-auto">
          <div className="bg-earth-50 rounded-lg p-4 mb-4">
            <p className="font-bold mb-2">How to Play:</p>
            <p className="text-sm mb-2">👂 Watch for the command that appears</p>
            <p className="text-sm mb-2">👆 Click the SAME command button as fast as possible</p>
            <p className="text-sm mb-2">⚡ Faster responses = better training</p>
            <p className="text-sm">❌ Wrong commands count as mistakes!</p>
          </div>
          <p className="mb-2 text-sm">🏆 Perfect accuracy + fast = 1.5x bonus</p>
          <p className="mb-2 text-sm">⭐ 1-2 mistakes = 1.2x+ bonus</p>
          <p className="text-sm">💪 Many mistakes = reduced bonus</p>
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
          <p className="text-earth-600 text-sm">Commands</p>
          <p className="text-3xl font-bold text-kennel-700">
            {commandsCompleted}/{totalCommands}
          </p>
        </div>
        <div>
          <p className="text-earth-600 text-sm">Accuracy</p>
          <p className="text-3xl font-bold text-green-600">
            {commandsCompleted > 0
              ? Math.floor(((commandsCompleted - mistakes) / commandsCompleted) * 100)
              : 100}%
          </p>
        </div>
        <div>
          <p className="text-earth-600 text-sm">Mistakes</p>
          <p className="text-3xl font-bold text-red-600">{mistakes}</p>
        </div>
      </div>

      {/* Game Area */}
      <div className="bg-white rounded-lg p-8 mb-6 max-w-3xl mx-auto">
        {/* Current Command Display */}
        <div className="mb-8 min-h-32 flex items-center justify-center">
          {currentCommand && !gameOver && (
            <div className="text-center">
              <p className="text-6xl font-bold text-kennel-700 animate-pulse mb-4">
                {currentCommand}!
              </p>
              <p className="text-earth-600">Click the command below!</p>
            </div>
          )}

          {!currentCommand && !gameOver && commandsCompleted < totalCommands && (
            <p className="text-2xl text-earth-600 animate-pulse">Get ready...</p>
          )}

          {feedback && !gameOver && (
            <div className="text-4xl font-bold animate-bounce">{feedback}</div>
          )}

          {gameOver && (
            <div className="text-center">
              <p className="text-3xl font-bold text-earth-900 mb-4">
                {mistakes === 0
                  ? '🏆 Perfect! Flawless obedience!'
                  : mistakes <= 2
                  ? '⭐ Excellent training!'
                  : mistakes <= 4
                  ? '👍 Good work!'
                  : '💪 Keep practicing!'}
              </p>
              <p className="text-earth-600">Commands Completed: {commandsCompleted}</p>
              <p className="text-earth-600">Mistakes: {mistakes}</p>
              <p className="text-earth-600">
                Accuracy: {Math.floor(((totalCommands - mistakes) / totalCommands) * 100)}%
              </p>
            </div>
          )}
        </div>

        {/* Command Buttons */}
        {!gameOver && currentCommand && (
          <div className="grid grid-cols-4 gap-3">
            {COMMANDS.map((command) => (
              <button
                key={command}
                onClick={() => handleCommandResponse(command)}
                className={`p-4 rounded-lg font-bold text-lg transition-all hover:scale-105 ${
                  command === currentCommand
                    ? 'bg-kennel-600 text-white hover:bg-kennel-700'
                    : 'bg-earth-100 text-earth-900 hover:bg-earth-200'
                }`}
              >
                {command}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
