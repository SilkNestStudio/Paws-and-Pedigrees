import { Dog } from '../../types';
import { rescueBreeds } from '../../data/rescueBreeds';
import { useGameStore } from '../../stores/gameStore';

interface DogMemorialModalProps {
  dog: Dog;
  onClose: () => void;
  onRevive: (dogId: string) => void;
  onStartFresh: (dogId: string) => void;
}

export default function DogMemorialModal({
  dog,
  onClose,
  onRevive,
  onStartFresh
}: DogMemorialModalProps) {
  const { user } = useGameStore();
  const breed = rescueBreeds.find(b => b.id === dog.breed_id);

  // Calculate revival cost:
  // First revival = FREE
  // Second revival = 50 gems
  // Third revival = 150 gems
  // Fourth+ revival = 300 gems
  const revivalCount = dog.revival_count || 0;
  const getRevivalCost = () => {
    if (revivalCount === 0) return 0; // First revival is FREE
    if (revivalCount === 1) return 50;
    if (revivalCount === 2) return 150;
    return 300; // Cap at 300 gems for 4+ revivals
  };

  const reviveCost = getRevivalCost();
  const canAfford = (user?.gems || 0) >= reviveCost;
  const isFree = reviveCost === 0;

  // Generate personalized memorial story based on death cause
  const getMemorialStory = () => {
    const dogName = dog.name;
    const breedName = breed?.name || 'dog';

    switch (dog.death_cause) {
      case 'old_age':
        return {
          title: 'A Life Well Lived',
          story: `${dogName} lived a full and happy life by your side. After ${dog.age_years || Math.floor(dog.age_weeks / 52)} wonderful years together, ${dog.gender === 'male' ? 'he' : 'she'} peacefully passed away in ${dog.gender === 'male' ? 'his' : 'her'} sleep. ${dogName} is now resting in the rainbow meadow, chasing endless tennis balls and enjoying unlimited treats.`,
          icon: '🌈',
          color: 'from-purple-100 to-blue-100'
        };

      case 'illness':
        return {
          title: 'Taken Too Soon',
          story: `Despite your best efforts, ${dogName}'s illness proved too severe. The brave ${breedName} fought hard, but ultimately succumbed to ${dog.gender === 'male' ? 'his' : 'her'} ailment. ${dogName} knew ${dog.gender === 'male' ? 'he' : 'she'} was loved until the very end.`,
          icon: '💔',
          color: 'from-red-100 to-pink-100'
        };

      case 'starvation':
        return {
          title: 'Neglected and Hungry',
          story: `${dogName} grew weaker and weaker from lack of food. The poor ${breedName} waited patiently for meals that never came. If only you had checked on ${dog.gender === 'male' ? 'him' : 'her'} sooner...`,
          icon: '🍽️',
          color: 'from-orange-100 to-yellow-100'
        };

      case 'dehydration':
        return {
          title: 'Parched and Weak',
          story: `Without access to fresh water, ${dogName} grew increasingly dehydrated. The ${breedName} tried to hold on, but eventually ${dog.gender === 'male' ? 'his' : 'her'} body gave out. A simple bowl of water could have prevented this tragedy.`,
          icon: '💧',
          color: 'from-blue-100 to-cyan-100'
        };

      case 'neglect':
        return {
          title: 'Forgotten and Alone',
          story: `${dogName} waited day after day for your attention, but it never came. The lonely ${breedName}'s health deteriorated from a combination of poor care, declining happiness, and broken spirit. ${dog.gender === 'male' ? 'He' : 'She'} deserved better.`,
          icon: '😢',
          color: 'from-gray-100 to-slate-100'
        };

      default:
        return {
          title: 'Gone But Not Forgotten',
          story: `${dogName} has crossed the rainbow bridge. The beloved ${breedName} will be remembered forever in your heart.`,
          icon: '🐾',
          color: 'from-kennel-100 to-earth-100'
        };
    }
  };

  const memorial = getMemorialStory();
  const deathDate = dog.death_date ? new Date(dog.death_date).toLocaleDateString() : 'Recently';

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header with gradient */}
        <div className={`bg-gradient-to-r ${memorial.color} p-6 rounded-t-2xl text-center border-b-4 border-gray-300`}>
          <div className="text-6xl mb-3">{memorial.icon}</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">In Loving Memory</h2>
          <h3 className="text-3xl font-bold text-gray-900">{dog.name}</h3>
          <p className="text-sm text-gray-600 mt-2">
            {breed?.name} • {dog.gender === 'male' ? 'Male' : 'Female'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Passed away: {deathDate}
          </p>
        </div>

        {/* Memorial Story */}
        <div className="p-6">
          <h4 className="text-xl font-bold text-gray-800 mb-3 text-center">
            {memorial.title}
          </h4>
          <div className="bg-gray-50 rounded-lg p-4 mb-6 border-l-4 border-kennel-500">
            <p className="text-gray-700 leading-relaxed italic">
              {memorial.story}
            </p>
          </div>

          {/* Dog Stats Memorial */}
          <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
            <div className="bg-earth-50 rounded-lg p-3 text-center">
              <p className="text-earth-600 font-semibold">Age</p>
              <p className="text-lg font-bold text-earth-800">
                {dog.age_years || Math.floor(dog.age_weeks / 52)} years
              </p>
            </div>
            <div className="bg-earth-50 rounded-lg p-3 text-center">
              <p className="text-earth-600 font-semibold">Bond Level</p>
              <p className="text-lg font-bold text-earth-800">
                {dog.bond_level}
              </p>
            </div>
          </div>

          {/* Revival Option */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 mb-4 border-2 border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h5 className="font-bold text-purple-900 text-lg">Rainbow Bridge Revival</h5>
                <p className="text-sm text-purple-700">
                  Bring {dog.name} back from the rainbow bridge
                </p>
                {revivalCount > 0 && (
                  <p className="text-xs text-purple-600 mt-1">
                    Revived {revivalCount} {revivalCount === 1 ? 'time' : 'times'} before
                  </p>
                )}
              </div>
              <div className="text-3xl">✨</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-purple-800">
                {isFree ? (
                  <span className="font-bold text-green-600 text-lg">FREE! First revival ✨</span>
                ) : (
                  <span><span className="font-semibold">Cost:</span> 💎 {reviveCost} Gems</span>
                )}
              </div>
              <button
                onClick={() => onRevive(dog.id)}
                disabled={!canAfford && !isFree}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  canAfford || isFree
                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isFree ? 'Revive (FREE)' : canAfford ? 'Revive' : 'Not Enough Gems'}
              </button>
            </div>
          </div>

          {/* Start Fresh Option */}
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-4 mb-4 border-2 border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h5 className="font-bold text-orange-900">Start Fresh</h5>
                <p className="text-sm text-orange-700">
                  Retire {dog.name} and continue with other dogs
                </p>
              </div>
              <div className="text-2xl">🌅</div>
            </div>
            <button
              onClick={() => onStartFresh(dog.id)}
              className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-all"
            >
              Retire Dog
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
