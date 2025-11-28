import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { isAdmin } from '../../config/adminConfig';

interface AdminPanelProps {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const { user, setUser } = useGameStore();
  const userIsAdmin = isAdmin(user?.id);

  // Show setup instructions if not yet added as admin
  if (!userIsAdmin) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100000] p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Admin Setup Required
            </h2>
            <p className="text-slate-600">
              Add your user ID to the admin config to access the admin panel
            </p>
          </div>

          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-6">
            <p className="text-sm font-semibold text-purple-900 mb-2">Your User ID:</p>
            <div className="bg-white px-4 py-3 rounded border border-purple-300 font-mono text-sm break-all">
              {user?.id || 'Not logged in'}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
            <p className="text-sm font-semibold text-slate-800 mb-2">Setup Instructions:</p>
            <ol className="text-sm text-slate-700 space-y-2 list-decimal list-inside">
              <li>Copy your user ID above</li>
              <li>Open <code className="bg-slate-200 px-2 py-1 rounded text-xs">src/config/adminConfig.ts</code></li>
              <li>Add your user ID to the <code className="bg-slate-200 px-2 py-1 rounded text-xs">ADMIN_USER_IDS</code> array</li>
              <li>Save the file and refresh the page</li>
            </ol>
          </div>

          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }
  const [values, setValues] = useState({
    level: user?.level || 1,
    xp: user?.xp || 0,
    cash: user?.cash || 0,
    gems: user?.gems || 0,
    food_storage: user?.food_storage || 0,
    kennel_level: user?.kennel_level || 1,
    training_skill: user?.training_skill || 1,
    care_knowledge: user?.care_knowledge || 1,
    breeding_expertise: user?.breeding_expertise || 1,
    competition_strategy: user?.competition_strategy || 1,
    business_acumen: user?.business_acumen || 1,
  });

  const handleChange = (field: string, value: number) => {
    setValues(prev => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    if (!user) return;

    setUser({
      ...user,
      level: values.level,
      xp: values.xp,
      cash: values.cash,
      gems: values.gems,
      food_storage: Math.min(100, values.food_storage), // Cap at 100
      kennel_level: values.kennel_level,
      training_skill: values.training_skill,
      care_knowledge: values.care_knowledge,
      breeding_expertise: values.breeding_expertise,
      competition_strategy: values.competition_strategy,
      business_acumen: values.business_acumen,
    });

    alert('Admin values applied! 🎮');
  };

  const handleQuickAdd = (field: string, amount: number) => {
    setValues(prev => ({
      ...prev,
      [field]: Math.max(0, prev[field as keyof typeof prev] + amount)
    }));
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100000] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">🎮 Developer Admin Panel</h2>
              <p className="text-purple-100 text-sm mt-1">Modify game values for testing</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              aria-label="Close"
            >
              <span className="text-2xl">✕</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Level & XP Section */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span>📊</span> Level & Experience
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Level */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Level (1-100)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={values.level}
                    onChange={(e) => handleChange('level', Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                    className="flex-1 px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-purple-500"
                    min="1"
                    max="100"
                  />
                  <button
                    onClick={() => handleChange('level', 100)}
                    className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* XP */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Experience Points
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={values.xp}
                    onChange={(e) => handleChange('xp', Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-purple-500"
                    min="0"
                  />
                  <button
                    onClick={() => handleQuickAdd('xp', 1000)}
                    className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                  >
                    +1000
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Currency Section */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span>💰</span> Currency
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cash */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Cash ($)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={values.cash}
                    onChange={(e) => handleChange('cash', Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-green-500"
                    min="0"
                  />
                  <button
                    onClick={() => handleQuickAdd('cash', 10000)}
                    className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                  >
                    +10K
                  </button>
                  <button
                    onClick={() => handleQuickAdd('cash', 100000)}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    +100K
                  </button>
                </div>
              </div>

              {/* Gems */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Gems (💎)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={values.gems}
                    onChange={(e) => handleChange('gems', Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                    min="0"
                  />
                  <button
                    onClick={() => handleQuickAdd('gems', 100)}
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                  >
                    +100
                  </button>
                  <button
                    onClick={() => handleQuickAdd('gems', 1000)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    +1000
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Resources Section */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span>📦</span> Resources
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Food Storage */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Food Storage (0-100 units)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={values.food_storage}
                    onChange={(e) => handleChange('food_storage', Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                    className="flex-1 px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                    min="0"
                    max="100"
                  />
                  <button
                    onClick={() => handleChange('food_storage', 100)}
                    className="px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium"
                  >
                    Fill
                  </button>
                </div>
              </div>

              {/* Kennel Level */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Kennel Level (1-10)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={values.kennel_level}
                    onChange={(e) => handleChange('kennel_level', Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                    className="flex-1 px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-orange-500"
                    min="1"
                    max="10"
                  />
                  <button
                    onClick={() => handleChange('kennel_level', 10)}
                    className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                  >
                    Max
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Skills Section */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span>⚡</span> Skills (1-100)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Training Skill */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Training Skill
                </label>
                <input
                  type="number"
                  value={values.training_skill}
                  onChange={(e) => handleChange('training_skill', Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                  min="1"
                  max="100"
                />
              </div>

              {/* Care Knowledge */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Care Knowledge
                </label>
                <input
                  type="number"
                  value={values.care_knowledge}
                  onChange={(e) => handleChange('care_knowledge', Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                  min="1"
                  max="100"
                />
              </div>

              {/* Breeding Expertise */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Breeding Expertise
                </label>
                <input
                  type="number"
                  value={values.breeding_expertise}
                  onChange={(e) => handleChange('breeding_expertise', Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                  min="1"
                  max="100"
                />
              </div>

              {/* Competition Strategy */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Competition Strategy
                </label>
                <input
                  type="number"
                  value={values.competition_strategy}
                  onChange={(e) => handleChange('competition_strategy', Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                  min="1"
                  max="100"
                />
              </div>

              {/* Business Acumen */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Business Acumen
                </label>
                <input
                  type="number"
                  value={values.business_acumen}
                  onChange={(e) => handleChange('business_acumen', Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                  min="1"
                  max="100"
                />
              </div>

              {/* Quick Max All Skills Button */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setValues(prev => ({
                      ...prev,
                      training_skill: 100,
                      care_knowledge: 100,
                      breeding_expertise: 100,
                      competition_strategy: 100,
                      business_acumen: 100,
                    }));
                  }}
                  className="w-full px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-colors font-semibold"
                >
                  Max All Skills
                </button>
              </div>
            </div>
          </div>

          {/* Warning Notice */}
          <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 flex items-start gap-2">
              <span className="text-lg">⚠️</span>
              <span>
                <strong>Developer Mode:</strong> These changes affect your game state. Use for testing purposes only.
                Changes are saved automatically when you click "Apply Changes".
              </span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors font-semibold"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
