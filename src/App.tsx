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

function App() {
  const [currentView, setCurrentView] = useState('kennel');
  const { user, dogs, addDog, updateDog, hasAdoptedFirstDog, setHasAdoptedFirstDog } = useGameStore();

  const handleDogAdopted = (breed: Breed, name: string) => {
    const newDog = generateDog(breed, name, user?.id || 'temp-user-id', true);
    addDog(newDog);
    setHasAdoptedFirstDog(true);
  };

  useEffect(() => {
  // Check all dogs for TP regeneration on mount
  dogs.forEach(dog => {
    if (shouldRegenerateTP(dog)) {
      const updates = regenerateTP(dog);
      if (Object.keys(updates).length > 0) {
        updateDog(dog.id, updates);
      }
    }
  });
}, []);

  if (!hasAdoptedFirstDog) {
    return <PoundScene onDogSelected={handleDogAdopted} />;
  }

  return (
    <div className="flex h-screen bg-earth-50">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      
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
            <SceneBackground scene={currentView as 'kennel' | 'training' | 'competition' | 'jobs' | 'shop'}>
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
                
                {currentView === 'training' && (
                  <div className="text-center py-20">
                    <h2 className="text-3xl font-bold text-white drop-shadow-lg mb-4">Training Yard</h2>
                    <p className="text-white drop-shadow">Coming soon...</p>
                  </div>
                )}
                
                {currentView === 'competition' && <CompetitionView />}
                
                {currentView === 'jobs' && (
                  <div className="text-center py-20">
                    <h2 className="text-3xl font-bold text-white drop-shadow-lg mb-4">Jobs Board</h2>
                    <p className="text-white drop-shadow">Coming soon...</p>
                  </div>
                )}
                
                {currentView === 'shop' && (
                  <div className="text-center py-20">
                    <h2 className="text-3xl font-bold text-white drop-shadow-lg mb-4">Shop</h2>
                    <p className="text-white drop-shadow">Coming soon...</p>
                  </div>
                )}
              </div>
            </SceneBackground>
          </main>
          
          {currentView === 'training' && <TrainingView />}
          
          {currentView === 'competition' && (
            <div className="text-center py-20">
              <h2 className="text-3xl font-bold text-earth-800 mb-4">Competitions</h2>
              <p className="text-earth-600">Coming soon...</p>
            </div>
          )}
          
          {currentView === 'jobs' && (
            <div className="text-center py-20">
              <h2 className="text-3xl font-bold text-earth-800 mb-4">Jobs Board</h2>
              <p className="text-earth-600">Coming soon...</p>
            </div>
          )}
          
          {currentView === 'shop' && (
            <div className="text-center py-20">
              <h2 className="text-3xl font-bold text-earth-800 mb-4">Shop</h2>
              <p className="text-earth-600">Coming soon...</p>
            </div>
          )}
        
      </div>
    </div>
  );
}

export default App;