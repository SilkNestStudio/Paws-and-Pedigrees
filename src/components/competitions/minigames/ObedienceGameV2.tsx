import { useState, useEffect, useRef } from 'react';
import type { Dog } from '../../../types';

interface ObedienceGameV2Props {
  dog: Dog;
  onComplete: (score: number) => void;
}

type Command = 'sit' | 'stay' | 'down' | 'come' | 'heel';

interface CommandDisplay {
  icon: string;
  name: string;
  color: string;
}

const COMMANDS: Record<Command, CommandDisplay> = {
  sit: { icon: '🪑', name: 'SIT', color: 'bg-blue-500' },
  stay: { icon: '✋', name: 'STAY', color: 'bg-green-500' },
  down: { icon: '⬇️', name: 'DOWN', color: 'bg-purple-500' },
  come: { icon: '👋', name: 'COME', color: 'bg-orange-500' },
  heel: { icon: '👣', name: 'HEEL', color: 'bg-pink-500' },
};

interface BreedModifiers {
  maxRounds: number;
  displayTime: number; // Time to show each command (ms)
  inputTime: number; // Time to input sequence (ms)
  errorTolerance: number; // Number of mistakes allowed
}

const getBreedModifiers = (dog: Dog): BreedModifiers => {
  const intelligence = dog.intelligence;
  const trainability = dog.trainability;
  const obedience = dog.obedience_trained || 0;

  return {
    maxRounds: Math.min(10, 5 + Math.floor((intelligence + trainability) / 40)), // 5-10 rounds
    displayTime: Math.max(400, 800 - (intelligence * 2)), // 400-800ms per command
    inputTime: Math.max(3000, 5000 - (trainability * 10)), // 3-5s total input time
    errorTolerance: Math.floor(obedience / 30), // 0-3 mistakes allowed
  };
};

