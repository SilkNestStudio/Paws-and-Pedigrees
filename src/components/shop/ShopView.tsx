import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { shopBreeds } from '../../data/shopBreeds';
import { shopItems } from '../../data/shopItems';
import { generateDog } from '../../utils/dogGenerator';
import { Breed, ShopItem } from '../../types';
import PoundView from '../pound/PoundView';
import HelpButton from '../tutorial/HelpButton';
import { showToast } from '../../lib/toast';
import { useConfirm } from '../../hooks/useConfirm';
import ConfirmModal from '../common/ConfirmModal';

interface ShopViewProps {
  initialTab?: 'breeds' | 'items' | 'pound';
}

export default function ShopView({ initialTab = 'breeds' }: ShopViewProps) {
  const { user, selectedDog, purchaseBreed, purchaseItem } = useGameStore();
  const [activeTab, setActiveTab] = useState<'breeds' | 'items' | 'pound'>(initialTab);
  const { confirm, confirmState, handleCancel } = useConfirm();

  const handlePurchaseBreed = async (breed: Breed) => {
    if (!user) return;

    const cashCost = breed.purchase_price || 0;
    const gemCost = breed.gem_price || 0;

    // Check if user has enough currency
    if (cashCost > 0 && user.cash < cashCost) {
      showToast.error(`Not enough cash! Need $${cashCost} (have $${user.cash})`);
      return;
    }
    if (gemCost > 0 && user.gems < gemCost) {
      showToast.error(`Not enough gems! Need ${gemCost} gems (have ${user.gems})`);
      return;
    }

    // Confirmation for purchase
    let costText = '';
    if (cashCost > 0 && gemCost > 0) {
      costText = `$${cashCost} and 💎${gemCost} gems`;
    } else if (cashCost > 0) {
      costText = `$${cashCost}`;
    } else if (gemCost > 0) {
      costText = `💎${gemCost} gems`;
    }

    const confirmed = await confirm({
      title: 'Purchase Breed',
      message: `Purchase ${breed.name} for ${costText}?`,
      confirmText: 'Purchase',
      variant: 'info'
    });

    if (!confirmed) {
      return;
    }

    // Ask for gender
    const genderChoice = prompt(
      `Choose gender for your ${breed.name}:\nType "male" or "female"`,
      'male'
    )?.toLowerCase();

    if (!genderChoice || (genderChoice !== 'male' && genderChoice !== 'female')) {
      showToast.warning('Invalid gender choice. Please type "male" or "female".');
      return;
    }

    const dogName = prompt(`Name your new ${genderChoice} ${breed.name}:`, `${breed.name}`);
    if (!dogName) return;

    // Generate the dog with chosen gender
    const newDog = generateDog(breed, dogName, user.id, false, genderChoice as 'male' | 'female');

    // Purchase the dog
    const result = purchaseBreed(newDog, cashCost, gemCost);

    if (result.success) {
      showToast.success(`🎉 Purchased ${dogName} (${genderChoice === 'male' ? '♂️ Male' : '♀️ Female'})!`);
    } else {
      showToast.error(result.message || 'Purchase failed!');
    }
  };

  const handlePurchaseItem = async (item: ShopItem) => {
    if (!user || !selectedDog) {
      showToast.warning('Select a dog first!');
      return;
    }

    const cashCost = item.price || 0;
    const gemCost = item.gem_price || 0;

    // Check if user has enough currency
    if (cashCost > 0 && user.cash < cashCost) {
      showToast.error(`Not enough cash! Need $${cashCost} (have $${user.cash})`);
      return;
    }
    if (gemCost > 0 && user.gems < gemCost) {
      showToast.error(`Not enough gems! Need ${gemCost} gems (have ${user.gems})`);
      return;
    }

    // Confirmation for purchase
    let costText = '';
    if (cashCost > 0 && gemCost > 0) {
      costText = `$${cashCost} and 💎${gemCost} gems`;
    } else if (cashCost > 0) {
      costText = `$${cashCost}`;
    } else if (gemCost > 0) {
      costText = `💎${gemCost} gems`;
    }

    const confirmed = await confirm({
      title: 'Use Item',
      message: `Use ${item.name} on ${selectedDog.name} for ${costText}?`,
      confirmText: 'Use Item',
      variant: 'info'
    });

    if (!confirmed) {
      return;
    }

    // Purchase the item
    purchaseItem(selectedDog.id, item.effect, cashCost, gemCost);

    showToast.success(`✅ Used ${item.name} on ${selectedDog.name}!`);
  };

  // Filter breeds by unlock level
  const availableBreeds = shopBreeds.filter(b => (user?.level || 1) >= b.unlock_level);
  const lockedBreeds = shopBreeds.filter(b => (user?.level || 1) < b.unlock_level);

  // Filter items by unlock level
  const availableItems = shopItems.filter(i => (user?.level || 1) >= i.unlock_level);
  const lockedItems = shopItems.filter(i => (user?.level || 1) < i.unlock_level);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-earth-900 mb-2">Shop</h2>
        <p className="text-earth-600">Purchase breeds and items to improve your kennel</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('breeds')}
          className={`px-6 py-3 rounded-lg font-bold transition-all ${
            activeTab === 'breeds'
              ? 'bg-kennel-600 text-white shadow-lg'
              : 'bg-white/90 text-earth-700 hover:bg-earth-100'
          }`}
        >
          🐕 Breeds
        </button>
        <button
          onClick={() => setActiveTab('items')}
          className={`px-6 py-3 rounded-lg font-bold transition-all ${
            activeTab === 'items'
              ? 'bg-kennel-600 text-white shadow-lg'
              : 'bg-white/90 text-earth-700 hover:bg-earth-100'
          }`}
        >
          🛍️ Items
        </button>
        <button
          onClick={() => setActiveTab('pound')}
          className={`px-6 py-3 rounded-lg font-bold transition-all ${
            activeTab === 'pound'
              ? 'bg-kennel-600 text-white shadow-lg'
              : 'bg-white/90 text-earth-700 hover:bg-earth-100'
          }`}
        >
          🏠 Pound
        </button>
      </div>

      {/* Breeds Tab */}
      {activeTab === 'breeds' && (
        <div>
          {/* Available Breeds */}
          {availableBreeds.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-xl font-bold text-white drop-shadow-lg">Available Breeds</h3>
                <HelpButton helpId="shop-breeds" tooltip="Learn about buying breeds" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableBreeds.map((breed) => (
                  <div
                    key={breed.id}
                    className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-5 hover:shadow-xl transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-lg font-bold text-earth-900">{breed.name}</h4>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            breed.tier === 'common'
                              ? 'bg-gray-200 text-gray-700'
                              : breed.tier === 'uncommon'
                              ? 'bg-green-200 text-green-700'
                              : breed.tier === 'rare'
                              ? 'bg-blue-200 text-blue-700'
                              : breed.tier === 'exotic'
                              ? 'bg-purple-200 text-purple-700'
                              : 'bg-yellow-200 text-yellow-700'
                          }`}
                        >
                          {breed.tier.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-earth-600 mb-3">{breed.description}</p>

                    {/* Stats Preview */}
                    <div className="bg-earth-50 p-3 rounded-lg mb-3 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-earth-600">Speed:</span>
                        <span className="font-mono text-earth-900">
                          {breed.speed_min}-{breed.speed_max}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-earth-600">Agility:</span>
                        <span className="font-mono text-earth-900">
                          {breed.agility_min}-{breed.agility_max}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-earth-600">Intelligence:</span>
                        <span className="font-mono text-earth-900">
                          {breed.intelligence_min}-{breed.intelligence_max}
                        </span>
                      </div>
                    </div>

                    {/* Price & Purchase */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        {breed.purchase_price && breed.purchase_price > 0 && (
                          <span className="text-green-600 font-bold">${breed.purchase_price}</span>
                        )}
                        {breed.gem_price && breed.gem_price > 0 && (
                          <span className="text-purple-600 font-bold">💎 {breed.gem_price}</span>
                        )}
                      </div>

                      <button
                        onClick={() => handlePurchaseBreed(breed)}
                        disabled={
                          !user ||
                          (!!breed.purchase_price && user.cash < breed.purchase_price) ||
                          (!!breed.gem_price && user.gems < breed.gem_price)
                        }
                        className="w-full py-2 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
                      >
                        Purchase
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Locked Breeds */}
          {lockedBreeds.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-white drop-shadow-lg mb-4">Locked Breeds</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lockedBreeds.map((breed) => (
                  <div
                    key={breed.id}
                    className="bg-white/60 backdrop-blur-sm rounded-lg shadow-lg p-5 opacity-70"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-lg font-bold text-earth-900">{breed.name}</h4>
                        <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-red-200 text-red-700">
                          LOCKED
                        </span>
                      </div>
                      <span className="text-2xl">🔒</span>
                    </div>

                    <p className="text-sm text-earth-600 mb-3">{breed.description}</p>

                    <div className="text-center py-2 bg-earth-100 rounded text-sm text-earth-600">
                      Unlocks at Level {breed.unlock_level}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Items Tab */}
      {activeTab === 'items' && (
        <div>
          {!selectedDog && (
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 font-semibold">
                ⚠️ Select a dog from your kennel to use items
              </p>
            </div>
          )}

          {/* Available Items */}
          {availableItems.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-xl font-bold text-white drop-shadow-lg">Available Items</h3>
                <HelpButton helpId="shop-items" tooltip="Learn about shop items" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {availableItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 hover:shadow-xl transition-all"
                  >
                    <div className="text-center mb-3">
                      <span className="text-4xl mb-2 block">{item.icon}</span>
                      <h4 className="text-md font-bold text-earth-900">{item.name}</h4>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold mt-1 ${
                          item.category === 'food'
                            ? 'bg-orange-200 text-orange-700'
                            : item.category === 'toy'
                            ? 'bg-pink-200 text-pink-700'
                            : item.category === 'health'
                            ? 'bg-red-200 text-red-700'
                            : item.category === 'energy'
                            ? 'bg-yellow-200 text-yellow-700'
                            : 'bg-blue-200 text-blue-700'
                        }`}
                      >
                        {item.category.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-earth-600 mb-3 text-center">{item.description}</p>

                    {/* Effects */}
                    <div className="bg-earth-50 p-2 rounded-lg mb-3 text-xs space-y-1">
                      {item.effect.hunger && (
                        <div className="flex justify-between">
                          <span className="text-earth-600">Hunger:</span>
                          <span className="text-green-600 font-bold">+{item.effect.hunger}</span>
                        </div>
                      )}
                      {item.effect.happiness && (
                        <div className="flex justify-between">
                          <span className="text-earth-600">Happiness:</span>
                          <span className="text-green-600 font-bold">+{item.effect.happiness}</span>
                        </div>
                      )}
                      {item.effect.health && (
                        <div className="flex justify-between">
                          <span className="text-earth-600">Health:</span>
                          <span className="text-green-600 font-bold">+{item.effect.health}</span>
                        </div>
                      )}
                      {item.effect.energy_stat && (
                        <div className="flex justify-between">
                          <span className="text-earth-600">Energy:</span>
                          <span className="text-green-600 font-bold">+{item.effect.energy_stat}</span>
                        </div>
                      )}
                      {item.effect.training_points && (
                        <div className="flex justify-between">
                          <span className="text-earth-600">TP:</span>
                          <span className="text-green-600 font-bold">+{item.effect.training_points}</span>
                        </div>
                      )}
                    </div>

                    {/* Price & Purchase */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 text-sm">
                        {item.price > 0 && <span className="text-green-600 font-bold">${item.price}</span>}
                        {item.gem_price && item.gem_price > 0 && (
                          <span className="text-purple-600 font-bold">💎 {item.gem_price}</span>
                        )}
                      </div>

                      <button
                        onClick={() => handlePurchaseItem(item)}
                        disabled={
                          !user ||
                          !selectedDog ||
                          (item.price > 0 && user.cash < item.price) ||
                          (!!item.gem_price && user.gems < item.gem_price)
                        }
                        className="w-full py-2 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-sm"
                      >
                        Use
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Locked Items */}
          {lockedItems.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-white drop-shadow-lg mb-4">Locked Items</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {lockedItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white/60 backdrop-blur-sm rounded-lg shadow-lg p-4 opacity-70"
                  >
                    <div className="text-center mb-3">
                      <span className="text-4xl mb-2 block opacity-50">{item.icon}</span>
                      <h4 className="text-md font-bold text-earth-900">{item.name}</h4>
                      <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-red-200 text-red-700 mt-1">
                        🔒 LOCKED
                      </span>
                    </div>

                    <div className="text-center py-2 bg-earth-100 rounded text-xs text-earth-600">
                      Unlocks at Level {item.unlock_level}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pound Tab */}
      {activeTab === 'pound' && <PoundView />}

      {/* Confirm Modal */}
      <ConfirmModal {...confirmState} onCancel={handleCancel} />
    </div>
  );
}
