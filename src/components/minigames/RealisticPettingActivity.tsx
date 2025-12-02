import { useState, useEffect } from 'react';
import { Dog } from '../../types';

interface RealisticPettingActivityProps {
  dog: Dog;
  onComplete: () => void;
  onCancel: () => void;
}

type PetArea = 'head' | 'ears' | 'back' | 'belly' | null;

export default function RealisticPettingActivity({ dog, onComplete, onCancel }: RealisticPettingActivityProps) {
  const [petCount, setPetCount] = useState(0);
  const [currentArea, setCurrentArea] = useState<PetArea>(null);
  const [dogMood, setDogMood] = useState<'calm' | 'happy' | 'content' | 'loving'>('calm');
  const [tailWagging, setTailWagging] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Dog's mood improves over time with petting
    if (petCount >= 20) {
      setDogMood('loving');
    } else if (petCount >= 12) {
      setDogMood('content');
    } else if (petCount >= 5) {
      setDogMood('happy');
    } else {
      setDogMood('calm');
    }
  }, [petCount]);

  const handlePetArea = (area: PetArea) => {
    setCurrentArea(area);
    setPetCount((prev) => prev + 1);
    setTailWagging(true);

    // Stop tail wagging after a moment
    setTimeout(() => {
      setTailWagging(false);
      setCurrentArea(null);
    }, 800);
  };

  const getDogExpression = () => {
    switch (dogMood) {
      case 'loving':
        return '😍';
      case 'content':
        return '😊';
      case 'happy':
        return '🙂';
      default:
        return '🐕';
    }
  };

  const getMoodText = () => {
    switch (dogMood) {
      case 'loving':
        return `${dog.name} is absolutely loving this! Their eyes are soft and they're completely relaxed.`;
      case 'content':
        return `${dog.name} is content and comfortable. You can feel them leaning into your hand.`;
      case 'happy':
        return `${dog.name} is enjoying your attention. Their tail is wagging!`;
      default:
        return `${dog.name} is calm and relaxed, waiting for your affection.`;
    }
  };

  const getAreaFeedback = (area: PetArea) => {
    const feedbacks = {
      head: [
        `${dog.name} leans into your hand`,
        `${dog.name}'s eyes close contentedly`,
        `You feel ${dog.name} relax under your touch`,
      ],
      ears: [
        `${dog.name}'s ear twitches happily`,
        `${dog.name} tilts their head for better access`,
        `The soft fur feels warm under your fingers`,
      ],
      back: [
        `${dog.name} arches slightly into the pet`,
        `You can feel their muscles relax`,
        `${dog.name} lets out a content sigh`,
      ],
      belly: [
        `${dog.name} rolls over, trusting you completely`,
        `Their tail wags enthusiastically`,
        `${dog.name} makes a happy sound`,
      ],
    };

    if (!area) return '';
    const options = feedbacks[area];
    return options[Math.floor(Math.random() * options.length)];
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-amber-50 to-orange-50 rounded-lg shadow-2xl max-w-3xl w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-earth-900">
              Spending Time with {dog.name}
            </h2>
            <p className="text-sm text-earth-600">Take your time - there's no rush</p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 text-2xl px-3"
          >
            ×
          </button>
        </div>

        {/* Session Info */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white p-3 rounded-lg border border-amber-200">
            <p className="text-xs text-amber-600 font-semibold">Time Together</p>
            <p className="text-lg font-bold text-earth-900">{formatTime(sessionTime)}</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-amber-200">
            <p className="text-xs text-amber-600 font-semibold">Mood</p>
            <p className="text-lg font-bold text-earth-900 capitalize">{dogMood}</p>
          </div>
        </div>

        {/* Dog Display */}
        <div className="relative bg-gradient-to-br from-green-100 to-green-200 rounded-lg p-8 mb-4 min-h-96">
          {/* Background */}
          <div className="absolute inset-0 opacity-20 text-6xl">
            🌳 🌿 🌸
          </div>

          {/* Dog */}
          <div className="relative flex flex-col items-center justify-center h-full">
            <div className="text-9xl mb-4 transition-transform duration-300">
              {getDogExpression()}
            </div>

            <p className="text-2xl font-bold text-earth-900 mb-6">{dog.name}</p>

            {/* Interactive Pet Areas */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-6">
              <button
                onClick={() => handlePetArea('head')}
                className={`p-4 bg-white border-3 rounded-lg transition-all ${
                  currentArea === 'head'
                    ? 'border-green-500 bg-green-50 scale-105'
                    : 'border-amber-300 hover:border-amber-400 hover:bg-amber-50'
                }`}
              >
                <p className="text-3xl mb-1">👋</p>
                <p className="font-semibold text-earth-900">Pet Head</p>
                <p className="text-xs text-earth-600">Gentle head pats</p>
              </button>

              <button
                onClick={() => handlePetArea('ears')}
                className={`p-4 bg-white border-3 rounded-lg transition-all ${
                  currentArea === 'ears'
                    ? 'border-green-500 bg-green-50 scale-105'
                    : 'border-amber-300 hover:border-amber-400 hover:bg-amber-50'
                }`}
              >
                <p className="text-3xl mb-1">👂</p>
                <p className="font-semibold text-earth-900">Scratch Ears</p>
                <p className="text-xs text-earth-600">Behind the ears</p>
              </button>

              <button
                onClick={() => handlePetArea('back')}
                className={`p-4 bg-white border-3 rounded-lg transition-all ${
                  currentArea === 'back'
                    ? 'border-green-500 bg-green-50 scale-105'
                    : 'border-amber-300 hover:border-amber-400 hover:bg-amber-50'
                }`}
              >
                <p className="text-3xl mb-1">🫳</p>
                <p className="font-semibold text-earth-900">Pet Back</p>
                <p className="text-xs text-earth-600">Long strokes</p>
              </button>

              <button
                onClick={() => handlePetArea('belly')}
                className={`p-4 bg-white border-3 rounded-lg transition-all ${
                  currentArea === 'belly'
                    ? 'border-green-500 bg-green-50 scale-105'
                    : 'border-amber-300 hover:border-amber-400 hover:bg-amber-50'
                }`}
              >
                <p className="text-3xl mb-1">🤗</p>
                <p className="font-semibold text-earth-900">Belly Rub</p>
                <p className="text-xs text-earth-600">If they roll over</p>
              </button>
            </div>

            {/* Feedback Text */}
            <div className="bg-white bg-opacity-80 rounded-lg p-4 text-center max-w-lg">
              <p className="text-sm italic text-earth-700">
                {currentArea ? getAreaFeedback(currentArea) : getMoodText()}
              </p>
              {tailWagging && (
                <p className="text-xs text-green-600 font-semibold mt-2">
                  *tail wagging*
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Done Button */}
        <div className="flex justify-center">
          <button
            onClick={onComplete}
            className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg"
          >
            Done Petting (Finish Session)
          </button>
        </div>

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            💡 <span className="font-semibold">Tip:</span> Take your time and enjoy the moment.
            The longer you spend with {dog.name}, the stronger your bond becomes.
            Click "Done Petting" when you're ready to finish.
          </p>
        </div>
      </div>
    </div>
  );
}
