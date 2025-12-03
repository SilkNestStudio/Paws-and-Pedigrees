import { useState, useEffect, useCallback } from 'react';

interface CommandDrillsGameProps {
  onComplete: (performanceMultiplier: number) => void;
  dogName: string;
}

const COMMANDS = [
  { name: 'Sit', emoji: '🪑' },
  { name: 'Stay', emoji: '✋' },
  { name: 'Down', emoji: '⬇️' },
  { name: 'Come', emoji: '🤝' },
  { name: 'Heel', emoji: '👣' },
  { name: 'Leave It', emoji: '🚫' },
  { name: 'Drop It', emoji: '📦' },
  { name: 'Wait', emoji: '⏸️' },
];

export default function CommandDrillsGame({ onComplete, dogName }: CommandDrillsGameProps) {
  const [phase, setPhase] = useState<'ready' | 'playing' | 'finished'>('ready');
  const [currentCommand, setCurrentCommand] = useState<typeof COMMANDS[0] | null>(null);
  const [commandStartTime, setCommandStartTime] = useState(0);
  const [commandsCompleted, setCommandsCompleted] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalResponseTime, setTotalResponseTime] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'incorrect' | 'fast' | 'slow'; text: string } | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);

  const TOTAL_COMMANDS = 10;
  const FAST_RESPONSE = 1000; // ms
  const GOOD_RESPONSE = 2000; // ms
  const SLOW_RESPONSE = 3500; // ms

  // Issue next command
  useEffect(() => {
    if (phase === 'playing' && !currentCommand && !isWaiting && commandsCompleted < TOTAL_COMMANDS) {
      setIsWaiting(true);
      setFeedback(null);

      // Random delay before next command (0.5-1.5 seconds)
      const delay = 500 + Math.random() * 1000;

      setTimeout(() => {
        issueNextCommand();
        setIsWaiting(false);
      }, delay);
    } else if (phase === 'playing' && commandsCompleted >= TOTAL_COMMANDS) {
      setTimeout(() => setPhase('finished'), 1500);
    }
  }, [phase, currentCommand, isWaiting, commandsCompleted]);

  const issueNextCommand = () => {
    const randomCommand = COMMANDS[Math.floor(Math.random() * COMMANDS.length)];
    setCurrentCommand(randomCommand);
    setCommandStartTime(Date.now());
  };

  const handleCommandResponse = useCallback((selectedCommand: typeof COMMANDS[0]) => {
    if (!currentCommand || phase !== 'playing' || isWaiting) return;

    const responseTime = Date.now() - commandStartTime;
    const isCorrect = selectedCommand.name === currentCommand.name;

    setCommandsCompleted(prev => prev + 1);

    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      setTotalResponseTime(prev => prev + responseTime);

      // Provide feedback based on speed
      if (responseTime < FAST_RESPONSE) {
        setFeedback({ type: 'fast', text: '⚡ Lightning fast!' });
      } else if (responseTime < GOOD_RESPONSE) {
        setFeedback({ type: 'correct', text: '✅ Good!' });
      } else if (responseTime < SLOW_RESPONSE) {
        setFeedback({ type: 'slow', text: '⏱️ Correct, but slow' });
      } else {
        setFeedback({ type: 'slow', text: '🐢 Too slow!' });
      }
    } else {
      setFeedback({ type: 'incorrect', text: `❌ Wrong! It was ${currentCommand.name}!` });
    }

    setCurrentCommand(null);
  }, [currentCommand, commandStartTime, phase, isWaiting]);

  const calculatePerformance = () => {
    const accuracy = correctAnswers / TOTAL_COMMANDS;
    const avgResponseTime = totalResponseTime / (correctAnswers || 1);

    let performance = 0.3; // Base performance

    // Performance based on accuracy and speed
    if (accuracy === 1.0 && avgResponseTime < FAST_RESPONSE) {
      performance = 1.5; // Perfect - fast and accurate
    } else if (accuracy >= 0.9 && avgResponseTime < GOOD_RESPONSE) {
      performance = 1.3; // Excellent
    } else if (accuracy >= 0.8 && avgResponseTime < SLOW_RESPONSE) {
      performance = 1.2; // Great
    } else if (accuracy >= 0.7) {
      performance = 1.0; // Good
    } else if (accuracy >= 0.6) {
      performance = 0.8; // Okay
    } else if (accuracy >= 0.5) {
      performance = 0.6; // Poor
    } else {
      performance = 0.4; // Very poor
    }

    return Math.min(1.5, Math.max(0.3, performance));
  };

  const handleFinish = () => {
    const performance = calculatePerformance();
    onComplete(performance);
  };

  const handleStart = () => {
    setPhase('playing');
  };

  if (phase === 'ready') {
    return (
      <div className="bg-gradient-to-b from-purple-50 to-pink-50 rounded-lg p-8 min-h-[600px]">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-3xl font-bold text-earth-900 mb-2">Obedience Command Drills</h2>
            <p className="text-earth-600 text-lg">Test {dogName}'s command recognition!</p>
          </div>

          <div className="bg-white rounded-lg p-6 mb-6">
            <h3 className="font-bold text-earth-900 mb-4">How to Play:</h3>
            <ul className="space-y-2 text-earth-700">
              <li className="flex items-start gap-2">
                <span className="text-purple-600">1.</span>
                <span>Watch for the command that appears in large text</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">2.</span>
                <span>Click the SAME command button as quickly as possible</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">3.</span>
                <span>Speed matters - faster responses show better training!</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">4.</span>
                <span>Complete {TOTAL_COMMANDS} commands correctly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">5.</span>
                <span>Wrong answers count as mistakes!</span>
              </li>
            </ul>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4 mb-6">
            <p className="text-yellow-900 text-sm">
              <strong>💡 Tip:</strong> Focus on accuracy first, then speed. A well-trained dog responds correctly AND quickly!
            </p>
          </div>

          <button
            onClick={handleStart}
            className="w-full py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-bold text-lg"
          >
            Start Obedience Training
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'playing' || phase === 'finished') {
    const accuracy = commandsCompleted > 0 ? (correctAnswers / commandsCompleted) * 100 : 100;
    const avgResponseTime = correctAnswers > 0 ? totalResponseTime / correctAnswers : 0;

    return (
      <div className="bg-gradient-to-b from-pink-50 to-purple-50 rounded-lg p-8 min-h-[600px]">
        <div className="max-w-4xl mx-auto">
          {phase === 'finished' && (
            <div className="bg-green-100 border-2 border-green-500 rounded-lg p-4 mb-6 text-center">
              <p className="text-green-900 font-bold text-xl">🎯 Training Complete!</p>
              <p className="text-green-700">
                {accuracy === 100
                  ? `Perfect obedience, ${dogName}!`
                  : accuracy >= 80
                  ? `Great work, ${dogName}!`
                  : `Keep practicing, ${dogName}!`}
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Commands</p>
              <p className="text-2xl font-bold text-purple-700">
                {commandsCompleted}/{TOTAL_COMMANDS}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Accuracy</p>
              <p className={`text-2xl font-bold ${
                accuracy >= 90 ? 'text-green-700' :
                accuracy >= 70 ? 'text-yellow-700' :
                'text-red-700'
              }`}>
                {Math.floor(accuracy)}%
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Correct</p>
              <p className="text-2xl font-bold text-green-700">{correctAnswers}</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Avg Time</p>
              <p className={`text-2xl font-bold ${
                avgResponseTime < FAST_RESPONSE ? 'text-green-700' :
                avgResponseTime < GOOD_RESPONSE ? 'text-yellow-700' :
                'text-orange-700'
              }`}>
                {avgResponseTime > 0 ? `${Math.floor(avgResponseTime)}ms` : '--'}
              </p>
            </div>
          </div>

          {/* Command display area */}
          <div className="bg-white rounded-lg p-8 mb-6 min-h-[250px] flex flex-col items-center justify-center">
            {isWaiting && phase === 'playing' && (
              <div className="text-center">
                <div className="text-5xl mb-4 animate-pulse">👂</div>
                <p className="text-2xl text-gray-600 animate-pulse">Listen carefully...</p>
              </div>
            )}

            {currentCommand && phase === 'playing' && (
              <div className="text-center animate-fade-in">
                <div className="text-8xl mb-4 animate-bounce">{currentCommand.emoji}</div>
                <p className="text-6xl font-bold text-purple-700 mb-4 animate-pulse">
                  {currentCommand.name}!
                </p>
                <p className="text-xl text-gray-600">Click the button below!</p>
              </div>
            )}

            {feedback && !currentCommand && phase === 'playing' && (
              <div className="text-center">
                <div className={`text-5xl font-bold mb-2 ${
                  feedback.type === 'fast' ? 'text-green-600 animate-bounce' :
                  feedback.type === 'correct' ? 'text-blue-600' :
                  feedback.type === 'slow' ? 'text-yellow-600' :
                  'text-red-600 animate-shake'
                }`}>
                  {feedback.text}
                </div>
              </div>
            )}

            {phase === 'finished' && (
              <div className="text-center">
                <p className="text-4xl font-bold text-earth-900 mb-4">
                  {accuracy === 100 && avgResponseTime < FAST_RESPONSE
                    ? '🏆 Perfect! Flawless obedience!'
                    : accuracy >= 90
                    ? '⭐ Excellent training!'
                    : accuracy >= 80
                    ? '👍 Great work!'
                    : accuracy >= 70
                    ? '💪 Good effort!'
                    : 'Keep practicing!'}
                </p>
                <div className="space-y-2 text-gray-700">
                  <p>Commands Completed: {commandsCompleted}</p>
                  <p>Correct Answers: {correctAnswers}</p>
                  <p>Accuracy: {Math.floor(accuracy)}%</p>
                  {avgResponseTime > 0 && (
                    <p>Average Response Time: {Math.floor(avgResponseTime)}ms</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Progress</span>
              <span className="text-sm text-gray-600">{commandsCompleted}/{TOTAL_COMMANDS}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                style={{ width: `${(commandsCompleted / TOTAL_COMMANDS) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Command buttons */}
          {phase === 'playing' && currentCommand && (
            <div className="grid grid-cols-4 gap-3">
              {COMMANDS.map((command) => (
                <button
                  key={command.name}
                  onClick={() => handleCommandResponse(command)}
                  className="p-4 bg-white rounded-lg hover:bg-purple-100 active:bg-purple-200 border-2 border-purple-300 hover:border-purple-500 transition-all font-bold text-center"
                >
                  <div className="text-3xl mb-1">{command.emoji}</div>
                  <div className="text-sm text-gray-800">{command.name}</div>
                </button>
              ))}
            </div>
          )}

          {phase === 'finished' && (
            <button
              onClick={handleFinish}
              className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold text-lg"
            >
              Complete Training
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
