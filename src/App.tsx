import { useState, useEffect } from 'react';
import PoundScene from './components/kennel/PoundScene';
import KennelView from './components/kennel/KennelView';
import DogDetailView from './components/kennel/DogDetailView';
import Sidebar from './components/layout/Sidebar';
import { Breed } from './types';
import { useGameStore } from './stores/gameStore';
import { generateDog } from './utils/dogGenerator';
import SceneBackground from './components/layout/SceneBackground';
import TrainingView from './components/training/TrainingView';
import { regenerateTP, shouldRegenerateTP } from './utils/tpRegeneration';
import CompetitionView from './components/competitions/CompetitionView';
import JobsBoard from './components/jobs/JobsBoard';
import BreedingPanel from './components/breeding/BreedingPanel';
import PuppyNursery from './components/breeding/PuppyNursery';
import ShopView from './components/shop/ShopView';
import { shouldAgeDog, ageDog } from './utils/puppyAging';
import OfficeDashboard from './components/office/OfficeDashboard';
import AuthView from './components/auth/AuthView';
import { useAuth } from './hooks/useAuth';
import IntroStory from './components/intro/IntroStory';
import SettingsDropdown from './components/layout/SettingsDropdown';
import DailyRewardModal from './components/rewards/DailyRewardModal';
import { canClaimDailyReward } from './utils/dailyRewards';

type View =
  | 'kennel'
  | 'dogDetail'
  | 'office'
  | 'training'
  | 'competition'
  | 'breeding'
  | 'jobs'
  | 'shop';

function App() {
  const [currentView, setCurrentView] = useState<View>('office');
  const [shopTab, setShopTab] = useState<'breeds' | 'items' | 'pound'>('breeds');
  const [showIntroStory, setShowIntroStory] = useState(true);
  const [showDailyReward, setShowDailyReward] = useState(false);
  const { user: authUser, loading: authLoading, signOut } = useAuth();
  const { user, dogs, addDog, updateDog, hasAdoptedFirstDog, setHasAdoptedFirstDog, loadFromSupabase, loading: gameLoading, error: gameError } = useGameStore();

  // Load user data from Supabase when authenticated
  useEffect(() => {
    if (authUser) {
      loadFromSupabase(authUser.id);
    }
  }, [authUser, loadFromSupabase]);

  // Check for daily reward after game loads
  useEffect(() => {
    if (user && !gameLoading && hasAdoptedFirstDog && canClaimDailyReward(user)) {
      setShowDailyReward(true);
    }
  }, [user, gameLoading, hasAdoptedFirstDog]);

  const handleDogAdopted = (breed: Breed, name: string, gender: 'male' | 'female') => {
    const newDog = generateDog(breed, name, user?.id || 'temp-user-id', true, gender);
    addDog(newDog);
    setHasAdoptedFirstDog(true);
  };

  useEffect(() => {
    // Check all dogs for TP regeneration and aging on mount
    dogs.forEach(dog => {
      const updates: any = {};

      // Check TP regeneration
      if (shouldRegenerateTP(dog)) {
        const tpUpdates = regenerateTP(dog);
        Object.assign(updates, tpUpdates);
      }

      // Check puppy aging
      if (shouldAgeDog(dog)) {
        const ageUpdates = ageDog(dog);
        Object.assign(updates, ageUpdates);
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        updateDog(dog.id, updates);
      }
    });
  }, []);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-kennel-100 to-earth-100">
        <div className="text-2xl font-bold text-kennel-700">Loading...</div>
      </div>
    );
  }

  // Show auth screen if not logged in
  if (!authUser) {
    return <AuthView onAuthSuccess={() => {}} />;
  }

  // Show loading while game data is being fetched from Supabase
  if (gameLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-kennel-100 to-earth-100">
        <div className="text-center">
          <div className="text-2xl font-bold text-kennel-700 mb-4">Loading your kennel...</div>
          <div className="animate-pulse text-6xl">🐕</div>
        </div>
      </div>
    );
  }

  // Show error if game data failed to load
  if (gameError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-kennel-100 to-earth-100">
        <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-xl">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Game</h2>
          <p className="text-earth-600 mb-4">{gameError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!hasAdoptedFirstDog) {
    if (showIntroStory) {
      return <IntroStory onComplete={() => setShowIntroStory(false)} />;
    }
    return <PoundScene onDogSelected={handleDogAdopted} />;
  }

  const handleViewChange = (view: string, options?: { shopTab?: 'breeds' | 'items' | 'pound' }) => {
    setCurrentView(view as View);
    if (view === 'shop' && options?.shopTab) {
      setShopTab(options.shopTab);
    }
  };

  return (
    <div className="md:flex h-screen bg-earth-50">
      <Sidebar currentView={currentView} onViewChange={handleViewChange} />

      <div className="flex-1 flex flex-col h-screen">
        <header className="bg-kennel-700 text-white p-3 md:p-4 shadow-lg">
          <div className="flex justify-between items-center">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-2xl font-bold truncate">{user?.kennel_name || 'My Kennel'}</h1>
              <p className="text-xs text-kennel-200 truncate">
                Owner: {user?.username || 'Player'}
              </p>
            </div>
            <div className="flex gap-2 md:gap-6 items-center">
              <div className="text-right">
                <p className="text-xs text-kennel-200 hidden md:block">Cash</p>
                <p className="text-sm md:text-lg font-bold">${user?.cash}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-kennel-200 hidden md:block">Gems</p>
                <p className="text-sm md:text-lg font-bold">💎 {user?.gems}</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs text-kennel-200 hidden md:block">Level</p>
                <p className="text-sm md:text-lg font-bold">{user?.level}</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs text-kennel-200 hidden md:block">Streak</p>
                <p className="text-sm md:text-lg font-bold">🔥 {user?.login_streak || 0}</p>
              </div>
              <div className="ml-2 md:ml-4">
                <SettingsDropdown onSignOut={signOut} />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <SceneBackground scene={currentView}>
            <div className="p-3 md:p-6">
              {currentView === 'kennel' && <KennelView onViewDog={() => setCurrentView('dogDetail')} />}

              {currentView === 'dogDetail' && <DogDetailView onBack={() => setCurrentView('kennel')} />}

              {currentView === 'office' && (
                <OfficeDashboard onNavigate={setCurrentView} />
              )}
              
              {currentView === 'training' && <TrainingView />}
              
              {currentView === 'competition' && <CompetitionView />}

              {currentView === 'breeding' && (
                <div className="grid grid-cols-1 gap-6">
                  <BreedingPanel />
                  <PuppyNursery />
                </div>
              )}

              {currentView === 'jobs' && <JobsBoard />}

              {currentView === 'shop' && <ShopView initialTab={shopTab} />}
            </div>
          </SceneBackground>
        </main>

      </div>

      {/* Daily Reward Modal */}
      {showDailyReward && user && (
        <DailyRewardModal onClose={() => setShowDailyReward(false)} />
      )}
    </div>
  );
}

export default App;
