import { memo } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { getDailyReward, getUpcomingRewards, calculateLoginStreak } from '../../utils/dailyRewards';

interface DailyRewardModalProps {
  onClose: () => void;
}

function DailyRewardModal({ onClose }: DailyRewardModalProps) {
  const { user, claimDailyReward } = useGameStore();

  if (!user) return null;

  const currentStreak = calculateLoginStreak(user);
  const nextStreak = currentStreak + 1;
  const todayReward = getDailyReward(nextStreak);
  const upcomingRewards = getUpcomingRewards(currentStreak);

  const handleClaim = () => {
    claimDailyReward();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-kennel-600 to-kennel-700 p-6 rounded-t-2xl text-white">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2">Daily Reward!</h2>
            <div className="flex items-center justify-center gap-2">
              <span className="text-5xl">🔥</span>
              <div>
                <p className="text-xl font-bold">{nextStreak} Day Streak!</p>
                <p className="text-sm text-kennel-200">Keep coming back daily!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Reward */}
        <div className="p-6">
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-4 border-amber-400 rounded-xl p-6 mb-6 shadow-lg">
            <h3 className="text-xl font-bold text-amber-900 mb-4 text-center">
              Today's Reward - Day {nextStreak}
            </h3>

            <div className="grid grid-cols-3 gap-4 mb-4">
              {todayReward.cash > 0 && (
                <div className="bg-white rounded-lg p-4 text-center shadow">
                  <div className="text-3xl mb-2">💰</div>
                  <p className="text-2xl font-bold text-green-600">${todayReward.cash}</p>
                  <p className="text-xs text-earth-600">Cash</p>
                </div>
              )}
              {todayReward.gems > 0 && (
                <div className="bg-white rounded-lg p-4 text-center shadow">
                  <div className="text-3xl mb-2">💎</div>
                  <p className="text-2xl font-bold text-purple-600">{todayReward.gems}</p>
                  <p className="text-xs text-earth-600">Gems</p>
                </div>
              )}
              {todayReward.xp > 0 && (
                <div className="bg-white rounded-lg p-4 text-center shadow">
                  <div className="text-3xl mb-2">⭐</div>
                  <p className="text-2xl font-bold text-blue-600">{todayReward.xp}</p>
                  <p className="text-xs text-earth-600">XP</p>
                </div>
              )}
            </div>

            {todayReward.bonus && (
              <div className="bg-amber-100 border-2 border-amber-300 rounded-lg p-3 text-center">
                <p className="text-amber-900 font-bold">{todayReward.bonus}</p>
              </div>
            )}

            <button
              onClick={handleClaim}
              className="w-full mt-4 py-4 bg-gradient-to-r from-kennel-600 to-kennel-700 hover:from-kennel-700 hover:to-kennel-800 text-white rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-105"
            >
              Claim Reward
            </button>
          </div>

          {/* Upcoming Rewards */}
          <div>
            <h4 className="text-lg font-bold text-earth-900 mb-3">Upcoming Rewards</h4>
            <div className="grid grid-cols-7 gap-2">
              {upcomingRewards.map((reward, index) => (
                <div
                  key={reward.day}
                  className={`bg-earth-50 rounded-lg p-2 text-center border-2 ${
                    index === 0
                      ? 'border-kennel-400 bg-kennel-50'
                      : reward.bonus
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-earth-200'
                  }`}
                >
                  <p className="text-xs font-bold text-earth-600 mb-1">Day {reward.day}</p>
                  <div className="space-y-1">
                    {reward.cash > 0 && (
                      <p className="text-[10px] text-green-600 font-semibold">${reward.cash}</p>
                    )}
                    {reward.gems > 0 && (
                      <p className="text-[10px] text-purple-600 font-semibold">💎{reward.gems}</p>
                    )}
                    {reward.bonus && <p className="text-xs">🎁</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-earth-50 p-4 rounded-b-2xl text-center">
          <p className="text-sm text-earth-600">
            Come back tomorrow to continue your streak and earn bigger rewards!
          </p>
        </div>
      </div>
    </div>
  );
}

export default memo(DailyRewardModal);
