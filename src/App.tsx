import FieldClub from './game/club/FieldClub';
import { newClubProgress } from './game/club/model';
import { initialNavigation, navigateTo, navigateBack, VIEW_NAMES, type GameView } from './utils/navigation';
import ReturnNavigation from './components/layout/ReturnNavigation';
import { lessonViewUnlocked } from './utils/firstRibbon';
import { dailyRewardUnlocked } from './utils/dailyRewards';
import { companionConditionUpdates } from './utils/companionLoop';
import { isLocalMode } from './lib/storage/config';
import LocalSaveControls from './components/layout/LocalSaveControls';
import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { Toaster } from 'react-hot-toast';
import PoundScene from './components/kennel/PoundScene';
import KennelView from './components/kennel/KennelView';
import CompanionView from './components/kennel/CompanionView';
import { Breed } from './types';
import { useGameStore } from './stores/gameStore';
import { generateDog } from './utils/dogGenerator';
import SceneBackground from './components/layout/SceneBackground';
import TrainingView from './components/training/TrainingView';
import { regenerateTP, shouldRegenerateTP } from './utils/tpRegeneration';
import { regenerateEnergy, shouldRegenerateEnergy } from './utils/energyRegeneration';
import EventBoardView from './components/competitions/EventBoardView';
import JobsBoard from './components/jobs/JobsBoard';
import BreedingPanel from './components/breeding/BreedingPanel';
import PuppyNursery from './components/breeding/PuppyNursery';
import ShopView from './components/shop/ShopView';
import { shouldAgeDog, ageDog } from './utils/puppyAging';
import JourneyHome from './components/journey/JourneyHome';
import AuthView from './components/auth/AuthView';
import { useAuth } from './hooks/useAuth';
import IntroStory from './components/intro/IntroStory';
import KennelHeader from './components/layout/KennelHeader';
import KennelUpgradeView from './components/kennel/KennelUpgradeView';
import DailyRewardModal from './components/rewards/DailyRewardModal';
import { canClaimDailyReward } from './utils/dailyRewards';
import TutorialManager from './components/tutorial/TutorialManager';
import FirstRibbonGuide from './components/tutorial/FirstRibbonGuide';
import VetClinicView from './components/vet/VetClinicView';
import StoryModeView from './components/story/StoryModeView';
import { saveUserProfile, saveDog, saveStoryProgress, debouncedSave, flushPendingSaves } from './lib/supabaseService';
import LoadingSpinner from './components/common/LoadingSpinner';
const KennelInterior = lazy(() => import('./game/kennel/KennelInterior'));
const Demo3DView = lazy(() => import('./game/yard/KennelYard'));

