import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { ACHIEVEMENTS } from '../../data/achievements';
import {
  getAvailableAchievements,
  getAchievementsByCategory,
  getAchievementProgress,
  getCompletionPercentage,
  isAchievementUnlocked,
} from '../../utils/achievementTracker';
import { Achievement, AchievementCategory } from '../../types/achievements';

const CATEGORIES: { id: AchievementCategory; name: string; icon: string }[] = [
  { id: 'kennel', name: 'Kennel', icon: '🏠' },
  { id: 'training', name: 'Training', icon: '🎓' },
  { id: 'competition', name: 'Competition', icon: '🏆' },
  { id: 'breeding', name: 'Breeding', icon: '🍼' },
  { id: 'collection', name: 'Collection', icon: '📚' },
  { id: 'care', name: 'Care', icon: '💕' },
  { id: 'progression', name: 'Progression', icon: '📈' },
  { id: 'special', name: 'Special', icon: '⭐' },
];

const RARITY_COLORS = {
  common: 'bg-gray-100 text-gray-700 border-gray-300',
  uncommon: 'bg-green-100 text-green-700 border-green-300',
  rare: 'bg-blue-100 text-blue-700 border-blue-300',
  epic: 'bg-purple-100 text-purple-700 border-purple-300',
  legendary: 'bg-yellow-100 text-yellow-700 border-yellow-300',
};

export default function AchievementsView() {
  const { user } = useGameStore();
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');

  const userAchievements = user?.achievements || [];
  const completionPercentage = getCompletionPercentage(userAchievements);

  const achievements =
    selectedCategory === 'all'
      ? getAvailableAchievements(userAchievements)
      : getAchievementsByCategory(selectedCategory, userAchievements);

  const renderAchievement = (achievement: Achievement) => {
    const unlocked = isAchievementUnlocked(achievement.id, userAchievements);
    const progress = getAchievementProgress(achievement.id, userAchievements);
    const progressPercentage = (progress.current / progress.required) * 100;

    return (
      <div
        key={achievement.id}
        className={`relative bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-5 transition-all ${
          unlocked
            ? 'border-2 border-green-500'
            : 'border border-earth-200 opacity-80'
        }`}
      >
        {/* Unlocked Badge */}
        {unlocked && (
          <div className="absolute top-3 right-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
            ✓ Unlocked
          </div>
        )}

        {/* Icon & Name */}
        <div className="flex items-start gap-4 mb-3">
          <span className="text-5xl">{achievement.icon}</span>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-earth-900">{achievement.name}</h3>
            <p className="text-sm text-earth-600">{achievement.description}</p>
          </div>
        </div>

        {/* Rarity */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`text-xs px-2 py-1 rounded-full border uppercase font-semibold ${
              RARITY_COLORS[achievement.rarity]
            }`}
          >
            {achievement.rarity}
          </span>
        </div>

        {/* Progress Bar */}
        {achievement.targetValue && achievement.targetValue > 1 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-earth-600 mb-1">
              <span>Progress</span>
              <span>
                {progress.current} / {progress.required}
              </span>
            </div>
            <div className="w-full bg-earth-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  unlocked ? 'bg-green-500' : 'bg-kennel-600'
                }`}
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Rewards */}
        <div className="bg-earth-50 p-3 rounded-lg">
          <p className="text-xs font-semibold text-earth-700 mb-2">Rewards:</p>
          <div className="flex flex-wrap gap-2 text-sm">
            {achievement.reward.cash && (
              <span className="text-green-700">💵 ${achievement.reward.cash}</span>
            )}
            {achievement.reward.gems && (
              <span className="text-purple-700">💎 {achievement.reward.gems}</span>
            )}
            {achievement.reward.xp && (
              <span className="text-blue-700">⭐ {achievement.reward.xp} XP</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-earth-900 mb-2">Achievements</h2>
        <p className="text-earth-600 mb-4">
          Track your progress and earn rewards for completing challenges
        </p>

        {/* Overall Progress */}
        <div className="bg-gradient-to-r from-kennel-50 to-transparent p-4 rounded-lg border-l-4 border-kennel-500">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-earth-900">Overall Completion</span>
            <span className="text-2xl font-bold text-kennel-700">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-earth-200 rounded-full h-3">
            <div
              className="bg-kennel-600 h-3 rounded-full transition-all"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <p className="text-xs text-earth-600 mt-2">
            {userAchievements.length} / {Object.keys(ACHIEVEMENTS).length} achievements unlocked
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              selectedCategory === 'all'
                ? 'bg-kennel-600 text-white'
                : 'bg-earth-100 text-earth-700 hover:bg-earth-200'
            }`}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                selectedCategory === cat.id
                  ? 'bg-kennel-600 text-white'
                  : 'bg-earth-100 text-earth-700 hover:bg-earth-200'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Achievements Grid */}
      {achievements.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map(renderAchievement)}
        </div>
      ) : (
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-12 text-center">
          <span className="text-6xl mb-4 block">🏆</span>
          <h3 className="text-xl font-bold text-earth-900 mb-2">No Achievements Yet</h3>
          <p className="text-earth-600">
            Start playing to unlock achievements in this category!
          </p>
        </div>
      )}
    </div>
  );
}
