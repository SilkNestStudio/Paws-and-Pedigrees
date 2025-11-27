import { useGameStore } from '../../stores/gameStore';
import { getWeeksRemaining } from '../../utils/breedingCalculations';

type View = 'kennel' | 'office' | 'training' | 'competition' | 'breeding' | 'jobs' | 'shop';

interface OfficeDashboardProps {
  onNavigate: (view: View) => void;
}

export default function OfficeDashboard({ onNavigate }: OfficeDashboardProps) {
  const { user, dogs } = useGameStore();

  // Calculate stats
  const totalDogs = dogs.length;
  const dogsNeedingAttention = dogs.filter(
    d => d.hunger < 50 || d.happiness < 50 || d.health < 50 || d.energy_stat < 50
  );
  const pregnantDogs = dogs.filter(d => d.is_pregnant && d.pregnancy_due);
  const puppies = dogs.filter(d => d.age_weeks < 52);
  const adults = dogs.filter(d => d.age_weeks >= 52);

  // Today's stats (would need to track these properly in a real app)
  const totalWins = (user?.competition_wins_local || 0) + (user?.competition_wins_regional || 0) + (user?.competition_wins_national || 0);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-3xl font-bold text-earth-900 mb-2">Office</h2>
        <p className="text-earth-600">Kennel management dashboard</p>
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
            <div>
              <p className="text-sm text-earth-600">Total Wins</p>
              <p className="text-3xl font-bold text-yellow-600">{totalWins}</p>
              <p className="text-xs text-earth-500 mt-1">
                All competitions
              </p>
            </div>
            <span className="text-4xl">🏆</span>
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
                  {dogsNeedingAttention.slice(0, 3).map(dog => (
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
                  {pregnantDogs.map(dog => (
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
        {/* To-Do Summary */}
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-earth-900 mb-4">📋 Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => onNavigate('kennel')}
              className="w-full text-left p-3 bg-earth-50 hover:bg-earth-100 rounded-lg transition-all"
            >
              <p className="font-semibold text-earth-900">🐕 View My Dogs</p>
              <p className="text-sm text-earth-600">Check on your {totalDogs} dogs</p>
            </button>

            <button
              onClick={() => onNavigate('training')}
              className="w-full text-left p-3 bg-earth-50 hover:bg-earth-100 rounded-lg transition-all"
            >
              <p className="font-semibold text-earth-900">🎯 Train Dogs</p>
              <p className="text-sm text-earth-600">Improve your dogs' skills</p>
            </button>

            <button
              onClick={() => onNavigate('competition')}
              className="w-full text-left p-3 bg-earth-50 hover:bg-earth-100 rounded-lg transition-all"
            >
              <p className="font-semibold text-earth-900">🏆 Enter Competition</p>
              <p className="text-sm text-earth-600">Compete for prizes</p>
            </button>

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
            onClick={() => onNavigate('kennel')}
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

      {/* Training Points Info */}
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-earth-900 mb-4">ℹ️ Training Points (TP) System</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="font-semibold text-blue-900 mb-1">Daily Regeneration</p>
            <p className="text-sm text-blue-700">
              Each dog gets 100 TP daily at midnight
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="font-semibold text-blue-900 mb-1">Training Cost</p>
            <p className="text-sm text-blue-700">
              Each training session costs 20 TP
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="font-semibold text-blue-900 mb-1">Bonus TP</p>
            <p className="text-sm text-blue-700">
              Buy training items from the shop for extra TP
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
