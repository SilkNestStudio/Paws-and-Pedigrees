import React, { useState } from 'react';
import { Tournament, TournamentParticipant } from '../../types/tournament';
import { TOURNAMENTS } from '../../data/tournaments';
import { Dog } from '../../types';

interface TournamentViewProps {
  userDogs: Dog[];
  onEnterTournament: (tournamentId: string, dogId: string) => void;
}

export const TournamentView: React.FC<TournamentViewProps> = ({
  userDogs,
  onEnterTournament,
}) => {
  const [selectedTab, setSelectedTab] = useState<'upcoming' | 'active' | 'completed'>('upcoming');
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  const upcomingTournaments = TOURNAMENTS.filter(t =>
    new Date(t.registrationDeadline) > new Date()
  );

  const renderTournamentCard = (tournament: Tournament) => {
    const isRegistrationOpen = new Date(tournament.registrationDeadline) > new Date();
    const hasStarted = new Date(tournament.startDate) <= new Date();

    return (
      <div
        key={tournament.id}
        className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => setSelectedTournament(tournament)}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800">{tournament.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{tournament.description}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            tournament.tier === 'championship' ? 'bg-purple-100 text-purple-800' :
            tournament.tier === 'national' ? 'bg-blue-100 text-blue-800' :
            tournament.tier === 'regional' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {tournament.tier.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Competition Type</p>
            <p className="font-semibold capitalize">{tournament.competitionType}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Format</p>
            <p className="font-semibold capitalize">{tournament.format.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Entry Fee</p>
            <p className="font-semibold">${tournament.entryFee}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Prize Pool</p>
            <p className="font-semibold text-green-600">${tournament.prizePool.first}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm">
            <p className="text-gray-500">Participants: {tournament.participants.length}/{tournament.maxParticipants}</p>
            <p className="text-gray-500">
              {isRegistrationOpen ? (
                <>Registration closes: {new Date(tournament.registrationDeadline).toLocaleDateString()}</>
              ) : (
                <>Starts: {new Date(tournament.startDate).toLocaleDateString()}</>
              )}
            </p>
          </div>
          {isRegistrationOpen && !hasStarted && (
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                // This would open dog selection modal
              }}
            >
              Enter Tournament
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderTournamentDetails = () => {
    if (!selectedTournament) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{selectedTournament.name}</h2>
                <p className="text-gray-600 mt-2">{selectedTournament.description}</p>
              </div>
              <button
                onClick={() => setSelectedTournament(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Tournament Info */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Entry Fee</p>
                <p className="text-xl font-bold">${selectedTournament.entryFee}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">1st Place Prize</p>
                <p className="text-xl font-bold text-green-600">${selectedTournament.prizePool.first}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Participants</p>
                <p className="text-xl font-bold">{selectedTournament.participants.length}/{selectedTournament.maxParticipants}</p>
              </div>
            </div>

            {/* Prize Distribution */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">Prize Distribution</h3>
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-yellow-50 p-3 rounded-lg text-center">
                  <p className="text-sm text-gray-600">🥇 1st</p>
                  <p className="font-bold text-yellow-700">${selectedTournament.prizePool.first}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-sm text-gray-600">🥈 2nd</p>
                  <p className="font-bold text-gray-700">${selectedTournament.prizePool.second}</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg text-center">
                  <p className="text-sm text-gray-600">🥉 3rd</p>
                  <p className="font-bold text-orange-700">${selectedTournament.prizePool.third}</p>
                </div>
                {selectedTournament.prizePool.fourth && (
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <p className="text-sm text-gray-600">4th</p>
                    <p className="font-bold text-blue-700">${selectedTournament.prizePool.fourth}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Entry Requirements */}
            {selectedTournament.entryRequirements && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">Entry Requirements</h3>
                <ul className="space-y-2">
                  {selectedTournament.entryRequirements.minLevel && (
                    <li className="flex items-center text-sm">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Minimum Level: {selectedTournament.entryRequirements.minLevel}
                    </li>
                  )}
                  {selectedTournament.entryRequirements.minCompetitionWins && (
                    <li className="flex items-center text-sm">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Minimum Competition Wins: {selectedTournament.entryRequirements.minCompetitionWins}
                    </li>
                  )}
                  {selectedTournament.entryRequirements.requiredCertifications && (
                    <li className="flex items-center text-sm">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Required Certifications: {selectedTournament.entryRequirements.requiredCertifications.join(', ')}
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Participants */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Current Participants</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                {selectedTournament.participants.length === 0 ? (
                  <p className="text-gray-500 text-center">No participants yet</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTournament.participants.map((participant, index) => (
                      <div key={participant.dogId} className="flex items-center bg-white p-2 rounded">
                        <span className="text-sm font-semibold text-gray-700 mr-2">{index + 1}.</span>
                        <span className="text-sm text-gray-600">{participant.dogId}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Tournaments</h1>
        <p className="text-gray-600">Compete in bracket-style tournaments for massive prizes and prestige</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b">
        <button
          onClick={() => setSelectedTab('upcoming')}
          className={`px-4 py-2 font-semibold transition-colors ${
            selectedTab === 'upcoming'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setSelectedTab('active')}
          className={`px-4 py-2 font-semibold transition-colors ${
            selectedTab === 'active'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setSelectedTab('completed')}
          className={`px-4 py-2 font-semibold transition-colors ${
            selectedTab === 'completed'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Completed
        </button>
      </div>

      {/* Tournament List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {selectedTab === 'upcoming' && upcomingTournaments.map(renderTournamentCard)}
        {selectedTab === 'active' && (
          <div className="col-span-2 text-center py-12 text-gray-500">
            No active tournaments
          </div>
        )}
        {selectedTab === 'completed' && (
          <div className="col-span-2 text-center py-12 text-gray-500">
            No completed tournaments yet
          </div>
        )}
      </div>

      {/* Tournament Details Modal */}
      {renderTournamentDetails()}
    </div>
  );
};
