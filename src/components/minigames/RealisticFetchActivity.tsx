import { useState, useEffect } from 'react';
import { Dog } from '../../types';

interface RealisticFetchActivityProps {
  dog: Dog;
  onComplete: () => void;
  onCancel: () => void;
}

type FetchPhase = 'ready' | 'throwing' | 'chasing' | 'returning' | 'dropped';

export default function RealisticFetchActivity({ dog, onComplete, onCancel }: RealisticFetchActivityProps) {
  const [phase, setPhase] = useState<FetchPhase>('ready');
  const [throwCount, setThrowCount] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
  const [dogEnergy, setDogEnergy] = useState(100);
  const [enthusiasm, setEnthusiasm] = useState<'excited' | 'happy' | 'tired'>('excited');

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Update enthusiasm based on energy
    if (dogEnergy > 60) {
      setEnthusiasm('excited');
    } else if (dogEnergy > 30) {
      setEnthusiasm('happy');
    } else {
      setEnthusiasm('tired');
    }
  }, [dogEnergy]);

  const throwBall = () => {
    if (phase !== 'ready' || dogEnergy < 10) return;

    setPhase('throwing');

    // Ball is thrown - dog starts chasing
    setTimeout(() => {
      setPhase('chasing');
    }, 500);

    // Dog catches/gets ball
    setTimeout(() => {
      setPhase('returning');
    }, 2500);

    // Dog returns and drops ball
    setTimeout(() => {
      setPhase('dropped');
      setThrowCount((prev) => prev + 1);
      setDogEnergy((prev) => Math.max(0, prev - 8)); // Lose energy each throw
    }, 4500);

    // Ready for next throw
    setTimeout(() => {
      setPhase('ready');
    }, 5500);
  };

  const getPhaseText = () => {
    switch (phase) {
      case 'ready':
        if (dogEnergy < 10) {
          return `${dog.name} is too tired to play fetch. They need to rest.`;
        }
        return `${dog.name} is watching you intently, waiting for you to throw the ball!`;
      case 'throwing':
        return `You throw the ball!`;
      case 'chasing':
        return `${dog.name} sprints after the ball with joy!`;
      case 'returning':
        return `${dog.name} has the ball and is bringing it back to you!`;
      case 'dropped':
        return `${dog.name} drops the ball at your feet, ready to go again!`;
      default:
        return '';
    }
  };

  const getEnthusiasmText = () => {
    switch (enthusiasm) {
      case 'excited':
        return `${dog.name} is full of energy and very excited!`;
      case 'happy':
        return `${dog.name} is still having fun but starting to tire a bit.`;
      case 'tired':
        return `${dog.name} is getting tired. Maybe one or two more throws.`;
      default:
        return '';
    }
  };

  const getDogPosition = () => {
    switch (phase) {
      case 'ready':
      case 'dropped':
        return 'translate-x-0'; // Close to you
      case 'throwing':
        return 'translate-x-8';
      case 'chasing':
        return 'translate-x-96'; // Far away
      case 'returning':
        return 'translate-x-48'; // Halfway back
      default:
        return 'translate-x-0';
    }
  };

  const getBallPosition = () => {
    switch (phase) {
      case 'ready':
        return 'left-[10%]'; // At your feet
      case 'throwing':
        return 'left-[30%]'; // In air
      case 'chasing':
        return 'left-[90%]'; // Far away
      case 'returning':
      case 'dropped':
        return 'left-[10%]'; // Back at feet
      default:
        return 'left-[10%]';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const canThrow = phase === 'ready' && dogEnergy >= 10;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-sky-50 to-green-50 rounded-lg shadow-2xl max-w-4xl w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-earth-900">
              Playing Fetch with {dog.name}
            </h2>
            <p className="text-sm text-earth-600">Click "Throw Ball" when they're ready</p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 text-2xl px-3"
          >
            ×
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white p-3 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-600 font-semibold">Time Playing</p>
            <p className="text-lg font-bold text-earth-900">{formatTime(sessionTime)}</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-green-200">
            <p className="text-xs text-green-600 font-semibold">Throws</p>
            <p className="text-lg font-bold text-earth-900">{throwCount}</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-orange-200">
            <p className="text-xs text-orange-600 font-semibold">Dog Energy</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    dogEnergy > 60 ? 'bg-green-500' : dogEnergy > 30 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${dogEnergy}%` }}
                />
              </div>
              <span className="text-sm font-bold">{dogEnergy}%</span>
            </div>
          </div>
        </div>

        {/* Enthusiasm Indicator */}
        <div className={`mb-4 p-3 rounded-lg border-2 ${
          enthusiasm === 'excited' ? 'bg-green-50 border-green-300' :
          enthusiasm === 'happy' ? 'bg-yellow-50 border-yellow-300' :
          'bg-orange-50 border-orange-300'
        }`}>
          <p className="text-sm font-semibold text-earth-900">
            {getEnthusiasmText()}
          </p>
        </div>

        {/* Play Area */}
        <div className="relative bg-gradient-to-b from-green-300 to-green-400 rounded-lg h-80 mb-4 overflow-hidden">
          {/* Background scenery */}
          <div className="absolute inset-0">
            <div className="absolute bottom-0 w-full h-16 bg-green-600" />
            <div className="absolute top-0 right-0 text-6xl opacity-30">☀️</div>
            <div className="absolute top-10 left-10 text-4xl">🌳</div>
            <div className="absolute top-20 right-20 text-3xl">🌳</div>
            <div className="absolute bottom-20 left-1/3 text-2xl">🌸</div>
          </div>

          {/* You (person icon) */}
          <div className="absolute left-[5%] bottom-16 text-6xl">
            🧍
          </div>

          {/* Ball */}
          <div
            className={`absolute ${getBallPosition()} bottom-16 text-4xl transition-all duration-1000 ease-out ${
              phase === 'throwing' ? 'transform -translate-y-32' : ''
            }`}
          >
            🎾
          </div>

          {/* Dog */}
          <div
            className={`absolute bottom-16 text-6xl transition-all duration-1000 ${getDogPosition()} ${
              phase === 'chasing' || phase === 'returning' ? 'scale-x-[-1]' : ''
            }`}
          >
            {enthusiasm === 'excited' ? '🐕‍🦺' : enthusiasm === 'happy' ? '🐕' : '😴'}
          </div>

          {/* Action text overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black bg-opacity-50 text-white px-6 py-3 rounded-lg text-center">
              <p className="font-semibold">{getPhaseText()}</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3 justify-center mb-4">
          <button
            onClick={throwBall}
            disabled={!canThrow}
            className={`px-8 py-3 font-bold rounded-lg transition-all shadow-lg ${
              canThrow
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {dogEnergy < 10 ? 'Dog Too Tired' : 'Throw Ball 🎾'}
          </button>

          <button
            onClick={onComplete}
            className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg"
          >
            Done Playing
          </button>
        </div>

        {/* Info */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            💡 <span className="font-semibold">Tip:</span> Watch {dog.name}'s energy level.
            They'll get tired after several throws. Play as long as you both want, then click "Done Playing" when finished!
          </p>
        </div>
      </div>
    </div>
  );
}
