import { useState, useEffect, useCallback, useRef } from 'react';

interface CommandDrillsGameProps {
  onComplete: (performanceMultiplier: number) => void;
  dogName: string;
}

interface Command {
  name: string;
  emoji: string;
  color: string;
}

const COMMANDS: Command[] = [
  { name: 'Sit', emoji: '🪑', color: 'bg-blue-500' },
  { name: 'Stay', emoji: '✋', color: 'bg-green-500' },
  { name: 'Down', emoji: '⬇️', color: 'bg-purple-500' },
  { name: 'Come', emoji: '🤝', color: 'bg-yellow-500' },
  { name: 'Heel', emoji: '👣', color: 'bg-pink-500' },
  { name: 'Fetch', emoji: '🎾', color: 'bg-orange-500' },
];

export default function CommandDrillsGame({ onComplete, dogName }: CommandDrillsGameProps) {
  const [phase, setPhase] = useState<'ready' | 'playing' | 'finished'>('ready');
  const [currentCommand, setCurrentCommand] = useState<Command | null>(null);
  const [commandStartTime, setCommandStartTime] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30); // 30 second timer
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [fastResponses, setFastResponses] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; color: string; points: number } | null>(null);
  const [difficulty, setDifficulty] = useState(1000); // ms between commands
  const commandTimerRef = useRef<number>();

  const FAST_RESPONSE = 500; // ms
  const GOOD_RESPONSE = 1000; // ms

  // Update max combo
  useEffect(() => {
    if (combo > maxCombo) {
      setMaxCombo(combo);
    }
  }, [combo, maxCombo]);

  // Increase difficulty as game progresses
  useEffect(() => {
    if (combo >= 10) {
      setDifficulty(600);
    } else if (combo >= 5) {
      setDifficulty(800);
    } else {
      setDifficulty(1000);
    }
  }, [combo]);

  // Game timer (30 seconds)
  useEffect(() => {
    if (phase !== 'playing') return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Clear any pending command timers before finishing
          if (commandTimerRef.current) {
            clearTimeout(commandTimerRef.current);
          }
          setPhase('finished');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase]);

  // Issue new command
  const issueCommand = useCallback(() => {
    if (phase !== 'playing') return;

    const randomCommand = COMMANDS[Math.floor(Math.random() * COMMANDS.length)];
    setCurrentCommand(randomCommand);
    setCommandStartTime(Date.now());

    // Auto-miss if no response in time
    commandTimerRef.current = window.setTimeout(() => {
      if (currentCommand) {
        handleMiss();
      }
    }, 2500);
  }, [phase, currentCommand]);

  // Start issuing commands
  useEffect(() => {
    if (phase !== 'playing') return;

    // Initial command
    issueCommand();

    return () => {
      if (commandTimerRef.current) {
        clearTimeout(commandTimerRef.current);
      }
    };
  }, [phase]);

  const handleMiss = () => {
    if (phase !== 'playing') return; // Don't issue commands if game is over

    setCombo(0);
    setIncorrectCount(i => i + 1);
    showFeedback('MISSED! 💥', 'text-red-600', -10);

    // Issue next command
    setTimeout(() => {
      issueCommand();
    }, 300);
  };

  const handleCommandClick = useCallback((selectedCommand: Command) => {
    if (!currentCommand || phase !== 'playing') return;

    // Clear auto-miss timer
    if (commandTimerRef.current) {
      clearTimeout(commandTimerRef.current);
    }

    const responseTime = Date.now() - commandStartTime;
    const isCorrect = selectedCommand.name === currentCommand.name;

    if (isCorrect) {
      // Calculate points based on speed
      let points = 100;
      let feedbackText = 'GOOD! ✓';
      let feedbackColor = 'text-green-500';

      if (responseTime < FAST_RESPONSE) {
        points = 200;
        feedbackText = 'LIGHTNING! ⚡';
        feedbackColor = 'text-yellow-500';
        setFastResponses(f => f + 1);
      } else if (responseTime < GOOD_RESPONSE) {
        points = 150;
        feedbackText = 'QUICK! 🌟';
        feedbackColor = 'text-blue-500';
      }

      // Add combo multiplier
      const comboBonus = combo * 10;
      const totalPoints = points + comboBonus;

      setScore(s => s + totalPoints);
      setCombo(c => c + 1);
      setCorrectCount(c => c + 1);
      showFeedback(feedbackText, feedbackColor, totalPoints);
    } else {
      // Wrong command!
      setCombo(0);
      setIncorrectCount(i => i + 1);
      showFeedback('WRONG! ✗', 'text-red-500', -20);
    }

    // Issue next command after brief delay
    setTimeout(() => {
      issueCommand();
    }, difficulty);
  }, [currentCommand, commandStartTime, phase, combo, difficulty]);

  const showFeedback = (text: string, color: string, points: number) => {
    setFeedback({ text, color, points });
    setTimeout(() => setFeedback(null), 500);
  };

  const calculatePerformance = () => {
    const totalAttempts = correctCount + incorrectCount;
    const accuracy = totalAttempts > 0 ? correctCount / totalAttempts : 0;
    const speedBonus = fastResponses / (totalAttempts || 1);

    let performance = 0.3 + (accuracy * 0.5) + (speedBonus * 0.3);

    // Combo bonus
    if (maxCombo >= 20) performance += 0.4;
    else if (maxCombo >= 15) performance += 0.3;
    else if (maxCombo >= 10) performance += 0.2;
    else if (maxCombo >= 5) performance += 0.1;

    // Score bonus
    if (score >= 3000) performance += 0.3;
    else if (score >= 2000) performance += 0.2;
    else if (score >= 1000) performance += 0.1;

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
            <div className="text-6xl mb-4">🎯🐕</div>
            <h2 className="text-3xl font-bold text-earth-900 mb-2">Command Recognition Drills</h2>
            <p className="text-earth-600 text-lg">Test {dogName}'s speed and accuracy!</p>
          </div>

          <div className="bg-white rounded-lg p-6 mb-6 shadow-lg">
            <h3 className="font-bold text-earth-900 mb-4 text-xl">🎮 How to Play:</h3>
            <div className="space-y-3 text-earth-700">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="text-2xl">👀</span>
                <div>
                  <p className="font-semibold text-blue-900">Watch the Command</p>
                  <p className="text-sm">A command will appear in the center - read it quickly!</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <span className="text-2xl">⚡</span>
                <div>
                  <p className="font-semibold text-green-900">Click Fast!</p>
                  <p className="text-sm">Click the matching command button as fast as possible!</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                <span className="text-2xl">🔥</span>
                <div>
                  <p className="font-semibold text-yellow-900">Build Combos</p>
                  <p className="text-sm">Consecutive correct answers build your combo multiplier!</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                <span className="text-2xl">⏱️</span>
                <div>
                  <p className="font-semibold text-purple-900">Beat the Clock</p>
                  <p className="text-sm">You have 30 seconds - get the highest score possible!</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-purple-400 rounded-lg p-4 mb-6">
            <p className="text-purple-900 font-semibold mb-2">💡 Pro Tip:</p>
            <p className="text-sm text-purple-800">Lightning fast responses (&lt;500ms) give double points! The game speeds up as your combo grows!</p>
          </div>

          <button
            onClick={handleStart}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 font-bold text-xl shadow-lg"
          >
            🎯 Start Command Drills
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'playing' || phase === 'finished') {
    const totalAttempts = correctCount + incorrectCount;
    const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 100;

    return (
      <div className="bg-gradient-to-b from-pink-50 to-purple-50 rounded-lg p-6 min-h-[700px]">
        <div className="max-w-5xl mx-auto">
          {/* Stats Bar */}
          <div className="grid grid-cols-5 gap-3 mb-4">
            <div className="bg-white/90 rounded-lg p-3 text-center shadow">
              <p className="text-xs text-gray-600 mb-1">Time</p>
              <p className={`text-2xl font-bold ${timeRemaining <= 10 ? 'text-red-600 animate-pulse' : 'text-blue-700'}`}>
                {timeRemaining}s
              </p>
            </div>
            <div className="bg-white/90 rounded-lg p-3 text-center shadow">
              <p className="text-xs text-gray-600 mb-1">Score</p>
              <p className="text-2xl font-bold text-purple-700">{score}</p>
            </div>
            <div className="bg-white/90 rounded-lg p-3 text-center shadow">
              <p className="text-xs text-gray-600 mb-1">Combo</p>
              <p className={`text-2xl font-bold ${combo >= 10 ? 'text-yellow-500' : combo >= 5 ? 'text-orange-500' : 'text-gray-700'}`}>
                {combo > 0 ? `${combo}x 🔥` : '-'}
              </p>
            </div>
            <div className="bg-white/90 rounded-lg p-3 text-center shadow">
              <p className="text-xs text-gray-600 mb-1">Correct</p>
              <p className="text-2xl font-bold text-green-700">{correctCount}</p>
            </div>
            <div className="bg-white/90 rounded-lg p-3 text-center shadow">
              <p className="text-xs text-gray-600 mb-1">Accuracy</p>
              <p className={`text-2xl font-bold ${accuracy >= 90 ? 'text-green-600' : accuracy >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                {accuracy}%
              </p>
            </div>
          </div>

          {/* Command Display Area */}
          <div className="relative bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl overflow-hidden shadow-2xl border-4 border-purple-400 h-64 flex items-center justify-center mb-6">
            {phase === 'playing' && currentCommand && (
              <div className="text-center animate-pulse">
                <div className="text-9xl mb-4 animate-bounce">{currentCommand.emoji}</div>
                <div className="text-6xl font-bold text-purple-900">{currentCommand.name}!</div>
              </div>
            )}

            {/* Feedback overlay */}
            {feedback && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="text-center">
                  <div className={`text-6xl font-bold ${feedback.color} drop-shadow-2xl animate-ping`}>
                    {feedback.text}
                  </div>
                  {feedback.points > 0 && (
                    <div className="text-4xl font-bold text-white mt-4">
                      +{feedback.points}
                    </div>
                  )}
                  {feedback.points < 0 && (
                    <div className="text-4xl font-bold text-red-300 mt-4">
                      {feedback.points}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Finish overlay */}
            {phase === 'finished' && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
                <div className="bg-white rounded-xl p-8 text-center max-w-md shadow-2xl">
                  <div className="text-6xl mb-4">
                    {score >= 3000 ? '🏆' : score >= 2000 ? '⭐' : '💪'}
                  </div>
                  <h3 className="text-3xl font-bold text-earth-900 mb-4">Time's Up!</h3>
                  <div className="space-y-2 text-left mb-6">
                    <p className="text-gray-700">⭐ Final Score: <span className="font-bold text-purple-600">{score}</span></p>
                    <p className="text-gray-700">✓ Correct: <span className="font-bold text-green-600">{correctCount}</span></p>
                    <p className="text-gray-700">✗ Wrong: <span className="font-bold text-red-600">{incorrectCount}</span></p>
                    <p className="text-gray-700">⚡ Fast Responses: <span className="font-bold text-yellow-600">{fastResponses}</span></p>
                    <p className="text-gray-700">🔥 Max Combo: <span className="font-bold text-orange-600">{maxCombo}x</span></p>
                    <p className="text-gray-700">🎯 Accuracy: <span className="font-bold">{accuracy}%</span></p>
                  </div>
                  <button
                    onClick={handleFinish}
                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-bold text-lg shadow-lg"
                  >
                    Complete Training
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Command Buttons */}
          {phase === 'playing' && (
            <div className="grid grid-cols-3 gap-4">
              {COMMANDS.map((command) => (
                <button
                  key={command.name}
                  onClick={() => handleCommandClick(command)}
                  className={`p-6 ${command.color} text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg font-bold`}
                >
                  <div className="text-5xl mb-2">{command.emoji}</div>
                  <div className="text-xl">{command.name}</div>
                </button>
              ))}
            </div>
          )}

          {/* Combo indicator */}
          {phase === 'playing' && combo >= 5 && (
            <div className="mt-4 text-center">
              <div className="inline-block bg-gradient-to-r from-orange-400 to-red-500 text-white px-6 py-3 rounded-full font-bold text-xl shadow-lg animate-bounce">
                🔥 {combo}x COMBO! 🔥
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
