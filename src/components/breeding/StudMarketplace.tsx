import { useState, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { supabase } from '../../lib/supabase';
import { rescueBreeds } from '../../data/rescueBreeds';
import { Dog } from '../../types';

interface StudListing {
  id: string;
  dog_id: string;
  user_id: string;
  stud_fee: number;
  description: string;
  created_at: string;
  // Joined dog data
  dog: Dog & { owner_username?: string };
}

export default function StudMarketplace() {
  const { dogs, user } = useGameStore();
  const [listings, setListings] = useState<StudListing[]>([]);
  const [myListings, setMyListings] = useState<StudListing[]>([]);
  const [selectedDog, setSelectedDog] = useState<string>('');
  const [studFee, setStudFee] = useState(100);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadListings();
    loadMyListings();
  }, [user]);

  const loadListings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('stud_listings')
      .select(`
        *,
        dog:dogs!stud_listings_dog_id_fkey(
          *,
          owner:profiles!dogs_user_id_fkey(username)
        )
      `)
      .neq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      const formattedListings = data.map((listing: any) => ({
        ...listing,
        dog: {
          ...listing.dog,
          owner_username: listing.dog.owner?.username,
        },
      }));
      setListings(formattedListings);
    }
  };

  const loadMyListings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('stud_listings')
      .select(`
        *,
        dog:dogs!stud_listings_dog_id_fkey(*)
      `)
      .eq('user_id', user.id);

    if (!error && data) {
      setMyListings(data as StudListing[]);
    }
  };

  const listDogForStud = async () => {
    if (!user || !selectedDog) return;

    setLoading(true);

    const { error } = await supabase
      .from('stud_listings')
      .insert({
        dog_id: selectedDog,
        user_id: user.id,
        stud_fee: studFee,
        description: description || 'Quality stud available',
      });

    if (!error) {
      alert('Dog listed successfully!');
      setSelectedDog('');
      setDescription('');
      setStudFee(100);
      loadMyListings();
    } else {
      alert('Error listing dog: ' + error.message);
    }

    setLoading(false);
  };

  const removeListing = async (listingId: string) => {
    const { error } = await supabase
      .from('stud_listings')
      .delete()
      .eq('id', listingId);

    if (!error) {
      loadMyListings();
    }
  };

  const breedWithStud = async (listing: StudListing) => {
    // This would integrate with the breeding system
    alert(`Breeding with ${listing.dog.name} for $${listing.stud_fee} - Feature coming soon!`);
  };

  const availableMales = dogs.filter((d: any) =>
    d.gender === 'male' &&
    d.age_weeks >= 52 &&
    !myListings.some(l => l.dog_id === d.id)
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-earth-900 mb-2">Stud Marketplace</h2>
        <p className="text-earth-600">
          List your male dogs for breeding or find quality studs from other players
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List Your Dog */}
        <div className="lg:col-span-1">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6 sticky top-4">
            <h3 className="text-xl font-bold text-earth-900 mb-4">List Your Stud</h3>

            {availableMales.length === 0 ? (
              <div className="text-center py-8 text-earth-400">
                <p className="text-sm">No eligible males to list</p>
                <p className="text-xs mt-2">Dogs must be male and at least 1 year old</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-earth-700 mb-2">
                    Select Dog
                  </label>
                  <select
                    value={selectedDog}
                    onChange={(e) => setSelectedDog(e.target.value)}
                    className="w-full p-3 border-2 border-earth-300 rounded-lg focus:border-kennel-500 focus:outline-none"
                  >
                    <option value="">Choose a dog...</option>
                    {availableMales.map((dog: any) => (
                      <option key={dog.id} value={dog.id}>
                        {dog.name} (Age: {Math.floor(dog.age_weeks / 52)}y)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-earth-700 mb-2">
                    Stud Fee ($)
                  </label>
                  <input
                    type="number"
                    value={studFee}
                    onChange={(e) => setStudFee(Number(e.target.value))}
                    min="0"
                    step="50"
                    className="w-full p-3 border-2 border-earth-300 rounded-lg focus:border-kennel-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-earth-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Describe your dog's strengths..."
                    className="w-full p-3 border-2 border-earth-300 rounded-lg focus:border-kennel-500 focus:outline-none resize-none"
                  />
                </div>

                <button
                  onClick={listDogForStud}
                  disabled={!selectedDog || loading}
                  className="w-full py-3 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold"
                >
                  {loading ? 'Listing...' : 'List for Stud'}
                </button>
              </div>
            )}

            {/* My Listings */}
            {myListings.length > 0 && (
              <div className="mt-6 pt-6 border-t border-earth-200">
                <h4 className="font-semibold text-earth-800 mb-3">My Listings</h4>
                <div className="space-y-2">
                  {myListings.map((listing) => (
                      <div key={listing.id} className="bg-earth-50 p-3 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-earth-900">{listing.dog.name}</p>
                            <p className="text-sm text-earth-600">${listing.stud_fee}</p>
                          </div>
                          <button
                            onClick={() => removeListing(listing.id)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Available Studs */}
        <div className="lg:col-span-2">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-earth-900 mb-4">
              Available Studs ({listings.length})
            </h3>

            {listings.length === 0 ? (
              <div className="text-center py-12 text-earth-400">
                <p>No studs currently listed</p>
                <p className="text-sm mt-2">Check back later for new listings!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {listings.map((listing) => {
                  const breedData = rescueBreeds.find(b => b.id === listing.dog.breed_id);
                  const age = Math.floor(listing.dog.age_weeks / 52);

                  return (
                    <div
                      key={listing.id}
                      className="border-2 border-earth-300 rounded-lg p-4 hover:border-kennel-500 transition-all"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <img
                          src={breedData?.img_sitting || ''}
                          alt={listing.dog.name}
                          className="w-16 h-16 object-contain"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-earth-900 truncate">
                            {listing.dog.name}
                          </p>
                          <p className="text-sm text-earth-600">
                            {breedData?.name} • {age}y old
                          </p>
                          <p className="text-xs text-earth-500">
                            Owner: {listing.dog.owner_username || 'Unknown'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-kennel-700">
                            ${listing.stud_fee}
                          </p>
                          <p className="text-xs text-earth-500">Stud Fee</p>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <span className="text-earth-500">Speed:</span>{' '}
                          <span className="font-semibold">{listing.dog.speed}</span>
                        </div>
                        <div>
                          <span className="text-earth-500">Agility:</span>{' '}
                          <span className="font-semibold">{listing.dog.agility}</span>
                        </div>
                        <div>
                          <span className="text-earth-500">Strength:</span>{' '}
                          <span className="font-semibold">{listing.dog.strength}</span>
                        </div>
                        <div>
                          <span className="text-earth-500">Endurance:</span>{' '}
                          <span className="font-semibold">{listing.dog.endurance}</span>
                        </div>
                      </div>

                      {listing.description && (
                        <p className="text-sm text-earth-600 mb-3 italic">
                          "{listing.description}"
                        </p>
                      )}

                      <button
                        onClick={() => breedWithStud(listing)}
                        className="w-full py-2 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 transition-all font-semibold"
                      >
                        Breed for ${listing.stud_fee}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