function App() {
  const mainRef = useRef<HTMLElement>(null);
  const [navigation,setNavigation] = useState(initialNavigation);
  const currentView = navigation.current;
  const [yardLaunch,setYardLaunch]=useState<{id:number;action:string}|null>(null);
  const [shopTab, setShopTab] = useState<'breeds' | 'items' | 'pound'>('breeds');
  const [showIntroStory, setShowIntroStory] = useState(true);
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [dailyRewardDismissed, setDailyRewardDismissed] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { user: authUser, loading: authLoading, signOut } = useAuth();
  const { user, tutorialProgress, dogs, addDog, updateDog, hasAdoptedFirstDog, setHasAdoptedFirstDog, loadFromSupabase, loading: gameLoading, error: gameError, syncEnabled, updateGameWeather } = useGameStore();

  useEffect(() => { mainRef.current?.scrollTo({ top: 0 }); }, [currentView]);

  // Check for reset flag FIRST, before anything else
  useEffect(() => {
    const resetPending = localStorage.getItem('reset-pending');
    if (resetPending === 'true' && !isLocalMode) {
      setIsResetting(true);
      // Clear ALL localStorage
      localStorage.clear();
      // Wait a moment then reload to let everything reinitialize
      setTimeout(() => {
        window.location.href = window.location.origin;
      }, 500);
    }
  }, []);

  // Load user data from Supabase when authenticated
  useEffect(() => {
    if (authUser && !isResetting) {
      loadFromSupabase(authUser.id);
    }
  }, [authUser, loadFromSupabase, isResetting]);

  // Keep care status current during local and cloud sessions, without repeated penalties.
  useEffect(() => {
    if (!authUser || gameLoading) return;
    const refresh = () => {
      const state = useGameStore.getState();
      for (const dog of state.dogs) {
        const updates = companionConditionUpdates(dog);
        if (Object.keys(updates).length) state.updateDog(dog.id, updates);
      }
    };
    refresh();
    const timer = setInterval(refresh, 60000);
    const resume = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', resume);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', resume); };
  }, [authUser?.id, gameLoading]);

  // Check for daily reward after game loads
  useEffect(() => {
    if (user && !gameLoading && hasAdoptedFirstDog && dailyRewardUnlocked(tutorialProgress) && !dailyRewardDismissed && !showDailyReward && canClaimDailyReward(user)) {
      setShowDailyReward(true);
    }
  }, [user, gameLoading, hasAdoptedFirstDog, showDailyReward, dailyRewardDismissed, tutorialProgress]);

  // Update weather on mount and periodically
  useEffect(() => {
    if (user) {
      // Update weather on mount
      updateGameWeather();

      // Update weather every hour
      const weatherInterval = setInterval(() => {
        updateGameWeather();
      }, 60 * 60 * 1000); // Every hour

      return () => clearInterval(weatherInterval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Only depend on user, not updateGameWeather to avoid infinite loop

  const handleDogAdopted = (breed: Breed, name: string, gender: 'male' | 'female') => {
    // Use authUser.id to ensure we always have the correct user ID
    const userId = authUser?.id || user?.id || 'temp-user-id';
    const newDog = generateDog(breed, name, userId, true, gender);
    addDog(newDog);
    setHasAdoptedFirstDog(true);
    const current = useGameStore.getState();
    useGameStore.setState({ activeTutorial: null, tutorialProgress: { ...current.tutorialProgress, fieldClub: newClubProgress() } });
  };

  useEffect(() => {
    // Check all dogs for TP regeneration, energy regeneration, and aging on mount
    dogs.forEach((dog: any) => {
      const updates: any = {};

      // Check TP regeneration (every 24 hours)
      if (shouldRegenerateTP(dog)) {
        const tpUpdates = regenerateTP(dog);
        Object.assign(updates, tpUpdates);
      }

      // Check energy regeneration (passive over time) with kennel bonus
      if (shouldRegenerateEnergy(dog)) {
        const energyUpdates = regenerateEnergy(dog, user?.kennel_level || 1);
        Object.assign(updates, energyUpdates);
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

  // Read current snapshots on a stable schedule; serialize them with action saves.
  useEffect(() => {
    if (!syncEnabled || !authUser) return;
    const save = async () => {
      const state = useGameStore.getState();
      if (!state.syncEnabled || state.user?.id !== authUser.id) return;
      const profile = state.user;
      debouncedSave('profile:' + profile.id, () => saveUserProfile(profile));
      for (const dog of state.dogs) debouncedSave('dog:' + dog.id, () => saveDog(dog));
      debouncedSave('story:' + profile.id, () => saveStoryProgress(profile.id, state.storyProgress));
      if (!await flushPendingSaves()) console.warn('Cloud save incomplete; local progress is retained for retry.');
    };
    const interval = setInterval(() => { void save(); }, 30000);
    const visibility = () => { if (document.hidden) void save(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', visibility); };
  }, [syncEnabled, authUser]);

  // Show resetting screen
  if (isResetting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-kennel-100 to-earth-100">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">🔄</div>
          <div className="text-2xl font-bold text-kennel-700">Resetting game...</div>
        </div>
      </div>
    );
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-kennel-100 to-earth-100">
        <LoadingSpinner size="lg" message="Authenticating..." />
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
        <LoadingSpinner size="lg" message="Loading your kennel..." />
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
          <p className="text-sm text-earth-500 mb-6">
            This usually means there's a database connection issue. Signing out and back in will resolve this.
          </p>
          <button
            onClick={async () => {
              await signOut();
              localStorage.clear();
              window.location.reload();
            }}
            className="px-6 py-3 bg-kennel-600 text-white rounded-lg hover:bg-kennel-700 font-semibold"
          >
            Sign Out & Restart
          </button>
        </div>
      </div>
    );
  }

  // Wait for user profile to be created/loaded before showing adoption screen
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-kennel-100 to-earth-100">
        <LoadingSpinner size="lg" message="Setting up your kennel..." />
      </div>
    );
  }

  if (!hasAdoptedFirstDog) {
    if (showIntroStory) {
      return <IntroStory onComplete={() => setShowIntroStory(false)} />;
    }
    return <PoundScene onDogSelected={handleDogAdopted} />;
  }

  const handleViewChange = (view: string, options?: { shopTab?: 'breeds' | 'items' | 'pound'; yardActivity?: string }) => {
    if (!(view in VIEW_NAMES)) return;
    const target:GameView = lessonViewUnlocked(tutorialProgress,view) ? view as GameView : 'office';
    setYardLaunch(target==='demo3d'&&options?.yardActivity?{id:Date.now(),action:options.yardActivity}:null);
    setNavigation(state=>navigateTo(state,target));
    if (view === 'shop' && options?.shopTab) {
      setShopTab(options.shopTab);
    }
  };

  const handleBack = () => { setYardLaunch(null); setNavigation(navigateBack); };

  return (
    <div className="club-app">

      <div className="club-workspace">
        <KennelHeader currentView={currentView} onSignOut={signOut} onNavigate={handleViewChange}/>
        <ReturnNavigation current={currentView} previous={navigation.history[navigation.history.length-1]??'hub'} onBack={handleBack} onNavigate={handleViewChange}/>


        <main ref={mainRef} className="club-main">
          <SceneBackground scene={currentView} kennelLevel={user?.kennel_level || 1}>
            <div className="club-content">
              {!tutorialProgress.fieldClub&&currentView!=='fieldClub'&&currentView!=='office'&&currentView!=='hub'&&<FirstRibbonGuide compact onNavigate={(view,options)=>handleViewChange(view,view==='shop'?{shopTab:'items'}:options)}/>}
              {currentView === 'hub' && <><a href="/?preview=legacy" className="mb-3 flex items-center justify-between rounded-xl border border-amber-200/30 bg-slate-800 px-5 py-3 text-sm text-amber-100"><span>Homecoming · Explore the new kennel preview</span><span aria-hidden="true">↗</span></a><Suspense fallback={<p>Opening your kennel...</p>}><KennelInterior onNavigate={handleViewChange}/></Suspense></>}
              {currentView === 'fieldClub' && <FieldClub onNavigate={handleViewChange}/>}
              {currentView === 'expansion' && <KennelUpgradeView/>}

              {currentView === 'kennel' && <KennelView onViewDog={() => handleViewChange('dogDetail')} onUpgrade={()=>handleViewChange('expansion')} />}

              {currentView === 'dogDetail' && (
                <CompanionView onNavigate={view => view === 'shop' ? handleViewChange('shop', { shopTab: 'items' }) : handleViewChange(view)} />
              )}

              {currentView === 'office' && (
                <JourneyHome onNavigate={handleViewChange} />
              )}

              {currentView === 'story' && <StoryModeView />}

              {currentView === 'training' && <TrainingView onReturnToDog={() => handleViewChange('dogDetail')} />}

              {currentView === 'competition' && <EventBoardView />}

              {currentView === 'breeding' && (
                <div className="grid grid-cols-1 gap-6">
                  <BreedingPanel />
                  <PuppyNursery />
                </div>
              )}

              {currentView === 'jobs' && <JobsBoard />}

              {currentView === 'shop' && <ShopView initialTab={shopTab} />}

              {currentView === 'vet' && <VetClinicView />}

              {currentView === 'demo3d' && <Suspense fallback={<p>Preparing practice…</p>}><Demo3DView onFieldClub={()=>handleViewChange('fieldClub')} onInside={()=>handleViewChange('hub')} launch={yardLaunch} onWelcomeComplete={()=>handleViewChange('office')} onShop={() => handleViewChange('shop', {shopTab: 'items'})} /></Suspense>}
            </div>
          </SceneBackground>
        </main>
        {isLocalMode && <LocalSaveControls />}

      </div>

      {/* Daily Reward Modal */}
      {showDailyReward && user && dailyRewardUnlocked(tutorialProgress) && (
        <DailyRewardModal onClose={() => { setDailyRewardDismissed(true); setShowDailyReward(false); }} />
      )}

      {/* Tutorial Manager */}
      <TutorialManager />

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}

export default App;
