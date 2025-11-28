import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import {
  getKennelLevelInfo,
  getUpgradeCost,
  canUpgradeKennel,
  getNewFeaturesAtLevel,
} from '../../utils/kennelUpgrades';

/**
 * Kennel Upgrade View
 *
 * Shows current kennel level, benefits, and allows upgrading to next level
 */
export default function KennelUpgradeView() {
  const { user, upgradeKennel } = useGameStore();
  const [upgrading, setUpgrading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <p className="text-earth-600">No user data available</p>
      </div>
    );
  }

  const currentLevel = user.kennel_level;
  const currentLevelInfo = getKennelLevelInfo(currentLevel);
  const nextLevel = currentLevel + 1;
  const nextLevelInfo = getKennelLevelInfo(nextLevel);
  const upgradeCost = getUpgradeCost(currentLevel);
  const canUpgrade = canUpgradeKennel(currentLevel, user.cash);
  const newFeatures = getNewFeaturesAtLevel(nextLevel);

  const handleUpgrade = async () => {
    if (!canUpgrade.canUpgrade) {
      setMessage({ type: 'error', text: canUpgrade.reason || 'Cannot upgrade' });
      return;
    }

    setUpgrading(true);
    const result = upgradeKennel();

    if (result.success) {
      setMessage({ type: 'success', text: result.message || 'Upgraded successfully!' });
      setTimeout(() => setMessage(null), 5000);
    } else {
      setMessage({ type: 'error', text: result.message || 'Upgrade failed' });
    }
    setUpgrading(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-kennel-600 to-kennel-700 rounded-lg shadow-xl p-6 text-white">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Kennel Upgrades</h1>
        <p className="text-kennel-100">Expand and improve your breeding facilities</p>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={`rounded-lg p-4 ${
            message.type === 'success'
              ? 'bg-green-100 border border-green-400 text-green-800'
              : 'bg-red-100 border border-red-400 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Level */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-kennel-700">Current Level</h2>
            <span className="text-4xl font-bold text-kennel-600">Lv {currentLevel}</span>
          </div>

          <h3 className="text-xl font-semibold text-earth-700 mb-2">{currentLevelInfo.name}</h3>
          <p className="text-earth-600 mb-4">{currentLevelInfo.description}</p>

          <div className="space-y-3">
            <div className="bg-kennel-50 rounded-lg p-3">
              <h4 className="font-semibold text-kennel-800 mb-2">Capacity & Storage</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-earth-600">Dog Capacity:</span>
                  <span className="ml-2 font-bold text-kennel-700">{currentLevelInfo.dogCapacity}</span>
                </div>
                <div>
                  <span className="text-earth-600">Food Storage:</span>
                  <span className="ml-2 font-bold text-kennel-700">{currentLevelInfo.foodStorageMax}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3">
              <h4 className="font-semibold text-blue-800 mb-2">Passive Bonuses</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-earth-600">Energy Regen:</span>
                  <span className="font-bold text-blue-700">+{currentLevelInfo.energyRegenBonus}/hr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-earth-600">Training Effectiveness:</span>
                  <span className="font-bold text-blue-700">+{currentLevelInfo.trainingEffectivenessBonus}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-earth-600">Recovery Speed:</span>
                  <span className="font-bold text-blue-700">-{currentLevelInfo.ailmentRecoveryBonus}%</span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-3">
              <h4 className="font-semibold text-green-800 mb-2">Business Bonuses</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-earth-600">Job Income:</span>
                  <span className="font-bold text-green-700">{currentLevelInfo.jobIncomeMultiplier}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-earth-600">Competition Prizes:</span>
                  <span className="font-bold text-green-700">+{currentLevelInfo.competitionPrizeBonus}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-earth-600">Vet Cost Reduction:</span>
                  <span className="font-bold text-green-700">-{currentLevelInfo.vetCostReduction}%</span>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-3">
              <h4 className="font-semibold text-purple-800 mb-2">Features Unlocked</h4>
              <div className="flex flex-wrap gap-2">
                {currentLevelInfo.features.map((feature, idx) => (
                  <span
                    key={idx}
                    className="bg-purple-200 text-purple-800 px-2 py-1 rounded text-xs font-medium"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Next Level */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg shadow-lg p-6 border-2 border-amber-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-amber-700">Next Level</h2>
            <span className="text-4xl font-bold text-amber-600">Lv {nextLevel}</span>
          </div>

          {currentLevel >= 10 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-2xl font-bold text-amber-700 mb-2">Maximum Level Reached!</h3>
              <p className="text-earth-600">You have the ultimate breeding facility!</p>
            </div>
          ) : (
            <>
              <h3 className="text-xl font-semibold text-earth-700 mb-2">{nextLevelInfo.name}</h3>
              <p className="text-earth-600 mb-4">{nextLevelInfo.description}</p>

              {/* Upgrade Cost */}
              <div className="bg-white rounded-lg p-4 mb-4 border-2 border-amber-300">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-earth-700">Upgrade Cost:</span>
                  <span className="text-2xl font-bold text-amber-700">${upgradeCost.toLocaleString()}</span>
                </div>
                <div className="mt-2 text-sm text-earth-600">
                  Your Cash: <span className="font-bold">${user.cash.toLocaleString()}</span>
                </div>
              </div>

              {/* New Features */}
              {newFeatures.length > 0 && (
                <div className="bg-white rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-amber-800 mb-2">🎉 New Features Unlocked:</h4>
                  <div className="space-y-1">
                    {newFeatures.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span className="text-earth-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Improvements */}
              <div className="space-y-3 mb-6">
                <div className="bg-white rounded-lg p-3">
                  <h4 className="font-semibold text-amber-800 mb-2">Improvements</h4>
                  <div className="space-y-2 text-sm">
                    {nextLevelInfo.dogCapacity > currentLevelInfo.dogCapacity && (
                      <div className="flex justify-between items-center">
                        <span className="text-earth-600">Dog Capacity:</span>
                        <span className="font-bold text-amber-700">
                          {currentLevelInfo.dogCapacity} → {nextLevelInfo.dogCapacity}
                          <span className="text-green-600 ml-1">(+{nextLevelInfo.dogCapacity - currentLevelInfo.dogCapacity})</span>
                        </span>
                      </div>
                    )}
                    {nextLevelInfo.foodStorageMax > currentLevelInfo.foodStorageMax && (
                      <div className="flex justify-between items-center">
                        <span className="text-earth-600">Food Storage:</span>
                        <span className="font-bold text-amber-700">
                          {currentLevelInfo.foodStorageMax} → {nextLevelInfo.foodStorageMax}
                          <span className="text-green-600 ml-1">(+{nextLevelInfo.foodStorageMax - currentLevelInfo.foodStorageMax})</span>
                        </span>
                      </div>
                    )}
                    {nextLevelInfo.energyRegenBonus > currentLevelInfo.energyRegenBonus && (
                      <div className="flex justify-between items-center">
                        <span className="text-earth-600">Energy Regen:</span>
                        <span className="font-bold text-amber-700">
                          +{currentLevelInfo.energyRegenBonus}/hr → +{nextLevelInfo.energyRegenBonus}/hr
                        </span>
                      </div>
                    )}
                    {nextLevelInfo.trainingEffectivenessBonus > currentLevelInfo.trainingEffectivenessBonus && (
                      <div className="flex justify-between items-center">
                        <span className="text-earth-600">Training Bonus:</span>
                        <span className="font-bold text-amber-700">
                          +{currentLevelInfo.trainingEffectivenessBonus}% → +{nextLevelInfo.trainingEffectivenessBonus}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Upgrade Button */}
              <button
                onClick={handleUpgrade}
                disabled={!canUpgrade.canUpgrade || upgrading}
                className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
                  canUpgrade.canUpgrade && !upgrading
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg hover:shadow-xl transform hover:scale-105'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {upgrading ? 'Upgrading...' : canUpgrade.canUpgrade ? `Upgrade for $${upgradeCost.toLocaleString()}` : canUpgrade.reason}
              </button>
            </>
          )}
        </div>
      </div>

      {/* All Levels Overview */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-kennel-700 mb-4">All Kennel Levels</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-kennel-100 text-kennel-800">
                <th className="p-2 text-left">Level</th>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-center">Capacity</th>
                <th className="p-2 text-center">Storage</th>
                <th className="p-2 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => {
                const info = getKennelLevelInfo(level);
                const isCurrentLevel = level === currentLevel;
                return (
                  <tr
                    key={level}
                    className={`border-b ${
                      isCurrentLevel
                        ? 'bg-kennel-50 font-bold'
                        : level < currentLevel
                        ? 'text-earth-400'
                        : 'hover:bg-earth-50'
                    }`}
                  >
                    <td className="p-2">
                      {isCurrentLevel ? '▶' : ''} Lv {level}
                    </td>
                    <td className="p-2">{info.name}</td>
                    <td className="p-2 text-center">{info.dogCapacity}</td>
                    <td className="p-2 text-center">{info.foodStorageMax}</td>
                    <td className="p-2 text-right">
                      {level === 1 ? 'Starting' : `$${info.upgradeCost.toLocaleString()}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
