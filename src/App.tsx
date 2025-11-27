import { useState } from 'react';
import PoundScene from './components/kennel/PoundScene';
import KennelView from './components/kennel/KennelView';
import DogCarePanel from './components/kennel/DogCarePanel';
import Sidebar from './components/layout/Sidebar';
import { Breed } from './types';
import { useGameStore } from './stores/gameStore';
import { generateDog } from './utils/dogGenerator';
import SceneBackground from './components/layout/SceneBackground';
import TrainingView from './components/training/TrainingView';
import { useEffect } from 'react';
import { regenerateTP, shouldRegenerateTP } from './utils/tpRegeneration';
import CompetitionView from './components/competitions/CompetitionView';
import JobsBoard from './components/jobs/JobsBoard';
import BreedingPanel from './components/breeding/BreedingPanel';
import PuppyNursery from './components/breeding/PuppyNursery';
import ShopView from './components/shop/ShopView';
import { shouldAgeDog, ageDog } from './utils/puppyAging';
import OfficeDashboard from './components/office/OfficeDashboard';

type View =
  | 'kennel'
  | 'office'
  | 'training'
  | 'competition'
  | 'breeding'
  | 'jobs'
  | 'shop';

function App() {
  const [currentView, setCurrentView] = useState<View>('kennel');
  const { user, dogs, addDog, updateDog, hasAdoptedFirstDog, setHasAdoptedFirstDog } = useGameStore();

  const handleDogAdopted = (breed: Breed, name: string) => {
    const newDog = generateDog(breed, name, user?.id || 'temp-user-id', true);
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

  if (!hasAdoptedFirstDog) {
    return <PoundScene onDogSelected={handleDogAdopted} />;
  }

  const handleViewChange = (view: string) => {
    setCurrentView(view as View);
  };

  return (
    <div className="flex h-screen bg-earth-50">
      <Sidebar currentView={currentView} onViewChange={handleViewChange} />
      
      <div className="flex-1 flex flex-col">
        <header className="bg-kennel-700 text-white p-4 shadow-lg">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Paws & Pedigrees</h1>
            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-xs text-kennel-200">Cash</p>
                <p className="text-lg font-bold">${user?.cash}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-kennel-200">Gems</p>
                <p className="text-lg font-bold">💎 {user?.gems}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-kennel-200">Level</p>
                <p className="text-lg font-bold">{user?.level}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <SceneBackground scene={currentView}>
            <div className="p-6">
              {currentView === 'kennel' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <KennelView />
                  </div>
                  <div>
                    <DogCarePanel />
                  </div>
                </div>
              )}

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

              {currentView === 'shop' && <ShopView />}
            </div>
          </SceneBackground>
        </main>

      </div>
    </div>
  );
}

export default App;
