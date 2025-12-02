import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { getItem, getRarityColor, getRarityBgColor } from '../../data/items';
import type { InventoryItem } from '../../types';

export default function InventoryPanel() {
  const { user, dogs, useItem } = useGameStore();
  const [selectedDog, setSelectedDog] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const inventory = user?.inventory || [];

  const handleUseItem = (itemId: string) => {
    const itemDef = getItem(itemId);
    if (!itemDef) return;

    // Check if item requires a dog
    const requiresDog = !!(
      itemDef.effects.energy ||
      itemDef.effects.happiness ||
      itemDef.effects.health ||
      itemDef.effects.bond_xp ||
      itemDef.effects.training_boost
    );

    if (requiresDog && !selectedDog) {
      setMessage({ text: 'Please select a dog first!', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const result = useItem(itemId, selectedDog || undefined);

    setMessage({
      text: result.message,
      type: result.success ? 'success' : 'error'
    });

    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-earth-900 mb-4">🎒 Inventory</h3>

      {/* Message Display */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-300'
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Dog Selector */}
      {dogs.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-semibold text-earth-700 mb-2">
            Select Dog to Use Items On:
          </label>
          <select
            value={selectedDog || ''}
            onChange={(e) => setSelectedDog(e.target.value || null)}
            className="w-full p-2 border border-earth-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-kennel-500"
          >
            <option value="">-- Select a dog --</option>
            {dogs.map((dog: any) => (
              <option key={dog.id} value={dog.id}>
                {dog.name} ({dog.age_weeks < 52 ? 'Puppy' : 'Adult'})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Inventory Items */}
      {inventory.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-earth-500 text-lg mb-2">Your inventory is empty!</p>
          <p className="text-earth-400 text-sm">
            Complete Story Mode chapters and win competitions to earn items.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {inventory.map((invItem: InventoryItem) => {
            const itemDef = getItem(invItem.itemId);
            if (!itemDef) return null;

            return (
              <div
                key={invItem.itemId}
                className={`${getRarityBgColor(itemDef.rarity)} border-2 border-gray-300 rounded-lg p-4 shadow-md hover:shadow-lg transition-all`}
              >
                {/* Item Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{itemDef.icon}</span>
                    <div>
                      <h4 className={`font-bold ${getRarityColor(itemDef.rarity)}`}>
                        {itemDef.name}
                      </h4>
                      <p className="text-xs text-gray-600 capitalize">
                        {itemDef.rarity} • {itemDef.category}
                      </p>
                    </div>
                  </div>
                  <span className="bg-white/80 px-2 py-1 rounded-full text-sm font-bold text-gray-700">
                    ×{invItem.quantity}
                  </span>
                </div>

                {/* Item Description */}
                <p className="text-sm text-gray-700 mb-3">
                  {itemDef.description}
                </p>

                {/* Item Effects */}
                <div className="mb-3 space-y-1">
                  {itemDef.effects.energy && (
                    <p className="text-xs text-gray-600">⚡ Energy: +{itemDef.effects.energy}</p>
                  )}
                  {itemDef.effects.happiness && (
                    <p className="text-xs text-gray-600">😊 Happiness: +{itemDef.effects.happiness}</p>
                  )}
                  {itemDef.effects.health && (
                    <p className="text-xs text-gray-600">❤️ Health: +{itemDef.effects.health}</p>
                  )}
                  {itemDef.effects.hunger && (
                    <p className="text-xs text-gray-600">🍖 Hunger: {itemDef.effects.hunger > 0 ? '+' : ''}{itemDef.effects.hunger}</p>
                  )}
                  {itemDef.effects.bond_xp && (
                    <p className="text-xs text-gray-600">💝 Bond XP: +{itemDef.effects.bond_xp}</p>
                  )}
                  {itemDef.effects.training_boost && (
                    <p className="text-xs text-gray-600">
                      📚 Training Boost: {Math.round((itemDef.effects.training_boost - 1) * 100)}%
                      {itemDef.effects.duration && ` for ${itemDef.effects.duration}min`}
                    </p>
                  )}
                </div>

                {/* Active Boost Indicator */}
                {invItem.activeBoost && new Date(invItem.activeBoost.expiresAt) > new Date() && (
                  <div className="mb-3 bg-blue-100 border border-blue-300 rounded p-2">
                    <p className="text-xs text-blue-800 font-semibold">
                      🌟 Active Boost: {Math.round((invItem.activeBoost.multiplier - 1) * 100)}%
                    </p>
                    <p className="text-xs text-blue-600">
                      Expires: {new Date(invItem.activeBoost.expiresAt).toLocaleTimeString()}
                    </p>
                  </div>
                )}

                {/* Use Button */}
                <button
                  onClick={() => handleUseItem(invItem.itemId)}
                  disabled={invItem.quantity < 1}
                  className="w-full py-2 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all font-semibold text-sm"
                >
                  Use Item
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
