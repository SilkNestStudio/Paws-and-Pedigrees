import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
const App = lazy(() => import('./App.tsx'));
const PracticeView = lazy(() => import('./game/agility/PracticeView'));
const LegacyPreview = lazy(() => import('./game/legacy/LegacyPreview'));
const PlayYard = lazy(() => import('./game/playyard/PlayYard'));
const playYard = new URLSearchParams(window.location.search).get('preview') === 'yard';
const practice = new URLSearchParams(window.location.search).get('practice') === 'agility';
const legacyPreview = new URLSearchParams(window.location.search).get('preview') === 'legacy';
import { isLocalMode } from './lib/storage/config';
import ErrorBoundary from './components/common/ErrorBoundary'

const root = createRoot(document.getElementById('root')!);
async function start() {
  if (isLocalMode && !practice && !legacyPreview && !playYard) {
    // One writer per origin prevents two tabs silently overwriting each other's kennel.
    if (navigator.locks) await new Promise<void>((resolve, reject) => {
      void navigator.locks.request('paws-and-pedigrees-writer', { ifAvailable: true }, async lock => {
        if (!lock) { reject(new Error('Your kennel is already open in another tab.')); return; }
        resolve();
        await new Promise(() => {});
      }).catch(reject);
    });
    const { useGameStore } = await import('./stores/gameStore');
    let hydrationError: unknown;
    useGameStore.persist.setOptions({ onRehydrateStorage: () => (_state, error) => { hydrationError = error; } });
    await useGameStore.persist.rehydrate();
    if (hydrationError) throw hydrationError;
  }
  root.render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<div className="min-h-screen bg-earth-50 p-8">Loading your game…</div>}>
        {playYard ? <PlayYard /> : legacyPreview ? <LegacyPreview /> : practice ? <PracticeView /> : <App />}
      </Suspense>
    </ErrorBoundary>
  </StrictMode>,
)

}
void start().catch(error => {
  console.error(error);
  root.render(<div className="p-8">Your local save could not be opened. Close other game tabs and retry. Your existing data has not been reset.</div>);
});