export default function ObedienceGameV2({ dog, onComplete }: ObedienceGameV2Props) {
  const [gameState, setGameState] = useState<'ready' | 'showing' | 'input' | 'finished'>('ready');
  const [round, setRound] = useState(1);
  const [sequence, setSequence] = useState<Command[]>([]);
  const [playerInput, setPlayerInput] = useState<Command[]>([]);
  const [currentDisplay, setCurrentDisplay] = useState<Command | null>(null);
  const [score, setScore] = useState(0);
  const [perfectRounds, setPerfectRounds] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const displayTimeoutRef = useRef<NodeJS.Timeout>();
  const inputTimerRef = useRef<number>();
  const modifiers = getBreedModifiers(dog);

  // Start a new round
  const startRound = () => {
    if (round > modifiers.maxRounds) {
      finishGame();
      return;
    }

    // Generate sequence (length = round number)
    const commandTypes = Object.keys(COMMANDS) as Command[];
    const newSequence: Command[] = [];
    for (let i = 0; i < round; i++) {
      newSequence.push(commandTypes[Math.floor(Math.random() * commandTypes.length)]);
    }

    setSequence(newSequence);
    setPlayerInput([]);
    setGameState('showing');
    setTimeRemaining(modifiers.inputTime / 1000);

    // Display sequence
    displaySequence(newSequence);
  };

  const displaySequence = (seq: Command[]) => {
    let index = 0;

    const showNext = () => {
      if (index < seq.length) {
        setCurrentDisplay(seq[index]);
        displayTimeoutRef.current = setTimeout(() => {
          setCurrentDisplay(null);
          displayTimeoutRef.current = setTimeout(() => {
            index++;
            showNext();
          }, 200); // Brief pause between commands
        }, modifiers.displayTime);
      } else {
        // Sequence shown, start input phase
        setGameState('input');
        startInputTimer();
      }
    };

    showNext();
  };

  const startInputTimer = () => {
    const startTime = Date.now();
    const duration = modifiers.inputTime;

    const updateTimer = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      setTimeRemaining(remaining / 1000);

      if (remaining > 0) {
        inputTimerRef.current = requestAnimationFrame(updateTimer);
      } else {
        // Time's up - check if input is complete
        checkSequence(playerInput);
      }
    };

    inputTimerRef.current = requestAnimationFrame(updateTimer);
  };

  const handleCommandClick = (command: Command) => {
    if (gameState !== 'input') return;

    const newInput = [...playerInput, command];
    setPlayerInput(newInput);

    // Flash feedback
    setCurrentDisplay(command);
    setTimeout(() => setCurrentDisplay(null), 200);

    // If sequence complete, check it
    if (newInput.length === sequence.length) {
      if (inputTimerRef.current) {
        cancelAnimationFrame(inputTimerRef.current);
      }
      checkSequence(newInput);
    }
  };

  const checkSequence = (input: Command[]) => {
    let isCorrect = true;
    let correctCount = 0;

    for (let i = 0; i < sequence.length; i++) {
      if (input[i] === sequence[i]) {
        correctCount++;
      } else {
        isCorrect = false;
      }
    }

    if (isCorrect && input.length === sequence.length) {
      // Perfect round
      setFeedback('correct');
      const roundScore = 100 * round; // More points for longer sequences
      setScore(prev => prev + roundScore);
      setPerfectRounds(prev => prev + 1);

      setTimeout(() => {
        setFeedback(null);
        const nextRound = round + 1;
        setRound(nextRound);
        // Start next round after incrementing
        setTimeout(() => {
          if (nextRound <= modifiers.maxRounds) {
            startRound();
          } else {
            finishGame();
          }
        }, 100);
      }, 1000);
    } else {
      // Mistake made
      setFeedback('wrong');
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);

      // Partial credit for correct commands
      const partialScore = correctCount * 20;
      setScore(prev => prev + partialScore);

      setTimeout(() => {
        setFeedback(null);

        // Check if too many mistakes
        if (newMistakes >= modifiers.errorTolerance + 1) {
          finishGame();
        } else {
          // Continue to next round
          const nextRound = round + 1;
          setRound(nextRound);
          setTimeout(() => {
            if (nextRound <= modifiers.maxRounds) {
              startRound();
            } else {
              finishGame();
            }
          }, 100);
        }
      }, 1000);
    }
  };

  const finishGame = () => {
    setGameState('finished');

    // Calculate final score
    const baseScore = score;
    const perfectBonus = perfectRounds === modifiers.maxRounds ? 500 : 0;
    const roundBonus = round * 50;
    const finalScore = baseScore + perfectBonus + roundBonus;

    setTimeout(() => onComplete(finalScore), 100);
  };

  const startGame = () => {
    setGameState('showing');
    setRound(1);
    setScore(0);
    setPerfectRounds(0);
    setMistakes(0);
    setPlayerInput([]);
    startRound();
  };

  // Auto-start next round
  useEffect(() => {
    if (gameState === 'showing' && round > 1) {
      const timeout = setTimeout(() => {
        startRound();
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [round, gameState]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (displayTimeoutRef.current) {
        clearTimeout(displayTimeoutRef.current);
      }
      if (inputTimerRef.current) {
        cancelAnimationFrame(inputTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-gradient-to-b from-blue-50 to-purple-50 rounded-lg p-6 min-h-[600px]">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-earth-900 mb-2">🎓 Obedience Trial</h2>
        <p className="text-earth-600 text-sm">
          Watch the command sequence, then repeat it perfectly!
        </p>
      </div>

      {/* Stats Display */}
      {gameState !== 'ready' && gameState !== 'finished' && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-xs text-gray-600">Round</p>
            <p className="text-2xl font-bold text-kennel-700">{round}/{modifiers.maxRounds}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-green-600">Score</p>
            <p className="text-2xl font-bold text-green-700">{score}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-600">Perfect</p>
            <p className="text-2xl font-bold text-blue-700">{perfectRounds}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-xs text-red-600">Mistakes</p>
            <p className="text-2xl font-bold text-red-700">{mistakes}/{modifiers.errorTolerance + 1}</p>
          </div>
        </div>
      )}

      {/* Game Area */}
      <div className="relative">
        {gameState === 'ready' && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🐕‍🦺</div>
            <h3 className="text-2xl font-bold text-earth-900 mb-4">Ready for Training!</h3>
            <div className="bg-blue-50 rounded-lg p-4 mb-6 max-w-md mx-auto">
              <p className="text-sm text-blue-900 mb-2"><strong>How to Play:</strong></p>
              <ul className="text-sm text-blue-800 text-left space-y-1">
                <li>• Watch {dog.name} perform the command sequence</li>
                <li>• Click the commands in the same order</li>
                <li>• Sequences get longer each round</li>
                <li>• Complete all {modifiers.maxRounds} rounds for max score!</li>
              </ul>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => onComplete(0)}
                className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-bold text-lg"
              >
                Cancel
              </button>
              <button
                onClick={startGame}
                className="px-8 py-3 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 transition-colors font-bold text-lg"
              >
                Start Training!
              </button>
            </div>
          </div>
        )}

        {(gameState === 'showing' || gameState === 'input') && (
          <>
            {/* Display Area */}
            <div className="bg-white rounded-lg p-8 mb-6 min-h-[200px] flex items-center justify-center relative">
              {gameState === 'showing' && (
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">Watch carefully...</p>
                  {currentDisplay ? (
                    <div className={`${COMMANDS[currentDisplay].color} text-white rounded-lg p-8 transition-all transform scale-110`}>
                      <div className="text-6xl mb-2">{COMMANDS[currentDisplay].icon}</div>
                      <div className="text-2xl font-bold">{COMMANDS[currentDisplay].name}</div>
                    </div>
                  ) : (
                    <div className="text-4xl opacity-30">🐕</div>
                  )}
                </div>
              )}

              {gameState === 'input' && (
                <div className="text-center w-full">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-600">Your turn - repeat the sequence!</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Time:</span>
                      <span className={`text-lg font-bold ${timeRemaining < 2 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`}>
                        {timeRemaining.toFixed(1)}s
                      </span>
                    </div>
                  </div>

                  {/* Progress indicator */}
                  <div className="flex justify-center gap-2 mb-4">
                    {sequence.map((cmd, index) => (
                      <div
                        key={index}
                        className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                          playerInput[index]
                            ? playerInput[index] === cmd
                              ? 'bg-green-500 text-white'
                              : 'bg-red-500 text-white'
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        {playerInput[index] ? COMMANDS[playerInput[index]].icon : '?'}
                      </div>
                    ))}
                  </div>

                  {/* Current display flash */}
                  {currentDisplay && (
                    <div className="text-4xl animate-ping">
                      {COMMANDS[currentDisplay].icon}
                    </div>
                  )}
                </div>
              )}

              {/* Feedback */}
              {feedback && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90">
                  <div className={`text-6xl font-bold ${
                    feedback === 'correct' ? 'text-green-500 animate-bounce' : 'text-red-500 animate-pulse'
                  }`}>
                    {feedback === 'correct' ? '✓ PERFECT!' : '✗ WRONG!'}
                  </div>
                </div>
              )}
            </div>

            {/* Command Buttons */}
            {gameState === 'input' && (
              <div className="grid grid-cols-5 gap-3">
                {(Object.keys(COMMANDS) as Command[]).map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => handleCommandClick(cmd)}
                    disabled={playerInput.length >= sequence.length}
                    className={`${COMMANDS[cmd].color} text-white rounded-lg p-4 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="text-4xl mb-1">{COMMANDS[cmd].icon}</div>
                    <div className="text-sm font-bold">{COMMANDS[cmd].name}</div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {gameState === 'finished' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-3xl font-bold text-earth-900 mb-6">Training Complete!</h3>

            <div className="bg-white rounded-lg p-6 max-w-md mx-auto mb-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Final Score</p>
                  <p className="text-3xl font-bold text-kennel-700">{score}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Rounds</p>
                  <p className="text-2xl font-bold text-blue-700">{round - 1}/{modifiers.maxRounds}</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-600">Perfect Rounds:</span>
                  <span className="font-bold">{perfectRounds}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">Mistakes:</span>
                  <span className="font-bold">{mistakes}</span>
                </div>
                {perfectRounds === modifiers.maxRounds && (
                  <div className="mt-4 p-3 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-lg border-2 border-yellow-400">
                    <p className="font-bold text-amber-900">🌟 FLAWLESS! +500 Bonus!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
