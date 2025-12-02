import { useState, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import {
  getDogLeaderboard,
  getUserLeaderboard,
  getDogChampionshipStats,
  getUserLeaderboardStats,
} from '../../utils/leaderboardService';
import type {
  DogLeaderboardEntry,
  UserLeaderboardEntry,
  DogChampionshipStats,
  UserLeaderboardStats,
  CompetitionType,
} from '../../types/leaderboard';
import { rescueBreeds } from '../../data/rescueBreeds';

type LeaderboardTab = 'dogs' | 'users' | 'my_stats';
type CompetitionFilter = 'all' | CompetitionType;

export default function LeaderboardView() {
  const { user, selectedDog } = useGameStore();
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('dogs');
  const [competitionFilter, setCompetitionFilter] = useState<CompetitionFilter>('all');
  const [dogLeaderboard, setDogLeaderboard] = useState<DogLeaderboardEntry[]>([]);
  const [userLeaderboard, setUserLeaderboard] = useState<UserLeaderboardEntry[]>([]);
  const [myDogStats, setMyDogStats] = useState<DogChampionshipStats | null>(null);
  const [myUserStats, setMyUserStats] = useState<UserLeaderboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [migrationNeeded, setMigrationNeeded] = useState(false);

  // Load leaderboards
  useEffect(() => {
    loadLeaderboards();
  }, [competitionFilter]);

  // Load user's stats
  useEffect(() => {
    if (user && activeTab === 'my_stats') {
      loadMyStats();
    }
  }, [user, activeTab, selectedDog]);

  const loadLeaderboards = async () => {
    setLoading(true);
    try {
      const [dogData, userData] = await Promise.all([
        getDogLeaderboard({
          category: 'global',
          timeframe: 'all_time',
          competition_type: competitionFilter !== 'all' ? competitionFilter : undefined,
          limit: 50,
        }),
        getUserLeaderboard({
          category: 'global',
          timeframe: 'all_time',
          limit: 50,
        }),
      ]);

      setDogLeaderboard(dogData);
      setUserLeaderboard(userData);
      setMigrationNeeded(false);
    } catch (error: any) {
      console.error('Error loading leaderboards:', error);
      // Check if error is due to missing tables
      if (error?.code === 'PGRST200' || error?.message?.includes('no matches were found')) {
        setMigrationNeeded(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMyStats = async () => {
    if (!user) return;

    try {
      const [dogStats, userStats] = await Promise.all([
        selectedDog ? getDogChampionshipStats(selectedDog.id) : Promise.resolve(null),
        getUserLeaderboardStats(user.id),
      ]);

      setMyDogStats(dogStats);
      setMyUserStats(userStats);
      setMigrationNeeded(false);
    } catch (error: any) {
      console.error('Error loading my stats:', error);
      // Check if error is due to missing tables
      if (error?.code === 'PGRST200' || error?.message?.includes('no matches were found')) {
        setMigrationNeeded(true);
      }
    }
  };

  const getBreedName = (breedId: string) => {
    return rescueBreeds.find((b) => b.id === breedId)?.name || 'Unknown';
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-earth-200">
        <h3 className="text-2xl font-bold text-earth-900 flex items-center gap-2">
          🏆 Competition Leaderboards
        </h3>
        <p className="text-sm text-earth-600 mt-1">
          Top competitors across all disciplines
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-earth-200">
        <div className="flex gap-1 p-2">
          <button
            onClick={() => setActiveTab('dogs')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              activeTab === 'dogs'
                ? 'bg-kennel-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🐕 Top Dogs
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              activeTab === 'users'
                ? 'bg-kennel-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            👤 Top Kennels
          </button>
          <button
            onClick={() => setActiveTab('my_stats')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              activeTab === 'my_stats'
                ? 'bg-kennel-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📊 My Stats
          </button>
        </div>
      </div>

      {/* Competition filter (for dogs tab) */}
      {activeTab === 'dogs' && (
        <div className="p-4 bg-gray-50 border-b border-earth-200">
          <p className="text-sm text-gray-600 mb-2">Filter by discipline:</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setCompetitionFilter('all')}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
                competitionFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setCompetitionFilter('agility')}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
                competitionFilter === 'agility'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              🏃 Agility
            </button>
            <button
              onClick={() => setCompetitionFilter('racing')}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
                competitionFilter === 'racing'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              ⚡ Racing
            </button>
            <button
              onClick={() => setCompetitionFilter('obedience')}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
                competitionFilter === 'obedience'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              🎓 Obedience
            </button>
            <button
              onClick={() => setCompetitionFilter('weight_pull')}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
                competitionFilter === 'weight_pull'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              💪 Weight Pull
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {migrationNeeded && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-3xl">⚠️</span>
              <div className="flex-1">
                <h4 className="font-bold text-yellow-900 mb-2">Database Migration Required</h4>
                <p className="text-sm text-yellow-800 mb-3">
                  The leaderboard system requires database tables that haven't been created yet.
                  You need to run the SQL migrations in your Supabase dashboard.
                </p>
                <div className="bg-white rounded p-4 border border-yellow-200">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Steps to activate leaderboards:</p>
                  <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                    <li>Go to your Supabase project dashboard</li>
                    <li>Navigate to the SQL Editor</li>
                    <li>Run these migration files in order:
                      <ul className="ml-6 mt-1 space-y-1 text-xs">
                        <li>• 20240116000007_add_puppy_training_fields.sql</li>
                        <li>• 20240116000008_add_additional_dog_fields.sql</li>
                        <li>• 20240116000009_add_competition_system.sql</li>
                        <li>• 20240116000010_add_leaderboards.sql</li>
                      </ul>
                    </li>
                    <li>Refresh this page after migrations complete</li>
                  </ol>
                </div>
                <p className="text-xs text-yellow-700 mt-3">
                  Migration files are located in: <code className="bg-yellow-100 px-1 rounded">supabase/migrations/</code>
                </p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading leaderboards...</p>
          </div>
        ) : (
          <>
            {/* Dogs Leaderboard */}
            {activeTab === 'dogs' && (
              <div>
                {dogLeaderboard.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No competition data yet</p>
                    <p className="text-gray-400 text-sm mt-2">
                      Be the first to compete and earn a spot on the leaderboard!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dogLeaderboard.map((entry, index) => (
                      <div
                        key={entry.id}
                        className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                          index < 3
                            ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="text-2xl font-bold w-16 text-center">
                          {getRankBadge(index + 1)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-earth-900 text-lg">
                              {entry.dog_name}
                            </h4>
                            <span className="text-sm text-gray-600">
                              ({getBreedName(entry.dog_breed)})
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Kennel: {entry.user_name || 'Anonymous'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Total Points</p>
                          <p className="text-2xl font-bold text-kennel-700">
                            {entry.total_points.toLocaleString()}
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            {entry.total_wins} wins / {entry.total_competitions} competitions
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Users Leaderboard */}
            {activeTab === 'users' && (
              <div>
                {userLeaderboard.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No kennel data yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userLeaderboard.map((entry, index) => (
                      <div
                        key={entry.id}
                        className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                          index < 3
                            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="text-2xl font-bold w-16 text-center">
                          {getRankBadge(index + 1)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-earth-900 text-lg">
                            {entry.kennel_name || entry.user_name}
                          </h4>
                          <div className="flex gap-4 mt-1 text-xs text-gray-600">
                            <span>🏆 {entry.champions_owned} Champions</span>
                            <span>⭐ {entry.grand_champions_owned} Grand Champions</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Championship Points</p>
                          <p className="text-2xl font-bold text-kennel-700">
                            {entry.total_championship_points.toLocaleString()}
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            {entry.total_wins} total wins
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* My Stats */}
            {activeTab === 'my_stats' && (
              <div className="space-y-6">
                {/* Dog Stats */}
                {selectedDog && myDogStats ? (
                  <div className="bg-gradient-to-r from-kennel-50 to-blue-50 rounded-lg p-6 border-2 border-kennel-300">
                    <h4 className="text-xl font-bold text-earth-900 mb-4">
                      {selectedDog.name}'s Stats
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Global Rank</p>
                        <p className="text-3xl font-bold text-kennel-700">
                          {myDogStats.global_rank ? `#${myDogStats.global_rank}` : '-'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Total Points</p>
                        <p className="text-2xl font-bold text-blue-700">
                          {myDogStats.total_points}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Wins</p>
                        <p className="text-2xl font-bold text-green-700">
                          {myDogStats.total_wins}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Competitions</p>
                        <p className="text-2xl font-bold text-purple-700">
                          {myDogStats.total_competitions}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="bg-white rounded p-3">
                        <p className="text-gray-600 mb-1">🏃 Agility</p>
                        <p className="font-bold">
                          {myDogStats.agility_wins}/{myDogStats.agility_competitions}
                        </p>
                        <p className="text-xs text-gray-500">
                          Best: {myDogStats.agility_best_score}
                        </p>
                      </div>
                      <div className="bg-white rounded p-3">
                        <p className="text-gray-600 mb-1">⚡ Racing</p>
                        <p className="font-bold">
                          {myDogStats.racing_wins}/{myDogStats.racing_competitions}
                        </p>
                        <p className="text-xs text-gray-500">
                          Best: {myDogStats.racing_best_score}
                        </p>
                      </div>
                      <div className="bg-white rounded p-3">
                        <p className="text-gray-600 mb-1">🎓 Obedience</p>
                        <p className="font-bold">
                          {myDogStats.obedience_wins}/{myDogStats.obedience_competitions}
                        </p>
                        <p className="text-xs text-gray-500">
                          Best: {myDogStats.obedience_best_score}
                        </p>
                      </div>
                      <div className="bg-white rounded p-3">
                        <p className="text-gray-600 mb-1">💪 Weight Pull</p>
                        <p className="font-bold">
                          {myDogStats.weight_pull_wins}/{myDogStats.weight_pull_competitions}
                        </p>
                        <p className="text-xs text-gray-500">
                          Best: {myDogStats.weight_pull_best_score}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : selectedDog ? (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <p className="text-gray-600">
                      {selectedDog.name} hasn't competed yet
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Enter a competition to start building your stats!
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <p className="text-gray-600">Select a dog to view stats</p>
                  </div>
                )}

                {/* User Stats */}
                {myUserStats && (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border-2 border-blue-300">
                    <h4 className="text-xl font-bold text-earth-900 mb-4">
                      Your Kennel Stats
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Global Rank</p>
                        <p className="text-3xl font-bold text-blue-700">
                          {myUserStats.global_rank ? `#${myUserStats.global_rank}` : '-'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Total Wins</p>
                        <p className="text-2xl font-bold text-green-700">
                          {myUserStats.total_wins}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Champions</p>
                        <p className="text-2xl font-bold text-yellow-700">
                          {myUserStats.champions_owned}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Grand Champions</p>
                        <p className="text-2xl font-bold text-purple-700">
                          {myUserStats.grand_champions_owned}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
