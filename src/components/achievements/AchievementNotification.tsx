import { Achievement } from '../../types/achievements';

interface AchievementNotificationProps {
  achievement: Achievement;
  onClose: () => void;
}

const RARITY_COLORS = {
  common: 'from-gray-400 to-gray-600',
  uncommon: 'from-green-400 to-green-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-yellow-600',
};

export default function AchievementNotification({
  achievement,
  onClose,
}: AchievementNotificationProps) {
  return (
    <div className="fixed top-20 right-4 z-50 animate-slideInRight">
      <div
        className={`bg-gradient-to-r ${RARITY_COLORS[achievement.rarity]} rounded-lg shadow-2xl overflow-hidden max-w-sm`}
      >
        <div className="bg-white/95 p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-earth-600 uppercase tracking-wide">
              Achievement Unlocked!
            </span>
            <button
              onClick={onClose}
              className="text-earth-400 hover:text-earth-600 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Achievement Info */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">{achievement.icon}</span>
            <div>
              <h3 className="font-bold text-earth-900 text-lg">{achievement.name}</h3>
              <p className="text-xs text-earth-600">{achievement.description}</p>
            </div>
          </div>

          {/* Rewards */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-2 rounded border border-yellow-200">
            <p className="text-xs font-semibold text-yellow-800 mb-1">Rewards:</p>
            <div className="flex flex-wrap gap-2 text-sm">
              {achievement.reward.cash && (
                <span className="text-green-700 font-semibold">
                  💵 ${achievement.reward.cash}
                </span>
              )}
              {achievement.reward.gems && (
                <span className="text-purple-700 font-semibold">
                  💎 {achievement.reward.gems}
                </span>
              )}
              {achievement.reward.xp && (
                <span className="text-blue-700 font-semibold">
                  ⭐ {achievement.reward.xp} XP
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
