import { useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { rescueBreeds } from '../../data/rescueBreeds';
import {
  isPregnancyComplete,
  getWeeksRemaining,
  generateLitter,
} from '../../utils/breedingCalculations';
import { BREEDING_CONSTANTS, calculatePuppyPrice, calculateSkipCost } from '../../data/breedingConstants';

export default function PuppyNursery() {
  const { dogs, user, giveBirth, sellPuppy, skipPregnancy, removeDog } = useGameStore();

  // Check for completed pregnancies on component mount and updates
  useEffect(() => {
    const pregnantDogs = dogs.filter(d => d.is_pregnant && d.pregnancy_due);

    pregnantDogs.forEach(dam => {
      if (dam.pregnancy_due && isPregnancyComplete(dam.pregnancy_due)) {
        // Find sire
        const sire = dogs.find(d => d.id !== dam.id && d.last_bred === dam.last_bred);
        if (!sire) return;

        // Get breeds
        const sireBreed = rescueBreeds.find(b => b.id === sire.breed_id);
        const damBreed = rescueBreeds.find(b => b.id === dam.breed_id);
        if (!sireBreed || !damBreed) return;

        // Generate litter
        const puppies = generateLitter(sire, dam, sireBreed, damBreed, user?.id || 'temp-user-id');

        // Add puppies to kennel
        giveBirth(dam.id, puppies);

        // Notify player
        alert(`🎉 ${dam.name} gave birth to ${puppies.length} puppies!`);
      }
    });
  }, [dogs]);

  // Get pregnant dogs
  const pregnantDogs = dogs.filter(d => d.is_pregnant && d.pregnancy_due);

  // Get puppies (dogs under 52 weeks, not pregnant, and not rescue)
  const puppies = dogs.filter(d => d.age_weeks < BREEDING_CONSTANTS.ADULT_AGE && !d.is_pregnant && !d.is_rescue);

  const handleSellPuppy = (puppy: typeof dogs[0]) => {
    const price = calculatePuppyPrice(puppy);
    if (confirm(`Sell ${puppy.name} for $${price}?`)) {
      sellPuppy(puppy.id, price);
    }
  };

  const handleRehome = (puppy: typeof dogs[0]) => {
    if (confirm(`Rehome ${puppy.name} for free? You'll gain XP but no cash.`)) {
      removeDog(puppy.id);
      // TODO: Add XP gain in future
    }
  };

  const handleSkipPregnancy = (dam: typeof dogs[0]) => {
    if (!dam.pregnancy_due) return;

    const weeksRemaining = getWeeksRemaining(dam.pregnancy_due);
    const cost = calculateSkipCost(weeksRemaining);

    if (!user || user.gems < cost) {
      alert(`Not enough gems! Need ${cost} gems (have ${user?.gems || 0})`);
      return;
    }

    if (confirm(`Skip ${weeksRemaining} weeks for ${cost} gems?`)) {
      skipPregnancy(dam.id, cost);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-earth-900 mb-2">Puppy Nursery</h2>
        <p className="text-earth-600">Manage your pregnant dogs and puppies</p>
      </div>

      {/* Pregnant Dogs */}
      {pregnantDogs.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-bold text-earth-900 mb-4">Expecting Mothers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pregnantDogs.map((dam) => {
              const weeksRemaining = dam.pregnancy_due ? getWeeksRemaining(dam.pregnancy_due) : 0;
              const skipCost = calculateSkipCost(weeksRemaining);

              return (
                <div key={dam.id} className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-earth-900">{dam.name}</h4>
                      <p className="text-sm text-earth-600">
                        Expecting {dam.litter_size} {dam.litter_size === 1 ? 'puppy' : 'puppies'}
                      </p>
                    </div>
                    <span className="text-3xl">🤰</span>
                  </div>

                  <div className="bg-kennel-50 p-4 rounded-lg mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-kennel-700">Due in:</span>
                      <span className="text-lg font-bold text-kennel-900">
                        {weeksRemaining} {weeksRemaining === 1 ? 'week' : 'weeks'}
                      </span>
                    </div>
                    <div className="w-full bg-kennel-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-kennel-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${((BREEDING_CONSTANTS.PREGNANCY_DURATION - weeksRemaining) / BREEDING_CONSTANTS.PREGNANCY_DURATION) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => handleSkipPregnancy(dam)}
                    disabled={!user || user.gems < skipCost}
                    className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                  >
                    Skip for 💎 {skipCost} Gems
                  </button>

                  <p className="text-xs text-earth-500 mt-2 text-center">
                    Keep {dam.name} healthy and happy during pregnancy
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Puppies */}
      {puppies.length > 0 ? (
        <div>
          <h3 className="text-xl font-bold text-earth-900 mb-4">
            Your Puppies ({puppies.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {puppies.map((puppy) => {
              const price = calculatePuppyPrice(puppy);
              const canTrain = puppy.age_weeks >= BREEDING_CONSTANTS.MIN_TRAINING_AGE;
              const canCompete = puppy.age_weeks >= BREEDING_CONSTANTS.MIN_COMPETITION_AGE;
              const canBreed = puppy.age_weeks >= BREEDING_CONSTANTS.MIN_BREEDING_AGE;

              return (
                <div key={puppy.id} className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-lg font-bold text-earth-900">{puppy.name}</h4>
                      <p className="text-sm text-earth-600">
                        {puppy.gender === 'male' ? '♂️' : '♀️'} {puppy.age_weeks} weeks old
                      </p>
                    </div>
                    <span className="text-2xl">🐕</span>
                  </div>

                  {/* Stats */}
                  <div className="bg-earth-50 p-3 rounded-lg mb-3 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-earth-600">Speed:</span>
                      <span className="font-mono text-earth-900">{puppy.speed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-earth-600">Agility:</span>
                      <span className="font-mono text-earth-900">{puppy.agility}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-earth-600">Strength:</span>
                      <span className="font-mono text-earth-900">{puppy.strength}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-earth-600">Endurance:</span>
                      <span className="font-mono text-earth-900">{puppy.endurance}</span>
                    </div>
                  </div>

                  {/* Milestones */}
                  <div className="mb-3 space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={canTrain ? 'text-green-600' : 'text-earth-400'}>
                        {canTrain ? '✅' : '⏳'}
                      </span>
                      <span className={canTrain ? 'text-earth-900' : 'text-earth-400'}>
                        Training ({BREEDING_CONSTANTS.MIN_TRAINING_AGE}+ weeks)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={canCompete ? 'text-green-600' : 'text-earth-400'}>
                        {canCompete ? '✅' : '⏳'}
                      </span>
                      <span className={canCompete ? 'text-earth-900' : 'text-earth-400'}>
                        Competitions ({BREEDING_CONSTANTS.MIN_COMPETITION_AGE}+ weeks)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={canBreed ? 'text-green-600' : 'text-earth-400'}>
                        {canBreed ? '✅' : '⏳'}
                      </span>
                      <span className={canBreed ? 'text-earth-900' : 'text-earth-400'}>
                        Breeding ({BREEDING_CONSTANTS.MIN_BREEDING_AGE}+ weeks)
                      </span>
                    </div>
                  </div>

                  {/* Appearance */}
                  <div className="text-xs text-earth-600 mb-3">
                    <p className="capitalize">{puppy.coat_color} {puppy.coat_pattern}</p>
                    <p className="capitalize">{puppy.coat_type} coat</p>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <button
                      onClick={() => handleSellPuppy(puppy)}
                      className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-semibold"
                    >
                      Sell for ${price}
                    </button>
                    <button
                      onClick={() => handleRehome(puppy)}
                      className="w-full py-1 bg-earth-200 text-earth-700 rounded-lg hover:bg-earth-300 transition-all text-xs"
                    >
                      Rehome (Free)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : pregnantDogs.length === 0 ? (
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-12 text-center">
          <span className="text-6xl mb-4 block">🐾</span>
          <h3 className="text-xl font-bold text-earth-900 mb-2">No Puppies Yet</h3>
          <p className="text-earth-600">
            Head to the Breeding Center to breed your dogs and raise puppies!
          </p>
        </div>
      ) : null}
    </div>
  );
}
