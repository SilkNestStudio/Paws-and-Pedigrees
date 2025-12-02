import { useState, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import type { CompetitionEvent, EventStatus, EventType, CompetitionDiscipline } from '../../types/competition';
import EventDetailModal from './EventDetailModal';
import ChampionshipProgressPanel from './ChampionshipProgressPanel';
import LeaderboardView from './LeaderboardView';

// Helper to format date/time
const formatEventDate = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 7) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } else if (diffDays > 0) {
    return `In ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `In ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  } else if (diffMinutes > 0) {
    return `In ${diffMinutes} min${diffMinutes !== 1 ? 's' : ''}`;
  } else if (diffMs > 0) {
    return 'Starting soon!';
  } else {
    return 'In progress';
  }
};

// Helper to get event type display info
const getEventTypeInfo = (eventType: EventType): { label: string; color: string; bgColor: string } => {
  const typeMap: Record<EventType, { label: string; color: string; bgColor: string }> = {
    match_show: { label: 'Match Show', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    point_show: { label: 'Point Show', color: 'text-green-700', bgColor: 'bg-green-100' },
    specialty_show: { label: 'Specialty', color: 'text-purple-700', bgColor: 'bg-purple-100' },
    group_show: { label: 'Group Show', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
    all_breed: { label: 'All-Breed', color: 'text-amber-700', bgColor: 'bg-amber-100' },
    invitational: { label: 'Invitational', color: 'text-pink-700', bgColor: 'bg-pink-100' },
    championship: { label: 'Championship', color: 'text-red-700', bgColor: 'bg-red-100' },
  };
  return typeMap[eventType];
};

// Helper to get discipline icon
const getDisciplineIcon = (discipline: CompetitionDiscipline): string => {
  const iconMap: Record<CompetitionDiscipline, string> = {
    conformation: '🏆',
    agility: '🏃',
    obedience: '🎓',
    rally: '🎯',
    racing: '⚡',
    weight_pull: '💪',
    tracking: '🔍',
    herding: '🐑',
  };
  return iconMap[discipline];
};

// Helper to get status badge
const getStatusBadge = (status: EventStatus): { text: string; color: string } => {
  const statusMap: Record<EventStatus, { text: string; color: string }> = {
    upcoming: { text: 'Coming Soon', color: 'bg-gray-200 text-gray-700' },
    registration: { text: 'Open', color: 'bg-green-500 text-white animate-pulse' },
    entries_closed: { text: 'Closed', color: 'bg-orange-500 text-white' },
    in_progress: { text: 'Live', color: 'bg-blue-500 text-white animate-pulse' },
    completed: { text: 'Finished', color: 'bg-gray-400 text-white' },
  };
  return statusMap[status];
};

export default function EventBoardView() {
  const {
    competitionEvents,
    initializeEventSystem,
    updateEventSystem,
    selectedDog,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<'events' | 'progress' | 'leaderboards'>('events');
  const [filter, setFilter] = useState<'all' | 'open' | 'upcoming'>('open');
  const [selectedEvent, setSelectedEvent] = useState<CompetitionEvent | null>(null);

  // Initialize event system on mount
  useEffect(() => {
    initializeEventSystem();
  }, [initializeEventSystem]);

  // Update events periodically
  useEffect(() => {
    const interval = setInterval(() => {
      updateEventSystem();
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [updateEventSystem]);

  // Filter events based on selected filter
  const filteredEvents = competitionEvents.filter((event) => {
    if (filter === 'open') {
      return event.status === 'registration';
    } else if (filter === 'upcoming') {
      return event.status === 'upcoming' || event.status === 'registration';
    }
    return true;
  }).sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

  if (!selectedDog) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-xl font-bold text-earth-900 mb-2">Competition Event Board</h3>
        <p className="text-earth-600">Select a dog to view available competitions</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-earth-200">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-2xl font-bold text-earth-900 flex items-center gap-2">
              🏆 Competition Center
            </h3>
            <p className="text-sm text-earth-600 mt-1">
              Events, championship progress, and leaderboards
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-earth-500">Competing with</p>
            <p className="text-lg font-bold text-kennel-700">{selectedDog.name}</p>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('events')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'events'
                ? 'bg-kennel-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📅 Events
          </button>
          <button
            onClick={() => setActiveTab('progress')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'progress'
                ? 'bg-kennel-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🏅 Progress
          </button>
          <button
            onClick={() => setActiveTab('leaderboards')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'leaderboards'
                ? 'bg-kennel-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🏆 Leaderboards
          </button>
        </div>

        {/* Filter buttons (only show on events tab) */}
        {activeTab === 'events' && (
          <div className="flex gap-2">
          <button
            onClick={() => setFilter('open')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              filter === 'open'
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Open for Registration
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              filter === 'upcoming'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Upcoming Events
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              filter === 'all'
                ? 'bg-kennel-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Events
          </button>
        </div>
        )}
      </div>

      {/* Tab content */}
      <div className="p-6">
        {activeTab === 'progress' && <ChampionshipProgressPanel />}
        {activeTab === 'leaderboards' && <LeaderboardView />}

        {/* Event list (only show on events tab) */}
        {activeTab === 'events' && (
          <div>
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No events found</p>
            <p className="text-gray-400 text-sm mt-2">Check back soon for new competitions!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.slice(0, 20).map((event) => {
              const typeInfo = getEventTypeInfo(event.eventType);
              const statusBadge = getStatusBadge(event.status);
              const disciplineIcon = getDisciplineIcon(event.discipline);

              return (
                <div
                  key={event.id}
                  className={`border-2 rounded-lg p-4 transition-all cursor-pointer ${
                    selectedEvent?.id === event.id
                      ? 'border-kennel-500 bg-kennel-50'
                      : 'border-earth-200 hover:border-kennel-300'
                  } ${event.isMajor ? 'bg-gradient-to-r from-amber-50 to-orange-50' : ''}`}
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{disciplineIcon}</span>
                        <div>
                          <h4 className="font-bold text-earth-900 text-lg">{event.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${typeInfo.bgColor} ${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${statusBadge.color}`}>
                              {statusBadge.text}
                            </span>
                            {event.isMajor && (
                              <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-400 text-yellow-900">
                                ⭐ MAJOR
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                        <div>
                          <p className="text-xs text-earth-500">Event Date</p>
                          <p className="font-semibold text-earth-900">{formatEventDate(event.eventDate)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-earth-500">Entry Fee</p>
                          <p className="font-semibold text-green-700">${event.entryFee}</p>
                        </div>
                        <div>
                          <p className="text-xs text-earth-500">Points (1st)</p>
                          <p className="font-semibold text-purple-700">{event.pointsAwarded.first} pts</p>
                        </div>
                        <div>
                          <p className="text-xs text-earth-500">Entries</p>
                          <p className="font-semibold text-blue-700">
                            {event.currentEntries} / {event.maxEntries}
                          </p>
                        </div>
                      </div>

                      {event.status === 'registration' && (
                        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-xs text-blue-800">
                            <strong>Registration closes:</strong> {new Date(event.registrationCloses).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                      }}
                      className={`ml-4 px-4 py-2 rounded-lg transition-colors font-semibold text-sm ${
                        event.status === 'registration'
                          ? 'bg-kennel-600 text-white hover:bg-kennel-700'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      {event.status === 'registration' ? 'Register' : 'View Details'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info box */}
        {filteredEvents.length > 0 && (
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-200 mt-6">
            <div className="flex items-start gap-3">
              <span className="text-3xl">ℹ️</span>
              <div className="flex-1">
                <h4 className="font-bold text-blue-900 mb-1">About the Competition System</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Match Shows:</strong> Practice events with no championship points</li>
                  <li>• <strong>Point Shows:</strong> Standard competitions awarding 1-2 points</li>
                  <li>• <strong>Major Shows:</strong> High-stakes events worth 3+ points (marked with ⭐)</li>
                  <li>• <strong>Championship Path:</strong> Earn 15 points + 2 majors to become a Champion!</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
