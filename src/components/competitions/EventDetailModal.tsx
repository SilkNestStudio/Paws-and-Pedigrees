import { useState, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import type { CompetitionEvent } from '../../types/competition';
import { calculateAgeInWeeks } from '../../utils/timeScaling';
import { checkEventQualification, TITLE_REQUIREMENTS } from '../../utils/championshipCalculations';
import CompetitionRunner from './CompetitionRunner';

interface EventDetailModalProps {
  event: CompetitionEvent;
  onClose: () => void;
}

// Helper to format date/time
const formatDateTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

// Helper to get time until date
const getTimeUntil = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
  }
};

export default function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  const {
    selectedDog,
    user,
    registerForEvent,
    withdrawFromEvent,
    eventRegistrations,
  } = useGameStore();

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCompetition, setShowCompetition] = useState(false);

  // Check if dog is registered for this event
  const isRegistered = selectedDog
    ? eventRegistrations.some(r => r.eventId === event.id && r.dogId === selectedDog.id && r.status === 'registered')
    : false;

  // Check qualification
  const [canEnter, setCanEnter] = useState(true);
  const [qualificationReason, setQualificationReason] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDog || !user) {
      setCanEnter(false);
      setQualificationReason('No dog selected');
      return;
    }

    // Check registration status
    if (event.status !== 'registration') {
      setCanEnter(false);
      setQualificationReason('Registration is not currently open');
      return;
    }

    // Check if event is full
    if (event.currentEntries >= event.maxEntries) {
      setCanEnter(false);
      setQualificationReason('Event is full');
      return;
    }

    // Check user level
    if (user.level < event.minLevel) {
      setCanEnter(false);
      setQualificationReason(`Requires kennel level ${event.minLevel}`);
      return;
    }

    // Check dog age
    const dogAgeWeeks = calculateAgeInWeeks(selectedDog.birth_date);
    if (dogAgeWeeks < event.minAge) {
      setCanEnter(false);
      setQualificationReason(`Dog must be at least ${event.minAge} weeks old`);
      return;
    }

    // Check title requirement
    const qualification = checkEventQualification(selectedDog, event);
    if (!qualification.qualified) {
      setCanEnter(false);
      setQualificationReason(qualification.reason || 'Does not meet requirements');
      return;
    }

    // Check entry fee
    if (user.cash < event.entryFee) {
      setCanEnter(false);
      setQualificationReason(`Not enough cash (need $${event.entryFee})`);
      return;
    }

    setCanEnter(true);
    setQualificationReason(null);
  }, [selectedDog, user, event]);

  const handleRegister = async () => {
    if (!selectedDog) return;

    setIsProcessing(true);
    const result = registerForEvent(event.id, selectedDog.id);

    setMessage({
      text: result.message,
      type: result.success ? 'success' : 'error'
    });

    if (result.success) {
      setTimeout(() => {
        onClose();
      }, 2000);
    }

    setIsProcessing(false);
  };

  const handleWithdraw = async () => {
    if (!selectedDog) return;

    setIsProcessing(true);
    const result = withdrawFromEvent(event.id, selectedDog.id);

    setMessage({
      text: result.message,
      type: result.success ? 'success' : 'error'
    });

    setIsProcessing(false);
  };

  // Get event type color
  const getEventColor = () => {
    const colors = {
      match_show: 'blue',
      point_show: 'green',
      specialty_show: 'purple',
      group_show: 'indigo',
      all_breed: 'amber',
      invitational: 'pink',
      championship: 'red',
    };
    return colors[event.eventType] || 'gray';
  };

  const color = getEventColor();

  // Show competition runner if user clicked compete
  if (showCompetition && selectedDog) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <CompetitionRunner
            event={event}
            dog={selectedDog}
            onComplete={() => {
              setShowCompetition(false);
              onClose();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`bg-gradient-to-r from-${color}-600 to-${color}-700 p-6 text-white relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 text-2xl font-bold"
          >
            ×
          </button>
          <h2 className="text-2xl font-bold mb-2">{event.name}</h2>
          <div className="flex gap-2 flex-wrap">
            <span className={`px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm font-semibold`}>
              {event.eventType.replace('_', ' ').toUpperCase()}
            </span>
            {event.isMajor && (
              <span className="px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-sm font-semibold">
                ⭐ MAJOR
              </span>
            )}
            <span className={`px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm`}>
              {event.discipline.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-4 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border-b border-green-200'
                : message.type === 'error'
                ? 'bg-red-50 text-red-800 border-b border-red-200'
                : 'bg-blue-50 text-blue-800 border-b border-blue-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Event Details */}
        <div className="p-6 space-y-6">
          {/* Timing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Registration Opens</p>
              <p className="font-semibold text-sm">{formatDateTime(event.registrationOpens)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Registration Closes</p>
              <p className="font-semibold text-sm">{formatDateTime(event.registrationCloses)}</p>
              {event.status === 'registration' && (
                <p className="text-xs text-orange-600 mt-1">
                  Closes in {getTimeUntil(event.registrationCloses)}
                </p>
              )}
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500 mb-1">Event Date</p>
              <p className="font-semibold">{formatDateTime(event.eventDate)}</p>
              {event.status === 'upcoming' || event.status === 'registration' ? (
                <p className="text-xs text-blue-600 mt-1">
                  Starts in {getTimeUntil(event.eventDate)}
                </p>
              ) : null}
            </div>
          </div>

          {/* Entry Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-bold text-earth-900">Entry Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Entry Fee</p>
                <p className="font-bold text-green-700">${event.entryFee}</p>
              </div>
              <div>
                <p className="text-gray-600">Entries</p>
                <p className="font-bold text-blue-700">
                  {event.currentEntries} / {event.maxEntries}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Min Level</p>
                <p className="font-bold">Level {event.minLevel}</p>
              </div>
              <div>
                <p className="text-gray-600">Min Age</p>
                <p className="font-bold">{event.minAge} weeks</p>
              </div>
            </div>

            {event.requiredTitle && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-gray-600 text-sm">Required Title</p>
                <p className="font-bold text-purple-700">
                  {TITLE_REQUIREMENTS[event.requiredTitle].icon}{' '}
                  {TITLE_REQUIREMENTS[event.requiredTitle].displayName}
                </p>
              </div>
            )}

            {event.breedRestriction && event.breedRestriction.length > 0 && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-gray-600 text-sm">Breed Restriction</p>
                <p className="font-bold text-purple-700">
                  Specialty Show - Breed {event.breedRestriction[0]}
                </p>
              </div>
            )}
          </div>

          {/* Points & Prizes */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border-2 border-purple-200">
            <h3 className="font-bold text-purple-900 mb-3">Points & Prizes</h3>
            <div className="grid grid-cols-4 gap-2 text-center text-sm">
              <div>
                <p className="text-xs text-purple-600 mb-1">1st Place</p>
                <p className="font-bold text-purple-900">{event.pointsAwarded.first} pts</p>
                <p className="text-xs text-green-600">${event.prizes.first}</p>
              </div>
              <div>
                <p className="text-xs text-purple-600 mb-1">2nd Place</p>
                <p className="font-bold text-purple-900">{event.pointsAwarded.second} pts</p>
                <p className="text-xs text-green-600">${event.prizes.second}</p>
              </div>
              <div>
                <p className="text-xs text-purple-600 mb-1">3rd Place</p>
                <p className="font-bold text-purple-900">{event.pointsAwarded.third} pts</p>
                <p className="text-xs text-green-600">${event.prizes.third}</p>
              </div>
              <div>
                <p className="text-xs text-purple-600 mb-1">4th Place</p>
                <p className="font-bold text-purple-900">{event.pointsAwarded.fourth} pts</p>
                <p className="text-xs text-green-600">${event.prizes.participation}</p>
              </div>
            </div>
          </div>

          {/* Registration Status */}
          {selectedDog && (
            <div className="border-2 border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-earth-900 mb-3">
                Registration Status for {selectedDog.name}
              </h3>

              {isRegistered ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <span className="text-2xl">✓</span>
                    <span className="font-semibold">Registered for this event</span>
                  </div>

                  {/* Compete button when event is in progress */}
                  {event.status === 'in_progress' && (
                    <button
                      onClick={() => setShowCompetition(true)}
                      className="w-full px-4 py-3 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 transition-colors font-bold animate-pulse"
                    >
                      🏁 Compete Now!
                    </button>
                  )}

                  {/* Withdraw button during registration */}
                  {event.status === 'registration' && (
                    <button
                      onClick={handleWithdraw}
                      disabled={isProcessing}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50"
                    >
                      {isProcessing ? 'Processing...' : 'Withdraw (50% refund)'}
                    </button>
                  )}

                  {/* Status message for entries_closed */}
                  {event.status === 'entries_closed' && (
                    <div className="text-center py-2 text-gray-600">
                      <p className="font-semibold">Entries closed - event starting soon!</p>
                      <p className="text-sm">Starts in {getTimeUntil(event.eventDate)}</p>
                    </div>
                  )}
                </div>
              ) : canEnter ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <span className="text-2xl">✓</span>
                    <span className="font-semibold">Eligible to enter</span>
                  </div>
                  <button
                    onClick={handleRegister}
                    disabled={isProcessing}
                    className="w-full px-4 py-3 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 transition-colors font-bold disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : `Register - $${event.entryFee}`}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-700">
                  <span className="text-2xl">✗</span>
                  <span className="font-semibold">{qualificationReason}</span>
                </div>
              )}
            </div>
          )}

          {!selectedDog && (
            <div className="border-2 border-gray-200 rounded-lg p-4 text-center text-gray-600">
              Select a dog to register for this event
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
