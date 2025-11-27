import { useState } from 'react';

interface ObedienceMiniGameProps {
  onComplete: (score: number) => void;
  dogName: string;
}

const COMMANDS = ['🦴 Sit', '👋 Stay', '🎾 Fetch', '🔄 Roll', '🤝 Shake', '⬇️ Down', '🎪 Spin', '🎯 Come'];

export default function ObedienceMiniGame({ onComplete, dogName }: ObedienceMiniGameProps) {
  const [gameStarted, setGameStarted] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerSequence, setPlayerSequence] = useState<number[]>([]);
  const [showingSequence, setShowingSequence] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [score, setScore] = useState(100);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [gamePhase, setGamePhase] = useState<'memorize' | 'repeat' | 'feedback'>('memorize');

  const totalRounds = 5;

  const startGame = () => {
    setGameStarted(true);
    setCurrentRound(0);
    setScore(100);
    startRound(0);
  };

  const startRound = (round: number) => {
    // Generate sequence (length = round + 2, so starts at 2 items)
    const newSequence: number[] = [];
    for (let i = 0; i <= round + 1; i++) {
      newSequence.push(Math.floor(Math.random() * COMMANDS.length));
    }
    setSequence(newSequence);
    setPlayerSequence([]);
    setGamePhase('memorize');
    setShowingSequence(true);
    showSequence(newSequence);
  };

  const showSequence = async (seq: number[]) => {
    for (let i = 0; i < seq.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setHighlightedIndex(seq[i]);
      await new Promise(resolve => setTimeout(resolve, 600));
      setHighlightedIndex(null);
    }
    setShowingSequence(false);
    setGamePhase('repeat');
  };

  const handleCommandClick = (commandIndex: number) => {
    if (showingSequence || gamePhase === 'feedback') return;

    const newPlayerSequence = [...playerSequence, commandIndex];
    setPlayerSequence(newPlayerSequence);

    // Check if correct so far
    const isCorrect = sequence[newPlayerSequence.length - 1] === commandIndex;

    if (!isCorrect) {
      // Wrong!
      handleRoundComplete(false);
    } else if (newPlayerSequence.length === sequence.length) {
      // Complete and correct!
      handleRoundComplete(true);
    }
  };

  const handleRoundComplete = (success: boolean) => {
    setGamePhase('feedback');

    let points = 0;
    let feedbackText = '';

    if (success) {
      points = 0;
      feedbackText = '✅ Perfect! Good dog!';
    } else {
      points = -20;
      feedbackText = '❌ Wrong sequence!';
    }

    setScore(Math.max(0, score + points));
    setFeedback(feedbackText);

    setTimeout(() => {
      setFeedback(null);

      if (currentRound + 1 >= totalRounds) {
        // Game complete
        onComplete(Math.max(0, score + points));
      } else {
        // Next round
        setCurrentRound(currentRound + 1);
        startRound(currentRound + 1);
      }
    }, 1500);
  };

  if (!gameStarted) {
    return (
      <div className="text-center py-12">
        <h2 className="text-3xl font-bold text-earth-900 mb-4">Obedience Trial Mini-Game</h2>
        <p className="text-earth-600 mb-6">
          Test {dogName}'s obedience training!<br/>
          Watch the sequence and repeat it back.
        </p>
        <div className="mb-6 text-earth-700 max-w-md mx-auto">
          <div className="bg-earth-50 rounded-lg p-4 mb-4">
            <p className="font-bold mb-2">How to Play:</p>
            <p className="text-sm mb-2">👀 Watch as commands are highlighted in sequence</p>
            <p className="text-sm mb-2">🧠 Memorize the order</p>
            <p className="text-sm mb-2">👆 Click the commands in the same order!</p>
            <p className="text-sm">📈 Each round adds one more command to remember</p>
          </div>
          <p className="mb-2 text-sm">✅ Correct sequence = No penalty</p>
          <p className="text-sm">❌ Wrong sequence = -20 points</p>
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
      <div className="mb-6">
        <div className="flex justify-center gap-2 mb-4">
          {Array.from({ length: totalRounds }).map((_, index) => (
            <div
              key={index}
              className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                index < currentRound
                  ? 'bg-green-500 text-white'
                  : index === currentRound
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

      <div className="bg-white rounded-lg p-8 mb-6 max-w-3xl mx-auto">
        {gamePhase === 'memorize' && (
          <h3 className="text-2xl font-bold text-earth-900 mb-6 animate-pulse">
            👀 Watch the sequence... ({sequence.length} commands)
          </h3>
        )}
        {gamePhase === 'repeat' && (
          <h3 className="text-2xl font-bold text-earth-900 mb-6">
            Your turn! Repeat the sequence ({playerSequence.length}/{sequence.length})
          </h3>
        )}
        {gamePhase === 'feedback' && feedback && (
          <div className="text-5xl font-bold mb-6 animate-bounce">
            {feedback}
          </div>
        )}

        {!feedback && (
          <div className="grid grid-cols-4 gap-4">
            {COMMANDS.map((command, index) => (
              <button
                key={index}
                onClick={() => handleCommandClick(index)}
                disabled={showingSequence || gamePhase === 'feedback'}
                className={`p-6 rounded-lg font-bold text-lg transition-all transform ${
                  highlightedIndex === index
                    ? 'bg-yellow-400 scale-110 shadow-xl'
                    : playerSequence.includes(index)
                    ? 'bg-green-200 border-2 border-green-500'
                    : 'bg-earth-100 hover:bg-earth-200'
                } ${
                  showingSequence || gamePhase === 'feedback'
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer hover:scale-105'
                }`}
              >
                {command}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-earth-600">
        Round {currentRound + 1} of {totalRounds}
      </p>
    </div>
  );
}
