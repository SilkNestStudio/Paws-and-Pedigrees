import { useState } from 'react';
import { getActiveSeasonalEvents } from '../../utils/weatherSystem';

export default function SeasonalEventsPanel() {
  const [expanded, setExpanded] = useState(false);
  const activeEvents = getActiveSeasonalEvents();

  if (activeEvents.length === 0) {
    return null;
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-earth-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div className="text-left">
            <h3 className="font-bold text-earth-900">
              Active Seasonal Events ({activeEvents.length})
            </h3>
            <p className="text-xs text-earth-600">Special bonuses available!</p>
          </div>
        </div>
        <span className="text-earth-400">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Events List */}
      {expanded && (
        <div className="border-t border-earth-200 p-4 space-y-3">
          {activeEvents.map(event => (
            <div
              key={event.id}
              className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border-l-4 border-yellow-500"
            >
              {/* Event Header */}
              <div className="flex items-start gap-3 mb-2">
                <span className="text-3xl">{event.icon}</span>
                <div className="flex-1">
                  <h4 className="font-bold text-earth-900">{event.name}</h4>
                  <p className="text-sm text-earth-600">{event.description}</p>
                </div>
              </div>

              {/* Event Dates */}
              <div className="text-xs text-earth-600 mb-2">
                <span>📅 {event.startDate} to {event.endDate}</span>
              </div>

              {/* Special Bonus */}
              {event.specialBonus && (
                <div className="bg-white/70 rounded p-2 mb-2">
                  <p className="text-sm font-semibold text-purple-700">
                    ⭐ {event.specialBonus}
                  </p>
                </div>
              )}

              {/* Rewards */}
              {event.rewards && (
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="font-semibold text-earth-700">Rewards:</span>
                  {event.rewards.cash && (
                    <span className="text-green-700">💵 ${event.rewards.cash}</span>
                  )}
                  {event.rewards.gems && (
                    <span className="text-purple-700">💎 {event.rewards.gems}</span>
                  )}
                  {event.rewards.xp && (
                    <span className="text-blue-700">⭐ {event.rewards.xp} XP</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
