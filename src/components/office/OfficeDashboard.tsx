import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { getWeeksRemaining } from '../../utils/breedingCalculations';
import { rescueBreeds } from '../../data/rescueBreeds';
import HelpButton from '../tutorial/HelpButton';
import { storyChapters } from '../../data/storyChapters';
import InventoryPanel from './InventoryPanel';

type View = 'kennel' | 'dogDetail' | 'office' | 'story' | 'training' | 'competition' | 'breeding' | 'jobs' | 'shop' | 'vet';

interface OfficeDashboardProps {
  onNavigate: (view: View, options?: { shopTab?: 'breeds' | 'items' | 'pound' }) => void;
}

export default function OfficeDashboard({ onNavigate }: OfficeDashboardProps) {
  const { user, dogs, selectDog, storyProgress } = useGameStore();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Calculate stats
  const totalDogs = dogs.length;
  const dogsNeedingAttention = dogs.filter(
    (d: any) => d.hunger < 50 || d.happiness < 50 || d.health < 50 || d.energy_stat < 50
  );
  const pregnantDogs = dogs.filter((d: any) => d.is_pregnant && d.pregnancy_due);
  const puppies = dogs.filter((d: any) => d.age_weeks < 52);
  const adults = dogs.filter((d: any) => d.age_weeks >= 52);

  // Today's stats (would need to track these properly in a real app)
  const totalWins = (user?.competition_wins_local || 0) + (user?.competition_wins_regional || 0) + (user?.competition_wins_national || 0);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-3xl font-bold text-earth-900">Office</h2>
              <HelpButton helpId="office-overview" tooltip="Learn about the Office" />
            </div>
            <p className="text-earth-600">Kennel management dashboard</p>
          </div>

          {/* Training Points Summary */}
          {dogs.length > 0 && (
            <div className="flex-shrink-0">
              <h3 className="text-sm font-bold text-earth-600 mb-3">🎯 Training Points</h3>
              <div className="flex gap-3 flex-wrap max-w-md">
                {dogs.map((dog: any) => {
                  const lastReset = new Date(dog.last_training_reset);
                  const nextReset = new Date(lastReset);
                  nextReset.setDate(nextReset.getDate() + 1);
                  nextReset.setHours(0, 0, 0, 0);
                  const now = new Date();
                  const hoursUntilReset = Math.max(0, Math.ceil((nextReset.getTime() - now.getTime()) / (1000 * 60 * 60)));

                  return (
                    <div key={dog.id} className="bg-blue-50 border border-blue-200 p-3 rounded-lg min-w-[140px]">
                      <p className="font-semibold text-blue-900 text-sm mb-1 truncate">{dog.name}</p>
                      <p className="text-xl font-bold text-blue-700">
                        {dog.training_points}/100
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {hoursUntilReset > 0
                          ? `Resets in ${hoursUntilReset}h`
                          : 'Resetting...'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-earth-600">Total Dogs</p>
              <p className="text-3xl font-bold text-earth-900">{totalDogs}</p>
              <p className="text-xs text-earth-500 mt-1">
                {adults.length} adults, {puppies.length} puppies
              </p>
            </div>
            <span className="text-4xl">🐕</span>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-earth-600">Cash</p>
              <p className="text-3xl font-bold text-green-600">${user?.cash || 0}</p>
              <p className="text-xs text-earth-500 mt-1">
                💎 {user?.gems || 0} gems
              </p>
            </div>
            <span className="text-4xl">💰</span>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-earth-600">Level</p>
              <p className="text-3xl font-bold text-kennel-600">{user?.level || 1}</p>
              <p className="text-xs text-earth-500 mt-1">
                {user?.xp || 0} XP
              </p>
            </div>
            <span className="text-4xl">⭐</span>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-earth-600">Total Wins</p>
              <p className="text-3xl font-bold text-yellow-600">{totalWins}</p>
              <div className="text-xs text-earth-500 mt-1 space-y-0.5">
                <div>🥉 Local: {user?.competition_wins_local || 0}</div>
                <div>🥈 Regional: {user?.competition_wins_regional || 0}</div>
                <div>🥇 National: {user?.competition_wins_national || 0}</div>
              </div>
            </div>
            <span className="text-4xl">🏆</span>
          </div>
        </div>
      </div>

      {/* Story Mode - Prominent Section */}
      <div className="mb-6">
        <div
          onClick={() => onNavigate('story')}
          className="bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500 rounded-lg shadow-xl p-6 cursor-pointer hover:shadow-2xl transform hover:scale-[1.02] transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">📖</span>
                <div>
                  <h3 className="text-2xl font-bold text-white drop-shadow-lg">Story Mode</h3>
                  <p className="text-purple-100 text-sm">Path to Championship</p>
                </div>
              </div>
              {storyProgress?.current_chapter ? (
                <div className="mt-3 bg-white/20 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white font-semibold">
                      {storyChapters.find(ch => ch.id === storyProgress.current_chapter)?.icon || '📘'}{' '}
                      {storyChapters.find(ch => ch.id === storyProgress.current_chapter)?.title || 'New Adventure'}
                    </p>
                    <span className="text-white/90 text-sm">
                      Chapter {storyChapters.find(ch => ch.id === storyProgress.current_chapter)?.chapter_number || 1}
                    </span>
                  </div>
                  <div className="bg-white/30 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-white h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round((storyProgress.completed_chapters?.length || 0) / storyChapters.length * 100)}%`
                      }}
                    />
                  </div>
                  <p className="text-white/90 text-xs mt-1">
                    {storyProgress.completed_chapters?.length || 0} / {storyChapters.length} chapters completed
                  </p>
                </div>
              ) : (
                <div className="mt-3">
                  <p className="text-white text-lg">Begin your journey to become a champion!</p>
                  <p className="text-purple-100 text-sm mt-1">Click to start the story</p>
                </div>
              )}
            </div>
            <div className="hidden md:block">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6 text-center">
                <span className="text-6xl">🏆</span>
                <p className="text-white font-semibold mt-2 text-sm">Start Now</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts & Notifications */}
      {(dogsNeedingAttention.length > 0 || pregnantDogs.length > 0) && (
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white drop-shadow-lg mb-4">⚠️ Needs Attention</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dogs Needing Care */}
            {dogsNeedingAttention.length > 0 && (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg shadow-lg p-5">
                <h4 className="font-bold text-yellow-900 mb-3 flex items-center gap-2">
                  <span>🔔</span>
                  {dogsNeedingAttention.length} {dogsNeedingAttention.length === 1 ? 'Dog Needs' : 'Dogs Need'} Care
                </h4>
                <div className="space-y-2">
                  {dogsNeedingAttention.slice(0, 3).map((dog: any) => (
                    <div key={dog.id} className="text-sm text-yellow-800">
                      <span className="font-semibold">{dog.name}:</span>{' '}
                      {dog.hunger < 50 && 'Hungry '}
                      {dog.happiness < 50 && 'Unhappy '}
                      {dog.health < 50 && 'Sick '}
                      {dog.energy_stat < 50 && 'Tired'}
                    </div>
                  ))}
                  {dogsNeedingAttention.length > 3 && (
                    <p className="text-xs text-yellow-600">
                      +{dogsNeedingAttention.length - 3} more
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onNavigate('kennel')}
                  className="mt-3 w-full py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all font-semibold text-sm"
                >
                  Go to Kennels
                </button>
              </div>
            )}

            {/* Pregnant Dogs */}
            {pregnantDogs.length > 0 && (
              <div className="bg-pink-50 border-2 border-pink-300 rounded-lg shadow-lg p-5">
                <h4 className="font-bold text-pink-900 mb-3 flex items-center gap-2">
                  <span>🤰</span>
                  {pregnantDogs.length} Pregnant {pregnantDogs.length === 1 ? 'Dog' : 'Dogs'}
                </h4>
                <div className="space-y-2">
                  {pregnantDogs.map((dog: any) => (
                    <div key={dog.id} className="text-sm text-pink-800">
                      <span className="font-semibold">{dog.name}:</span>{' '}
                      {dog.pregnancy_due && `${getWeeksRemaining(dog.pregnancy_due)} weeks left`}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => onNavigate('breeding')}
                  className="mt-3 w-full py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-all font-semibold text-sm"
                >
                  Go to Breeding
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Quick Actions Panel */}
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-earth-900 mb-4">📋 Quick Actions</h3>
          <div className="space-y-3">
            {/* View My Dogs - Expandable */}
            <div className="border border-earth-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === 'dogs' ? null : 'dogs')}
                className="w-full text-left p-3 bg-earth-50 hover:bg-earth-100 transition-all flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold text-earth-900">🐕 View My Dogs</p>
                  <p className="text-sm text-earth-600">{totalDogs} {totalDogs === 1 ? 'dog' : 'dogs'}</p>
                </div>
                <span className="text-earth-600">{expandedSection === 'dogs' ? '▼' : '▶'}</span>
              </button>
              {expandedSection === 'dogs' && (
                <div className="p-3 bg-white border-t border-earth-200 space-y-2">
                  {dogs.length === 0 ? (
                    <p className="text-sm text-earth-500 text-center py-2">No dogs yet</p>
                  ) : (
                    dogs.map((dog: any) => {
                      const breedData = rescueBreeds.find(b => b.id === dog.breed_id);
                      return (
                        <button
                          key={dog.id}
                          onClick={() => {
                            selectDog(dog);
                            onNavigate('dogDetail');
                          }}
                          className="w-full text-left p-2 bg-earth-50 hover:bg-kennel-100 rounded transition-all flex items-center gap-3"
                        >
                          <img
                            src={breedData?.img_sitting || ''}
                            alt={dog.name}
                            className="w-12 h-12 object-contain"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-earth-900">{dog.name}</p>
                            <p className="text-xs text-earth-600 capitalize">{breedData?.name}</p>
                          </div>
                          <span className="text-earth-400">→</span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Quick Training */}
            <button
              onClick={() => onNavigate('training')}
              className="w-full text-left p-3 bg-earth-50 hover:bg-earth-100 rounded-lg transition-all"
            >
              <p className="font-semibold text-earth-900">🎯 Train Dogs</p>
              <p className="text-sm text-earth-600">Improve your dogs' skills</p>
            </button>

            {/* Quick Competition */}
            <button
              onClick={() => onNavigate('competition')}
              className="w-full text-left p-3 bg-earth-50 hover:bg-earth-100 rounded-lg transition-all"
            >
              <p className="font-semibold text-earth-900">🏆 Enter Competition</p>
              <p className="text-sm text-earth-600">Compete for prizes</p>
            </button>

            {/* Quick Jobs */}
            <button
              onClick={() => onNavigate('jobs')}
              className="w-full text-left p-3 bg-earth-50 hover:bg-earth-100 rounded-lg transition-all"
            >
              <p className="font-semibold text-earth-900">💼 Do Jobs</p>
              <p className="text-sm text-earth-600">Earn extra cash</p>
            </button>
          </div>
        </div>

        {/* Pound Link */}
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-earth-900 mb-4">🏠 Adopt from Pound</h3>
          <div
            onClick={() => onNavigate('shop', { shopTab: 'pound' })}
            className="cursor-pointer group"
          >
            <div className="bg-earth-100 rounded-lg p-8 mb-4 text-center group-hover:bg-earth-200 transition-all">
              <span className="text-8xl group-hover:scale-110 transition-transform inline-block">🐶</span>
            </div>
            <button className="w-full py-3 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 transition-all font-bold">
              Visit the Pound
            </button>
            <p className="text-sm text-earth-600 mt-2 text-center">
              Rescue dogs need loving homes! Lower cost, good hearts.
            </p>
          </div>
        </div>
      </div>

      {/* Inventory Section */}
      <div className="mb-6">
        <InventoryPanel />
      </div>

    </div>
  );
}
