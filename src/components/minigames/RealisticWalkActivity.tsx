import { useState, useEffect } from 'react';
import { Dog } from '../../types';

interface RealisticWalkActivityProps {
  dog: Dog;
  onComplete: () => void;
  onCancel: () => void;
}

type Location = 'park' | 'neighborhood' | 'beach';
type WalkEvent = 'sniffing' | 'other_dog' | 'interesting_smell' | 'squirrel' | 'walking' | null;

const LOCATIONS = {
  park: {
    name: 'Park',
    emoji: '🌳',
    bg: 'from-green-300 to-green-400',
    description: 'Beautiful green park with trees and open grass',
  },
  neighborhood: {
    name: 'Neighborhood',
    emoji: '🏘️',
    bg: 'from-gray-200 to-gray-300',
    description: 'Quiet suburban streets with sidewalks',
  },
  beach: {
    name: 'Beach',
    emoji: '🏖️',
    bg: 'from-blue-200 to-yellow-200',
    description: 'Sandy beach with ocean breeze',
  },
};

export default function RealisticWalkActivity({ dog, onComplete, onCancel }: RealisticWalkActivityProps) {
  const [location, setLocation] = useState<Location | null>(null);
  const [isWalking, setIsWalking] = useState(false);
  const [distance, setDistance] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
  const [currentEvent, setCurrentEvent] = useState<WalkEvent>(null);
  const [eventMessage, setEventMessage] = useState('');
  const [walkLog, setWalkLog] = useState<string[]>([]);

  useEffect(() => {
    if (!isWalking) return;

    const timer = setInterval(() => {
      setSessionTime((prev) => prev + 1);
      setDistance((prev) => prev + 0.05); // 0.05 km per second = 3km per minute

      // Random events during walk
      if (Math.random() < 0.15) { // 15% chance per second
        triggerRandomEvent();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isWalking]);

  const startWalk = (loc: Location) => {
    setLocation(loc);
    setIsWalking(true);
    addToLog(`Started walk at ${LOCATIONS[loc].name}`);
  };

  const triggerRandomEvent = () => {
    const events: WalkEvent[] = ['sniffing', 'other_dog', 'interesting_smell', 'squirrel'];
    const event = events[Math.floor(Math.random() * events.length)];
    setCurrentEvent(event);

    const messages = {
      sniffing: [
        `${dog.name} stops to sniff a tree`,
        `${dog.name} investigates a bush`,
        `${dog.name} sniffs the ground intently`,
      ],
      other_dog: [
        `You see another dog walker approaching`,
        `A friendly dog comes over to say hi to ${dog.name}`,
        `${dog.name} spots another dog across the street`,
      ],
      interesting_smell: [
        `${dog.name} picks up an interesting scent`,
        `Something catches ${dog.name}'s attention`,
        `${dog.name} wants to investigate something`,
      ],
      squirrel: [
        `A squirrel runs across the path!`,
        `${dog.name} spots a squirrel in a tree`,
        `A squirrel catches ${dog.name}'s eye`,
      ],
    };

    if (event) {
      const eventMessages = messages[event];
      const message = eventMessages[Math.floor(Math.random() * eventMessages.length)];
      setEventMessage(message);
      addToLog(message);
    }
  };

  const handleEventChoice = (choice: 'allow' | 'continue') => {
    const responses = {
      sniffing: {
        allow: `You let ${dog.name} sniff around. They seem happy to explore.`,
        continue: `You gently encourage ${dog.name} to keep moving.`,
      },
      other_dog: {
        allow: `The dogs greet each other. ${dog.name} wags their tail happily!`,
        continue: `You politely keep walking. ${dog.name} looks back curiously.`,
      },
      interesting_smell: {
        allow: `${dog.name} investigates thoroughly. Good enrichment!`,
        continue: `${dog.name} reluctantly moves on, still curious.`,
      },
      squirrel: {
        allow: `${dog.name} watches the squirrel intently, alert and engaged.`,
        continue: `You keep ${dog.name} focused on the walk.`,
      },
    };

    if (currentEvent) {
      addToLog(responses[currentEvent][choice]);
    }
    setCurrentEvent(null);
    setEventMessage('');
  };

  const addToLog = (message: string) => {
    setWalkLog((prev) => [...prev, message]);
  };

  const formatDistance = (km: number) => {
    return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(2)}km`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Location selection screen
  if (!location) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-earth-900">
                Where would you like to walk {dog.name}?
              </h2>
              <p className="text-sm text-earth-600">Choose a location for your walk</p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 text-2xl px-3"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(LOCATIONS).map(([key, loc]) => (
              <button
                key={key}
                onClick={() => startWalk(key as Location)}
                className="p-6 border-3 border-earth-300 rounded-lg hover:border-earth-500 hover:bg-earth-50 transition-all text-center"
              >
                <p className="text-6xl mb-3">{loc.emoji}</p>
                <p className="font-bold text-xl text-earth-900 mb-2">{loc.name}</p>
                <p className="text-sm text-earth-600">{loc.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentLocation = LOCATIONS[location];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-sky-50 to-green-50 rounded-lg shadow-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-earth-900">
              Walking {dog.name} at the {currentLocation.name}
            </h2>
            <p className="text-sm text-earth-600">Enjoy your walk together</p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 text-2xl px-3"
          >
            ×
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white p-3 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-600 font-semibold">Walk Time</p>
            <p className="text-lg font-bold text-earth-900">{formatTime(sessionTime)}</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-green-200">
            <p className="text-xs text-green-600 font-semibold">Distance</p>
            <p className="text-lg font-bold text-earth-900">{formatDistance(distance)}</p>
          </div>
        </div>

        {/* Walking Scene */}
        <div className={`relative bg-gradient-to-b ${currentLocation.bg} rounded-lg p-8 mb-4 min-h-64 overflow-hidden`}>
          {/* Scenery */}
          <div className="absolute inset-0 flex items-center justify-center opacity-30 text-6xl">
            {currentLocation.emoji}
          </div>

          {/* Walking animation */}
          <div className="relative flex items-center justify-center h-48">
            <div className="flex items-end gap-4">
              <div className="text-6xl">🧍</div>
              <div className="text-6xl animate-bounce">🐕‍🦺</div>
            </div>
          </div>

          {/* Status message */}
          {!currentEvent ? (
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <div className="inline-block bg-white bg-opacity-90 px-6 py-3 rounded-lg">
                <p className="font-semibold text-earth-900">
                  You and {dog.name} are walking together peacefully...
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Event Interaction */}
        {currentEvent && (
          <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg animate-fade-in">
            <p className="font-semibold text-earth-900 mb-3">{eventMessage}</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleEventChoice('allow')}
                className="flex-1 px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-all"
              >
                Let them investigate
              </button>
              <button
                onClick={() => handleEventChoice('continue')}
                className="flex-1 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-all"
              >
                Keep walking
              </button>
            </div>
          </div>
        )}

        {/* Walk Log */}
        {walkLog.length > 0 && (
          <div className="mb-4 p-4 bg-white border border-earth-200 rounded-lg max-h-32 overflow-y-auto">
            <h4 className="font-semibold text-earth-900 mb-2 text-sm">Walk Log</h4>
            <div className="space-y-1">
              {walkLog.slice(-5).map((log, idx) => (
                <p key={idx} className="text-xs text-earth-600">• {log}</p>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center">
          <button
            onClick={onComplete}
            className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg"
          >
            End Walk & Head Home
          </button>
        </div>

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            💡 <span className="font-semibold">Tip:</span> Take your time! Let {dog.name} sniff and explore.
            The longer your walk, the more exercise they get. Click "End Walk" when you're ready to head home.
          </p>
        </div>
      </div>
    </div>
  );
}
